import React from 'react'
import { useStore } from '../store/useStore'
import { PLAYBOOKS } from '../data/playbooks'
import { SMBar, TierPill, timeAgo, OutcomePill } from '../components/common'
import Conversation from '../components/Conversation'
import TalkTrack from '../components/TalkTrack'

export default function TaskDetail() {
  const id = useStore((s) => s.selectedTaskId)
  const task = useStore((s) => s.tasks[id])
  const patient = useStore((s) => s.patients[task?.patientId])
  const navigators = useStore((s) => s.navigators)
  const events = useStore((s) => s.events)
  const setView = useStore((s) => s.setView)
  const openTask = useStore((s) => s.openTask)
  const openPatient = useStore((s) => s.openPatient)
  const sendOutreach = useStore((s) => s.sendOutreach)
  const retry = useStore((s) => s.retry)
  const escalate = useStore((s) => s.escalate)

  if (!task) return <div className="empty">Task not found.</div>
  const pb = PLAYBOOKS[task.playbookId]
  const assisted = pb.tier === 'assisted'
  const taskEvents = events.filter((e) => e.taskId === task.id)

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn sm ghost" onClick={() => setView('queue')}>← Queue</button>
        <span className="mono faint">{task.id}</span>
        <TierPill tier={pb.tier} />
        <div style={{ flex: 1 }} />
        <span className="link" onClick={() => openPatient(patient.id)}>{patient.name} →</span>
      </div>

      <div className="goal-banner" style={{ marginBottom: 18 }}>
        <div>
          <div className="lab">Agent goal · {pb.name}</div>
          <div className="g">{task.goal}</div>
        </div>
        <div style={{ flex: 1 }} />
        {task.outcomeSummary && <OutcomePill outcome={task.outcomeSummary.response_type} />}
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <SMBar task={task} />
        {task.nextTaskSpawned && (
          <div className="callout" style={{ marginTop: 14 }}>
            ⛓ Chained a next task on success:{' '}
            <span className="link" onClick={() => openTask(task.nextTaskSpawned.id)}>{task.nextTaskSpawned.id} · {task.nextTaskSpawned.label} →</span>
          </div>
        )}
        {task.escalationReason && (
          <div className="callout warn" style={{ marginTop: 14 }}>
            <b style={{ color: 'var(--text)' }}>Escalation reason.</b> {task.escalationReason}
          </div>
        )}
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>
            {assisted ? 'Track B · Navigator workspace' : 'Track A · Conversation'}
          </div>

          {!assisted && task.state === 'queued' && (
            <div style={{ marginBottom: 14 }}>
              <button className="btn primary" onClick={() => sendOutreach(task.id)}>✦ Compose &amp; send first outreach</button>
            </div>
          )}

          {assisted ? <TalkTrack task={task} /> : <Conversation task={task} />}

          {!assisted && task.state === 'in_progress' && (
            <div className="row" style={{ marginTop: 16, gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button className="btn sm" onClick={() => retry(task.id)}>↻ No reply — retry (next channel)</button>
              <button className="btn sm warn" onClick={() => escalate(task.id, 'Manually escalated by operator.')}>Escalate now</button>
              <span className="faint mono" style={{ fontSize: 11 }}>max {pb.retryPolicy.maxAttempts} attempts · ladder {pb.retryPolicy.ladder.join(' → ')}</span>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="section-title" style={{ marginTop: 0 }}>Context</div>
            <div className="kv">
              <div className="k">Patient</div><div className="v">{patient.name}, {patient.age} · {patient.sex}</div>
              <div className="k">Program</div><div className="v">{task.program}</div>
              <div className="k">Trigger</div><div className="v">{task.sourceEvent}</div>
              <div className="k">Interaction</div><div className="v mono" style={{ fontSize: 12 }}>{task.interactionType}</div>
              <div className="k">Channel</div><div className="v">{task.channel}</div>
              <div className="k">Attempts</div><div className="v">{task.attemptCount} / {pb.retryPolicy.maxAttempts}</div>
              {task.assignedNavigator && <><div className="k">Navigator</div><div className="v">{navigators[task.assignedNavigator].name}</div></>}
              {task.ownershipStatus && <><div className="k">Ownership</div><div className="v"><span className="pill neutral">{task.ownershipStatus}</span></div></>}
            </div>
          </div>

          <div className="card pad">
            <div className="section-title" style={{ marginTop: 0 }}>Expected outcomes</div>
            <div className="wrap-row">
              {task.expectedOutcomes.map((o) => <span key={o} className="pill neutral" style={{ fontSize: 10 }}>{o}</span>)}
            </div>
            <div className="section-title">Barrier signals → escalate</div>
            <div className="wrap-row">
              {pb.barrierSignals.length ? pb.barrierSignals.map((b) => <span key={b} className="pill bad" style={{ fontSize: 10 }}>{b}</span>) : <span className="faint">none</span>}
            </div>
          </div>

          <div className="card pad">
            <div className="section-title" style={{ marginTop: 0 }}>Event log · this task</div>
            <div className="stack" style={{ gap: 8 }}>
              {taskEvents.map((e) => (
                <div key={e.id} style={{ fontSize: 12 }}>
                  <span className="mono faint">{timeAgo(e.ts)}</span> · {e.from} → <b>{e.to}</b>
                  <div className="faint" style={{ fontSize: 11 }}>{e.changedBy}: {e.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
