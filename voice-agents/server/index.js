// qTrack voice adapter — thin backend that holds the Retell key server-side and
// proxies the calls the browser must NOT make directly (agent creation, web-call
// token minting, call retrieval). The Retell API key never reaches the frontend.

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const KEY = process.env.RETELL_API_KEY
const PORT = process.env.PORT || 8787
const RETELL = 'https://api.retellai.com'

if (!KEY) console.warn('⚠  RETELL_API_KEY missing from server/.env')

async function retell(path, method = 'GET', body) {
  const res = await fetch(RETELL + path, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) throw { status: res.status, data }
  return data
}

// Reuse agents across identical (voice + prompt) requests so we don't leak a new
// Retell agent on every call. Keyed by a hash of the behaviour.
const agentCache = new Map()
const sig = (voiceId, prompt, begin) =>
  crypto.createHash('sha1').update(`${voiceId}|${prompt}|${begin}`).digest('hex').slice(0, 12)

async function ensureAgent({ voiceId, prompt, beginMessage, name }) {
  const key = sig(voiceId, prompt, beginMessage)
  if (agentCache.has(key)) return agentCache.get(key)
  const llm = await retell('/create-retell-llm', 'POST', {
    general_prompt: prompt,
    begin_message: beginMessage || undefined,
  })
  const agent = await retell('/create-agent', 'POST', {
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    voice_id: voiceId || 'cartesia-Cleo',
    agent_name: name || 'qTrack POC agent',
  })
  const rec = { agentId: agent.agent_id, llmId: llm.llm_id }
  agentCache.set(key, rec)
  return rec
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, hasKey: !!KEY }))

// Curated voice list (recommended first) for the picker.
app.get('/api/voices', async (_req, res) => {
  try {
    const voices = await retell('/list-voices')
    const slim = voices.map((v) => ({
      voice_id: v.voice_id, name: v.voice_name, gender: v.gender,
      accent: v.accent, provider: v.provider, preview: v.preview_audio_url, recommended: v.recommended,
    }))
    slim.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0))
    res.json(slim)
  } catch (e) { res.status(e.status || 500).json({ error: e.data || String(e) }) }
})

// Mint a browser web-call token for a given behaviour.
app.post('/api/web-call', async (req, res) => {
  try {
    const { voiceId, prompt, beginMessage, name, metadata } = req.body || {}
    if (!prompt) return res.status(400).json({ error: 'prompt required' })
    const { agentId } = await ensureAgent({ voiceId, prompt, beginMessage, name })
    const call = await retell('/v2/create-web-call', 'POST', {
      agent_id: agentId,
      metadata: metadata || {},
      retell_llm_dynamic_variables: metadata?.dynamic || undefined,
    })
    res.json({ access_token: call.access_token, call_id: call.call_id, agent_id: agentId })
  } catch (e) {
    console.error('web-call error', e)
    res.status(e.status || 500).json({ error: e.data || String(e) })
  }
})

// Fetch a call after it ends (transcript, recording, Retell's own analysis).
app.get('/api/call/:id', async (req, res) => {
  try {
    res.json(await retell('/v2/get-call/' + req.params.id))
  } catch (e) { res.status(e.status || 500).json({ error: e.data || String(e) }) }
})

// Optional: Retell webhook sink. localhost won't receive these without a tunnel;
// the frontend polls /api/call/:id instead. Kept for completeness.
const webhookLog = []
app.post('/api/webhook', (req, res) => {
  webhookLog.push({ ts: Date.now(), event: req.body?.event, call_id: req.body?.call?.call_id })
  res.sendStatus(204)
})
app.get('/api/webhook-log', (_req, res) => res.json(webhookLog.slice(-50)))

app.listen(PORT, () => console.log(`qTrack voice backend on http://localhost:${PORT}  (key: ${KEY ? 'loaded' : 'MISSING'})`))
