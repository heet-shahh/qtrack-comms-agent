import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { friendlyProgram, talkingPoints, lastPatientQuestion } from './translate'

export default function NavTask() {
  const id = useStore((s) => s.selectedTaskId)
  const task = useStore((s) => s.tasks[id])
  const patient = useStore((s) => s.patients[task?.patientId])
  const pb = useStore((s) => (task ? s.playbooks[task.playbookId] : null))
  const navigators = useStore((s) => s.navigators)
  const me = useStore((s) => s.currentNavigator)
  const setView = useStore((s) => s.setView)
  const startCall = useStore((s) => s.startCall)
  const saveCapture = useStore((s) => s.saveCapture)
  const confirmCapture = useStore((s) => s.confirmCapture)
  const resolveEscalation = useStore((s) => s.resolveEscalation)
  const reassignTask = useStore((s) => s.reassignTask)

  if (!task) return <div className="nav-wrap"><div className="nav-empty">Nothing selected.</div></div>

  // An automatic task the assistant is (or was) handling on its own — read-only for a navigator.
  const handledByAssistant = pb.tier === 'automatic' && task.state !== 'escalated'
  if (handledByAssistant) {
    return (
      <div className="nav-wrap narrow">
        <button className="btn sm ghost" onClick={() => setView('home')} style={{ marginBottom: 16 }}>← My Work</button>
        <div className="nav-patient">
          <div className="np-avatar">{patient.name.split(' ').map((x) => x[0]).join('')}</div>
          <div>
            <h1 style={{ fontSize: 24 }}>{patient.name}</h1>
            <div className="faint">{friendlyProgram(patient.program)}</div>
          </div>
        </div>
        <div className="done-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          <b style={{ color: 'var(--text)' }}>The assistant is handling this.</b>
          <p style={{ margin: '8px 0 0' }}>This is routine outreach that runs on its own. You'll only be pulled in if the patient replies with something that needs a person. Nothing to do here for now.</p>
        </div>
      </div>
    )
  }

  const isEscalation = task.state === 'escalated' && pb.tier !== 'assisted'
  const points = talkingPoints(task, patient, pb)
  const question = lastPatientQuestion(task)
  const done = task.state === 'completed' || (task.state === 'escalated' && pb.tier === 'assisted')

  return (
    <div className="nav-wrap narrow">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn sm ghost" onClick={() => setView('home')}>← My Work</button>
        <Handoff task={task} navigators={navigators} me={me} onReassign={(toId, note) => { reassignTask(task.id, toId, note); setView('home') }} />
      </div>

      <div className="nav-patient">
        <div className="np-avatar">{patient.name.split(' ').map((x) => x[0]).join('')}</div>
        <div>
          <h1 style={{ fontSize: 24 }}>{patient.name}</h1>
          <div className="faint">{patient.age} · {patient.sex} · {friendlyProgram(patient.program)} · {patient.phone}</div>
        </div>
      </div>

      <div className="why-card">
        <div className="lab">Why you're calling</div>
        {isEscalation
          ? <p>{patient.name.split(' ')[0]} got an automated message and replied with something the assistant shouldn't answer on its own. It's flagged for you.</p>
          : <p>A new {friendlyProgram(patient.program).toLowerCase()} result came in and needs a person to explain it. {patient.finding}</p>}
      </div>

      {isEscalation && question && (
        <div className="quote-card">
          <div className="lab">They said</div>
          <div className="q">"{question}"</div>
        </div>
      )}

      <div className="nav-sec-label">What to cover</div>
      <ul className="points">
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>

      {!isEscalation && (
        <div className="ctx-card">
          <div className="lab">Good to know</div>
          <div className="ctx-row"><span>Smoking</span><b>{patient.smoking}</b></div>
          <div className="ctx-row"><span>Recommended plan</span><b>{patient.fleischner || '—'}</b></div>
          <div className="ctx-row"><span>Prior anxiety noted</span><b>{patient.anxietyFlag ? 'Yes — go gently' : 'No'}</b></div>
        </div>
      )}

      {done
        ? <DoneCard task={task} />
        : isEscalation
          ? <CallbackForm onSave={(v) => { resolveEscalation(task.id, v); setView('home') }} />
          : <AssistedFlow task={task} startCall={() => startCall(task.id)} saveCapture={(c) => saveCapture(task.id, c)} confirm={() => { if (confirmCapture(task.id)) setView('home') }} />}
    </div>
  )
}

function DoneCard({ task }) {
  const s = task.outcomeSummary || {}
  return (
    <div className="done-card">
      <div className="row" style={{ gap: 8 }}><span style={{ fontSize: 20 }}>✓</span><b>Logged and closed.</b></div>
      {s.note && <p className="muted" style={{ marginTop: 8 }}>"{s.note}"</p>}
      {s.questions_raised && <p className="muted" style={{ marginTop: 8 }}>Questions raised: {s.questions_raised}</p>}
      {s.action_items && <p className="muted" style={{ marginTop: 4 }}>Next steps: {s.action_items}</p>}
    </div>
  )
}

function CallbackForm({ onSave }) {
  const [note, setNote] = useState('')
  const [scheduled, setScheduled] = useState('')
  return (
    <div className="log-card">
      <div className="lab">After the call</div>
      <div className="field"><label>How did it go?</label>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you talked about, how they seemed…" />
      </div>
      <div className="field"><label>Booked anything? (optional)</label>
        <input className="input" value={scheduled} onChange={(e) => setScheduled(e.target.value)} placeholder="e.g. Follow-up call Fri, or scan on the 27th" />
      </div>
      <button className="btn primary lg" onClick={() => onSave({ note, scheduled })}>Save &amp; close</button>
    </div>
  )
}

function AssistedFlow({ task, startCall, saveCapture, confirm }) {
  const [c, setC] = useState(task.capture || {})
  const set = (k, v) => { const n = { ...c, [k]: v }; setC(n); saveCapture(n) }

  if (task.state === 'queued') {
    return (
      <div className="log-card center">
        <p className="muted" style={{ marginTop: 0 }}>Read the points above, then start the call. You'll log how it went afterward.</p>
        <button className="btn primary lg" onClick={startCall}>▷ Start call</button>
      </div>
    )
  }

  return (
    <div className="log-card">
      <div className="lab">After the call</div>
      <div className="field"><label>Did they understand the plan?</label>
        <Choice value={c.patient_understood} onChange={(v) => set('patient_understood', v)} options={[['yes', 'Yes'], ['unsure', 'Somewhat'], ['no', 'No']]} />
      </div>
      <div className="field"><label>Did you book the next step?</label>
        <Choice value={c.scheduled} onChange={(v) => set('scheduled', v)} options={[['yes', 'Yes'], ['no', 'No']]} />
      </div>
      {c.scheduled === 'yes' && (
        <div className="field"><label>When?</label>
          <input className="input" type="date" value={c.scheduled_date || ''} onChange={(e) => set('scheduled_date', e.target.value)} />
        </div>
      )}
      <div className="field"><label>Anything they were worried about?</label>
        <textarea className="input" rows={2} value={c.questions_raised || ''} onChange={(e) => set('questions_raised', e.target.value)} placeholder="Optional" />
      </div>
      <div className="field"><label>Were they upset or distressed?</label>
        <Choice value={c.distress_flag ? 'yes' : c.distress_flag === false ? 'no' : undefined} onChange={(v) => set('distress_flag', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes — needs review']]} />
      </div>
      <div className="field"><label>Next steps</label>
        <input className="input" value={c.action_items || ''} onChange={(e) => set('action_items', e.target.value)} placeholder="e.g. Book 6-month CT, send info leaflet" />
      </div>
      <button className="btn primary lg" onClick={confirm}>Save &amp; close</button>
      <div className="faint" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>You can't close until the first, second and last fields are filled.</div>
    </div>
  )
}

function Choice({ value, onChange, options }) {
  return (
    <div className="choice">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

function Handoff({ task, navigators, me, onReassign }) {
  const [open, setOpen] = useState(false)
  const currentOwner = task.assignedNavigator || me
  const others = Object.values(navigators).filter((n) => n.id !== currentOwner)
  const [toId, setToId] = useState(others[0]?.id || '')
  const [note, setNote] = useState('')
  return (
    <div className="handoff-wrap">
      <button className="btn sm" onClick={() => setOpen((o) => !o)}>⇄ Hand off</button>
      {open && (
        <div className="handoff-pop">
          <div className="lab">Assign to a colleague</div>
          <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
            {others.map((n) => <option key={n.id} value={n.id}>{n.name} · {n.role}</option>)}
          </select>
          <input className="input" style={{ marginTop: 8 }} placeholder="Reason (optional), e.g. covering their panel today" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button className="btn primary sm" onClick={() => onReassign(toId, note)} disabled={!toId}>Reassign</button>
            <button className="btn sm ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>It moves to their worklist. The handoff is logged.</div>
        </div>
      )}
    </div>
  )
}
