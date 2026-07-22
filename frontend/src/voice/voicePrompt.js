// Turns a qTrack patient + task into the Retell agent's instructions. Voice-only
// port of the POC: no playbooks/interpret brain — the goal is derived straight
// from the task the navigator is working.

const PROGRAM = {
  LCS: 'lung cancer screening',
  IPN: 'incidental pulmonary nodule follow-up',
}

// Per-task goal + how the agent should open. Falls back to a generic outreach
// goal for any task type not listed here.
function goalFor(task) {
  const t = (task?.t || '').toLowerCase()
  if (t.includes('clarifying')) {
    return {
      goal: 'walk the patient through their imaging finding and confirm they understand it needs a closer look (not that it is a diagnosis); explain the next step — a physician appointment plus an immediate 3-month follow-up CT scan, and confirm they understand both are being scheduled (not optional); ask about any new or worsening symptoms since the last visit; and offer to help find a physician appointment time and CT slot within the next 3 months',
      begin: true,
    }
  }
  if (t.includes('appointment')) {
    return {
      goal: 'confirm the patient can make their upcoming appointment and verify the best callback number',
      begin: true,
    }
  }
  if (t.includes('enroll')) {
    return {
      goal: 'confirm the patient wants to enroll and gather any consent/eligibility detail still outstanding',
      begin: true,
    }
  }
  return { goal: `complete this outreach task: ${task?.t || 'patient outreach'}`, begin: true }
}

export function buildVoicePrompt(patient, task) {
  const first = (patient?.n || 'the patient').split(' ')[0]
  const program = PROGRAM[patient?.prog] || 'care'
  const { goal } = goalFor(task)
  const finding = patient?.find ? ` The finding on file: ${patient.find}.` : ''

  const prompt = `You are Robin, a warm and concise care coordinator calling on behalf of the qTrack ${program} program.
You are speaking with ${first}.${finding}

YOUR SINGLE GOAL for this call: ${goal}.

How to behave:
- Be brief. Keep every turn to ONE or TWO short sentences, then stop and let them talk. Never monologue.
- Ask ONE thing at a time and work through the goal across several short turns — do not deliver all your points at once.
- Talk like a real phone call: warm, plain, natural. No scripts, no filler, no repeating yourself.
- You are NOT a clinician. If they ask a medical question you cannot answer (is it serious, is it cancer, why do I need this), do not answer it — say a nurse will call them back today, then move on.
- If they raise a real barrier (cost, fear, transport, "not now"), do NOT push — acknowledge it, say a nurse will call them back today, and end the call warmly.
- As soon as you reach the goal, or hear a clear "no" or "not now", thank them and end the call. Do not drag it on.`

  const beginMessage = `Hi, this is Robin calling from the qTrack care team. Am I speaking with ${first}?`
  return { prompt, beginMessage }
}
