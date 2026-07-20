import React from 'react'
import { useStore } from '../store/useStore'
import { activityLine } from './translate'
import { timeAgo } from '../components/common'

export default function NavActivity() {
  const tasks = Object.values(useStore((s) => s.tasks))
  const patients = useStore((s) => s.patients)
  const playbooks = useStore((s) => s.playbooks)
  const me = useStore((s) => s.currentNavigator)

  const auto = tasks
    .filter((t) => patients[t.patientId].navigator === me && playbooks[t.playbookId].tier === 'automatic')
    .sort((a, b) => new Date(b.stageEnteredAt) - new Date(a.stageEnteredAt))

  const iconFor = (s) => (s === 'completed' ? '✓' : s === 'escalated' ? '!' : '…')

  return (
    <div className="nav-wrap">
      <div className="nav-hero">
        <h1>What the assistant did</h1>
        <p>Routine reminders and chases the assistant handled for your patients, so nothing is a black box. You only get pulled in when a person is actually needed.</p>
      </div>
      <div className="feed">
        {auto.map((t) => (
          <div key={t.id} className="feed-row">
            <div className={`feed-ic ${t.state}`}>{iconFor(t.state)}</div>
            <div style={{ flex: 1 }}>
              <div>{activityLine(t, patients[t.patientId], playbooks[t.playbookId])}</div>
              <div className="faint" style={{ fontSize: 12 }}>{timeAgo(t.stageEnteredAt)}</div>
            </div>
            <span className={`statuschip ${t.state}`}>
              {t.state === 'completed' ? 'Done' : t.state === 'in_progress' ? 'In progress' : t.state === 'escalated' ? 'Sent to you' : 'Queued'}
            </span>
          </div>
        ))}
        {auto.length === 0 && <div className="nav-empty">No automated activity yet for your patients.</div>}
      </div>
    </div>
  )
}
