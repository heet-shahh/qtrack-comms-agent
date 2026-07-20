import React from 'react'
import { useStore } from '../store/useStore'
import { PLAYBOOKS } from '../data/playbooks'
import { TierPill, timeAgo } from '../components/common'

export default function NavigatorQueue() {
  const tasks = Object.values(useStore((s) => s.tasks))
  const patients = useStore((s) => s.patients)
  const navigators = useStore((s) => s.navigators)
  const openTask = useStore((s) => s.openTask)

  const escalated = tasks.filter((t) => t.state === 'escalated')
  const assisted = tasks.filter((t) => PLAYBOOKS[t.playbookId].tier === 'assisted' && ['created', 'queued', 'in_progress'].includes(t.state))

  const Card = ({ t, kind }) => {
    const p = patients[t.patientId]
    const pb = PLAYBOOKS[t.playbookId]
    const lastIn = [...t.messages].reverse().find((m) => m.direction === 'inbound')
    return (
      <div className="card pad" style={{ cursor: 'pointer' }} onClick={() => openTask(t.id)}>
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="mono faint">{t.id}</span>
          <TierPill tier={pb.tier} />
          <div style={{ flex: 1 }} />
          <span className="faint mono" style={{ fontSize: 11 }}>{timeAgo(t.stageEnteredAt)}</span>
        </div>
        <div style={{ fontWeight: 600 }}>{p.name} <span className="faint mono" style={{ fontSize: 11 }}>· {p.program} · {p.mrn}</span></div>
        <div className="muted" style={{ fontSize: 13 }}>{pb.name}</div>
        {kind === 'escalated' && (
          <>
            <div className="callout warn" style={{ marginTop: 10 }}>{t.escalationReason}</div>
            {lastIn && <div className="bubble in" style={{ marginTop: 8, maxWidth: '100%' }}>"{lastIn.body}"<div className="meta">patient · {lastIn.channel}</div></div>}
            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill bad">SLA · same business day</span>
              <span className="pill neutral">→ {t.assignedNavigator ? navigators[t.assignedNavigator].name : 'on-call'}</span>
            </div>
          </>
        )}
        {kind === 'assisted' && (
          <div className="row" style={{ marginTop: 10 }}>
            <span className="pill neutral">{t.ownershipStatus || 'no owner'}</span>
            <span className="pill info">{t.state}</span>
            {t.findingContext && <span className="faint" style={{ fontSize: 12 }}>{t.findingContext}</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Everything a human needs to act on: automatic tasks that escalated (with the flagged question visible),
        and assisted Track B talk-track tasks. This is where Track A becomes Track B.
      </p>

      <div className="section-title">Escalated from Track A ({escalated.length})</div>
      <div className="grid g2">
        {escalated.map((t) => <Card key={t.id} t={t} kind="escalated" />)}
        {escalated.length === 0 && <div className="empty">No escalations. Trigger a fallout reply in any active conversation.</div>}
      </div>

      <div className="section-title">Assisted · Track B talk tracks ({assisted.length})</div>
      <div className="grid g2">
        {assisted.map((t) => <Card key={t.id} t={t} kind="assisted" />)}
        {assisted.length === 0 && <div className="empty">No open assisted tasks.</div>}
      </div>
    </>
  )
}
