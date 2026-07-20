import React from 'react'
import { useStore } from '../store/useStore'
import TaskRow from '../components/TaskRow'
import { timeAgo } from '../components/common'

export default function Dashboard() {
  const tasks = Object.values(useStore((s) => s.tasks))
  const playbooks = useStore((s) => s.playbooks)
  const events = useStore((s) => s.events)
  const setView = useStore((s) => s.setView)

  const active = tasks.filter((t) => ['created', 'queued', 'in_progress'].includes(t.state))
  const autoTasks = tasks.filter((t) => playbooks[t.playbookId].tier === 'automatic')
  const completed = tasks.filter((t) => t.state === 'completed')
  const escalated = tasks.filter((t) => t.state === 'escalated')
  const resolvedNoEsc = autoTasks.length ? Math.round((autoTasks.filter((t) => t.state === 'completed').length / autoTasks.length) * 100) : 0

  const recent = [...events].reverse().slice(0, 8)

  return (
    <>
      <div className="grid g4">
        <Metric k={active.length} l="Active tasks" s="created · queued · in-progress" />
        <Metric k={`${resolvedNoEsc}%`} l="Track A auto-resolved" s="completed without escalation" />
        <Metric k={escalated.length} l="Escalated to navigator" s="awaiting human action" />
        <Metric k={completed.length} l="Completed" s="goal met, logged" />
      </div>

      <div className="section-title">Live queue</div>
      <div className="tasklist">
        {active.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
        {active.length === 0 && <div className="empty">No active tasks. Fire one from the Trigger Simulator.</div>}
      </div>
      <div style={{ marginTop: 10 }}>
        <span className="link" onClick={() => setView('queue')}>View full queue →</span>
      </div>

      <div className="grid g2" style={{ marginTop: 26 }}>
        <div className="card pad">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Event log · latest</div>
          <div className="stack" style={{ gap: 10 }}>
            {recent.map((e) => (
              <div key={e.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="pill neutral" style={{ fontSize: 10 }}>{e.changedBy}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>
                    <span className="mono faint">{e.taskId}</span> · {e.from} → <b style={{ color: 'var(--text)' }}>{e.to}</b>
                  </div>
                  <div className="faint" style={{ fontSize: 11.5 }}>{e.note}</div>
                </div>
                <span className="faint mono" style={{ fontSize: 10 }}>{timeAgo(e.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div className="section-title" style={{ margin: '0 0 12px' }}>The thesis</div>
          <p className="muted" style={{ marginTop: 0 }}>
            One state-machine engine turns a clinical trigger into a tracked conversation that either reaches
            its goal on its own (Track A) or hands off cleanly to a navigator (Track B).
          </p>
          <div className="callout" style={{ marginTop: 12 }}>
            The channel is a swappable adapter. This POC speaks over Slack/SMS; the identical brain speaks
            over voice later. Nothing left of the channel changes.
          </div>
          <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => setView('trigger')}>⚡ Trigger a condition</button>
            <button className="btn sm" onClick={() => setView('navigator')}>✎ Navigator queue</button>
            <button className="btn sm" onClick={() => setView('playbooks')}>❏ Playbooks</button>
          </div>
        </div>
      </div>
    </>
  )
}

function Metric({ k, l, s }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className="l">{l}</div>
      <div className="s">{s}</div>
    </div>
  )
}
