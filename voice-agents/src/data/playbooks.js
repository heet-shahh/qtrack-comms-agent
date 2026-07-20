// The five POC playbooks. A playbook is the versioned "state machine definition"
// for one condition. It never runs; it describes how a Task of this type behaves.
// Swapping the channel (Slack -> voice) never touches these.

export const PLAYBOOKS = {
  lcs_eligibility: {
    id: 'lcs_eligibility',
    num: 1,
    name: 'LCS eligibility outreach',
    tier: 'automatic',
    interactionType: 'binary_logistics',
    program: 'LCS',
    trigger: 'Nightly scan: age 50-80, >=20 pack-years, not enrolled',
    goal: 'Elicit interest in a free annual lung scan',
    successOutcome: 'interested',
    expectedOutcomes: ['interested', 'not_interested', 'no_response', 'opt_out'],
    barrierSignals: ['cost', 'insurance', 'afraid', 'scared'],
    retryPolicy: { maxAttempts: 3, waitDays: 4, ladder: ['sms', 'voice', 'email'] },
    nextTaskOnSuccess: { playbookId: 'appt_reminder', label: 'Schedule shared-decision visit' },
    scriptHint:
      'Short, single-question, opt-out bearing. "You may qualify for a free annual lung scan. Reply YES to learn more."',
  },

  overdue_chase: {
    id: 'overdue_chase',
    num: 2,
    name: 'No-show / overdue chase',
    tier: 'automatic',
    interactionType: 'binary_logistics',
    program: 'LCS + IPN',
    trigger: 'Appointment no-show, or overdue by N days vs. Fleischner interval',
    goal: 'Capture a concrete (re)schedule date',
    successOutcome: 'reschedule_requested',
    expectedOutcomes: ['confirmed', 'reschedule_requested', 'declined', 'no_answer', 'voicemail', 'unclear'],
    barrierSignals: ['afford', 'cost', 'money', 'afraid', 'scared', 'cant', "can't"],
    retryPolicy: { maxAttempts: 3, waitDays: 3, ladder: ['sms', 'voice', 'email'] },
    nextTaskOnSuccess: { playbookId: 'prescan_reminder', label: 'Pre-scan reminder at T-48h' },
    scriptHint:
      'Acknowledge the missed / overdue visit, ask for a workable date, give an opt-out. Never explain the finding.',
  },

  prescan_reminder: {
    id: 'prescan_reminder',
    num: 3,
    name: 'Pre-scan instructions / reminder',
    tier: 'automatic',
    interactionType: 'binary_logistics',
    program: 'LCS + IPN',
    trigger: 'Time-based: T-48h and T-24h before a scheduled scan',
    goal: 'Confirm attendance and acknowledge any prep',
    successOutcome: 'confirmed',
    expectedOutcomes: ['confirmed', 'reschedule_requested', 'no_answer', 'opt_out'],
    barrierSignals: ['afraid', 'scared'],
    retryPolicy: { maxAttempts: 2, waitDays: 1, ladder: ['sms', 'voice'] },
    nextTaskOnSuccess: null,
    scriptHint:
      'Confirm date/time, include prep (fasting/contrast) only if the modality requires it.',
  },

  appt_reminder: {
    id: 'appt_reminder',
    num: 4,
    name: 'General appointment reminder',
    tier: 'automatic',
    interactionType: 'binary_logistics',
    program: 'LCS + IPN',
    trigger: 'Time-based, any visit type (SDM, scan, follow-up, PET/biopsy logistics)',
    goal: 'Confirm attendance for any visit type',
    successOutcome: 'confirmed',
    expectedOutcomes: ['confirmed', 'reschedule_requested', 'no_answer', 'opt_out'],
    barrierSignals: ['afford', 'cost'],
    retryPolicy: { maxAttempts: 2, waitDays: 1, ladder: ['sms', 'voice'] },
    nextTaskOnSuccess: null,
    scriptHint: 'Same mechanics as pre-scan, content branches on appointment type.',
  },

  new_finding: {
    id: 'new_finding',
    num: 5,
    name: 'New finding — navigator talk track',
    tier: 'assisted',
    interactionType: 'open_clinical',
    program: 'LCS + IPN',
    trigger: 'Lung-RADS 3/4A or IPN surveillance result filed, AND ownership resolved',
    goal: 'Prep a navigator, then capture a structured call outcome',
    successOutcome: 'capture_complete',
    expectedOutcomes: ['capture_complete', 'distress_escalation'],
    barrierSignals: [],
    retryPolicy: { maxAttempts: 1, waitDays: 0, ladder: ['navigator_call'] },
    nextTaskOnSuccess: { playbookId: 'appt_reminder', label: 'Surveillance follow-up scheduling' },
    scriptHint:
      'Agent does NOT talk to the patient. It builds a pre-call brief; the navigator makes the call and fills the capture gate.',
  },
}

export const PLAYBOOK_LIST = Object.values(PLAYBOOKS).sort((a, b) => a.num - b.num)

// Track B completion gate fields (Workflow 5)
export const CAPTURE_FIELDS = [
  { key: 'patient_understood', label: 'Patient understood', type: 'enum', options: ['yes', 'no', 'unsure'] },
  { key: 'scheduled', label: 'Follow-up scheduled', type: 'enum', options: ['yes', 'no'] },
  { key: 'scheduled_date', label: 'Scheduled date', type: 'date', dependsOn: { scheduled: 'yes' } },
  { key: 'questions_raised', label: 'Questions raised', type: 'text' },
  { key: 'distress_flag', label: 'Distress flag', type: 'bool' },
  { key: 'action_items', label: 'Action items', type: 'text' },
]
