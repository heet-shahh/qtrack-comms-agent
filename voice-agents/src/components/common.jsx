import React from 'react'
import { STATES, STATE_META, OUTCOME_LABELS } from '../lib/stateMachine'

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function TierPill({ tier }) {
  return <span className={`pill ${tier === 'assisted' ? 'assisted' : 'auto'}`}>{tier === 'assisted' ? 'ASSISTED · Track B' : 'AUTOMATIC · Track A'}</span>
}

const STATE_TONE = { created: 'neutral', queued: 'info', in_progress: 'active', completed: 'ok', escalated: 'warn', failed: 'bad', closed: 'neutral' }
export function StatePill({ state }) {
  return <span className={`pill dot ${STATE_TONE[state] || 'neutral'}`}>{(STATE_META[state]?.label || state).toUpperCase()}</span>
}

export function OutcomePill({ outcome }) {
  if (!outcome) return null
  const bad = ['opt_out', 'declined', 'not_interested'].includes(outcome)
  return <span className={`pill ${bad ? 'neutral' : 'ok'}`}>{OUTCOME_LABELS[outcome] || outcome}</span>
}

// State-machine progress bar. For assisted tasks the "in_progress" node reads as the call.
export function SMBar({ task }) {
  const terminal = task.state === 'escalated' ? 'escalated' : 'completed'
  const path = ['created', 'queued', 'in_progress', terminal]
  const curIdx = path.indexOf(task.state)
  return (
    <div className="smbar">
      {path.map((st, i) => {
        const done = curIdx > i
        const current = curIdx === i
        const tone = st === 'escalated' ? 'warn' : st === 'completed' ? 'ok' : ''
        return (
          <React.Fragment key={st}>
            <div className={`smnode ${done ? 'done' : ''} ${current ? 'current ' + tone : ''}`}>
              <span className="chip">{STATE_META[st]?.label || st}</span>
            </div>
            {i < path.length - 1 && <span className="smarrow">→</span>}
          </React.Fragment>
        )
      })}
    </div>
  )
}
