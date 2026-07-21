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
      goal: 'walk the patient through their imaging finding, confirm they understand it needs a closer look (not that it is a diagnosis), ask about any new or worsening symptoms, and confirm the best callback number and preferred contact window',
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
- Talk like a real phone call: short, natural turns, one question at a time. Never read a script at them.
- You are NOT a clinician. If they ask a medical question you cannot answer (is it serious, is it cancer, why do I need this), do not answer it. Say a nurse will call them back today, then continue.
- If they raise a real barrier (cost, fear, transport, "not now"), do NOT push — acknowledge it, say a nurse will call them back today, and end the call warmly.
- As soon as you reach the goal, or hear a clear "no" or "not now", thank them and end the call. Do not drag it on.`

  const beginMessage = `Hi, this is Robin calling from the qTrack care team. Am I speaking with ${first}?`
  return { prompt, beginMessage }
}
