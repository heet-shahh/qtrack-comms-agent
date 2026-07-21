"""qTrack voice adapter — the Retell proxy, ported from the POC's Express server.

Holds the Retell API key server-side and proxies the three calls the browser
must NOT make directly: agent creation, web-call token minting, and call
retrieval. The key never reaches the frontend. Mounted under /api by main.py.
"""

import hashlib
import os

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

RETELL = "https://api.retellai.com"
KEY = os.getenv("RETELL_API_KEY", "")

router = APIRouter(prefix="/api")

# Retell's own LLM reads the transcript after the call and fills these fields;
# they come back on the call object as call_analysis.custom_analysis_data.
POST_CALL_ANALYSIS = [
    {
        "type": "string",
        "name": "clinical_note",
        "description": (
            "A concise clinical note (2-4 sentences) summarising THIS call for the EMR: "
            "what the patient was told, how they responded, any concern/barrier raised, and the outcome. "
            "Professional clinical language, no preamble."
        ),
    },
    {
        "type": "string",
        "name": "action_items",
        "description": (
            "The concrete follow-up tasks implied by THIS conversation, as a JSON array and nothing else. "
            'Each element: {"task": "<short imperative>", "agent": "<Appointment Agent|Prior Authorization Agent|Reminder Agent|Care navigator>"}. '
            "Route by task: scheduling/confirming/rescheduling a visit -> Appointment Agent; "
            "insurance/coverage/prior authorization/eligibility -> Prior Authorization Agent; "
            "a follow-up reminder or callback -> Reminder Agent; "
            "a clinical question or anything needing a human nurse/navigator -> Care navigator. "
            "Only include tasks the conversation actually calls for. If none, return []."
        ),
    },
]

# Giving the LLM this tool lets the agent actually hang up (auto flows) once it has
# said goodbye — the prompt tells it to end; this makes ending possible.
END_CALL_TOOL = {
    "type": "end_call",
    "name": "end_call",
    "description": "End the call after saying goodbye — once the goal is met, the patient clearly declines, or you have promised a nurse callback.",
}


class RetellError(Exception):
    def __init__(self, status: int, data):
        self.status = status
        self.data = data


async def _retell(path: str, method: str = "GET", body: dict | None = None):
    """One call to the Retell REST API, with the key attached server-side."""
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.request(
            method,
            RETELL + path,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
            json=body,
        )
    try:
        data = res.json()
    except ValueError:
        data = res.text
    if res.status_code >= 400:
        raise RetellError(res.status_code, data)
    return data


# Reuse agents across identical (voice + prompt) requests so we don't leak a new
# Retell agent on every call. Keyed by a hash of the behaviour — same as the POC.
_agent_cache: dict[str, dict] = {}


def _sig(voice_id: str, prompt: str, begin: str) -> str:
    raw = f"{voice_id}|{prompt}|{begin}".encode()
    return hashlib.sha1(raw).hexdigest()[:12]


async def _ensure_agent(voice_id: str, prompt: str, begin_message: str, name: str) -> dict:
    key = _sig(voice_id or "", prompt or "", begin_message or "")
    if key in _agent_cache:
        return _agent_cache[key]
    llm = await _retell(
        "/create-retell-llm",
        "POST",
        {
            "general_prompt": prompt,
            "begin_message": begin_message or None,
            "general_tools": [END_CALL_TOOL],
        },
    )
    agent = await _retell(
        "/create-agent",
        "POST",
        {
            "response_engine": {"type": "retell-llm", "llm_id": llm["llm_id"]},
            "voice_id": voice_id or "cartesia-Cleo",
            "agent_name": name or "qTrack POC agent",
            # Retell's own LLM reads the transcript after the call and fills these.
            # custom_analysis_data on the returned call carries them back.
            "post_call_analysis_data": POST_CALL_ANALYSIS,
        },
    )
    rec = {"agentId": agent["agent_id"], "llmId": llm["llm_id"]}
    _agent_cache[key] = rec
    return rec


def _err(e: RetellError):
    return JSONResponse({"error": e.data}, status_code=e.status or 500)


@router.get("/health")
def health():
    return {"ok": True, "hasKey": bool(KEY)}


@router.get("/voices")
async def voices():
    """Curated voice list (recommended first) for the picker."""
    try:
        data = await _retell("/list-voices")
        slim = [
            {
                "voice_id": v.get("voice_id"),
                "name": v.get("voice_name"),
                "gender": v.get("gender"),
                "accent": v.get("accent"),
                "provider": v.get("provider"),
                "preview": v.get("preview_audio_url"),
                "recommended": v.get("recommended"),
            }
            for v in data
        ]
        slim.sort(key=lambda v: 0 if v.get("recommended") else 1)
        return slim
    except RetellError as e:
        return _err(e)


class WebCallBody(BaseModel):
    voiceId: str | None = None
    prompt: str | None = None
    beginMessage: str | None = None
    name: str | None = None
    metadata: dict | None = None


@router.post("/web-call")
async def web_call(body: WebCallBody):
    """Mint a browser web-call token for a given behaviour."""
    if not body.prompt:
        return JSONResponse({"error": "prompt required"}, status_code=400)
    try:
        agent = await _ensure_agent(
            body.voiceId or "", body.prompt, body.beginMessage or "", body.name or ""
        )
        meta = body.metadata or {}
        call_body = {"agent_id": agent["agentId"], "metadata": meta}
        # Only include dynamic variables when present — Retell rejects a null value
        # (the field must be an object or absent entirely).
        if meta.get("dynamic"):
            call_body["retell_llm_dynamic_variables"] = meta["dynamic"]
        call = await _retell("/v2/create-web-call", "POST", call_body)
        return {
            "access_token": call["access_token"],
            "call_id": call["call_id"],
            "agent_id": agent["agentId"],
        }
    except RetellError as e:
        return _err(e)


@router.get("/call/{call_id}")
async def get_call(call_id: str):
    """Fetch a call after it ends (transcript, recording, Retell's analysis)."""
    try:
        return await _retell("/v2/get-call/" + call_id)
    except RetellError as e:
        return _err(e)
