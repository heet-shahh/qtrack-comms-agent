import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'
import { useStore } from '../store/useStore'
import { buildVoicePrompt } from '../lib/voicePrompt'
import { interpret } from '../lib/interpret'
import { OUTCOME_LABELS } from '../lib/stateMachine'

export default function VoiceAgent() {
  const playbooks = useStore((s) => s.playbooks)
  const patients = useStore((s) => s.patients)
  const list = Object.values(playbooks).sort((a, b) => a.num - b.num)

  const [playbookId, setPlaybookId] = useState('overdue_chase')
  const [patientId, setPatientId] = useState('p_chen')
  const [voices, setVoices] = useState([])
  const [voiceId, setVoiceId] = useState('cartesia-Cleo')
  const [status, setStatus] = useState('idle') // idle | connecting | live | ended | error
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [callId, setCallId] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const clientRef = useRef(null)
  const pb = playbooks[playbookId]
  const patient = patients[patientId]
  const { prompt, beginMessage } = useMemo(() => buildVoicePrompt(pb, patient), [pb, patient])
  const [promptDraft, setPromptDraft] = useState(prompt)
  useEffect(() => setPromptDraft(prompt), [prompt])

  useEffect(() => {
    fetch('/api/voices').then((r) => r.json()).then((v) => { if (Array.isArray(v)) setVoices(v) }).catch(() => {})
    return () => { try { clientRef.current?.stopCall() } catch {} }
  }, [])

  const start = async () => {
    setError(null); setResult(null); setTranscript([]); setStatus('connecting')
    try {
      const r = await fetch('/api/web-call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, prompt: promptDraft, beginMessage, name: `qTrack ${pb.name}`, metadata: { playbookId, patientId } }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      setCallId(data.call_id)

      const client = new RetellWebClient()
      clientRef.current = client
      client.on('call_started', () => setStatus('live'))
      client.on('call_ready', () => setStatus('live'))
      client.on('agent_start_talking', () => setSpeaking(true))
      client.on('agent_stop_talking', () => setSpeaking(false))
      client.on('update', (u) => { const t = u?.transcript; if (Array.isArray(t)) setTranscript(t) })
      client.on('error', (e) => { setError(String(e?.message || e)); setStatus('error'); try { client.stopCall() } catch {} })
      client.on('call_ended', () => { setStatus('ended'); setSpeaking(false); pollResult(data.call_id) })

      await client.startCall({ accessToken: data.access_token })
    } catch (e) {
      setError(e.message || String(e)); setStatus('error')
    }
  }

  const end = () => { try { clientRef.current?.stopCall() } catch {} }

  const pollResult = async (id) => {
    for (let i = 0; i < 8; i++) {
      await new Promise((res) => setTimeout(res, 1600))
      try {
        const r = await fetch('/api/call/' + id)
        const call = await r.json()
        const to = call.transcript_object || []
        if (to.length || call.transcript) {
          const userText = to.filter((t) => t.role === 'user').map((t) => t.content).join(' ') || call.transcript || ''
          const brain = interpret(userText, pb)
          setResult({ call, brain, userText })
          return
        }
      } catch {}
    }
    setResult({ call: null, brain: null, userText: '', pending: true })
  }

  const busy = status === 'connecting' || status === 'live'

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        The voice adapter, live. Pick a playbook and press start — you'll talk to the agent through your mic,
        playing the patient. Same playbook and goal as the text channel; only the mouth changed. When the call
        ends, the same interpret brain reads the transcript and maps it to the playbook's outcome.
      </p>

      <div className="grid" style={{ gridTemplateColumns: '340px 1fr', alignItems: 'start', gap: 18 }}>
        {/* config */}
        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>Call setup</div>
          <div className="field"><label>Playbook</label>
            <select className="input" value={playbookId} disabled={busy} onChange={(e) => setPlaybookId(e.target.value)}>
              {list.map((p) => <option key={p.id} value={p.id}>{p.num}. {p.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Patient (you'll role-play them)</label>
            <select className="input" value={patientId} disabled={busy} onChange={(e) => setPatientId(e.target.value)}>
              {Object.values(patients).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.program}</option>)}
            </select>
          </div>
          <div className="field"><label>Voice</label>
            <select className="input" value={voiceId} disabled={busy} onChange={(e) => setVoiceId(e.target.value)}>
              {voices.length === 0 && <option value="cartesia-Cleo">Cleo (default)</option>}
              {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name} · {v.gender} · {v.accent}{v.recommended ? ' ★' : ''}</option>)}
            </select>
          </div>
          <div className="goal-banner" style={{ margin: '8px 0 14px' }}>
            <div><div className="lab">Goal</div><div className="g" style={{ fontSize: 14 }}>{pb.goal}</div></div>
          </div>
          {status === 'idle' || status === 'ended' || status === 'error'
            ? <button className="btn primary lg" onClick={start}>🎙 Start voice call</button>
            : <button className="btn warn lg" onClick={end}>■ End call</button>}
          <div className="faint" style={{ fontSize: 11.5, marginTop: 8 }}>Your browser will ask for microphone access.</div>
          {error && <div className="callout warn" style={{ marginTop: 12, fontSize: 12.5 }}><b style={{ color: 'var(--text)' }}>Error.</b> {error}</div>}
        </div>

        {/* call surface */}
        <div className="stack" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 10 }}>
                <span className={`voicedot ${status}`} />
                <b>{statusLabel(status)}</b>
                {status === 'live' && <span className="pill info">{speaking ? 'agent speaking' : 'listening'}</span>}
              </div>
              {callId && <span className="mono faint" style={{ fontSize: 11 }}>{callId}</span>}
            </div>

            <div className="chat" style={{ marginTop: 16, minHeight: 160, maxHeight: 320, overflowY: 'auto' }}>
              {transcript.length === 0 && <div className="bubble sys">{status === 'idle' ? 'Press start to place the call.' : 'Transcript will appear here as you talk…'}</div>}
              {transcript.map((t, i) => (
                <div key={i} className={`bubble ${t.role === 'agent' ? 'out' : 'in'}`} style={{ maxWidth: '86%' }}>
                  <div>{t.content}</div>
                  <div className="meta">{t.role === 'agent' ? 'AGENT (Retell)' : 'YOU (patient)'}</div>
                </div>
              ))}
            </div>
          </div>

          {status === 'ended' && (
            <div className="card pad">
              <div className="section-title" style={{ marginTop: 0 }}>Outcome — read by the same interpret brain</div>
              {!result && <div className="faint mono" style={{ fontSize: 12 }}>Fetching transcript &amp; analysis from Retell…</div>}
              {result?.pending && <div className="faint mono" style={{ fontSize: 12 }}>Transcript not ready yet — Retell is still processing. Try again shortly via call id {callId}.</div>}
              {result?.brain && (
                <>
                  <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                    <span className={`pill ${result.brain.barrier ? 'bad' : result.brain.fallout ? 'warn' : result.brain.matched ? 'ok' : 'neutral'}`}>
                      {OUTCOME_LABELS[result.brain.outcome.response_type] || result.brain.outcome.response_type}
                    </span>
                    {result.brain.outcome.date && <span className="pill neutral">date: {result.brain.outcome.date}</span>}
                    {result.brain.fallout && <span className="pill warn">fallout → escalate</span>}
                    {result.brain.barrier && <span className="pill bad">barrier → escalate</span>}
                  </div>
                  <div className="callout" style={{ fontSize: 12.5 }}>{result.brain.rationale}</div>
                  <div className="faint" style={{ fontSize: 12, margin: '10px 0 4px' }}>In production this maps straight onto the task: a match completes it and chains the next task; a fallout/barrier escalates to a navigator.</div>
                  {result.call?.call_analysis && (
                    <div className="kv" style={{ marginTop: 12 }}>
                      {result.call.call_analysis.call_summary && <><div className="k">Retell summary</div><div className="v">{result.call.call_analysis.call_summary}</div></>}
                      {result.call.call_analysis.user_sentiment && <><div className="k">Sentiment</div><div className="v">{result.call.call_analysis.user_sentiment}</div></>}
                      {'call_successful' in result.call.call_analysis && <><div className="k">Call successful</div><div className="v">{String(result.call.call_analysis.call_successful)}</div></>}
                    </div>
                  )}
                  {result.call?.recording_url && <div style={{ marginTop: 12 }}><a href={result.call.recording_url} target="_blank" rel="noreferrer">▶ recording</a></div>}
                </>
              )}
            </div>
          )}

          <details className="card pad">
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)' }}>Agent prompt (built from the playbook — editable)</summary>
            <textarea className="input" style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 12 }} rows={12} value={promptDraft} disabled={busy} onChange={(e) => setPromptDraft(e.target.value)} />
          </details>
        </div>
      </div>
    </>
  )
}

function statusLabel(s) {
  return { idle: 'Ready', connecting: 'Connecting…', live: 'Call live', ended: 'Call ended', error: 'Error' }[s] || s
}
