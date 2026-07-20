import React, { useState } from 'react'
import { useStore } from '../store/useStore'

export default function TriggerSimulator() {
  const patients = Object.values(useStore((s) => s.patients))
  const playbooks = useStore((s) => s.playbooks)
  const fireTrigger = useStore((s) => s.fireTrigger)
  const runNightlyScan = useStore((s) => s.runNightlyScan)
  const openTask = useStore((s) => s.openTask)
  const playbookList = Object.values(playbooks).sort((a, b) => a.num - b.num)
  const [pb, setPb] = useState('overdue_chase')
  const [pid, setPid] = useState('p_chen')

  const fire = () => {
    const id = fireTrigger(pb, pid)
    setTimeout(() => openTask(id), 350)
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Stand-in for the event listener. In production these fire from EMR/RIS events and the nightly derived
        scan. Here you fire them by hand to walk the demo. Each mints a real Task and event-log rows.
      </p>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>Fire a single condition</div>
          <div className="field">
            <label>Condition · playbook</label>
            <select className="input" value={pb} onChange={(e) => setPb(e.target.value)}>
              {playbookList.map((p) => (
                <option key={p.id} value={p.id}>{p.num}. {p.name} · {p.tier}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Patient</label>
            <select className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.program} · {p.mrn}</option>
              ))}
            </select>
          </div>
          <button className="btn primary" onClick={fire}>⚡ Fire trigger → create task</button>
        </div>

        <div className="card pad">
          <div className="section-title" style={{ marginTop: 0 }}>Derived background scan</div>
          <p className="muted" style={{ marginTop: 0 }}>
            The nightly scan runs against the whole population, checking time-elapsed conditions that are not
            single events ("overdue by N days", "no rescreen in 12 months"). Running it mints tasks for
            everyone currently matching.
          </p>
          <button className="btn" onClick={runNightlyScan}>⚡ Run nightly scan</button>
          <div className="callout" style={{ marginTop: 14 }}>
            Automatic tasks auto-queue on creation. Assisted tasks (new finding) wait on the ownership chain
            before a navigator task exists.
          </div>
        </div>
      </div>

      <div className="section-title">Demo script</div>
      <div className="card pad">
        <ol className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>Open <b>T-1042</b> (Margaret Chen, overdue chase) from the queue. It is mid-conversation, one attempt out.</li>
          <li>Hit <b>"Gives a date"</b> — watch the brain extract the date, the task complete, and a pre-scan reminder chain automatically.</li>
          <li>Fire a fresh <b>overdue chase</b> here, send outreach, then hit <b>"Asks a clinical question"</b> — watch the graceful handoff and a card appear in the Navigator Queue.</li>
          <li>Open <b>T-1044b</b> (Frank Russo) to walk the <b>ownership chain</b>, then <b>T-1044</b> (James Okafor) for the full <b>Track B</b> talk track + completion gate.</li>
        </ol>
      </div>
    </>
  )
}
