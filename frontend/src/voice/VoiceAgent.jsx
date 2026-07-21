import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'
import { buildVoicePrompt } from './voicePrompt'
import './voice.css'

// Live Retell voice call, embedded inside the qTrack mock. Voice-only: the agent
// (Robin, the care coordinator) places the call from the patient's task context;
// you role-play the patient through your mic. Renders with the mock's own
// .transcript / .turn / .btn classes so it reads as native qTrack UI.
export default function VoiceAgent({ patient, task, onEnded, onCallId, onTranscript }) {
  const aliveRef = useRef(true)
  const [voices, setVoices] = useState([])
  const [voiceId, setVoiceId] = useState('cartesia-Cleo')
  const [status, setStatus] = useState('idle') // idle | connecting | live | ended | error
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [callId, setCallId] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [backendUp, setBackendUp] = useState(null) // null unknown | true | false

  const clientRef = useRef(null)
  const { prompt, beginMessage } = useMemo(() => buildVoicePrompt(patient, task), [patient, task])
  const [promptDraft, setPromptDraft] = useState(prompt)
  useEffect(() => setPromptDraft(prompt), [prompt])

  useEffect(() => {
    fetch('/api/health')
      .then(safeJson)
      .then((h) => setBackendUp(!!h.ok && h.hasKey !== false))
      .catch(() => setBackendUp(false))
    fetch('/api/voices').then(safeJson).then((v) => { if (Array.isArray(v)) setVoices(v) }).catch(() => {})
    return () => { aliveRef.current = false; try { clientRef.current?.stopCall() } catch {} }
  }, [])

  const start = async () => {
    setError(null); setResult(null); setTranscript([]); setStatus('connecting')
    try {
      const r = await fetch('/api/web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          prompt: promptDraft,
          beginMessage,
          name: `qTrack ${task?.t || 'call'}`,
          metadata: { patient: patient?.n, task: task?.t },
        }),
      })
      const data = await safeJson(r)
      if (!r.ok || !data.access_token) {
        const detail = data.error ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) : null
        throw new Error(detail || `Voice backend not reachable (status ${r.status}).`)
      }
      setCallId(data.call_id)
      onCallId?.(data.call_id)

      const client = new RetellWebClient()
      clientRef.current = client
      client.on('call_started', () => setStatus('live'))
      client.on('call_ready', () => setStatus('live'))
      client.on('agent_start_talking', () => setSpeaking(true))
      client.on('agent_stop_talking', () => setSpeaking(false))
      client.on('update', (u) => { const t = u?.transcript; if (Array.isArray(t)) { setTranscript(t); onTranscript?.(t) } })
      client.on('error', (e) => { setError(String(e?.message || e)); setStatus('error'); try { client.stopCall() } catch {} })
      client.on('call_ended', () => { setStatus('ended'); setSpeaking(false); pollResult(data.call_id) })

      await client.startCall({ accessToken: data.access_token })
    } catch (e) {
      setError(e.message || String(e)); setStatus('error')
    }
  }

  const end = () => { try { clientRef.current?.stopCall() } catch {} }

  const pollResult = async (id) => {
    let last = null
    for (let i = 0; i < 10; i++) {
      await new Promise((res) => setTimeout(res, 1600))
      try {
        const r = await fetch('/api/call/' + id)
        const call = await r.json()
        const to = call.transcript_object || []
        if (to.length || call.transcript) last = call
        // Prefer returning once Retell's summary is ready; otherwise keep the
        // latest transcript-bearing call as a fallback.
        if (call?.call_analysis?.call_summary) {
          const res = { call, callId: id }
          if (aliveRef.current) setResult(res)
          onEnded?.(res); return
        }
      } catch {}
    }
    if (last) { const res = { call: last, callId: id }; if (aliveRef.current) setResult(res); onEnded?.(res); return }
    const pending = { call: null, callId: id, pending: true }
    if (aliveRef.current) setResult(pending)
    onEnded?.(pending)
  }

  const busy = status === 'connecting' || status === 'live'
  const analysis = result?.call?.call_analysis

  return (
    <div className="voiceagent">
      <div className="va-bar">
        <span className={`va-dot ${status}`} />
        <b>{statusLabel(status)}</b>
        {status === 'live' && <span className="pill" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{speaking ? 'agent speaking' : 'listening'}</span>}
        <div className="va-spacer" />
        <select className="va-select" value={voiceId} disabled={busy} onChange={(e) => setVoiceId(e.target.value)}>
          {voices.length === 0 && <option value="cartesia-Cleo">Cleo (default)</option>}
          {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} · {v.gender} · {v.accent}{v.recommended ? ' ★' : ''}</option>)}
        </select>
        {status === 'idle' || status === 'ended' || status === 'error'
          ? <button className="btn primary" onClick={start} disabled={backendUp === false}>🎙 Start call</button>
          : <button className="btn" onClick={end}>■ End call</button>}
      </div>

      {backendUp === false && (
        <div className="va-note warn">Voice backend not reachable or the Retell key is missing. Set <code>RETELL_API_KEY</code> in <code>backend/.env</code> and restart.</div>
      )}
      {error && <div className="va-note warn"><b>Error.</b> {error}</div>}

      <div className="transcript va-transcript">
        {transcript.length === 0 && (
          <div className="turn"><div className="msg">{status === 'idle' ? 'Press start to place the call — you role-play the patient through your mic.' : 'Transcript will appear here as you talk…'}</div></div>
        )}
        {transcript.map((t, i) => (
          <div key={i} className={`turn ${t.role === 'agent' ? 'agent' : 'right'}`}>
            <div className="who">{t.role === 'agent' ? 'Robin (agent)' : `${patient?.n || 'Patient'} (you)`}</div>
            <div className="msg">{t.content}</div>
          </div>
        ))}
      </div>

      {status === 'ended' && (
        <div className="va-outcome">
          {!result && <div className="psub">Fetching transcript &amp; analysis from Retell…</div>}
          {result?.pending && <div className="psub">Transcript not ready yet — Retell is still processing (call {callId}).</div>}
          {analysis && (
            <>
              <div className="draftlabel"><span>Call summary · Retell analysis</span></div>
              {analysis.call_summary && <div className="draft" style={{ maxHeight: 'none' }}>{analysis.call_summary}</div>}
              <div className="va-tags">
                {analysis.user_sentiment && <span className="tag">sentiment: {analysis.user_sentiment}</span>}
                {'call_successful' in analysis && <span className="tag">successful: {String(analysis.call_successful)}</span>}
              </div>
              {result?.call?.recording_url && <div style={{ marginTop: 10 }}><a href={result.call.recording_url} target="_blank" rel="noreferrer">▶ recording</a></div>}
            </>
          )}
        </div>
      )}

      <details className="va-prompt">
        <summary>Agent prompt (built from this patient &amp; task — editable)</summary>
        <textarea value={promptDraft} disabled={busy} rows={11} onChange={(e) => setPromptDraft(e.target.value)} />
      </details>
    </div>
  )
}

function statusLabel(s) {
  return { idle: 'Ready', connecting: 'Connecting…', live: 'Call live', ended: 'Call ended', error: 'Error' }[s] || s
}

// Tolerant JSON parse: an empty/non-JSON body resolves to {} instead of throwing.
async function safeJson(r) {
  const text = await r.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { error: text.slice(0, 200) } }
}
