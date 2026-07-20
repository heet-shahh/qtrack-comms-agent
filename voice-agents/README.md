# qTrack · Patient Communication Agent — POC

An interactive mock UI for the goal-directed, state-machine communication engine.
Frontend-only with a Zustand store standing in for the backend. Every action is live:
firing triggers, composing outreach, interpreting replies, escalating fallout, and
running the Track B talk-track completion gate all mutate real in-memory state and
write to the event log.

## Run

```bash
npm install
npm run dev
```

Opens at http://localhost:5180

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

Replace the store's mutators with API calls. The three seams:
- `src/lib/interpret.js` → a Claude call (same input/output contract).
- `src/lib/stateMachine.js#composeMessage` → a Claude call.
- Slack/voice send + inbound reply → a real channel adapter.

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
