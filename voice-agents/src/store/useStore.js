import { create } from 'zustand'
import { PLAYBOOKS } from '../data/playbooks'
import { PATIENTS, NAVIGATORS, SEED_TASKS } from '../data/mockData'
import { interpret } from '../lib/interpret'
import { composeMessage, FALLOUT_SCRIPT } from '../lib/stateMachine'

const now = () => new Date()
const hoursAgoISO = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

let taskSeq = 2000
const newTaskId = () => `T-${++taskSeq}`
let eventSeq = 0
const newEventId = () => `E-${++eventSeq}`

// Build a full Task from a playbook + patient, copying the playbook's goal spec onto it.
function makeTask(base) {
  const pb = PLAYBOOKS[base.playbookId]
  const patient = PATIENTS[base.patientId]
  return {
    id: base.id || newTaskId(),
    patientId: base.patientId,
    playbookId: base.playbookId,
    program: patient.program,
    sourceEvent: base.sourceEvent || pb.trigger,
    automationTier: pb.tier,
    interactionType: pb.interactionType,
    riskTier: pb.id === 'new_finding' ? 'indeterminate' : null,
    state: base.state || 'created',
    attemptCount: base.attemptCount || 0,
    channel: base.channel || patient.channel,
    goal: pb.goal,
    expectedOutcomes: pb.expectedOutcomes,
    findingContext: pb.id === 'new_finding' ? patient.finding : null,
    ownershipStatus: base.ownershipStatus || null,
    assignedNavigator: base.assignedNavigator || null,
    messages: (base.messages || []).map((m) => ({ ...m, ts: hoursAgoISO(m.hoursAgo ?? 0) })),
    outcomeSummary: base.outcomeSummary || null,
    capture: base.capture || {},
    escalationReason: base.escalationReason || null,
    createdAt: hoursAgoISO(base.hoursAgo ?? 0),
    stageEnteredAt: hoursAgoISO(base.hoursAgo ?? 0),
    nextTaskSpawned: base.nextTaskSpawned || null,
  }
}

function seedEvents(tasks) {
  const ev = []
  Object.values(tasks).forEach((t) => {
    ev.push({ id: newEventId(), taskId: t.id, patientId: t.patientId, from: '∅', to: t.state,
      changedBy: 'system', note: t.sourceEvent, ts: t.createdAt })
  })
  return ev.sort((a, b) => new Date(a.ts) - new Date(b.ts))
}

const initialTasks = {}
SEED_TASKS.forEach((t) => { initialTasks[t.id] = makeTask(t) })

export const useStore = create((set, get) => ({
  patients: PATIENTS,
  navigators: NAVIGATORS,
  tasks: initialTasks,
  events: seedEvents(initialTasks),

  view: 'dashboard',
  selectedTaskId: null,
  selectedPatientId: null,
  toast: null,

  setView: (view) => set({ view }),
  openTask: (id) => set({ view: 'task', selectedTaskId: id }),
  openPatient: (id) => set({ view: 'patient', selectedPatientId: id }),
  flash: (msg) => {
    set({ toast: { msg, ts: Date.now() } })
    setTimeout(() => {
      if (get().toast && Date.now() - get().toast.ts >= 2400) set({ toast: null })
    }, 2600)
  },

  // ---- core primitives ----
  _log: (taskId, patientId, from, to, changedBy, note) =>
    set((s) => ({ events: [...s.events, { id: newEventId(), taskId, patientId, from, to, changedBy, note, ts: now().toISOString() }] })),

  _patch: (taskId, patch) =>
    set((s) => ({ tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], ...patch } } })),

  _transition: (taskId, to, changedBy, note) => {
    const t = get().tasks[taskId]
    if (!t) return
    get()._patch(taskId, { state: to, stageEnteredAt: now().toISOString() })
    get()._log(taskId, t.patientId, t.state, to, changedBy, note)
  },

  _addMessage: (taskId, msg) =>
    set((s) => {
      const t = s.tasks[taskId]
      return { tasks: { ...s.tasks, [taskId]: { ...t, messages: [...t.messages, { ...msg, ts: now().toISOString() }] } } }
    }),

  // ---- triggers ----
  fireTrigger: (playbookId, patientId) => {
    const pb = PLAYBOOKS[playbookId]
    const isAssisted = pb.tier === 'assisted'
    const patient = PATIENTS[patientId]
    const task = makeTask({
      playbookId, patientId, hoursAgo: 0,
      state: 'created',
      ownershipStatus: isAssisted ? 'proposed' : null,
      assignedNavigator: isAssisted ? null : null,
    })
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }))
    get()._log(task.id, patientId, '∅', 'created', 'system', pb.trigger)
    // Automatic tasks auto-advance to queued; assisted wait for ownership.
    if (!isAssisted) {
      get()._transition(task.id, 'queued', 'system', 'Auto-queued (binary/logistics → automatic)')
    }
    get().flash(`Trigger fired · ${pb.name} · ${patient.name}`)
    return task.id
  },

  runNightlyScan: () => {
    // Simulate the derived background scan finding two overdue conditions.
    const created = []
    created.push(get().fireTrigger('overdue_chase', 'p_williams'))
    created.push(get().fireTrigger('lcs_eligibility', 'p_nguyen'))
    get().flash(`Nightly scan complete · ${created.length} new tasks minted`)
  },

  // ---- automatic track (playbooks 1-4) ----
  sendOutreach: (taskId) => {
    const t = get().tasks[taskId]
    const pb = PLAYBOOKS[t.playbookId]
    const patient = PATIENTS[t.patientId]
    const attempt = (t.attemptCount || 0) + 1
    const body = composeMessage(pb, patient, attempt)
    get()._addMessage(taskId, { direction: 'outbound', channel: patient.channel, body })
    get()._patch(taskId, { attemptCount: attempt, channel: patient.channel })
    if (t.state !== 'in_progress') get()._transition(taskId, 'in_progress', 'system', `Composed + sent attempt ${attempt} via ${patient.channel}`)
    else get()._log(taskId, t.patientId, 'in_progress', 'in_progress', 'system', `Retry attempt ${attempt}`)
    get().flash('Message composed by brain + sent')
  },

  retry: (taskId) => {
    const t = get().tasks[taskId]
    const pb = PLAYBOOKS[t.playbookId]
    const patient = PATIENTS[t.patientId]
    const attempt = (t.attemptCount || 0) + 1
    if (attempt > pb.retryPolicy.maxAttempts) {
      get().escalate(taskId, `Attempt budget exhausted (${pb.retryPolicy.maxAttempts} attempts, no matched reply).`)
      return
    }
    const nextChannel = pb.retryPolicy.ladder[Math.min(attempt - 1, pb.retryPolicy.ladder.length - 1)]
    const body = composeMessage(pb, patient, attempt)
    get()._addMessage(taskId, { direction: 'outbound', channel: nextChannel, body })
    get()._patch(taskId, { attemptCount: attempt, channel: nextChannel })
    get()._log(taskId, t.patientId, 'in_progress', 'in_progress', 'system', `Retry attempt ${attempt} via ${nextChannel} (channel-escalation ladder)`)
    get().flash(`Retry ${attempt} sent via ${nextChannel}`)
  },

  receiveReply: (taskId, text) => {
    const t = get().tasks[taskId]
    const pb = PLAYBOOKS[t.playbookId]
    const patient = PATIENTS[t.patientId]
    const result = interpret(text, pb)
    get()._addMessage(taskId, { direction: 'inbound', channel: t.channel, body: text, interpreted: result })
    get()._log(taskId, t.patientId, 'in_progress', 'in_progress', 'brain', `Interpreted: ${result.outcome.response_type} · ${result.rationale}`)

    if (result.outcome.response_type === 'opt_out') {
      get()._patch(taskId, { outcomeSummary: { response_type: 'opt_out', note: 'Patient opted out.' } })
      get()._transition(taskId, 'completed', 'system', 'Patient opted out — task closed.')
      get().flash('Patient opted out · task closed')
      return
    }

    if (result.fallout || result.barrier) {
      const navName = patient.navigator ? NAVIGATORS[patient.navigator].name : null
      get()._addMessage(taskId, { direction: 'outbound', channel: t.channel, body: FALLOUT_SCRIPT(patient, navName) })
      const reason = result.barrier
        ? `Barrier signal in reply — escalated. Captured question: "${text}"`
        : `Unscripted question — escalated. Captured question: "${text}"`
      get().escalate(taskId, reason)
      return
    }

    if (result.matched) {
      const summary = { response_type: result.outcome.response_type, ...result.outcome }
      get()._patch(taskId, { outcomeSummary: summary })
      get()._transition(taskId, 'completed', 'system', `Goal met: ${result.outcome.response_type}`)
      get()._maybeSpawnNext(taskId)
      get().flash(`Matched · ${result.outcome.response_type} · task completed`)
      return
    }

    // unclear, no fallout
    get().flash('Unclear reply logged · retry on cadence')
  },

  escalate: (taskId, reason) => {
    const t = get().tasks[taskId]
    const patient = PATIENTS[t.patientId]
    get()._patch(taskId, { escalationReason: reason, assignedNavigator: patient.navigator })
    get()._transition(taskId, 'escalated', 'system', reason)
    get().flash('Escalated to navigator queue (SLA: same business day)')
  },

  _maybeSpawnNext: (taskId) => {
    const t = get().tasks[taskId]
    const pb = PLAYBOOKS[t.playbookId]
    if (!pb.nextTaskOnSuccess) return
    const next = makeTask({
      playbookId: pb.nextTaskOnSuccess.playbookId, patientId: t.patientId, hoursAgo: 0,
      state: 'created', sourceEvent: `Spawned by ${t.id} on success`,
    })
    set((s) => ({ tasks: { ...s.tasks, [next.id]: next } }))
    get()._log(next.id, t.patientId, '∅', 'created', 'system', `Chained from ${t.id}: ${pb.nextTaskOnSuccess.label}`)
    get()._transition(next.id, 'queued', 'system', 'Auto-queued')
    get()._patch(taskId, { nextTaskSpawned: { id: next.id, label: pb.nextTaskOnSuccess.label } })
  },

  // ---- ownership chain (playbook 5) ----
  resolveOwnership: (taskId, decision) => {
    const t = get().tasks[taskId]
    const patient = PATIENTS[t.patientId]
    if (decision === 'accept') {
      get()._patch(taskId, { ownershipStatus: 'accepted', assignedNavigator: patient.navigator })
      get()._log(taskId, t.patientId, 'proposed', 'accepted', 'ordering-physician', 'Ordering physician accepted ownership.')
      get()._transition(taskId, 'queued', 'system', 'Ownership accepted → navigator task created')
      get().flash('Ownership accepted · talk-track task queued')
    } else {
      get()._patch(taskId, { ownershipStatus: 'fallback_assigned', assignedNavigator: patient.navigator })
      get()._log(taskId, t.patientId, 'proposed', 'declined', 'ordering-physician', 'Declined (or SLA timeout).')
      get()._log(taskId, t.patientId, 'declined', 'fallback_assigned', 'system', 'Fallback chain: PCP → pulmonology → safety-net navigator (owner of last resort).')
      get()._transition(taskId, 'queued', 'system', 'Fallback owner assigned → navigator task created')
      get().flash('Declined · fell through to safety-net navigator')
    }
  },

  startCall: (taskId) => {
    get()._transition(taskId, 'in_progress', 'navigator', 'Navigator opened pre-call brief and started the call.')
    get().flash('Call in progress · fill the capture gate to close')
  },

  saveCapture: (taskId, capture) => get()._patch(taskId, { capture }),

  confirmCapture: (taskId) => {
    const t = get().tasks[taskId]
    const c = t.capture || {}
    const missing = []
    if (!c.patient_understood) missing.push('patient understood')
    if (!c.scheduled) missing.push('scheduled')
    if (c.scheduled === 'yes' && !c.scheduled_date) missing.push('scheduled date')
    if (!c.action_items) missing.push('action items')
    if (missing.length) {
      get().flash(`Completion gate blocked · missing: ${missing.join(', ')}`)
      return false
    }
    get()._patch(taskId, { outcomeSummary: { response_type: 'capture_complete', ...c } })
    if (c.distress_flag) {
      get()._transition(taskId, 'escalated', 'navigator', 'Distress flag set → routed to review queue.')
      get().flash('Distress flag · routed to review queue')
      return true
    }
    get()._transition(taskId, 'completed', 'navigator', 'Capture gate satisfied → task completed.')
    get()._maybeSpawnNext(taskId)
    get().flash('Capture confirmed · task completed')
    return true
  },
}))
