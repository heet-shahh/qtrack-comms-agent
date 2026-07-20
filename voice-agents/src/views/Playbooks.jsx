import React from 'react'
import { PLAYBOOK_LIST } from '../data/playbooks'
import { TierPill } from '../components/common'

export default function PlaybooksView() {
  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        The versioned config that drives everything. A playbook is a state-machine definition, not code.
        Adding a sixth condition is one more entry here; it never touches the engine.
      </p>
      <div className="grid g2">
        {PLAYBOOK_LIST.map((p) => (
          <div className="card pad" key={p.id}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="mono faint">#{p.num}</span>
              <h3 style={{ fontSize: 15 }}>{p.name}</h3>
              <div style={{ flex: 1 }} />
              <TierPill tier={p.tier} />
            </div>
            <div className="kv">
              <div className="k">Trigger</div><div className="v">{p.trigger}</div>
              <div className="k">Goal</div><div className="v" style={{ color: '#8cc4ff' }}>{p.goal}</div>
              <div className="k">Interaction</div><div className="v mono" style={{ fontSize: 12 }}>{p.interactionType}</div>
              <div className="k">Success</div><div className="v"><span className="pill ok">{p.successOutcome}</span></div>
              <div className="k">Retry</div><div className="v mono" style={{ fontSize: 12 }}>{p.retryPolicy.maxAttempts}× / {p.retryPolicy.waitDays}d · {p.retryPolicy.ladder.join(' → ')}</div>
              <div className="k">Next task</div><div className="v">{p.nextTaskOnSuccess ? p.nextTaskOnSuccess.label : '—'}</div>
            </div>
            <div className="divider" />
            <div className="faint mono" style={{ fontSize: 11 }}>SCRIPT HINT</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{p.scriptHint}</div>
            <div className="wrap-row" style={{ marginTop: 10 }}>
              {p.expectedOutcomes.map((o) => <span key={o} className="pill neutral" style={{ fontSize: 10 }}>{o}</span>)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
