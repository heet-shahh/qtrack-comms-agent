import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { CAPTURE_FIELDS } from '../data/playbooks'

export default function TalkTrack({ task }) {
  const patient = useStore((s) => s.patients[task.patientId])
  const navigators = useStore((s) => s.navigators)
  const resolveOwnership = useStore((s) => s.resolveOwnership)
  const startCall = useStore((s) => s.startCall)
  const saveCapture = useStore((s) => s.saveCapture)
  const confirmCapture = useStore((s) => s.confirmCapture)
  const [cap, setCap] = useState(task.capture || {})

  const navName = task.assignedNavigator ? navigators[task.assignedNavigator].name : '—'

  const setField = (k, v) => {
    const next = { ...cap, [k]: v }
    setCap(next)
    saveCapture(task.id, next)
  }

  // ownership gate first
  if (task.state === 'created' && task.ownershipStatus === 'proposed') {
    return (
      <div className="card pad">
        <div className="section-title" style={{ marginTop: 0 }}>Ownership confirmation required (§5a)</div>
        <p className="muted" style={{ marginTop: 0 }}>
          This is an incidental finding from an out-of-domain ordering physician. A talk-track task cannot be
          created until ownership resolves. Silence past the SLA counts as an implicit decline.
        </p>
        <div className="kv" style={{ margin: '14px 0' }}>
          <div className="k">Finding</div><div className="v">{task.findingContext}</div>
          <div className="k">Ordering</div><div className="v">Cardiology (CT angiogram) — out of domain for a lung nodule</div>
          <div className="k">Fallback chain</div><div className="v mono" style={{ fontSize: 12 }}>ordering MD → PCP → pulmonology → safety-net navigator</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ok" onClick={() => resolveOwnership(task.id, 'accept')}>Ordering MD accepts</button>
          <button className="btn warn" onClick={() => resolveOwnership(task.id, 'decline')}>Decline / SLA timeout → fallback</button>
        </div>
      </div>
    )
  }

  const brief = (
    <div className="card pad">
      <div className="section-title" style={{ marginTop: 0 }}>Pre-call brief · generated for {navName}</div>
      <div className="kv">
        <div className="k">Finding</div><div className="v">{task.findingContext || patient.finding}</div>
        <div className="k">Comparison</div><div className="v">{patient.finding?.includes('stable') ? 'Stable vs. prior' : 'New vs. prior'}</div>
        <div className="k">Guideline step</div><div className="v">{patient.fleischner}</div>
        <div className="k">Ownership</div><div className="v"><span className="pill ok">{task.ownershipStatus}</span></div>
        <div className="k">Anxiety flag</div><div className="v">{patient.anxietyFlag ? <span className="pill warn">prior anxiety on file</span> : 'none'}</div>
      </div>
      <div className="callout" style={{ marginTop: 14 }}>
        <b style={{ color: 'var(--text)' }}>Talk track.</b> Reassure — most nodules this size are benign. Explain the
        {' '}{patient.fleischner?.toLowerCase()} timeline. Confirm scheduling. This is an open clinical conversation,
        so the agent preps and documents — it does not speak to the patient.
      </div>
    </div>
  )

  if (task.state === 'queued') {
    return (
      <div className="stack" style={{ gap: 16 }}>
        {brief}
        <button className="btn primary" onClick={() => startCall(task.id)}>▷ Navigator: start call</button>
      </div>
    )
  }

  if (task.state === 'completed' || task.state === 'escalated') {
    return (
      <div className="stack" style={{ gap: 16 }}>
        {brief}
        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>Captured outcome</div>
          <div className="kv">
            {Object.entries(task.capture || {}).map(([k, v]) => (
              <React.Fragment key={k}><div className="k">{k}</div><div className="v">{String(v)}</div></React.Fragment>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // in_progress → completion gate form
  return (
    <div className="stack" style={{ gap: 16 }}>
      {brief}
      <div className="card pad">
        <div className="section-title" style={{ marginTop: 0 }}>Post-call capture · completion gate</div>
        <p className="faint mono" style={{ fontSize: 11, marginTop: 0 }}>The task cannot close until required fields are filled. (V1 = manual entry; V2 = AI-drafted from the call recording, navigator-confirmed.)</p>
        {CAPTURE_FIELDS.map((f) => {
          if (f.dependsOn && cap[Object.keys(f.dependsOn)[0]] !== Object.values(f.dependsOn)[0]) return null
          return (
            <div className="field" key={f.key}>
              <label>{f.label}{['patient_understood', 'scheduled', 'action_items'].includes(f.key) ? ' *' : ''}</label>
              {f.type === 'enum' && (
                <div className="seg">
                  {f.options.map((o) => (
                    <button key={o} className={cap[f.key] === o ? 'on' : ''} onClick={() => setField(f.key, o)}>{o}</button>
                  ))}
                </div>
              )}
              {f.type === 'bool' && (
                <div className="seg">
                  {['no', 'yes'].map((o) => (
                    <button key={o} className={String(cap[f.key]) === (o === 'yes' ? 'true' : 'false') || (!cap[f.key] && o === 'no') ? 'on' : ''} onClick={() => setField(f.key, o === 'yes')}>{o}</button>
                  ))}
                </div>
              )}
              {(f.type === 'text' || f.type === 'date') && (
                <input className="input" type={f.type === 'date' ? 'date' : 'text'} value={cap[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.type === 'text' ? 'free text…' : ''} />
              )}
            </div>
          )
        })}
        <button className="btn primary" onClick={() => confirmCapture(task.id)}>✓ Confirm &amp; close (completion gate)</button>
      </div>
    </div>
  )
}
