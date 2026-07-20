import React from 'react'
import { useStore } from '../store/useStore'

export default function Patients() {
  const patients = Object.values(useStore((s) => s.patients))
  const tasks = Object.values(useStore((s) => s.tasks))
  const navigators = useStore((s) => s.navigators)
  const openPatient = useStore((s) => s.openPatient)

  return (
    <table className="tbl">
      <thead>
        <tr><th>Patient</th><th>MRN</th><th>Program</th><th>Navigator</th><th>Tasks</th><th>Context</th></tr>
      </thead>
      <tbody>
        {patients.map((p) => {
          const n = tasks.filter((t) => t.patientId === p.id).length
          return (
            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPatient(p.id)}>
              <td style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name} <span className="faint" style={{ fontWeight: 400 }}>· {p.age}{p.sex}</span></td>
              <td className="mono">{p.mrn}</td>
              <td><span className="pill neutral">{p.program}</span></td>
              <td>{navigators[p.navigator]?.name}</td>
              <td className="mono">{n}</td>
              <td>{p.note}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
