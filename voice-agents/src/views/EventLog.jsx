import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { fmtTime } from '../components/common'

export default function EventLog() {
  const events = useStore((s) => s.events)
  const patients = useStore((s) => s.patients)
  const openTask = useStore((s) => s.openTask)
  const [q, setQ] = useState('')

  const rows = [...events].reverse().filter((e) => {
    if (!q) return true
    const p = patients[e.patientId]
    const hay = `${e.taskId} ${p?.name} ${e.from} ${e.to} ${e.changedBy} ${e.note}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <>
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ flex: 1 }} />
        <span className="faint mono" style={{ fontSize: 12 }}>{rows.length} rows · append-only audit trail</span>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr><th>Time</th><th>Task</th><th>Patient</th><th>Transition</th><th>By</th><th>Note</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => openTask(e.taskId)}>
                <td className="mono">{fmtTime(e.ts)}</td>
                <td className="mono" style={{ color: 'var(--accent)' }}>{e.taskId}</td>
                <td>{patients[e.patientId]?.name}</td>
                <td className="mono">{e.from} → <b style={{ color: 'var(--text)' }}>{e.to}</b></td>
                <td><span className="pill neutral" style={{ fontSize: 10 }}>{e.changedBy}</span></td>
                <td>{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
