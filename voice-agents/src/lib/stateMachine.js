// State-machine helpers: the ordered states, display metadata, and the mock
// "compose a turn" brain. advance() logic itself lives in the store where it can
// mutate state and append event-log rows.

export const STATES = ['created', 'queued', 'in_progress', 'completed', 'escalated']

export const STATE_META = {
  created: { label: 'Created', tone: 'neutral', desc: 'Trigger minted the task. Nothing sent yet.' },
  queued: { label: 'Queued', tone: 'info', desc: 'Ready for the executor / navigator to pick up.' },
  in_progress: { label: 'In progress', tone: 'active', desc: 'A turn is out; awaiting a reply.' },
  completed: { label: 'Completed', tone: 'ok', desc: 'Goal met. next_task fired.' },
  escalated: { label: 'Escalated', tone: 'warn', desc: 'Handed to a navigator with full history.' },
  failed: { label: 'Failed', tone: 'bad', desc: 'Unrecoverable.' },
  closed: { label: 'Closed', tone: 'neutral', desc: 'Archived.' },
}

export const OUTCOME_LABELS = {
  interested: 'Interested',
  not_interested: 'Not interested',
  confirmed: 'Confirmed',
  reschedule_requested: 'Reschedule requested',
  declined: 'Declined',
  no_answer: 'No answer',
  voicemail: 'Voicemail',
  unclear: 'Unclear',
  opt_out: 'Opted out',
  capture_complete: 'Capture complete',
}

// Mock content generator. Real system = Claude call with the playbook script + patient context.
export function composeMessage(playbook, patient, attempt) {
  const first = patient.name.split(' ')[0]
  switch (playbook.id) {
    case 'lcs_eligibility':
      return `Hi ${first}, this is City Health Lung Program. Based on your health record you may qualify for a free annual lung scan. Reply YES to learn more, or STOP to opt out.`
    case 'overdue_chase':
      return attempt <= 1
        ? `Hi ${first}, this is City Health Lung Program. Your follow-up scan is overdue. What day would work to reschedule? Reply STOP to opt out.`
        : `Hi ${first}, following up again about your lung scan. It's important for your health — reply with a day that works, or call us. Reply STOP to opt out.`
    case 'prescan_reminder':
      return `Hi ${first}, reminder: your lung scan is coming up soon. Reply C to confirm or R to reschedule.`
    case 'appt_reminder':
      return `Hi ${first}, reminder about your upcoming appointment with City Health. Reply C to confirm or R to reschedule.`
    default:
      return `Hi ${first}, reaching out from City Health.`
  }
}

export const FALLOUT_SCRIPT = (patient, navName) =>
  `That's a really important question, and I want you to get the right answer. I'm going to have ${navName || 'your care coordinator'}, your care coordinator, call you back today to talk it through. Thank you.`
