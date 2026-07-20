import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import TaskRow from '../components/TaskRow'

export default function TaskQueue() {
  const tasks = Object.values(useStore((s) => s.tasks))
  const playbooks = useStore((s) => s.playbooks)
  const [track, setTrack] = useState('all')
  const [state, setState] = useState('all')

  const filtered = tasks
    .filter((t) => track === 'all' || playbooks[t.playbookId].tier === track)
    .filter((t) => state === 'all' || (state === 'active' ? ['created', 'queued', 'in_progress'].includes(t.state) : t.state === state))
    .sort((a, b) => new Date(b.stageEnteredAt) - new Date(a.stageEnteredAt))

  return (
    <>
      <div className="toolbar">
        <div className="seg">
          {['all', 'automatic', 'assisted'].map((k) => (
            <button key={k} className={track === k ? 'on' : ''} onClick={() => setTrack(k)}>
              {k === 'all' ? 'All tracks' : k === 'automatic' ? 'Track A · Auto' : 'Track B · Assisted'}
            </button>
          ))}
        </div>
        <div className="seg">
          {['all', 'active', 'completed', 'escalated'].map((k) => (
            <button key={k} className={state === k ? 'on' : ''} onClick={() => setState(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <span className="faint mono" style={{ fontSize: 12 }}>{filtered.length} tasks</span>
      </div>

      <div className="tasklist">
        {filtered.map((t) => <TaskRow key={t.id} task={t} />)}
        {filtered.length === 0 && <div className="empty">No tasks match this filter.</div>}
      </div>
    </>
  )
}
