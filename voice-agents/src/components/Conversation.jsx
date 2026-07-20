import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { REPLY_PRESETS } from '../lib/interpret'
import { OUTCOME_LABELS } from '../lib/stateMachine'
import { fmtTime } from './common'

export default function Conversation({ task }) {
  const receiveReply = useStore((s) => s.receiveReply)
  const [draft, setDraft] = useState('')
  const canReply = task.state === 'in_progress'

  const send = (text) => {
    if (!text.trim()) return
    receiveReply(task.id, text.trim())
    setDraft('')
  }

  return (
    <div>
      <div className="chat">
        {task.messages.length === 0 && <div className="bubble sys">No messages yet. Send the first outreach.</div>}
        {task.messages.map((m, i) => (
          <div key={i} className={`bubble ${m.direction === 'outbound' ? 'out' : 'in'}`}>
            <div>{m.body}</div>
            <div className="meta">{m.direction === 'outbound' ? 'AGENT' : 'PATIENT'} · {m.channel} · {fmtTime(m.ts)}</div>
            {m.interpreted && (
              <div className={`interp ${m.interpreted.barrier ? 'barrier' : m.interpreted.fallout ? 'fallout' : ''}`}>
                <span className="tag">brain →</span> {OUTCOME_LABELS[m.interpreted.outcome.response_type] || m.interpreted.outcome.response_type}
                {m.interpreted.outcome.date && <> · date: <b>{m.interpreted.outcome.date}</b></>}
                {m.interpreted.fallout && <> · <b style={{ color: '#e7bd62' }}>FALLOUT</b></>}
                {m.interpreted.barrier && <> · <b style={{ color: '#f89a91' }}>BARRIER</b></>}
                <div style={{ marginTop: 4, opacity: .8 }}>{m.interpreted.rationale}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {canReply ? (
        <div className="reply-box">
          <div className="faint mono" style={{ fontSize: 11, marginBottom: 8 }}>SIMULATE PATIENT REPLY — pick a preset or type your own; the brain interprets it live</div>
          <div className="reply-presets">
            {REPLY_PRESETS.map((p) => (
              <button key={p.label} className={`chipbtn ${p.kind === 'fallout' ? 'fallout' : p.kind === 'barrier' ? 'barrier' : ''}`} onClick={() => send(p.text)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" value={draft} placeholder="Type a patient reply…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)} />
            <button className="btn primary" onClick={() => send(draft)}>Send</button>
          </div>
        </div>
      ) : (
        <div className="reply-box faint mono" style={{ fontSize: 12 }}>
          {task.state === 'queued' && 'Send the first outreach to start the conversation.'}
          {task.state === 'completed' && 'Conversation closed — goal met.'}
          {task.state === 'escalated' && 'Conversation escalated — see the navigator queue.'}
          {task.state === 'created' && 'Task not yet queued.'}
        </div>
      )}
    </div>
  )
}
