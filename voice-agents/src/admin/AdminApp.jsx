import React from 'react'
import { useStore } from '../store/useStore'
import ModeSwitcher from '../components/ModeSwitcher'
import Dashboard from '../views/Dashboard'
import Workflows from '../views/Workflows'
import TaskQueue from '../views/TaskQueue'
import TaskDetail from '../views/TaskDetail'
import Patients from '../views/Patients'
import PatientDetail from '../views/PatientDetail'
import EventLog from '../views/EventLog'
import TriggerSimulator from '../views/TriggerSimulator'

const NAV = [
  { group: 'Configure', items: [
    { key: 'workflows', label: 'Workflows', ic: '❏' },
    { key: 'trigger', label: 'Trigger Simulator', ic: '⚡' },
  ]},
  { group: 'Monitor', items: [
    { key: 'dashboard', label: 'Dashboard', ic: '◫' },
    { key: 'queue', label: 'Task Queue', ic: '☰' },
    { key: 'events', label: 'Event Log', ic: '≣' },
    { key: 'patients', label: 'Patients', ic: '⊕' },
  ]},
]

const TITLES = {
  dashboard: 'Dashboard', workflows: 'Workflow Configuration', queue: 'Task Queue',
  trigger: 'Trigger Simulator', patients: 'Patients', events: 'Event Log',
  task: 'Task Detail', patient: 'Patient Record',
}

export default function AdminApp() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const tasks = useStore((s) => s.tasks)
  const runNightlyScan = useStore((s) => s.runNightlyScan)

  const taskArr = Object.values(tasks)
  const counts = {
    queue: taskArr.filter((t) => ['created', 'queued', 'in_progress'].includes(t.state)).length,
  }

  return (
    <div className="app admin">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">q</div>
          <div>
            <div className="bt">qTrack</div>
            <div className="bs">admin console</div>
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
        <ModeSwitcher />
      </aside>

      <div className="main">
        <div className="topbar">
          <h1>{TITLES[view] || 'qTrack'}</h1>
          <span className="crumb">Workflow management · v0.1 POC</span>
          <div className="spacer" />
          <button className="btn sm" onClick={runNightlyScan}>⚡ Run nightly scan</button>
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard />}
          {view === 'workflows' && <Workflows />}
          {view === 'queue' && <TaskQueue />}
          {view === 'task' && <TaskDetail />}
          {view === 'trigger' && <TriggerSimulator />}
          {view === 'patients' && <Patients />}
          {view === 'patient' && <PatientDetail />}
          {view === 'events' && <EventLog />}
        </div>
      </div>
    </div>
  )
}
