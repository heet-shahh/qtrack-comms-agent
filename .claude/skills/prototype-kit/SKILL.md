---
name: prototype-kit
description: The canonical qTrack screen layout. Use whenever anyone at Qure wants to prototype, mock up, or explore a qTrack workflow, screen, or feature. Covers the Worklist screen, the Patient page (Synopsis / Records / Task-editor states), the mini worklist, and navigation between them, with optional Qure SDS colors and light/dark theming. Applies even if "qTrack" isn't named but it's clearly a Qure clinical workflow. Before generating, it asks scope + style (and, for new features, how the feature is used), then builds the clickable mock in the project's running app with working interactions.
---

# qTrack Layout

*Version 7 (reflect edition)*

Produces a **clickable mock of a qTrack workflow** with working interactions, built inside the project's running app. Content stays low-fidelity (placeholders); structure follows qTrack; visuals are either greyscale wireframe or on-brand Qure SDS. Reference build: **`references/prototype-kit-reference.html`** — match its structure and interactions; only colors differ by mode.

## ① ALWAYS ASK THESE THREE QUESTIONS FIRST — do not build yet

Before generating anything, your **first reply must contain ONLY these three questions, worded exactly as below, then stop and wait.** Ask them **every time**, even if the prompt seems detailed. Do not invent or substitute questions, do not assume answers, do not build/describe/sketch in this first reply.

1. **What part of the workflow do you want to create?**
   A. Only Patient Page   B. Only Worklist   C. Entire workflow (Worklist → Patient Page → Action/Task)   D. Other (specify)
2. **How should it look?**
   A. Wireframe (greyscale)   B. Qure design system colors
3. **(Only if this is a new feature)** How will the user use this feature — what are they trying to do with it?

After answers: build per the rules below.
- **Scope hides the other screens but NEVER removes interactions.** Only Patient Page still wires Records open/close + the task editor; Entire workflow wires worklist → patient → task end to end.
- **Style:** build in color **only** if they chose B; otherwise greyscale.
- **New feature:** place it by the module purposes (data to read → Records/Synopsis; an action to take → a task type in the Action Center; an AI nudge → Aira; a triage signal → a Worklist column/tile).

## ② Output format (hard)
- **You are in reflect — build in the project's running app** (`/app/frontend/src/main.js` + `style.css`; the preview hot-reloads). Port the structure, markup, and interactions of **`references/prototype-kit-reference.html`** (in this skill's folder) into the app — do not invent a new layout from scratch, and do not drop stray standalone `.html` files into the workspace.
- The result is a **clickable mock** in vanilla HTML/CSS/JS (IBM Plex Sans) — every interaction for the chosen scope is wired and functional in the live preview.
- **No emoji and no decorative icons anywhere.** The record rail uses the text labels `Im / Lb / Rx / Dc`; section headers are text only.
- **Status color appears only in pills and status dots** (`*-tint` background + `*-text` text). Never color body text (findings, next-action labels) and never fill whole rows with status color — rows stay neutral.
- Content uses placeholders; render **person names as `John Doe 1 / Jane Doe 2 / John Doe 3 …`** (numbered Doe names), never invented realistic names or `[Patient Name]`.

## Rendering model — hard rules
1. **Worklist and Patient page are two SEPARATE FULL SCREENS** (route swap). The "Worklist" / `⤢` breadcrumb returns to the full Worklist screen. ❌ Never render the Worklist as a modal/drawer/overlay over the patient page.
2. **The cohort / saved-filter chip** (e.g. "Eligibility pending ▾") and the `»` rail open the **mini worklist** — an **inline left column** within the patient page (cohort grouped by stage; `«` collapses). This is distinct from the full Worklist screen and is **not** a float/overlay.
3. **Clicking a task's primary action** (Edit / Open) opens the **Task editor**: a full surface filling the work area, with its own `Tasks › … › Edit` breadcrumb and `✕`. ❌ Not a popover.

## Header & identifier (match the reference exactly)
- **Top bar** (persistent on every screen): left = `qTrack · Worklist`; right = [light/dark toggle — colors mode only] + search. Do **not** merge `qTrack` into the breadcrumb.
- **Patient-page sub-header is ONE row:** `⤢` · `Worklist` · `›` · cohort chip `[Cohort] [count] ▾` · `›` · (avatar) Name · age/sex · MRN · ……… (right) `n of N in cohort` `‹ ›`. The patient name lives in this row — **not** in a separate large identifier band.

## Modules (one purpose each)
| Module | What it is |
|---|---|
| **Identifier** | The sub-header above. Minimal. |
| **Synopsis** | Left column: program, clinical status, stage-in-cohort, care team, **Notes**. Reference only. Heading "Synopsis" is a **prominent ~20px medium heading** with an edit button + underline — not a small caps label. |
| **Action Center** | **Tasks list + Action workspace + Comments** as **ONE component** (see below). |
| **Records** | Detailed history/source data (Im/Lb/Rx/Dc) via the rail. Verification. |
| **Aira** | The AI **layer** (not a column): "Why this task?", suggestions, pre-drafted artifacts. |

Notes (in Synopsis) = patient-level, `STAGE`/`CONTEXT`. Comments (in Action Center) = task-level, `@mention`. Aira never gets its own column.

## Aira: the layer's moves
Aira is one identifiable layer that can do several things, each with a home in the UI. Use the same Aira signature wherever it speaks: a small teal A badge on a brand-tint surface. Aira's moves:

- **Surface** relevant or latest information: mark or pin the items that matter now (a "latest" or "relevant" tag in Synopsis or Records, or a highlighted Worklist row).
- **Summarise**: produce a short digest (the Aira-curated Synopsis, a case summary line, or a Worklist banner such as "Aira flagged N patients").
- **Flag** gaps and criticals: pending or overdue tasks, and missing information (a flag pill on a task or row, or a "missing: ..." note in the Action workspace or Synopsis).
- **Predict**: risk, likelihood, or eligibility (a score or tag in Synopsis and as a Worklist column; the reasoning shown in "Why this task?").
- **Prefill and auto-complete**: pre-fill artifacts and forms from existing patient information, and auto-complete routine tasks (labelled "pre-filled by Aira" or "auto-completed").
- **Recommend**: the next best action with a one-line "Why this task?" rationale.

Homes by module: Worklist (flag column or banner, risk score), Synopsis (summary, latest highlight, risk or eligibility tag, missing-info note), Records (latest or relevant highlight, summary), Action Center ("Why this task?", pre-filled body, missing-field flag). Aira still never gets its own column.

## Action Center: one component, two modes
A single bordered card. It has two layouts; choose by how many steps the work needs.

- **Single-action mode (use for simple work).** One atomic action with no sequence, for example acknowledge a result, send one reminder, or confirm a finding. No task list. The Action workspace fills the whole component: optional Aira rationale, the artifact or form, the primary action, and Comments. Use this whenever there is exactly one thing to do and nothing depends on anything else.
- **Task-sequence mode.** Multiple or ordered steps, or steps that unblock each other, for example registry, then PCP letter, then patient letter, then scheduling. Shows the Tasks list on the left and the Action workspace on the right. Do not render them as two separate sibling columns.

Guardrail: do not force a task list for a one-step action. If the list would have a single item, use single-action mode instead. A few independent quick actions can sit as a small action stack rather than a numbered protocol.

Shared rules: the Task editor is a state of this component (the task list collapses to a numbered rail, the editor fills the rest). The Action workspace is an overview with no internal scroll (truncate the draft, "read full draft"). Always show at least 2 comments.

## Layout invariants
- Synopsis is always **left + vertical**; stays visible during actions — except when Records is open (Records takes its slot).
- **Records is responsive** (flexible width, content wraps), **overlays Synopsis when open**, and is **zero-width when closed** (just the rail tabs).
- The Action workspace is never alone — Synopsis or Records stays beside it.

## Screens & states
- **Worklist (own screen):** count tiles (program-specific, prompt-configurable) + columns `Patient · Finding · Next action · Open · Assignee` + rows (status dot/pill on Next action). Row → patient page.
- **Patient page · Synopsis-default (home).** rail ~48 · Synopsis ~280 · Action Center fills rest.
- **Mini worklist open:** inline left column (cohort by stage), pushes content right.
- **Records-expanded:** Records overlays Synopsis; **task list → numbered rail**; Action workspace stays.
- **Task editor:** editor fills work area; **task list → numbered rail**; Synopsis stays.

## Interactions & collapse
| Trigger | Result |
|---|---|
| Worklist row | Full screen swap → patient page. |
| "Worklist" / `⤢` | Full screen swap → Worklist. |
| Cohort chip / `»` | Toggle the **mini worklist** (inline left column). |
| Mini-worklist patient | Loads that patient (stays on the page). |
| `‹ ›` (n of N) | Prev/next patient within the cohort. |
| Select a task | Action workspace shows it (list stays full). |
| Task's primary action | Opens Task editor; **task list → numbered rail**; Synopsis stays. |
| Open a record (Im/Lb/Rx/Dc) | Records overlays Synopsis; **task list → numbered rail**; Action stays. |
| Theme toggle (colors mode) | Flips light/dark — colors only. |

**Collapse summary:** mini worklist is inline (never overlay); task list → numbered rail when a record OR the editor is open; Synopsis → replaced by Records only while a record is open.

## Task types (one frame, swap body + actions)
Frame = title + source pill + assignee + Aira "Why this task?" + body + actions + Comments. Body/actions vary: Letter (template + rich text → Save draft/Save), Email/SMS (recipient + body → Send), Form (pre-filled fields → Save/Skip), Note (free text → Send), Call/Referral (log/pre-filled → Confirm), Composite plan (mixed sections → Confirm). New type = describe fields + primary action; keep the frame identical.

## Visual modes

**Wireframe (greyscale) — default unless colors chosen.** Neutral greys only, no brand color; primary button = charcoal; statuses = a grey dot + label (no color); no theme toggle.
```css
:root{ --font:"IBM Plex Sans",sans-serif;
  --bg:#fff; --bg-2:#f4f4f5; --bg-3:#e9e9eb;
  --text:#1a1d21; --text-2:#52555b; --text-3:#86898f;
  --brand:#1a1d21; --brand-tint:#0000000a; --on-brand:#fff;
  --border:#e2e3e5; --border-2:#c4c6c9;
  --radius:8px; --radius-full:999px; --pad:16px; }
```

**Qure SDS colors — only when chosen.** Teal brand, semantic statuses, light/dark toggle in the header.
```css
:root{ --font:"IBM Plex Sans",sans-serif;
  --bg:#fff; --bg-2:#f3f4f4; --bg-3:#e8e9ea;
  --text:#0c1723; --text-2:#39414c; --text-3:#565d66;
  --brand:#008280; --brand-tint:#0082801f; --on-brand:#f6f7f7;
  --border:#dee1e2; --border-2:#bbbfc2;
  --success:#00c86e; --success-tint:#d4f1e4; --success-text:#007a43;
  --attention:#ffb400; --attention-tint:#f9ebca; --attention-text:#b17900;
  --urgent:#ed2635;  --urgent-tint:#fbdee1;  --urgent-text:#93212f;
  --radius:8px; --radius-full:999px; --pad:16px; --shadow:0 1px 2px #0000001f; }
[data-theme="dark"]{
  --bg:#1d2732; --bg-2:#0c1723; --bg-3:#141f2a;
  --text:#f6f7f7; --text-2:#cfd2d4; --text-3:#a8acb0;
  --brand:#00d0cd; --brand-tint:#00d0cd29; --on-brand:#0c1723;
  --border:#38414b; --border-2:#646b72;
  --success:#00c86e; --success-tint:#053d2b; --success-text:#5ddaa2;
  --attention:#ffb400; --attention-tint:#422a10; --attention-text:#fcd26c;
  --urgent:#ed2635;  --urgent-tint:#451b28;  --urgent-text:#f699a1; }
```
Mapping: page=`--bg-2`; cards=`--bg`; rail/highlight=`--bg-3`. Primary button=`--brand`+`--on-brand`; secondary=`--bg`+`--border`. Aira "Why this task?" = `--brand-tint` bg + `--brand` accent. Status pills = matching `*-tint` bg + `*-text`. **Amber Attention always uses dark text.** *(SDS has no pink; Aira uses the teal brand-tint.)*

## Output / content rules
- Person names → `John Doe 1 / Jane Doe 2 …`. Other clinical detail → placeholders (`[finding]`, `[date]`, `Task placeholder`); **invent no real values, drugs, doses, or stats.**
- 1–2 example items per list, the rest placeholders.
- Build only the **state(s)** the chosen scope needs — but wire every interaction in that scope.

## Don'ts
❌ Worklist as overlay · ❌ mini worklist as a float · ❌ task as popover · ❌ Synopsis on right/top · ❌ small Synopsis heading · ❌ tasks + action as two separate columns · ❌ scrolling action workspace · ❌ fewer than 2 comments · ❌ Notes merged with Comments · ❌ Aira as a column · ❌ Records as a separate page / empty column when closed · ❌ non-responsive Records · ❌ white text on amber · ❌ React or a new framework instead of the app's vanilla JS · ❌ invented clinical detail · ❌ color when wireframe was chosen · ❌ emoji or decorative icons · ❌ status color on body text or full-row fills · ❌ removing interactions when a narrower scope is chosen · ❌ skipping or rewording the three intake questions · ❌ forcing a task list for a single-step action.

## Reference
Reference mock (match this): `references/prototype-kit-reference.html` in this skill's folder. Companion: the **Design Tokens** skill (Qure SDS colors, typography, components) when SDS style is chosen.
