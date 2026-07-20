import React from 'react'
import { useStore } from '../store/useStore'
import { PLAYBOOKS } from '../data/playbooks'
import { StatePill, timeAgo } from './common'

export default function TaskRow({ task }) {
  const patient = useStore((s) => s.patients[task.patientId])
  const openTask = useStore((s) => s.openTask)
  const pb = PLAYBOOKS[task.playbookId]
  return (
    <div className="task-row" onClick={() => openTask(task.id)}>
      <div>
        <div className="tid">{task.id}</div>
        <span className={`pill ${pb.tier === 'assisted' ? 'assisted' : 'auto'}`} style={{ fontSize: 9, padding: '1px 6px', marginTop: 4 }}>
          {pb.tier === 'assisted' ? 'B' : 'A'}
        </span>
      </div>
      <div className="stack">
        <div className="tname">{patient.name} <span className="faint mono" style={{ fontSize: 11 }}>· {patient.program}</span></div>
        <div className="tsub">{pb.name} · <span className="faint">{task.sourceEvent}</span></div>
      </div>
      <div className="tright">
        {task.state === 'in_progress' && <span className="pill neutral">attempt {task.attemptCount}</span>}
        <StatePill state={task.state} />
        <span className="faint mono" style={{ fontSize: 11 }}>{timeAgo(task.stageEnteredAt)}</span>
      </div>
    </div>
  )
}
