import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { TierPill } from '../components/common'

export default function Workflows() {
  const playbooks = useStore((s) => s.playbooks)
  const updatePlaybook = useStore((s) => s.updatePlaybook)
  const flash = useStore((s) => s.flash)
  const list = Object.values(playbooks).sort((a, b) => a.num - b.num)
  const [selId, setSelId] = useState(list[0].id)
  const pb = playbooks[selId]

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Each workflow is a condition the platform watches for, and what should happen when it fires. Change the
        goal, the retry rules, what escalates a case to a human, and which task runs next on success. Edits apply
        to newly created tasks.
      </p>
      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', alignItems: 'start', gap: 18 }}>
        <div className="stack" style={{ gap: 8 }}>
          {list.map((p) => (
            <div key={p.id} className={`wf-item ${selId === p.id ? 'on' : ''}`} onClick={() => setSelId(p.id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="mono faint" style={{ fontSize: 11 }}>#{p.num}</span>
                <span className={`pill ${p.tier === 'assisted' ? 'assisted' : 'auto'}`} style={{ fontSize: 9 }}>{p.tier === 'assisted' ? 'B' : 'A'}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 2 }}>{p.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>{p.goal}</div>
            </div>
          ))}
        </div>

        <Editor key={selId} pb={pb} list={list} onSave={(patch) => { updatePlaybook(selId, patch); flash('Workflow saved · applies to new tasks') }} />
      </div>
    </>
  )
}

function Editor({ pb, list, onSave }) {
  const [f, setF] = useState(() => hydrate(pb))
  useEffect(() => setF(hydrate(pb)), [pb.id])
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const save = () => onSave({
    name: f.name,
    program: f.program,
    tier: f.tier,
    interactionType: f.tier === 'assisted' ? 'open_clinical' : 'binary_logistics',
    trigger: f.trigger,
    goal: f.goal,
    successOutcome: f.successOutcome,
    scriptHint: f.scriptHint,
    expectedOutcomes: splitList(f.expectedOutcomes),
    barrierSignals: splitList(f.barrierSignals),
    retryPolicy: { maxAttempts: +f.maxAttempts, waitDays: +f.waitDays, ladder: splitList(f.ladder) },
    nextTaskOnSuccess: f.nextId === 'none' ? null : { playbookId: f.nextId, label: f.nextLabel },
  })

  return (
    <div className="card pad">
      <div className="row" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 16 }}>{f.name || 'Workflow'}</h3>
        <TierPill tier={f.tier} />
        <div style={{ flex: 1 }} />
        <button className="btn primary sm" onClick={save}>Save changes</button>
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        <Field label="Workflow name"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Program"><input className="input" value={f.program} onChange={(e) => set('program', e.target.value)} /></Field>
      </div>

      <Field label="When it fires (trigger)"><input className="input" value={f.trigger} onChange={(e) => set('trigger', e.target.value)} /></Field>

      <Field label="How it runs">
        <div className="seg">
          <button className={f.tier === 'automatic' ? 'on' : ''} onClick={() => set('tier', 'automatic')}>Automatic — no human</button>
          <button className={f.tier === 'assisted' ? 'on' : ''} onClick={() => set('tier', 'assisted')}>Assisted — navigator calls</button>
        </div>
        <div className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>
          {f.tier === 'assisted'
            ? 'Open clinical conversation. A navigator makes the call; the agent preps and captures the outcome.'
            : 'Binary / logistics. The agent handles it end to end and only escalates on fallout.'}
        </div>
      </Field>

      <div className="grid g2" style={{ gap: 16 }}>
        <Field label="Goal (what success looks like)"><input className="input" value={f.goal} onChange={(e) => set('goal', e.target.value)} /></Field>
        <Field label="Success outcome"><input className="input" value={f.successOutcome} onChange={(e) => set('successOutcome', e.target.value)} /></Field>
      </div>

      <div className="divider" />
      <div className="section-title" style={{ marginTop: 0 }}>Retry &amp; escalation</div>
      <div className="grid g3" style={{ gap: 16 }}>
        <Field label="Max attempts"><input className="input" type="number" min="1" value={f.maxAttempts} onChange={(e) => set('maxAttempts', e.target.value)} /></Field>
        <Field label="Wait between (days)"><input className="input" type="number" min="0" value={f.waitDays} onChange={(e) => set('waitDays', e.target.value)} /></Field>
        <Field label="Channel ladder"><input className="input" value={f.ladder} onChange={(e) => set('ladder', e.target.value)} /></Field>
      </div>
      {f.tier === 'automatic' && (
        <Field label="Escalate to a human if the reply mentions (barrier words)">
          <input className="input" value={f.barrierSignals} onChange={(e) => set('barrierSignals', e.target.value)} placeholder="cost, afraid, can't…" />
        </Field>
      )}

      <div className="divider" />
      <div className="section-title" style={{ marginTop: 0 }}>What happens next on success</div>
      <div className="grid g2" style={{ gap: 16 }}>
        <Field label="Next workflow">
          <select className="input" value={f.nextId} onChange={(e) => set('nextId', e.target.value)}>
            <option value="none">— nothing —</option>
            {list.filter((p) => p.id !== pb.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Label"><input className="input" value={f.nextLabel} disabled={f.nextId === 'none'} onChange={(e) => set('nextLabel', e.target.value)} /></Field>
      </div>

      <div className="divider" />
      <Field label="Message / talk-track guidance">
        <textarea className="input" rows={3} value={f.scriptHint} onChange={(e) => set('scriptHint', e.target.value)} />
      </Field>
      <Field label="Expected replies (automatic tracks)">
        <input className="input" value={f.expectedOutcomes} onChange={(e) => set('expectedOutcomes', e.target.value)} />
      </Field>
    </div>
  )
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}
function hydrate(pb) {
  return {
    name: pb.name, program: pb.program, tier: pb.tier, trigger: pb.trigger, goal: pb.goal,
    successOutcome: pb.successOutcome || '', scriptHint: pb.scriptHint || '',
    expectedOutcomes: (pb.expectedOutcomes || []).join(', '),
    barrierSignals: (pb.barrierSignals || []).join(', '),
    maxAttempts: pb.retryPolicy.maxAttempts, waitDays: pb.retryPolicy.waitDays,
    ladder: pb.retryPolicy.ladder.join(', '),
    nextId: pb.nextTaskOnSuccess ? pb.nextTaskOnSuccess.playbookId : 'none',
    nextLabel: pb.nextTaskOnSuccess ? pb.nextTaskOnSuccess.label : '',
  }
}
const splitList = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean)
