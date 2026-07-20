import React from 'react'
import { useStore } from '../store/useStore'
import { friendlyProgram } from './translate'

export default function NavPatients() {
  const patients = Object.values(useStore((s) => s.patients))
  const tasks = Object.values(useStore((s) => s.tasks))
  const me = useStore((s) => s.currentNavigator)
  const openPatient = useStore((s) => s.openPatient)

  const mine = patients.filter((p) => p.navigator === me)

  return (
    <div className="nav-wrap">
      <div className="nav-hero">
        <h1>My patients</h1>
        <p>Everyone on your panel. Open one to see their full history — every message and call, automated or yours.</p>
      </div>
      <div className="nav-cards">
        {mine.map((p) => {
          const open = tasks.filter((t) => t.patientId === p.id && ['escalated', 'queued', 'in_progress'].includes(t.state)).length
          return (
            <div key={p.id} className="workcard" onClick={() => openPatient(p.id)}>
              <div className="np-avatar sm">{p.name.split(' ').map((x) => x[0]).join('')}</div>
              <div className="wc-body">
                <div className="wc-title">{p.name} <span className="faint" style={{ fontWeight: 400, fontSize: 13 }}>· {p.age}</span></div>
                <div className="wc-why">{friendlyProgram(p.program)} · {p.note}</div>
              </div>
              {open > 0 ? <span className="today">{open} open</span> : <span className="faint" style={{ fontSize: 12 }}>up to date</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
