// Turns the engine's internal vocabulary into plain language for clinical users.
// Navigators never see "playbook", "automation_tier", "escalated", etc.

export const friendlyProgram = (p) =>
  p === 'LCS' ? 'Lung screening' : p === 'IPN' ? 'Nodule follow-up' : p

const first = (name) => name.split(' ')[0]

export function lastPatientQuestion(task) {
  const m = [...task.messages].reverse().find((x) => x.direction === 'inbound')
  return m ? m.body : null
}

// One card's worth of plain-language framing for a task that needs the navigator.
export function cardFor(task, patient, pb) {
  const f = first(patient.name)
  if (task.state === 'escalated') {
    return {
      urgency: 'high',
      kind: 'callback',
      title: `Call ${f} back`,
      why: 'They had a question during an automated message that needs a person.',
      cta: 'Open call',
    }
  }
  if (pb.id === 'new_finding') {
    return {
      urgency: 'med',
      kind: 'result',
      title: `Talk to ${f} about a new scan result`,
      why: `${friendlyProgram(patient.program)} · ${patient.finding || 'new finding'}`,
      cta: task.state === 'in_progress' ? 'Log the call' : 'Start call',
    }
  }
  return {
    urgency: 'low',
    kind: 'other',
    title: `Follow up with ${f}`,
    why: pb.goal,
    cta: 'Open',
  }
}

export function talkingPoints(task, patient, pb) {
  if (task.state === 'escalated') {
    const q = lastPatientQuestion(task)
    return [
      'Answer their question directly and simply.',
      q ? `They asked: "${q}"` : 'Listen for what is really worrying them.',
      'Reassure them, and confirm the appointment or interest they already gave.',
      'Book the next step before you hang up.',
    ]
  }
  if (pb.id === 'new_finding') {
    const pts = [
      'Reassure: most nodules this size usually turn out to be nothing serious.',
      `Explain the plan in plain words: ${patient.fleischner || 'the recommended follow-up'}.`,
      'Make sure the next scan is booked before the call ends.',
    ]
    if (patient.anxietyFlag) pts.unshift('Go gently — there is a note about anxiety on this patient.')
    return pts
  }
  return [pb.goal]
}

// Plain status line for the "what the assistant did" feed.
export function activityLine(task, patient, pb) {
  const f = first(patient.name)
  const s = task.state
  const map = {
    lcs_eligibility: {
      completed: `Invited ${f} to lung screening — they responded.`,
      in_progress: `Reaching out to ${f} about lung screening — waiting to hear back.`,
      queued: `Queued a screening invite for ${f}.`,
    },
    overdue_chase: {
      completed: `Rebooked ${f}'s overdue scan.`,
      in_progress: `Chasing ${f}'s overdue scan — waiting to hear back.`,
      queued: `Queued a reminder for ${f}'s overdue scan.`,
    },
    prescan_reminder: {
      completed: `Reminded ${f} about their scan — confirmed.`,
      in_progress: `Sent ${f} a pre-scan reminder — waiting to hear back.`,
      queued: `Queued a pre-scan reminder for ${f}.`,
    },
    appt_reminder: {
      completed: `Reminded ${f} about their appointment — confirmed.`,
      in_progress: `Sent ${f} an appointment reminder.`,
      queued: `Queued an appointment reminder for ${f}.`,
    },
  }
  const line = map[pb.id]?.[s]
  if (line) return line
  if (s === 'escalated') return `Flagged ${f} for you — they needed a person.`
  if (s === 'completed') return `Handled a task for ${f}.`
  return `Working on a task for ${f}.`
}
