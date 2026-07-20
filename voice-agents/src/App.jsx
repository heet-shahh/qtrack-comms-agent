import React from 'react'
import { useStore } from './store/useStore'
import { PLAYBOOKS } from './data/playbooks'
import Dashboard from './views/Dashboard'
import TaskQueue from './views/TaskQueue'
import TaskDetail from './views/TaskDetail'
import NavigatorQueue from './views/NavigatorQueue'
import Patients from './views/Patients'
import PatientDetail from './views/PatientDetail'
import PlaybooksView from './views/Playbooks'
import EventLog from './views/EventLog'
import TriggerSimulator from './views/TriggerSimulator'

const NAV = [
  { group: 'Operate', items: [
    { key: 'dashboard', label: 'Dashboard', ic: '◫' },
    { key: 'queue', label: 'Task Queue', ic: '☰' },
    { key: 'navigator', label: 'Navigator Queue', ic: '✎' },
    { key: 'trigger', label: 'Trigger Simulator', ic: '⚡' },
  ]},
  { group: 'Records', items: [
    { key: 'patients', label: 'Patients', ic: '⊕' },
    { key: 'events', label: 'Event Log', ic: '≣' },
    { key: 'playbooks', label: 'Playbooks', ic: '❏' },
  ]},
]

const TITLES = {
  dashboard: 'Dashboard', queue: 'Task Queue', navigator: 'Navigator Queue',
  trigger: 'Trigger Simulator', patients: 'Patients', events: 'Event Log',
  playbooks: 'Playbook Registry', task: 'Task Detail', patient: 'Patient Record',
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const tasks = useStore((s) => s.tasks)
  const toast = useStore((s) => s.toast)
  const runNightlyScan = useStore((s) => s.runNightlyScan)

  const taskArr = Object.values(tasks)
  const counts = {
    queue: taskArr.filter((t) => ['created', 'queued', 'in_progress'].includes(t.state)).length,
    navigator: taskArr.filter((t) => t.state === 'escalated' || (PLAYBOOKS[t.playbookId].tier === 'assisted' && t.state !== 'completed')).length,
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">q</div>
          <div>
            <div className="bt">qTrack</div>
            <div className="bs">comms agent</div>
          </div>
        </div>
        {NAV.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => (
              <button key={it.key} className={`nav-item ${view === it.key ? 'active' : ''}`} onClick={() => setView(it.key)}>
                <span className="ic">{it.ic}</span>
                <span>{it.label}</span>
                {counts[it.key] != null && <span className="count">{counts[it.key]}</span>}
              </button>
            ))}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="callout" style={{ fontSize: 12, lineHeight: 1.5 }}>
          <b style={{ color: 'var(--text)' }}>POC · mock data</b><br />
          Channel = Slack/SMS stub. The interpret step is a rule-based stand-in for the Claude brain. Backend plugs in behind the same contract.
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <h1>{TITLES[view] || 'qTrack'}</h1>
          <span className="crumb">Patient Communication Agent · v0.1 POC</span>
          <div className="spacer" />
          <button className="btn sm" onClick={runNightlyScan}>⚡ Run nightly scan</button>
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard />}
          {view === 'queue' && <TaskQueue />}
          {view === 'task' && <TaskDetail />}
          {view === 'navigator' && <NavigatorQueue />}
          {view === 'trigger' && <TriggerSimulator />}
          {view === 'patients' && <Patients />}
          {view === 'patient' && <PatientDetail />}
          {view === 'events' && <EventLog />}
          {view === 'playbooks' && <PlaybooksView />}
        </div>
      </div>

      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  )
}
