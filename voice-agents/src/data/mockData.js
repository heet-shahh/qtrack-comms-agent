// Mock data for the POC. Everything here is stand-in for a real backend:
// patients, navigators, and a seeded set of tasks + event-log rows so the
// app opens with a believable population instead of an empty queue.

export const NAVIGATORS = {
  sarah: { id: 'sarah', name: 'Sarah Kim, RN', role: 'Lead navigator', panel: 42 },
  miguel: { id: 'miguel', name: 'Miguel Torres, RN', role: 'Navigator', panel: 38 },
}

export const PATIENTS = {
  p_chen: {
    id: 'p_chen', mrn: 'MRN-40218', name: 'Margaret Chen', age: 64, sex: 'F',
    program: 'IPN', navigator: 'sarah', channel: 'sms', phone: '+1 415 555 0142',
    smoking: 'Former, 28 pack-years, quit 6y ago',
    finding: '7mm solid RLL nodule, stable vs. prior', fleischner: 'Repeat CT in 6 months',
    anxietyFlag: false,
    note: 'Follow-up CT is 30 days overdue. No future appointment on file.',
  },
  p_alvarez: {
    id: 'p_alvarez', mrn: 'MRN-51877', name: 'Robert Alvarez', age: 58, sex: 'M',
    program: 'LCS', navigator: 'miguel', channel: 'sms', phone: '+1 415 555 0199',
    smoking: 'Current, 32 pack-years',
    finding: null, fleischner: null, anxietyFlag: false,
    note: 'Meets USPSTF criteria, never enrolled in screening.',
  },
  p_williams: {
    id: 'p_williams', mrn: 'MRN-33940', name: 'Dorothy Williams', age: 71, sex: 'F',
    program: 'LCS', navigator: 'sarah', channel: 'sms', phone: '+1 415 555 0177',
    smoking: 'Former, 45 pack-years, quit 3y ago',
    finding: null, fleischner: null, anxietyFlag: true,
    note: 'No-showed LDCT 5 days ago. Prior anxiety flag on file.',
  },
  p_okafor: {
    id: 'p_okafor', mrn: 'MRN-60112', name: 'James Okafor', age: 67, sex: 'M',
    program: 'LCS', navigator: 'sarah', channel: 'sms', phone: '+1 415 555 0155',
    smoking: 'Current, 40 pack-years',
    finding: 'Lung-RADS 3 · 6mm part-solid nodule, new vs. prior', fleischner: '6-month LDCT follow-up',
    anxietyFlag: false,
    note: 'New Lung-RADS 3 result filed. Needs guideline-concordant explanation call.',
  },
  p_nguyen: {
    id: 'p_nguyen', mrn: 'MRN-72455', name: 'Patricia Nguyen', age: 55, sex: 'F',
    program: 'LCS', navigator: 'miguel', channel: 'sms', phone: '+1 415 555 0133',
    smoking: 'Former, 22 pack-years, quit 10y ago',
    finding: null, fleischner: null, anxietyFlag: false,
    note: 'LDCT scheduled in 2 days.',
  },
  p_russo: {
    id: 'p_russo', mrn: 'MRN-80231', name: 'Frank Russo', age: 69, sex: 'M',
    program: 'IPN', navigator: 'miguel', channel: 'sms', phone: '+1 415 555 0121',
    smoking: 'Former, 30 pack-years, quit 12y ago',
    finding: 'Incidental 9mm solid nodule (found on cardiac CT angiogram)',
    fleischner: 'CT in 3 months per Fleischner', anxietyFlag: false,
    note: 'Incidental finding. Ordering cardiologist has NOT confirmed ownership.',
  },
}

export const PATIENT_LIST = Object.values(PATIENTS)

// --- seeded tasks ---
// Timestamps are relative offsets (hours ago) resolved at load into ISO strings.
export const SEED_TASKS = [
  {
    id: 'T-1042', patientId: 'p_chen', playbookId: 'overdue_chase', state: 'in_progress',
    attemptCount: 1, channel: 'sms', hoursAgo: 6,
    sourceEvent: 'Scan: IPN follow-up CT overdue 30d',
    messages: [
      { direction: 'outbound', channel: 'sms', hoursAgo: 6,
        body: "Hi Margaret, this is City Health Lung Program. Our records show your follow-up CT scan is overdue. Could you let us know a day that works to reschedule? Reply STOP to opt out." },
    ],
  },
  {
    id: 'T-1043', patientId: 'p_alvarez', playbookId: 'lcs_eligibility', state: 'queued',
    attemptCount: 0, channel: 'sms', hoursAgo: 2,
    sourceEvent: 'Nightly scan: USPSTF-eligible, not enrolled',
    messages: [],
  },
  {
    id: 'T-1039', patientId: 'p_williams', playbookId: 'overdue_chase', state: 'in_progress',
    attemptCount: 2, channel: 'voice', hoursAgo: 20,
    sourceEvent: 'No-show: LDCT missed 5d ago',
    messages: [
      { direction: 'outbound', channel: 'sms', hoursAgo: 72,
        body: "Hi Dorothy, we missed you at your lung scan appointment. It's important for your health. Reply to reschedule or call us." },
      { direction: 'outbound', channel: 'voice', hoursAgo: 20,
        body: "[Automated voice attempt 2] We'd like to help you rebook your lung scan. Please say a day that works, or press 1 to speak with a coordinator." },
    ],
  },
  {
    id: 'T-1044', patientId: 'p_okafor', playbookId: 'new_finding', state: 'queued',
    attemptCount: 0, channel: 'navigator_call', hoursAgo: 3,
    sourceEvent: 'Lung-RADS 3 result filed',
    ownershipStatus: 'accepted', assignedNavigator: 'sarah',
    messages: [],
  },
  {
    id: 'T-1031', patientId: 'p_nguyen', playbookId: 'prescan_reminder', state: 'completed',
    attemptCount: 1, channel: 'sms', hoursAgo: 30,
    sourceEvent: 'T-48h before scheduled LDCT',
    outcomeSummary: { response_type: 'confirmed', note: 'Confirmed attendance, no prep needed for LDCT.' },
    messages: [
      { direction: 'outbound', channel: 'sms', hoursAgo: 30,
        body: "Hi Patricia, reminder: your lung scan is in 2 days. No fasting needed. Reply C to confirm or R to reschedule." },
      { direction: 'inbound', channel: 'sms', hoursAgo: 29,
        body: "C", interpreted: { matched: true, outcome: { response_type: 'confirmed' } } },
    ],
  },
  {
    id: 'T-1044b', patientId: 'p_russo', playbookId: 'new_finding', state: 'created',
    attemptCount: 0, channel: 'navigator_call', hoursAgo: 5,
    sourceEvent: 'Incidental nodule on cardiac CT angiogram',
    ownershipStatus: 'proposed', assignedNavigator: null,
    messages: [],
  },
  {
    id: 'T-1028', patientId: 'p_williams', playbookId: 'lcs_eligibility', state: 'escalated',
    attemptCount: 1, channel: 'sms', hoursAgo: 40,
    sourceEvent: 'Nightly scan: USPSTF-eligible',
    assignedNavigator: 'sarah',
    escalationReason: 'Fallout: patient confirmed interest but asked an unscripted clinical question ("is it dangerous?").',
    messages: [
      { direction: 'outbound', channel: 'sms', hoursAgo: 41,
        body: "Hi Dorothy, you may qualify for a free annual lung scan. Reply YES to learn more, or STOP to opt out." },
      { direction: 'inbound', channel: 'sms', hoursAgo: 40,
        body: "Yes but is this dangerous? My sister had lung cancer and I'm scared",
        interpreted: { matched: true, outcome: { response_type: 'interested' }, fallout: true, barrier: true } },
      { direction: 'outbound', channel: 'sms', hoursAgo: 40,
        body: "That's a really important question, and I want you to get the right answer. I'm going to have Sarah Kim, your care coordinator, call you back today to talk it through. Thank you." },
    ],
  },
]
