import React from 'react'
import { useStore } from '../store/useStore'
import { cardFor, friendlyProgram } from './translate'

export default function NavHome() {
  const tasks = Object.values(useStore((s) => s.tasks))
  const patients = useStore((s) => s.patients)
  const playbooks = useStore((s) => s.playbooks)
  const navigators = useStore((s) => s.navigators)
  const me = useStore((s) => s.currentNavigator)
  const openTask = useStore((s) => s.openTask)

  const mine = tasks.filter((t) => {
    const p = patients[t.patientId]
    const forMe = (t.assignedNavigator || p.navigator) === me
    if (!forMe) return false
    if (t.state === 'escalated') return true
    if (playbooks[t.playbookId].tier === 'assisted' && ['queued', 'in_progress'].includes(t.state)) return true
    return false
  })

  const order = { high: 0, med: 1, low: 2 }
  const cards = mine
    .map((t) => ({ t, p: patients[t.patientId], pb: playbooks[t.playbookId], c: cardFor(t, patients[t.patientId], playbooks[t.playbookId]) }))
    .sort((a, b) => order[a.c.urgency] - order[b.c.urgency])

  const closedToday = tasks.filter((t) => {
    const p = patients[t.patientId]
    return (t.assignedNavigator || p.navigator) === me && t.state === 'completed' && t.outcomeSummary
      && ['capture_complete', 'navigator_resolved'].includes(t.outcomeSummary.response_type)
  }).length

  const autoHandled = tasks.filter((t) => {
    const p = patients[t.patientId]
    return p.navigator === me && playbooks[t.playbookId].tier === 'automatic'
  }).length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const meName = navigators[me].name.split(',')[0].split(' ')[0]

  return (
    <div className="nav-wrap">
      <div className="nav-hero">
        <h1>{greeting}, {meName}.</h1>
        <p>
          {cards.length === 0
            ? 'Nothing needs a call right now. The assistant has your routine outreach covered.'
            : <>You have <b>{cards.length} {cards.length === 1 ? 'patient' : 'patients'}</b> to call. The assistant is handling {autoHandled} others in the background.</>}
        </p>
      </div>

      {cards.length > 0 && <div className="nav-sec-label">Needs a call</div>}
      <div className="nav-cards">
        {cards.map(({ t, p, c }) => (
          <div key={t.id} className="workcard" onClick={() => openTask(t.id)}>
            <div className={`urg ${c.urgency}`} />
            <div className="wc-body">
              <div className="wc-title">{c.title}</div>
              <div className="wc-why">{c.why}</div>
              <div className="wc-meta">
                {p.name} · {p.age} · {friendlyProgram(p.program)}
                {c.urgency === 'high' && <span className="today">Call today</span>}
              </div>
            </div>
            <button className="btn primary">{c.cta} →</button>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="nav-empty">
            <div style={{ fontSize: 34, marginBottom: 8 }}>✓</div>
            You're all caught up.
          </div>
        )}
      </div>

      {closedToday > 0 && (
        <div className="nav-note">You've closed <b>{closedToday}</b> {closedToday === 1 ? 'call' : 'calls'} recently. Nice work.</div>
      )}
    </div>
  )
}
