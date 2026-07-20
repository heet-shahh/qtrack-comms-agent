# qTrack · Patient Communication Agent — POC

An interactive mock UI for the goal-directed, state-machine communication engine.
Frontend-only with a Zustand store standing in for the backend. Every action is live:
firing triggers, composing outreach, interpreting replies, escalating fallout, and
running the Track B talk-track completion gate all mutate real in-memory state and
write to the event log.

## Run

```bash
npm install
npm run dev        # frontend only (mock UI, no voice)
```

Opens at http://localhost:5180

### With the Retell voice adapter

```bash
cp server/.env.example server/.env   # then paste your Retell API key
npm run dev:all                       # runs frontend (5180) + backend (8787) together
```

Then go to **Admin → Voice Agent**, pick a playbook, and press **Start voice call** — you
talk to the agent through your mic (browser will ask for mic permission), playing the
patient. When the call ends, the same `interpret()` brain reads the transcript and maps it
to the playbook's outcome. The backend (`server/index.js`) holds the Retell key server-side
and mints web-call tokens; the key never reaches the browser and is never committed.

## Two modes (toggle top-right: "Viewing as")

Real deployments gate these by role; here a switcher flips between them.

- **Navigator (clinical, default):** the simple experience for the people who actually
  make calls. A plain-English worklist ("3 patients need a call"), each with talking
  points and one "log the call" form. No engine jargon. Tabs: My Work · Assistant
  Activity (what the automation did for their panel) · My Patients.
- **Admin (workflow management):** the configuration + ops console. The **Workflows**
  screen edits each condition's trigger, goal, retry policy, escalation words, and what
  runs next on success — and those edits flow into the live engine. Plus Trigger
  Simulator, Task Queue, Event Log, Dashboard, Patients.

## The idea

- **Playbook** = a versioned per-condition state-machine definition (5 of them).
- **Task** = a running playbook instance for one patient; it *is* the state machine.
- **advance(task, event)** = the one verb, in `src/store/useStore.js`.
- **Channel is a swappable adapter.** Slack/SMS now (stubbed), voice later. The brain
  (`src/lib/interpret.js`, `stateMachine.js`) does not change when the channel does.

## What to click (demo path)

1. **Trigger Simulator** → follow the on-screen demo script.
2. **Task Queue → T-1042** (Margaret Chen, overdue chase): hit *"Gives a date"* and watch
   the brain extract the date, complete the task, and chain a pre-scan reminder.
3. Fire a fresh overdue chase, send outreach, hit *"Asks a clinical question"*: watch the
   graceful 3-move handoff and a card appear in **Navigator Queue**.
4. **T-1044b** (Frank Russo): walk the ownership chain. **T-1044** (James Okafor): the full
   Track B talk track + structured capture completion gate.
5. **Event Log** and any **Patient** record: the durable, cross-task audit trail.

## Plugging in a backend

Replace the store's mutators with API calls. The seams:
- `src/lib/interpret.js` → a Claude call (same input/output contract). Already reused as-is
  to read voice-call transcripts, not just text replies.
- `src/lib/stateMachine.js#composeMessage` → a Claude call for text; `src/lib/voicePrompt.js`
  is the voice equivalent.
- Channel adapters: the Slack/SMS send is stubbed in the store; the **Retell voice adapter is
  real** (`server/index.js` + `src/views/VoiceAgent.jsx`). Both sit behind the same idea —
  send a turn, capture a reply, feed the outcome back to the task.

## Layout note

```
server/            Express backend — holds the Retell key, mints web-call tokens (gitignored .env)
src/lib/voicePrompt.js   playbook + patient -> Retell agent instructions
src/views/VoiceAgent.jsx live web-call UI (Retell Web SDK) + transcript + outcome mapping
```

## Structure

```
src/
  data/        playbooks.js (the 5 configs) · mockData.js (patients + seeded tasks)
  lib/         interpret.js (mock brain) · stateMachine.js (states + compose)
  store/       useStore.js (mock backend: triggers, advance, escalate, capture)
  components/  common, TaskRow, Conversation, TalkTrack
  views/       Dashboard, TaskQueue, TaskDetail, NavigatorQueue, TriggerSimulator,
               Patients, PatientDetail, Playbooks, EventLog
```
