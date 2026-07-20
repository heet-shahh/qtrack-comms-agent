import React from 'react'
import { useStore } from '../store/useStore'
import ModeSwitcher from '../components/ModeSwitcher'
import NavHome from './NavHome'
import NavTask from './NavTask'
import NavActivity from './NavActivity'
import NavPatients from './NavPatients'
import PatientDetail from '../views/PatientDetail'

const TABS = [
  { key: 'home', label: 'My Work' },
  { key: 'activity', label: 'Assistant Activity' },
  { key: 'patients', label: 'My Patients' },
]

export default function NavigatorApp() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const navigators = useStore((s) => s.navigators)
  const currentNavigator = useStore((s) => s.currentNavigator)
  const setNavigator = useStore((s) => s.setNavigator)

  const nav = navigators[currentNavigator]
  const tab = ['home', 'activity', 'patients'].includes(view) ? view : null

  return (
    <div className="nav-app">
      <header className="nav-top">
        <div className="nav-top-inner">
          <div className="row" style={{ gap: 10 }}>
            <div className="logo" style={{ width: 28, height: 28, fontSize: 14 }}>q</div>
            <span style={{ fontWeight: 700 }}>qTrack</span>
            <span className="faint" style={{ fontSize: 12 }}>care coordinator</span>
          </div>
          <div className="spacer" style={{ flex: 1 }} />
          <div className="row" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>You are</span>
            <select className="input" style={{ width: 'auto', padding: '5px 10px' }} value={currentNavigator} onChange={(e) => setNavigator(e.target.value)}>
              {Object.values(navigators).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <ModeSwitcher />
        </div>
        <nav className="nav-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setView(t.key)}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main className="nav-main">
        {view === 'home' && <NavHome />}
        {view === 'activity' && <NavActivity />}
        {view === 'patients' && <NavPatients />}
        {view === 'navtask' && <NavTask />}
        {view === 'patient' && <PatientDetail />}
      </main>
    </div>
  )
}
