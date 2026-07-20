import React from 'react'
import { useStore } from '../store/useStore'
import { StatePill, TierPill, fmtTime } from '../components/common'

export default function PatientDetail() {
  const pid = useStore((s) => s.selectedPatientId)
  const patient = useStore((s) => s.patients[pid])
  const playbooks = useStore((s) => s.playbooks)
  const navigators = useStore((s) => s.navigators)
  const tasks = Object.values(useStore((s) => s.tasks)).filter((t) => t.patientId === pid)
  const setView = useStore((s) => s.setView)
  const openTask = useStore((s) => s.openTask)

  if (!patient) return <div className="empty">No patient selected.</div>

  // Communication History Log: every message across every task, chronological.
  const comms = tasks
    .flatMap((t) => t.messages.map((m) => ({ ...m, task: t })))
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn sm ghost" onClick={() => setView('patients')}>← Patients</button>
        <span className="mono faint">{patient.mrn}</span>
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
        <div className="card pad">
          <h2 style={{ fontSize: 20 }}>{patient.name}</h2>
          <div className="muted" style={{ marginBottom: 14 }}>{patient.age} · {patient.sex} · {patient.program}</div>
          <div className="kv">
            <div className="k">Navigator</div><div className="v">{navigators[patient.navigator]?.name}</div>
            <div className="k">Channel</div><div className="v">{patient.channel} · {patient.phone}</div>
            <div className="k">Smoking</div><div className="v">{patient.smoking}</div>
            {patient.finding && <><div className="k">Finding</div><div className="v">{patient.finding}</div></>}
            {patient.fleischner && <><div className="k">Guideline</div><div className="v">{patient.fleischner}</div></>}
            <div className="k">Anxiety flag</div><div className="v">{patient.anxietyFlag ? <span className="pill warn">yes</span> : 'none'}</div>
          </div>

          <div className="section-title">Tasks ({tasks.length})</div>
          <div className="stack" style={{ gap: 8 }}>
            {tasks.map((t) => (
              <div key={t.id} className="row" style={{ cursor: 'pointer' }} onClick={() => openTask(t.id)}>
                <span className="mono faint" style={{ fontSize: 12 }}>{t.id}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{playbooks[t.playbookId].name}</span>
                <StatePill state={t.state} />
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>Communication history · all tasks, chronological</div>
          <p className="faint mono" style={{ fontSize: 11, marginTop: 0 }}>The durable, cross-task, patient-indexed log (§9). Track A and Track B both land here.</p>
          <div className="chat">
            {comms.map((m, i) => (
              <div key={i} className={`bubble ${m.direction === 'outbound' ? 'out' : 'in'}`} style={{ maxWidth: '88%' }}>
                <div>{m.body}</div>
                <div className="meta">{m.direction === 'outbound' ? 'AGENT' : 'PATIENT'} · {m.channel} · {playbooks[m.task.playbookId].name} · {fmtTime(m.ts)}</div>
              </div>
            ))}
            {comms.length === 0 && <div className="empty">No communications yet.</div>}
          </div>
        </div>
      </div>
    </>
  )
}
