// Mock "LLM brain" — the interpret step. In the real system this is a Claude call
// that scores a reply against the task's goal, extracts a structured outcome, and
// flags barriers/fallout in one pass. Here it is a transparent rule-based stub with
// the SAME output contract, so the backend can drop in later without UI changes.

const DAY_WORDS = /\b(mon|tue|tues|wed|thu|thur|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|morning|afternoon)\b/i
const DATE_LIKE = /\b(\d{1,2}(st|nd|rd|th)?)\b|\b(\d{1,2}\/\d{1,2})\b/
const QUESTION = /\?|\b(why|what|how|is it|does it|dangerous|serious|mean|scared|worried|cancer)\b/i

export function interpret(text, playbook) {
  const t = (text || '').toLowerCase().trim()
  const barriers = playbook.barrierSignals || []
  const hasBarrier = barriers.some((b) => t.includes(b))
  const hasQuestion = QUESTION.test(t)

  // opt out always wins
  if (/\b(stop|opt out|unsubscribe|remove me)\b/.test(t)) {
    return { matched: true, outcome: { response_type: 'opt_out' }, fallout: false, barrier: false,
      rationale: 'Opt-out keyword detected.' }
  }

  // detect a matched primary intent
  let outcome = null
  if (/\b(yes|yep|sure|ok|okay|interested|sounds good)\b/.test(t)) {
    outcome = playbook.id === 'lcs_eligibility' ? { response_type: 'interested' } : { response_type: 'confirmed' }
  }
  if (/\b(no|not interested|nope|don'?t want)\b/.test(t) && !DAY_WORDS.test(t)) {
    outcome = playbook.id === 'lcs_eligibility' ? { response_type: 'not_interested' } : { response_type: 'declined' }
  }
  if (/\b(resched|reschedule|move|change|book|another day|different)\b/.test(t) || DAY_WORDS.test(t) || DATE_LIKE.test(t)) {
    const dateGuess = matchDate(text)
    outcome = { response_type: 'reschedule_requested', date: dateGuess }
  }
  if (/\b(confirm|confirmed|i'?ll be there|see you|coming)\b/.test(t)) {
    outcome = { response_type: 'confirmed' }
  }

  // A reply that trips a barrier signal escalates immediately, even if it matched.
  if (hasBarrier) {
    return { matched: !!outcome, outcome: outcome || { response_type: 'unclear' }, fallout: true, barrier: true,
      rationale: 'Barrier signal detected (financial / fear) — escalate to a human regardless of the matched intent.' }
  }

  // A matched intent carrying an extra unscripted question is fallout.
  if (outcome && hasQuestion) {
    return { matched: true, outcome, fallout: true, barrier: false,
      rationale: 'Primary intent matched, but the reply carries an unscripted clinical question — hand off to a navigator.' }
  }

  // A clean match, no question, no barrier.
  if (outcome && !hasQuestion) {
    return { matched: true, outcome, fallout: false, barrier: false,
      rationale: `Reply maps cleanly to "${outcome.response_type}" within the expected set.` }
  }

  // No match at all: if it's a question, that's fallout; otherwise unclear (retry).
  if (hasQuestion) {
    return { matched: false, outcome: { response_type: 'unclear' }, fallout: true, barrier: false,
      rationale: 'Reply matches no expected outcome and reads as an open question — escalate rather than guess.' }
  }
  return { matched: false, outcome: { response_type: 'unclear' }, fallout: false, barrier: false,
    rationale: 'Reply matches no expected outcome — log as unclear and retry on cadence.' }
}

function matchDate(text) {
  const m = text.match(DAY_WORDS) || text.match(DATE_LIKE)
  return m ? m[0] : 'unspecified'
}

// Preset replies offered in the conversation simulator, so a demo is deterministic.
export const REPLY_PRESETS = [
  { label: 'Gives a date', text: 'Sure, how about next Monday afternoon?', kind: 'match' },
  { label: 'Confirms (button)', text: 'C', kind: 'match' },
  { label: 'Asks a clinical question', text: 'Wait, why do I even need this scan? What does it mean?', kind: 'fallout' },
  { label: 'Declines with a barrier', text: "No, I can't afford this right now", kind: 'barrier' },
  { label: 'Opts out', text: 'STOP', kind: 'optout' },
  { label: 'Unclear reply', text: 'hmm ok maybe', kind: 'unclear' },
]
