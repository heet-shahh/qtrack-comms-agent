// qTrack prototype — voice agents (Auto / Assist) in IPN & LCS workflows.
// The clickable mock, now with a REAL voice agent wired into the two call
// surfaces (auto call console + assisted calling session) via the Retell
// adapter — see ./voice/. Everything else is still in-file mock state.

import { mountVoiceAgent, unmountVoiceAgent } from './voice/mount.js'

document.querySelector('#app').innerHTML = `
<header class="topbar">
  <div class="brand">qTrack <span>· Worklist</span></div>
  <div class="topright">
    <button class="toggle" id="themeToggle" title="Light / Dark"></button>
    <div class="search">⌕ search patient / MRN</div>
  </div>
</header>

<!-- ============ WORKLIST SCREEN ============ -->
<section id="screen-worklist" class="screen">
  <div class="tiles" id="tiles"></div>
  <div class="progtabs" id="progTabs">
    <button class="progtab active" data-prog="All">All programs</button>
    <button class="progtab" data-prog="LCS">LCS</button>
    <button class="progtab" data-prog="IPN">IPN</button>
  </div>
  <div class="wl-table">
    <div class="wl-head cap">
      <div>Patient</div><div>Program</div><div>Finding</div><div>Next action</div><div>Open</div><div>Assignee</div>
    </div>
    <div id="wlRows"></div>
  </div>
</section>

<!-- ============ PATIENT PAGE ============ -->
<section id="screen-patient" class="screen hidden">
  <div class="subheader">
    <button class="iconbtn" id="btnExpand" title="Back to Worklist">⤢</button>
    <span class="crumb" id="crumbWorklist">Worklist</span>
    <span class="muted">›</span>
    <button class="chip" id="cohortChip">Needs voice outreach <span class="cnt">5</span> ▾</button>
    <span class="muted">›</span>
    <div class="pident">
      <span class="avatar" id="pAvatar">JD</span>
      <span class="nm" id="pName">John Doe 3</span>
      <span class="muted" id="pMeta">62M · MRN V6B36D</span>
    </div>
    <div class="cohortpos">
      <span id="pPos">3 of 5 in cohort</span>
      <button class="iconbtn" id="btnPrev">‹</button>
      <button class="iconbtn" id="btnNext">›</button>
    </div>
  </div>

  <div class="pbody">
    <aside id="miniwl" class="hidden">
      <div class="miniwl-head">
        <div><strong>Needs voice outreach</strong><div class="psub">5 patients · by program</div></div>
        <button class="iconbtn" id="miniClose">«</button>
      </div>
      <div class="miniwl-sel">‹ Worklist · All cohorts · LCS + IPN</div>
      <div id="miniGroups"></div>
    </aside>

    <nav class="rail">
      <button class="railbtn" id="railExpand" title="Open mini worklist">»</button>
      <button class="railbtn" data-rec="Imaging">Im</button>
      <button class="railbtn" data-rec="Labs">Lb</button>
      <button class="railbtn" data-rec="Rx">Rx</button>
      <button class="railbtn" data-rec="Docs">Dc</button>
    </nav>

    <aside id="synopsis"></aside>

    <aside id="records" class="hidden">
      <div class="rec-head"><button class="iconbtn" id="recBack">‹</button><h2 id="recTitle">Records</h2><span class="muted" id="recSub">/ Imaging</span></div>
      <div class="rec-sec"><div class="lbl">Headline</div><div><strong>LDCT Chest · low-dose · [date]</strong><div class="psub">Imaging · Radiology · Dr Doe</div></div></div>
      <div class="rec-sec"><div class="lbl">Impression</div><div class="muted">[Impression placeholder — finding, size, category, and recommended follow-up.]</div></div>
      <div class="rec-sec"><div class="lbl">Technique / source</div><div class="psub">[technique placeholder] · [source placeholder]</div></div>
      <div class="rec-sec"><div class="lbl">Prior studies</div>
        <div class="rec-prior"><span>[date]</span><span>[prior result placeholder]</span></div>
        <div class="rec-prior"><span>[date]</span><span>[prior result placeholder]</span></div>
      </div>
      <div class="actions"><button class="btn">print</button><button class="btn">pin</button></div>
    </aside>

    <section id="actioncenter">
      <div id="tasklist">
        <div class="tl-head"><span class="cap">Tasks</span><span class="psub tl-sub" id="tlCount">1 open</span></div>
        <div id="taskRows"></div>
        <button class="createtask">+ create task</button>
      </div>
      <div id="workarea"></div>
      <div id="editor" class="hidden"></div>
    </section>
  </div>
</section>

<!-- ============ ASSISTED CALLING SESSION ============ -->
<section id="screen-session" class="screen hidden">
  <div class="subheader">
    <button class="iconbtn" id="sessExit" title="Exit session">✕</button>
    <span class="crumb" id="sessExitLbl">Exit session</span>
    <span class="muted">›</span>
    <div class="pident"><span class="nm">Assisted calling session</span></div>
    <div class="cohortpos"><span id="sessProgress">Patient 1 of 3</span></div>
  </div>
  <div class="pbody" style="overflow:auto;display:block;padding:24px">
    <div id="sessBody"></div>
  </div>
</section>
`

/* ============================================================
   ICONS — small line-icon badges used instead of the words
   "Auto mode" / "Assist mode": bot = auto, headset = assist,
   person = human assignee.
   ============================================================ */
const svgWrap = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const iconAuto = () => svgWrap(`<rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M12 8V4"></path><circle cx="12" cy="3" r="1"></circle><circle cx="9" cy="14" r="1"></circle><circle cx="15" cy="14" r="1"></circle><path d="M4 13H2"></path><path d="M22 13h-2"></path>`);
const iconAssist = () => svgWrap(`<path d="M3 13a9 9 0 0 1 18 0"></path><path d="M21 13v5a2 2 0 0 1-2 2h-1"></path><rect x="17" y="13" width="4" height="6" rx="1"></rect><rect x="3" y="13" width="4" height="6" rx="1"></rect>`);
const iconHuman = () => svgWrap(`<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"></path>`);
const modeBadge = (kind,sm) => kind==='auto' ? `<span class="modeicon auto${sm?' sm':''}" title="Auto mode">${iconAuto()}</span>`
  : kind==='assist' ? `<span class="modeicon assist${sm?' sm':''}" title="Assist mode">${iconAssist()}</span>` : '';

/* ============================================================
   DATA — names rendered as John/Jane Doe N; all clinical detail
   is placeholder text per the qTrack prototyping convention.
   ============================================================ */
const AGENT = {appt:"Appointment Agent", pa:"Prior Authorization Agent", reminder:"Reminder Agent"};

const patients = [
  {id:1,n:"John Doe 1",a:"67M",mrn:"T6B36D",prog:"LCS",progFull:"Lung Cancer Screening",find:"22 mm · solid · LUL"},
  {id:2,n:"Jane Doe 2",a:"54F",mrn:"U6B36D",prog:"IPN",progFull:"Prior Authorization",find:"[eligibility placeholder]"},
  {id:3,n:"John Doe 3",a:"62M",mrn:"V6B36D",prog:"LCS",progFull:"Lung Cancer Screening",find:"16 mm · solid · RUL · Lung-RADS 4B"},
  {id:4,n:"Jane Doe 4",a:"48F",mrn:"W6B36D",prog:"IPN",progFull:"Prior Authorization",find:"[coverage placeholder]"},
  {id:5,n:"John Doe 5",a:"58M",mrn:"X6B36D",prog:"LCS",progFull:"Lung Cancer Screening",find:"14 mm · part-solid · RML"},
];

const tasksByPatient = {
  1:[{t:"Appointment confirmation",s:"due today",kind:"auto",sub:"appt",assignee:AGENT.appt,status:"pending"}],
  2:[{t:"Enrollment",s:"in progress · calling now",kind:"auto",sub:"pa",assignee:AGENT.pa,status:"pending"}],
  3:[
    {t:"Clarifying questions",s:"context ready · not yet called",kind:"assist",assignee:"J. Okafor",status:"pending"},
    {t:"Appointment confirmation",s:"scheduled",kind:"auto",sub:"appt",assignee:AGENT.appt,status:"pending"},
  ],
  4:[{t:"Clarifying questions",s:"context ready · not yet called",kind:"assist",assignee:"M. Reyes",status:"pending"}],
  5:[
    {t:"Clarifying questions",s:"context ready · not yet called",kind:"assist",assignee:"Dr Doe",status:"pending"},
    {t:"Enrollment",s:"escalated · needs human",kind:"auto",sub:"pa",assignee:AGENT.pa,status:"pending"},
  ],
};

const initials = n => n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase().replace(/[^A-Z]/g,"D");
function patientById(id){ return patients.find(p=>p.id===id); }
function avatarFor(t){
  if(t.kind==="auto") return `<span class="avatar agent" title="${t.assignee}">${iconAuto()}</span>`;
  return `<span class="avatar" title="${t.assignee}">${initials(t.assignee)}</span>`;
}

let current = 2; // index of John Doe 3
let activeTask = 0;
let progFilter = "All";
let autoOutcome = "sad";

/* ---------- tiles ---------- */
function totalOpen(){ return Object.values(tasksByPatient).reduce((n,arr)=>n+arr.filter(t=>t.status==="pending").length,0); }
function countByKind(kind){ return Object.values(tasksByPatient).reduce((n,arr)=>n+arr.filter(t=>t.kind===kind&&t.status==="pending").length,0); }
function countEscalated(){ return Object.values(tasksByPatient).reduce((n,arr)=>n+arr.filter(t=>t.status==="pending"&&t.s.includes("escalated")).length,0); }
function renderTiles(){
  const queued = buildAssistQueue().length;
  document.getElementById("tiles").innerHTML = `
    <div class="tile"><div class="n">${patients.length}</div><div class="l">Patients</div></div>
    <div class="tile"><div class="n">${totalOpen()}</div><div class="l">Tasks</div></div>
    <div class="tile"><div class="n">${countByKind("auto")}</div><div class="l-row">${modeBadge('auto',true)}<span class="l">Auto tasks</span></div></div>
    <div class="tile"><div class="n">${countByKind("assist")}</div><div class="l-row">${modeBadge('assist',true)}<span class="l">Assist tasks</span></div></div>
    <div class="tile"><div class="n">${countEscalated()}</div><div class="l">Escalated</div></div>
    <div class="tile cta" id="tileSession"><div class="n">${queued}</div><div class="l-row">${modeBadge('assist',true)}<span class="l">Start assist session</span></div></div>
  `;
  document.getElementById("tileSession").onclick = ()=>startSession();
}

/* ---------- worklist ---------- */
function nextActionFor(p){ return tasksByPatient[p.id][0]; }
function statusPill(t){
  const s = t.s;
  let sk = "";
  if(s.includes("escalated")) sk = "urgent";
  else if(s.includes("due today")||s.includes("in progress")) sk = "attention";
  else if(s.includes("scheduled")||s.includes("context ready")) sk = "";
  const c = sk? {urgent:["--urgent-tint","--urgent-text"],attention:["--attention-tint","--attention-text"]}[sk] : null;
  return c ? `<span class="pill" style="background:var(${c[0]});color:var(${c[1]})"><span class="dot" style="background:var(${c[1]})"></span>${s}</span>` : `<span class="muted">${s}</span>`;
}
function renderWorklist(){
  const rows = patients.map((p,i)=>({p,i})).filter(({p})=>progFilter==="All"||p.prog===progFilter);
  document.getElementById("wlRows").innerHTML = rows.map(({p,i})=>{
    const t = nextActionFor(p);
    const openCount = tasksByPatient[p.id].filter(x=>x.status==="pending").length;
    return `<div class="wl-row" data-i="${i}">
      <div class="cell-pt"><span class="avatar">${initials(p.n)}</span><div><div class="pname">${p.n}</div><div class="psub">${p.a} · MRN ${p.mrn}</div></div></div>
      <div class="psub" style="color:var(--text-2)">${p.prog}</div>
      <div class="psub" style="color:var(--text-2)">${p.find}</div>
      <div><div class="tt-row" style="font-weight:600">${modeBadge(t.kind,true)}${t.t}</div>${statusPill(t)}</div>
      <div><span class="opentag">${openCount} open</span></div>
      <div class="assignee">${avatarFor(t)}<span>${t.assignee}</span></div>
    </div>`;
  }).join("");
  document.querySelectorAll(".wl-row").forEach(r=>r.onclick=()=>openPatient(+r.dataset.i));
}
document.querySelectorAll(".progtab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".progtab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  progFilter = b.dataset.prog;
  renderWorklist();
});

/* ---------- synopsis ---------- */
function renderSynopsis(){
  const p = patients[current];
  document.getElementById("synopsis").innerHTML = `
    <div class="syn-head"><h2>Synopsis</h2><button class="edit">edit</button></div>
    <div class="syn-sec"><div class="lbl">Program</div><div class="val">${p.progFull}</div><div class="psub">${p.prog} · [pathway placeholder]</div></div>
    <div class="syn-sec"><div class="lbl">Clinical status</div><div class="tagrow"><span class="tag">${p.find}</span></div></div>
    <div class="syn-sec"><div class="lbl">Stage in cohort</div><div class="tagrow"><span class="tag">Needs voice outreach</span></div></div>
    <div class="syn-sec"><div class="lbl">Care team</div><div class="psub">Nav · ${tasksByPatient[p.id].find(t=>t.kind!=="auto")?.assignee || tasksByPatient[p.id][0].assignee} (you)</div><div class="psub">PCP · Dr Doe</div></div>
    <div class="syn-sec"><div class="lbl">Notes</div>
      <div class="note"><span class="nt">STAGE</span>[Stage note placeholder — prior contact attempts and outcome.]</div>
      <div class="note"><span class="nt">CONTEXT</span>[Context note placeholder — preferred language, callback window.]</div>
    </div>
  `;
}

/* ---------- task list + mini worklist ---------- */
function renderTasks(){
  const p = patients[current];
  const list = tasksByPatient[p.id];
  document.getElementById("tlCount").textContent = list.filter(t=>t.status==="pending").length+" open";
  document.getElementById("taskRows").innerHTML = list.map((t,i)=>`
    <div class="task ${i===activeTask?'active':''}" data-i="${i}">
      <span class="num">${i+1}</span>
      <div>
        <div class="tt-row">${modeBadge(t.kind,true)}<span class="tt">${t.t}</span></div>
        <div class="ts">${t.s}</div>
      </div>
    </div>`).join("");
  document.querySelectorAll("#taskRows .task").forEach(el=>el.onclick=()=>{
    activeTask = +el.dataset.i;
    renderTasks();
    renderWorkarea();
  });
}
function renderMini(){
  const groups = {};
  patients.forEach((p,i)=>{(groups[p.prog]=groups[p.prog]||[]).push({...p,i})});
  document.getElementById("miniGroups").innerHTML = Object.entries(groups).map(([g,arr])=>`
    <div class="miniwl-grp"><div class="ghead cap"><span>${g}</span><span>${arr.length}</span></div>
    ${arr.map(p=>`<div class="miniwl-item ${p.i===current?'active':''}" data-i="${p.i}">
      <span class="avatar">${initials(p.n)}</span><div><div style="font-weight:600;font-size:13px">${p.n}</div><div class="ts">${p.find}</div></div></div>`).join("")}
    </div>`).join("");
  document.querySelectorAll(".miniwl-item").forEach(el=>el.onclick=()=>loadPatient(+el.dataset.i));
}

/* ---------- workarea renderers ---------- */
function renderWorkarea(){
  const p = patients[current];
  const t = tasksByPatient[p.id][activeTask];
  const wa = document.getElementById("workarea");
  wa.innerHTML = t.kind==="assist" ? assistWorkarea(p,t) : autoWorkarea(p,t);
  wireWorkarea(p,t);
}
function commentsHtml(a,b){
  return `<div class="cmts">
    <div class="cap" style="margin-bottom:8px">Comments</div>
    ${a}${b}
    <div class="cmtbar"><span class="avatar" style="width:22px;height:22px">JO</span><div class="cmtinput">Comment &amp; tag a teammate…</div><button class="btn primary">send</button></div>
  </div>`;
}
function assistWorkarea(p,t){
  return `
    <div class="aw-top">
      <span class="pill" style="background:var(--brand-tint);color:var(--brand)">Aira</span>
      ${modeBadge('assist')}
      <span class="pill" style="background:var(--attention-tint);color:var(--attention-text)">${t.s}</span>
      <span class="muted" style="font-size:12px">qure.ai</span>
      <span class="aw-assign">Assigned ${avatarFor(t)} ${t.assignee} · reassign ▾</span>
    </div>
    <div class="aw-title">Clarifying questions</div>
    <div class="psub">Call ${p.n} to talk through the finding and next steps · brief prepared by Aira</div>
    <div class="why">
      <div class="h"><span class="a-badge">A</span> Aira · Why this task?</div>
      This needs a human voice — Aira has prepared the clarifying questions below and will listen in once the call starts, taking notes and proposing follow-ups afterward.
    </div>
    <div class="draftlabel"><span>Clarifying questions · prepared by Aira</span><span class="muted">read full brief</span></div>
    <ul class="qlist">
      <li>Confirm ${p.n} understands the finding (${p.find}) and that it needs a closer look, not that it's a diagnosis.</li>
      <li>Explain the next step: a physician appointment plus an immediate 3-month follow-up CT scan — confirm they understand both are being scheduled, not optional.</li>
      <li>Ask about new or worsening symptoms since the last visit — [symptom placeholder].</li>
      <li>Offer to help find a physician appointment time and CT slot within the next 3 months.</li>
    </ul>
    <div class="actions">
      <button class="btn primary" id="btnStartCall">☎ Start call</button>
      <button class="btn">Reassign</button>
    </div>
    ${commentsHtml(
      `<div class="cmt"><span class="avatar" style="width:22px;height:22px">A</span><div><strong>Aira</strong> <span class="muted">2 min</span><div class="body">Brief is ready — flagged Assist mode since this needs a human to deliver it.</div></div></div>`,
      `<div class="cmt"><span class="avatar" style="width:22px;height:22px">${initials(t.assignee)}</span><div><strong>${t.assignee}</strong> <span class="muted">1 min</span><div class="body">Calling from the session queue shortly.</div></div></div>`
    )}
  `;
}
function autoWorkarea(p,t){
  const escalated = t.s.includes("escalated");
  return `
    <div class="aw-top">
      <span class="pill" style="background:var(--brand-tint);color:var(--brand)">Aira</span>
      ${modeBadge('auto')}
      <span class="pill" style="background:var(${escalated?'--urgent-tint':'--attention-tint'});color:var(${escalated?'--urgent-text':'--attention-text'})">${t.s}</span>
      <span class="muted" style="font-size:12px">qure.ai</span>
      <span class="aw-assign">Assigned ${avatarFor(t)} ${t.assignee} · reassign ▾</span>
    </div>
    <div class="aw-title">${t.t}</div>
    <div class="psub">${t.t==="Enrollment"?"Confirm enrollment step":"Reminder + availability confirmation"} · queued for [date]</div>
    <div class="why">
      <div class="h"><span class="a-badge">A</span> Aira · Why this task?</div>
      ${escalated ? "The agent surfaced a question it can't resolve on its own — routing this to a human to close out." : "Routine outreach the agent can run end to end, escalating only if the patient has questions the care team should answer."}
    </div>
    <div class="steps">
      <div class="step done"><span class="sc">✓</span><span class="sl">Queued</span></div><div class="sline"></div>
      <div class="step ${escalated?'done':'now'}"><span class="sc">${escalated?'✓':'2'}</span><span class="sl">Dialing</span></div><div class="sline"></div>
      <div class="step ${escalated?'now':''}"><span class="sc">3</span><span class="sl">Outcome</span></div>
    </div>
    <div class="draftlabel"><span>Call summary · auto-generated</span><span class="muted">read full transcript</span></div>
    <div class="draft">${escalated? "Patient asked a question the agent routed to the care team — see call console for the full exchange." : "Call in progress — summary will populate here once the call completes."}</div>
    <div class="actions">
      <button class="btn primary" id="btnOpenConsole">☎ Open call console</button>
      ${escalated? "" : `<button class="btn" id="btnEscalate">Escalate to human</button>`}
      <button class="btn">✓ Mark complete</button>
    </div>
    ${commentsHtml(
      `<div class="cmt">${avatarFor(t)}<div><strong>${t.assignee}</strong> <span class="muted">just now</span><div class="body">${escalated? "Routed to a human — patient had a coverage question." : "Dialing patient now."}</div></div></div>`,
      `<div class="cmt"><span class="avatar" style="width:22px;height:22px">JO</span><div><strong>J. Okafor</strong> <span class="muted">4 min</span><div class="body">If it escalates, loop me in directly.</div></div></div>`
    )}
  `;
}
function wireWorkarea(p,t){
  const startCall = document.getElementById("btnStartCall");
  if(startCall) startCall.onclick = ()=>startSession(p.id);
  const openConsole = document.getElementById("btnOpenConsole");
  if(openConsole) openConsole.onclick = ()=>openAutoConsole(p,t,t.s.includes("escalated")?"esc":autoOutcome);
  const escalate = document.getElementById("btnEscalate");
  if(escalate) escalate.onclick = ()=>openAutoConsole(p,t,"esc");
}

/* ---------- editor: auto call console (Appointment confirmation / Enrollment) ---------- */
function openAutoConsole(p,t,outcome){
  autoOutcome = outcome;
  document.getElementById("workarea").classList.add("hidden");
  const ed = document.getElementById("editor");
  ed.classList.remove("hidden");
  document.getElementById("tasklist").classList.add("collapsed");
  ed.innerHTML = `
    <div class="ed-head">
      <div class="psub"><span class="crumb">Tasks</span> › <span class="crumb">${t.t}</span> › <strong style="color:var(--text)">Call console</strong></div>
      <button class="iconbtn" id="edClose">✕</button>
    </div>
    <div class="ed-tools">
      ${modeBadge('auto')}
      <span>Assigned to <strong style="color:var(--text)">${t.assignee}</strong></span>
      <span style="margin-left:auto">Outcome:</span>
      <div class="outcomepick">
        <button class="opick ${outcome==='happy'?'active happy':''}" data-o="happy">Happy · confirmed</button>
        <button class="opick ${outcome==='sad'?'active sad':''}" data-o="sad">Sad · no answer</button>
        <button class="opick ${outcome==='esc'?'active esc':''}" data-o="esc">Escalate to human</button>
      </div>
    </div>
    <div class="ed-body"><div id="autoVoiceMount"></div></div>
    <div class="ed-foot">
      <button class="cancel" id="edCancel">Cancel</button>
      <button class="btn">Save</button>
      <button class="btn primary" id="edConfirmOutcome">${outcome==='esc'?'✓ Assign to human':'✓ Confirm outcome'}</button>
    </div>
  `;
  mountVoiceAgent(document.getElementById("autoVoiceMount"), { patient: p, task: t });
  // Outcome picker is the navigator's manual call: toggle it in place rather than
  // re-rendering the console, so a live call keeps running underneath.
  ed.querySelectorAll(".opick").forEach(b=>b.onclick=()=>{
    autoOutcome = b.dataset.o;
    ed.querySelectorAll(".opick").forEach(x=>x.classList.remove("active","happy","sad","esc"));
    b.classList.add("active", autoOutcome);
    document.getElementById("edConfirmOutcome").textContent = autoOutcome==='esc'?'✓ Assign to human':'✓ Confirm outcome';
  });
  document.getElementById("edClose").onclick = closeEditor;
  document.getElementById("edCancel").onclick = closeEditor;
  document.getElementById("edConfirmOutcome").onclick = ()=>{
    const labels = {happy:"completed · patient confirmed",sad:"voicemail left · retry queued",esc:"escalated · needs human"};
    t.s = labels[autoOutcome];
    if(autoOutcome==="happy") t.status="done";
    renderTasks(); renderWorklist(); renderTiles();
    closeEditor();
  };
}
function closeEditor(){
  unmountVoiceAgent(document.getElementById("autoVoiceMount"));
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("workarea").classList.remove("hidden");
  if(document.getElementById("records").classList.contains("hidden"))document.getElementById("tasklist").classList.remove("collapsed");
}

/* ============================================================
   ASSISTED CALLING SESSION — the human works an Assist-mode
   queue patient after patient: context → dialing → live call →
   notes & follow-up items → next patient.
   ============================================================ */
let sessionQueue = [];
let sessionPos = 0;
let sessionPhase = "context"; // context | dialing | live | wrapup | done
let sessionItems = [];
let sessionStats = {calls:0, items:0};
let sessionCall = null;      // full Retell call object (transcript + call_analysis)
let sessionCallId = null;    // Retell call id, captured live from the widget
let sessionTranscript = [];  // live transcript array, captured as the call runs
let sessionEmrSent = false;
let sessionGenerating = false; // true while polling Retell's post-call analysis

function buildAssistQueue(){
  return patients.filter(p=>tasksByPatient[p.id].some(t=>t.kind==="assist"&&t.status==="pending")).map(p=>p.id);
}
function startSession(startPatientId){
  sessionQueue = buildAssistQueue();
  if(startPatientId){
    const idx = sessionQueue.indexOf(startPatientId);
    if(idx>0) sessionQueue = sessionQueue.slice(idx).concat(sessionQueue.slice(0,idx));
  }
  sessionPos = 0;
  sessionPhase = "context";
  sessionStats = {calls:0, items:0};
  show("screen-session");
  renderSession();
}
function currentSessionPatient(){ return patientById(sessionQueue[sessionPos]); }
function currentSessionTask(){ const p=currentSessionPatient(); return p && tasksByPatient[p.id].find(t=>t.kind==="assist"&&t.status==="pending"); }

function renderSession(){
  const total = sessionQueue.length;
  document.getElementById("sessProgress").textContent = sessionPhase==="done" ? `${sessionStats.calls} of ${total} complete` : `Patient ${sessionPos+1} of ${total}`;
  const body = document.getElementById("sessBody");

  if(sessionPhase==="done" || total===0){
    body.innerHTML = `
      <div class="sess-card">
        <h2 style="margin-top:0">Session complete</h2>
        <p class="psub">${sessionStats.calls} call${sessionStats.calls===1?'':'s'} handled · ${sessionStats.items} follow-up task${sessionStats.items===1?'':'s'} created and assigned.</p>
        <div class="sess-foot"><button class="btn primary" id="sessReturn">Return to worklist</button></div>
      </div>`;
    document.getElementById("sessReturn").onclick = ()=>{ show("screen-worklist"); renderWorklist(); renderTiles(); };
    return;
  }

  const p = currentSessionPatient();
  const t = currentSessionTask();
  const progress = sessionQueue.map((id,i)=>`<div class="sp ${i<sessionPos?'done':i===sessionPos?'now':''}"></div>`).join("");

  if(sessionPhase==="context"){
    body.innerHTML = `
      <div class="sess-progress">${progress}</div>
      <div class="sess-card">
        <div class="sess-pt"><span class="avatar" style="width:38px;height:38px;font-size:14px">${initials(p.n)}</span>
          <div><div class="nm">${p.n}</div><div class="psub">${p.a} · MRN ${p.mrn} · ${p.prog}</div></div>
        </div>
        <div class="tagrow"><span class="tag">${p.find}</span></div>
        <div class="why">
          <div class="h"><span class="a-badge">A</span> Aira · Why this task?</div>
          Assigned to ${t.assignee} — this needs a human voice. Clarifying questions are prepared below; Aira will listen in and take notes once the call connects.
        </div>
        <div class="draftlabel"><span>Clarifying questions · prepared by Aira</span></div>
        <ul class="qlist">
          <li>Confirm ${p.n} understands the finding (${p.find}) and that it needs a closer look, not that it's a diagnosis.</li>
          <li>Explain the next step: a physician appointment plus an immediate 3-month follow-up CT scan — confirm they understand both are being scheduled, not optional.</li>
          <li>Ask about new or worsening symptoms since the last visit — [symptom placeholder].</li>
          <li>Offer to help find a physician appointment time and CT slot within the next 3 months.</li>
        </ul>
        <div class="sess-foot">
          <button class="btn primary" id="btnDial">☎ Start dialing</button>
          <button class="btn" id="btnSkip">Skip patient</button>
        </div>
      </div>`;
    document.getElementById("btnDial").onclick = ()=>{ sessionPhase="dialing"; renderSession(); };
    document.getElementById("btnSkip").onclick = advanceSession;
    return;
  }

  if(sessionPhase==="dialing"){
    body.innerHTML = `
      <div class="sess-progress">${progress}</div>
      <div class="sess-card">
        <div class="sess-pt"><span class="avatar" style="width:38px;height:38px;font-size:14px">${initials(p.n)}</span>
          <div><div class="nm">${p.n}</div><div class="psub">${p.a} · MRN ${p.mrn} · ${p.prog}</div></div>
        </div>
        <div class="sess-dialing"><span class="pulse"></span> Dialing ${p.n}…</div>
        <p class="psub">Aira has the brief loaded and will start taking notes as soon as the call connects.</p>
        <div class="sess-foot">
          <button class="btn primary" id="btnConnected">✓ Connected — begin call</button>
          <button class="btn" id="btnNoAnswer">No answer</button>
        </div>
      </div>`;
    document.getElementById("btnConnected").onclick = ()=>{ sessionPhase="live"; renderSession(); };
    document.getElementById("btnNoAnswer").onclick = ()=>{ t.s="voicemail left · retry queued"; renderTasks(); advanceSession(); };
    return;
  }

  if(sessionPhase==="live"){
    body.innerHTML = `
      <div class="sess-progress">${progress}</div>
      <div class="sess-card">
        <div class="sess-pt"><span class="avatar" style="width:38px;height:38px;font-size:14px">${initials(p.n)}</span>
          <div><div class="nm">Live call · ${p.n}</div><div class="psub">Robin (agent) places the call from Aira's brief — you role-play ${p.n}.</div></div>
        </div>
        <div class="talktrack">
          <div class="draftlabel" style="margin-top:0"><span>Talk track · say these while on the call</span></div>
          <ul class="qlist">
            <li>Confirm ${p.n} understands the finding (${p.find}) and that it needs a closer look, not that it's a diagnosis.</li>
            <li>Explain the next step: a physician appointment plus an immediate 3-month follow-up CT scan — confirm they understand both are being scheduled, not optional.</li>
            <li>Ask about new or worsening symptoms since the last visit — [symptom placeholder].</li>
            <li>Offer to help find a physician appointment time and CT slot within the next 3 months.</li>
          </ul>
        </div>
        <div id="sessVoiceMount"></div>
      </div>
      <div class="sess-foot"><button class="btn primary" id="btnEndCall">✓ End call &amp; wrap up</button></div>`;
    sessionCall = null; sessionCallId = null; sessionTranscript = []; sessionEmrSent = false;
    mountVoiceAgent(document.getElementById("sessVoiceMount"), {
      patient: p, task: t,
      onCallId: (id)=>{ sessionCallId = id; },
      onTranscript: (tr)=>{ sessionTranscript = tr || []; },
      onEnded: (res)=>{
        if(res?.call) sessionCall = res.call;
        sessionCallId = res?.callId || sessionCallId;
        if(sessionPhase==="wrapup") paintWrapup(p);
      },
    });
    document.getElementById("btnEndCall").onclick = ()=>{
      unmountVoiceAgent(document.getElementById("sessVoiceMount"));
      t.s = "completed · notes saved"; t.status="done";
      sessionStats.calls++;
      renderTasks();
      sessionPhase="wrapup"; renderSession();
    };
    return;
  }

  if(sessionPhase==="wrapup"){
    body.innerHTML = `
      <div class="sess-progress">${progress}</div>
      <div class="sess-card">
        <div class="emr-top">
          <div class="draftlabel" style="margin:0"><span>Clinical note · summary of the call</span></div>
          <button class="btn primary" id="btnSendEmr">⤴ Send clinical note to EMR</button>
        </div>
        <textarea class="note-edit" id="sessNote"></textarea>
        <div class="va-tags" id="sessNoteTags"></div>

        <div class="draftlabel" style="margin-top:16px"><span>Follow-up action items · generated from the call</span></div>
        <div id="sessItems"></div>

        <div class="sess-foot"><button class="btn primary" id="btnNextPatient">${sessionPos+1<sessionQueue.length?'Next patient →':'Finish session'}</button></div>
      </div>`;
    document.getElementById("btnNextPatient").onclick = advanceSession;
    paintWrapup(p);
    hydrateWrapup(p);
    return;
  }
}

// The live transcript as plain text, for the never-stuck fallback note.
function transcriptText(){
  return (sessionTranscript||[]).map(x=>`${x.role==='agent'?'Agent':'Patient'}: ${x.content}`).join("\n");
}

// Clinical note: prefer Retell's LLM-written clinical_note, then its default
// call_summary; never leave "Generating…" once polling has finished.
function clinicalNote(p){
  const a = sessionCall?.call_analysis, cad = a?.custom_analysis_data;
  if(cad?.clinical_note) return cad.clinical_note;
  if(a?.call_summary) return a.call_summary;
  if(sessionGenerating) return "Generating clinical note from the call…";
  const txt = transcriptText();
  return txt ? `Automated summary unavailable — transcript follows.\n\n${txt}`
             : `No transcript was captured for this call with ${p.n} (the call may not have connected).`;
}

// Tolerant parse of Retell's action_items string → array of {task, agent}.
function parseActionItems(raw){
  if(!raw) return null;
  const s = String(raw).trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if(a>=0 && b>a){ try{ const arr = JSON.parse(s.slice(a,b+1)); if(Array.isArray(arr)) return arr; }catch{} }
  return null;
}
const KNOWN_AGENT = {
  "appointment agent":AGENT.appt, "prior authorization agent":AGENT.pa,
  "reminder agent":AGENT.reminder, "care navigator":"Care navigator",
};
// Follow-up items generated from the actual conversation (Retell's post-call LLM);
// falls back to a keyword scan of the transcript only if analysis never arrives.
function itemsFromCall(p){
  const cad = sessionCall?.call_analysis?.custom_analysis_data;
  const parsed = parseActionItems(cad?.action_items);
  if(parsed){
    return parsed.filter(x=>x && (x.task||x.text)).map(x=>{
      const assignee = KNOWN_AGENT[String(x.agent||"").toLowerCase().trim()] || x.agent || "Care navigator";
      return { txt:(x.task||x.text), assignee, kind: assignee==="Care navigator"?"human":"auto", added:false };
    });
  }
  if(sessionGenerating) return null; // show a "generating" placeholder, not stale items
  // fallback (analysis unavailable): light keyword scan of the transcript
  const text = (transcriptText()+" "+(sessionCall?.call_analysis?.call_summary||"")).toLowerCase();
  const items = [];
  if(/appoint|schedul|visit|book|come in|slot|reschedul/.test(text)) items.push({txt:`Schedule / confirm the appointment for ${p.n}`, assignee:AGENT.appt, kind:"auto"});
  if(/auth|coverage|eligib|insur|prior|approval|referral/.test(text)) items.push({txt:`Verify prior authorization / coverage for ${p.n}`, assignee:AGENT.pa, kind:"auto"});
  if(/remind|call ?back|follow[- ]?up|reach out|check in|later|another time|busy|voicemail/.test(text)) items.push({txt:`Send a follow-up reminder / callback to ${p.n}`, assignee:AGENT.reminder, kind:"auto"});
  if(/why|serious|scared|worried|cancer|dangerous|mean|nurse|question/.test(text)) items.push({txt:`Nurse to answer ${p.n}'s clinical question before next contact`, assignee:"Care navigator", kind:"human"});
  if(items.length===0) items.push({txt:`Review the call and decide the next step for ${p.n}`, assignee:"Care navigator", kind:"human"});
  return items.map(i=>({...i, added:false}));
}

function paintWrapup(p){
  if(sessionPhase!=="wrapup") return;
  const note = document.getElementById("sessNote");
  if(note && document.activeElement!==note) note.value = clinicalNote(p);
  const tags = document.getElementById("sessNoteTags");
  const a = sessionCall?.call_analysis;
  if(tags) tags.innerHTML = a ?
    ((a.user_sentiment?`<span class="tag">sentiment: ${a.user_sentiment}</span>`:"")
     + ('call_successful' in a?`<span class="tag">successful: ${String(a.call_successful)}</span>`:"")) : "";
  const items = itemsFromCall(p);
  if(items===null){ // still generating, no dynamic items yet
    const box = document.getElementById("sessItems");
    if(box) box.innerHTML = `<div class="psub" style="padding:4px 2px">Generating action items from the call…</div>`;
  } else {
    sessionItems = items;
    renderSessionItems();
  }
  wireSendEmr();
}

// Poll Retell's post-call analysis until the note/action items arrive, repainting
// as data improves; always resolves to real content (never stuck on "Generating…").
async function hydrateWrapup(p){
  sessionGenerating = true;
  paintWrapup(p);
  if(sessionCallId){
    for(let i=0;i<12 && sessionPhase==="wrapup";i++){
      try{
        const res = await fetch("/api/call/"+sessionCallId);
        const call = await res.json();
        if(call && (call.transcript || call.call_analysis)) sessionCall = call;
        paintWrapup(p);
        const cad = call?.call_analysis?.custom_analysis_data;
        if(cad && (cad.clinical_note || cad.action_items!==undefined)) break;
      }catch{}
      await new Promise(r=>setTimeout(r,2000));
    }
  }
  sessionGenerating = false;
  paintWrapup(p);
}
function wireSendEmr(){
  const btn = document.getElementById("btnSendEmr");
  if(!btn) return;
  if(sessionEmrSent){ btn.className="btn sent"; btn.textContent="✓ Sent to EMR"; btn.disabled=true; return; }
  btn.className="btn primary"; btn.disabled = false;
  btn.onclick = ()=>{
    sessionEmrSent = true;
    btn.className="btn sent"; btn.textContent=`✓ Sent to EMR · note ${(sessionCallId||"draft").slice(0,10)}`; btn.disabled=true;
  };
}
function renderSessionItems(){
  const box = document.getElementById("sessItems");
  if(!box) return;
  box.innerHTML = sessionItems.map((it,i)=>`
    <div class="aitem ${it.added?'added':''}">
      <div class="txt">${it.txt}<div class="who">${it.kind==='human'?iconHuman():iconAuto()} ${it.assignee}</div></div>
      <button data-i="${i}">${it.added?'✓ added':'+ add to tasks'}</button>
    </div>`).join("");
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    const i = +b.dataset.i, it = sessionItems[i];
    if(it.added) return;
    it.added = true;
    const p = currentSessionPatient();
    tasksByPatient[p.id].push({t:it.txt,s:"assigned · from Assist call notes",kind:it.kind==="human"?"assist":"auto",assignee:it.assignee,status:"pending"});
    sessionStats.items++;
    renderSessionItems();
  });
}
function advanceSession(){
  sessionPos++;
  if(sessionPos>=sessionQueue.length){ sessionPhase="done"; }
  else{ sessionPhase="context"; }
  renderSession();
}
document.getElementById("sessExit").onclick = document.getElementById("sessExitLbl").onclick = ()=>{ unmountVoiceAgent(document.getElementById("sessVoiceMount")); show("screen-worklist"); renderWorklist(); renderTiles(); };

/* ---------- navigation ---------- */
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.add("hidden"));document.getElementById(id).classList.remove("hidden");}
function loadPatient(i){
  current=i;const p=patients[i];
  document.getElementById("pName").textContent=p.n;
  document.getElementById("pAvatar").textContent=initials(p.n);
  document.getElementById("pMeta").textContent=`${p.a} · MRN ${p.mrn}`;
  document.getElementById("pPos").textContent=`${i+1} of ${patients.length} in cohort`;
  activeTask = 0;
  renderSynopsis();
  renderTasks();
  renderWorkarea();
  renderMini();
}
function openPatient(i){loadPatient(i);show("screen-patient");resetStates();}
function resetStates(){
  document.getElementById("synopsis").classList.remove("hidden");
  document.getElementById("records").classList.add("hidden");
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("workarea").classList.remove("hidden");
  document.getElementById("tasklist").classList.remove("collapsed");
  document.querySelectorAll(".railbtn[data-rec]").forEach(b=>b.classList.remove("active"));
  document.getElementById("miniwl").classList.add("hidden");
}

document.getElementById("crumbWorklist").onclick=()=>{show("screen-worklist");renderWorklist();renderTiles();};
document.getElementById("btnExpand").onclick=()=>{show("screen-worklist");renderWorklist();renderTiles();};
document.getElementById("btnPrev").onclick=()=>loadPatient((current+patients.length-1)%patients.length);
document.getElementById("btnNext").onclick=()=>loadPatient((current+1)%patients.length);
function toggleMini(){document.getElementById("miniwl").classList.toggle("hidden");}
document.getElementById("cohortChip").onclick=toggleMini;
document.getElementById("railExpand").onclick=toggleMini;
document.getElementById("miniClose").onclick=()=>document.getElementById("miniwl").classList.add("hidden");

document.querySelectorAll(".railbtn[data-rec]").forEach(b=>b.onclick=()=>{
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("workarea").classList.remove("hidden");
  document.querySelectorAll(".railbtn[data-rec]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  document.getElementById("synopsis").classList.add("hidden");
  const r=document.getElementById("records");r.classList.remove("hidden");
  document.getElementById("recSub").textContent="/ "+b.dataset.rec;
  document.getElementById("tasklist").classList.add("collapsed");
});
document.getElementById("recBack").onclick=()=>{
  document.getElementById("records").classList.add("hidden");
  document.getElementById("synopsis").classList.remove("hidden");
  document.querySelectorAll(".railbtn[data-rec]").forEach(x=>x.classList.remove("active"));
  if(document.getElementById("editor").classList.contains("hidden"))document.getElementById("tasklist").classList.remove("collapsed");
};

document.getElementById("themeToggle").onclick=()=>{
  const h=document.documentElement;h.dataset.theme=h.dataset.theme==="dark"?"light":"dark";
};

/* init */
renderTiles();
renderWorklist();
loadPatient(current);
