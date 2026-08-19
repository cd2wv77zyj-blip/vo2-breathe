
(() => {
"use strict";

const KEY = "vo2BreatheV2";
const LEGACY_VO2 = "vo2";

const defaults = {
  version: 7,
  health: {
    connected: false,
    latestVo2: null,
    latestVo2Date: null,
    latestRestingHR: null,
    latestHRV: null,
    workoutImportCount: 0
  },
  settings: {
    sound: true,
    haptics: true,
    breathingReminders: false,
    notifications: false,
    planPreferencesSaved: false
  },
  profile: {
    name: "", age: "", sex: "", weightLb: "", restingHR: "",
    level: "intermediate", daysPerWeek: 4, planWeeks: 4, vo2Goal: ""
  },
  vo2: [],
  workouts: [],
  breathSessions: [],
  co2Assessments: [],
  planCompletions: {},
  selectedProtocol: "recovery55",
  todayLayout:["todayPlan","trainingLoad","nextAction","vo2Trend"]
};

const protocols = [
{id:"recovery55",name:"Recovery 5.5",category:"Recover",desc:"Equal slow breathing for recovery and HRV",inhale:5.5,exhale:5.5,hold:0,minutes:6,instruction:"Breathe lightly and comfortably. Keep the inhale and exhale smooth and equal."},
{id:"recoveryDownshift",name:"Recovery Downshift",category:"Recover",desc:"Post-workout downshift at six breaths per minute",inhale:4,exhale:6,hold:0,minutes:5,instruction:"Use after your breathing begins to settle from exercise. Keep every breath gentle and unforced."},
{id:"sleepDownshift",name:"Sleep Downshift",category:"Recover",desc:"Comfortable slow breathing before sleep",inhale:4,exhale:6,hold:0,minutes:10,instruction:"Stay at 4 in / 6 out. If an 8-second exhale feels effortless, lengthen it; comfort matters more than the number."},
{id:"resonance6",name:"Resonance 6",category:"Recover",desc:"Dedicated slow-breathing / HRV practice",inhale:4,exhale:6,hold:0,minutes:10,instruction:"Breathe quietly for ten minutes. This is a standalone slow-breathing practice rather than a workout cooldown."},
{id:"performancePrimer",name:"Performance Primer",category:"Perform",desc:"Progressive breathing to prepare for training",inhale:4,exhale:4,hold:0,minutes:3,instruction:"Minute 1: 4 in / 4 out. Minute 2: 3 / 3. Minute 3: 2 / 2. Finish alert and ready to move, never lightheaded."},
{id:"morningRise",name:"Morning Rise",category:"Perform",desc:"Controlled morning activation",inhale:2,exhale:2,hold:0,minutes:5,instruction:"2 in / 2 out for two minutes, 3 / 3 for two minutes, then normal breathing for one minute. Sit or stand upright."},
{id:"box4",name:"Box 4",category:"Focus",desc:"Structured breathing for focus and composure",inhale:4,exhale:4,hold:4,minutes:5,instruction:"4 in · 4 hold · 4 out · 4 hold. Keep every phase comfortable."},
{id:"extendedBox",name:"Extended Box",category:"Focus",desc:"Long-exhale box breathing for calm and control",inhale:4,exhale:8,hold:4,minutes:6,instruction:"Intermediate: 4 in · 4 hold · 8 out · 4 hold. Return to Box 4 if the post-exhale hold feels uncomfortable."},
{id:"478",name:"4–7–8 Downshift",category:"Focus",desc:"Slow structured breathing for relaxation",inhale:4,exhale:8,hold:7,minutes:1.9,instruction:"4 in · 7 hold · 8 out. Standard session: 6 cycles. Use 4 cycles if new to the pattern."},
{id:"boltReset",name:"BOLT Reset",category:"Train",desc:"CO₂ comfort and breathing awareness",inhale:4,exhale:6,hold:8,minutes:5,instruction:"Exhale normally, then hold comfortably only until the first clear desire to breathe. The on-screen hold is a short ceiling, not a target to push through. Resume gentle nasal breathing."},
{id:"hypoxicTolerance",name:"Hypoxic Tolerance",category:"Train · Advanced",desc:"Fixed progressive exhale holds: 6 · 8 · 10 · 12 sec",inhale:4,exhale:6,hold:6,minutes:6,instruction:"Advanced: 60 sec preparation, then fixed exhale holds of 6, 8, 10 and 12 seconds with relaxed recovery. Never hyperventilate first."}
];

const V8_CATEGORY_CONFIG = {
  recover:{
    key:"recover",
    label:"RECOVER",
    className:"category-recover",
    tagline:"Restore · Downshift · Support HRV"
  },
  perform:{
    key:"perform",
    label:"PERFORM",
    className:"category-perform",
    tagline:"Activate · Prime · Energize"
  },
  focus:{
    key:"focus",
    label:"FOCUS",
    className:"category-focus",
    tagline:"Focus · Composure · Control"
  },
  train:{
    key:"train",
    label:"TRAIN · ADVANCED",
    className:"category-train",
    tagline:"Build Tolerance · Train Breath Control"
  }
};

function categoryKeyForProtocol(p){
  if(p.category==="Perform") return "perform";
  if(p.category==="Focus") return "focus";
  if(String(p.category).startsWith("Train")) return "train";
  return "recover";
}
function categoryConfigForProtocol(p){
  return V8_CATEGORY_CONFIG[categoryKeyForProtocol(p)];
}

function categoryIconSvg(key){
  if(key==="recover"){
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2 4.2 12.7A5.3 5.3 0 0 1 11.7 5l.3.3.3-.3a5.3 5.3 0 0 1 7.5 7.7Z"></path></svg>`;
  }
  if(key==="perform"){
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.8" cy="4.4" r="1.8"></circle><path d="m12.8 8.2-3.2 3.1-3.3-.6M12.8 8.2l3.2 2.4 3.3-.3M12 11.2l-2 4.1-4 3.2M12 11.2l3.2 4.2 3.4 2.1"></path></svg>`;
  }
  if(key==="focus"){
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.7"></circle><circle cx="12" cy="12" r="1.5"></circle><path d="m15.3 8.7 4.5-4.5M16.5 4.2h3.3v3.3"></path></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.5 18.5 5.6-10 3.1 5.1 3.4-7.1 6.9 12H2.5Z"></path><path d="m6.3 11.7 1.8 1.5 1.9-2.1M13.3 9.2l1.4 1.2 1.6-1.4"></path></svg>`;
}

function protocolDisplaySummary(p){
  const summaries={
    recovery55:"5.5s in · 5.5s out",
    recoveryDownshift:"4s in · 6s out",
    sleepDownshift:"4s in · 6s out · optional 8s out",
    resonance6:"4s in · 6s out",
    performancePrimer:"4→3→2 in · 4→3→2 out",
    morningRise:"2→3 in · 2→3 out · normal breathing",
    box4:"4s in · 4s hold · 4s out · 4s hold",
    extendedBox:"4s in · 4s hold · 8s out · 4s hold",
    "478":"4s in · 7s hold · 8s out",
    boltReset:"Normal exhale · comfortable hold · recovery",
    hypoxicTolerance:"4s in · 6s out · holds 6/8/10/12s"
  };
  return summaries[p.id] || `${p.inhale}s in · ${p.exhale}s out`;
}
function protocolDurationLabel(p){
  if(p.id==="478") return "6 CYCLES";
  if(p.id==="boltReset") return "~5 MIN";
  if(p.id==="hypoxicTolerance") return "~6 MIN";
  return `${p.minutes} MIN`;
}
function protocolRateLabel(p){
  if(p.id==="recovery55") return "~5.5";
  if(["recoveryDownshift","sleepDownshift","resonance6"].includes(p.id)) return "~6";
  if(p.id==="box4") return "~3.8";
  if(p.id==="extendedBox") return "~3";
  if(p.id==="478") return "6";
  return "—";
}
function formatPhaseValue(v){
  const n=Number(v);
  if(!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function renderBreathingLibrary(){
  const root=$("#breathingLibraryGroups");
  if(!root)return;

  const groups=[
    {key:"recover", protocols:protocols.filter(p=>categoryKeyForProtocol(p)==="recover")},
    {key:"perform", protocols:protocols.filter(p=>categoryKeyForProtocol(p)==="perform")},
    {key:"focus", protocols:protocols.filter(p=>categoryKeyForProtocol(p)==="focus")},
    {key:"train", protocols:protocols.filter(p=>categoryKeyForProtocol(p)==="train")}
  ];

  root.innerHTML=groups.map(group=>{
    const meta=V8_CATEGORY_CONFIG[group.key];
    return `<section class="v8-library-category ${meta.className}">
      <div class="v8-library-category-heading">
        <div class="v8-category-heading-left">
          <span class="v8-category-icon">${categoryIconSvg(group.key)}</span>
          <div>
            <strong>${meta.label}</strong>
            <small>${meta.tagline}</small>
          </div>
        </div>
        <span class="v8-library-count">${group.protocols.length} protocol${group.protocols.length===1?"":"s"}</span>
      </div>

      <div class="v8-protocol-list">
        ${group.protocols.map(p=>`
          <button type="button" class="v8-protocol-row library-protocol-row" data-library-protocol="${p.id}">
            <span class="v8-protocol-number">${protocols.indexOf(p)+1}</span>
            <span class="v8-protocol-copy">
              <strong>${p.name}</strong>
              <small>${protocolDisplaySummary(p)}</small>
            </span>
            <span class="v8-protocol-duration">${protocolDurationLabel(p)}</span>
            <span class="v8-protocol-chevron">›</span>
          </button>`).join("")}
      </div>
    </section>`;
  }).join("");

  root.querySelectorAll("[data-library-protocol]").forEach(row=>{
    row.addEventListener("click",()=>openProtocolDetail(row.dataset.libraryProtocol));
  });
}

function openProtocolDetail(id){
  const p=protocols.find(x=>x.id===id);
  if(!p)return;
  state.selectedProtocol=p.id;
  saveState();
  $("#breatheLibraryView").hidden=true;
  $("#breatheDetailView").hidden=false;
  setBreathPlayer(p);
  renderProtocols();
  window.scrollTo({top:0,behavior:"instant"});
}
function closeProtocolDetail(){
  if(breathRuntime.running) stopBreath(false);
  $("#breatheDetailView").hidden=true;
  $("#breatheLibraryView").hidden=false;
  window.scrollTo({top:0,behavior:"instant"});
}
function showBreatheLibrary(){
  const lib=$("#breatheLibraryView"),detail=$("#breatheDetailView");
  if(lib && detail){
    detail.hidden=true;
    lib.hidden=false;
  }
}

function phaseCardsForProtocol(p){
  if(p.id==="performancePrimer") return [["Minute 1","4 / 4"],["Minute 2","3 / 3"],["Minute 3","2 / 2"]];
  if(p.id==="morningRise") return [["Minutes 1–2","2 / 2"],["Minutes 3–4","3 / 3"],["Minute 5","Normal"]];
  if(p.id==="box4") return [["Inhale","4s"],["Hold","4s"],["Exhale","4s"],["Hold","4s"]];
  if(p.id==="extendedBox") return [["Inhale","4s"],["Hold","4s"],["Exhale","8s"],["Hold","4s"]];
  if(p.id==="478") return [["Inhale","4s"],["Hold","7s"],["Exhale","8s"]];
  if(p.id==="boltReset") return [["Settle","1:00"],["Hold","Comfortable"],["Recover","1:00"]];
  if(p.id==="hypoxicTolerance") return [["Prepare","4 / 6"],["Hold 1","6s"],["Hold 2","8s"],["Hold 3","10s"],["Hold 4","12s"]];
  return [["Inhale",`${formatPhaseValue(p.inhale)}s`],["Exhale",`${formatPhaseValue(p.exhale)}s`]];
}
function renderPhaseCards(p){
  const root=$("#breathPhaseCards");
  if(!root)return;
  root.innerHTML=phaseCardsForProtocol(p).map((item,i)=>`
    <div class="v8-phase-card ${i===0?"active":""}">
      <span>${item[0]}</span>
      <strong>${item[1]}</strong>
    </div>`).join("");
}
function updateDetailTheme(p){
  const meta=categoryConfigForProtocol(p);
  const player=$("#breathPlayer");
  if(player){
    player.classList.remove("category-recover","category-perform","category-focus","category-train");
    player.classList.add(meta.className);
  }
  $("#breathCategoryTop").textContent=meta.label;
  $("#breathPurposePill").innerHTML=`<span class="v8-purpose-icon">${categoryIconSvg(meta.key)}</span><span>${meta.tagline}</span>`;
  $("#breathHowIcon").innerHTML=categoryIconSvg(meta.key);
  $("#breathRateMetric").textContent=protocolRateLabel(p);
  $("#breathRateLabel").textContent=p.id==="478" ? "CYCLES" : "BREATHS / MIN";
  renderPhaseCards(p);
}
function sessionProgressLabel(){
  if(!breathRuntime.running || breathRuntime.paused) return breathRuntime.paused ? "Paused" : "Ready";
  const p=breathRuntime.protocol;
  const elapsed=Math.max(0,performance.now()-breathRuntime.startedAt);
  const ratio=clamp(elapsed/Math.max(1,breathRuntime.durationMs),0,1);
  if(p?.id==="478") return `${Math.min(6,Math.max(1,Math.ceil(ratio*6)))} / 6 cycles`;
  if(p?.id==="boltReset") return `Round ${Math.min(3,Math.max(1,Math.ceil(ratio*3)))} of 3`;
  if(p?.id==="hypoxicTolerance") return `Round ${Math.min(4,Math.max(1,Math.ceil(ratio*4)))} of 4`;
  return `${Math.round(ratio*100)}%`;
}


let state = loadState();
const protocolAliases={extended:"recoveryDownshift",co2:"hypoxicTolerance",primer:"performancePrimer",easy:"recoveryDownshift"};
if(protocolAliases[state.selectedProtocol]){state.selectedProtocol=protocolAliases[state.selectedProtocol];saveState();}
let breathRuntime = {
  running:false, protocol:null, startedAt:0, durationMs:0,
  phaseIndex:0, phaseStartedAt:0, phaseDuration:0, timer:null,
  audio:true, haptics:true, audioContext:null, wakeLock:null, breathFrame:null,
  customTimeline:null, paused:false, pauseStartedAt:0, currentPhase:null
};

function $(s){ return document.querySelector(s); }
function $$(s){ return [...document.querySelectorAll(s)]; }
function nowISO(){ return new Date().toISOString(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function clamp(n,a,b){ return Math.min(b,Math.max(a,n)); }
function round1(n){ return Math.round(n*10)/10; }
function daysAgo(n){ return Date.now() - n*86400000; }
function validNumber(v,min,max){ const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max ? n : null; }

function loadState(){
  try{
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if(parsed && (parsed.version === 2 || parsed.version === 3 || parsed.version === 4 || parsed.version === 5 || parsed.version === 6 || parsed.version === 7)) {
      return {
        ...defaults,
        ...parsed,
        version: 7,
        health: {...defaults.health, ...(parsed.health || {})},
        settings: {...defaults.settings, ...(parsed.settings || {})},
        profile:{...defaults.profile,...parsed.profile},
        todayLayout:Array.isArray(parsed.todayLayout)?parsed.todayLayout:[...defaults.todayLayout]
      };
    }
  }catch(_){}
  const next = structuredClone ? structuredClone(defaults) : JSON.parse(JSON.stringify(defaults));
  try{
    const legacy = Number(localStorage.getItem(LEGACY_VO2));
    if(Number.isFinite(legacy) && legacy >= 10 && legacy <= 100){
      next.vo2.push({id:cryptoId(), date:todayISO(), value:round1(legacy), method:"Imported prototype value"});
    }
  }catch(_){}
  return next;
}
function saveState(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }
function cryptoId(){ try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2);} }

function showToast(text){
  const el=$("#toast"); el.textContent=text; el.classList.add("show");
  clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove("show"),2200);
}

function formatDate(dateString){
  const d = new Date(dateString.length===10 ? dateString+"T12:00:00" : dateString);
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function formatTimer(totalSec){
  totalSec=Math.max(0,Math.ceil(totalSec));
  return `${Math.floor(totalSec/60)}:${String(totalSec%60).padStart(2,"0")}`;
}

function vo2Tier(v){
  if(v == null) return "No baseline";
  // Prototype display tiers only; production will use validated age/sex-specific norms.
  if(v>=55) return "Superior";
  if(v>=48) return "Excellent";
  if(v>=40) return "Good";
  if(v>=32) return "Fair";
  return "Developing";
}
function latestVo2(){
  if(state.health?.connected && Number.isFinite(Number(state.health.latestVo2))){
    return {
      id:"healthkit-latest",
      date:state.health.latestVo2Date || todayISO(),
      value:Number(state.health.latestVo2),
      method:"Apple Health"
    };
  }
  return [...state.vo2].sort((a,b)=>new Date(b.date)-new Date(a.date))[0] || null;
}
function sortedVo2(){ return [...state.vo2].sort((a,b)=>new Date(a.date)-new Date(b.date)); }

function navigate(name){
  const previous=document.querySelector('.screen.active[data-screen]')?.dataset.screen;
  if(breathRuntime.running && name!=="breathe") stopBreath(false);
  if(name==="breathe" && previous!=="breathe") showBreatheLibrary();
  $$("[data-screen]").forEach(el=>el.classList.toggle("active",el.dataset.screen===name));
  $$("[data-tab]").forEach(el=>el.classList.toggle("active",el.dataset.tab===name));
  window.scrollTo({top:0,behavior:"instant"});
  renderAll();
}
$$("[data-tab]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.tab)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));

function renderAll(){
  renderHealthStatus();
  renderToday();
  renderTodaysPlan();
  renderTrainingLoad();
  applyTodayLayout();
  renderPlanControls();
  renderTrainingPlan();
  renderBreathingLibrary();
  renderProtocols();
  renderBreathStats();
  prefillLogForms();
  renderProgress();
}

function renderHealthStatus(){
  const connected=!!state.health?.connected;
  $("#healthStatusTitle").textContent=connected?"Apple Health connected":"Connect your health data";
  $("#healthStatusBadge").textContent=connected?"Connected":"Not connected";
  $("#healthStatusCopy").textContent=connected
    ? "VO₂ max and available fitness data are being treated as the preferred source before manual entry."
    : "In the native iPhone build, Apple Health will supply your latest VO₂ max, workouts, resting heart rate, HRV, and other available metrics automatically.";
  $("#healthConnectButton").textContent=connected?"Health data connected":"Connect Apple Health";
  $("#healthConnectButton").disabled=connected;

  const profileBtn=$("#profileHealthButton");
  if(profileBtn){
    profileBtn.textContent=connected?"Apple Health connected":"Connect Apple Health";
    profileBtn.disabled=connected;
  }

  if(connected && state.health.latestRestingHR){
    $("#restingHrMetric").textContent=state.health.latestRestingHR;
  }
}

function explainHealthConnection(){
  alert(
    "Apple Health connection is staged for the native iPhone build. " +
    "A web/PWA cannot request HealthKit permission directly. In the native build, " +
    "this button will open Apple’s Health authorization sheet and sync your latest VO₂ max, workouts, resting heart rate, and available recovery metrics."
  );
}


function workoutLoad(workout){
  const duration=Number(workout.duration||0);
  const rpe=Number(workout.rpe||5);
  return Math.max(0,Math.round(duration*rpe*.55));
}
function breathLoad(session){
  const min=Number(session.minutes||0);
  const p=protocols.find(x=>x.id===session.protocolId);
  const factor=p?.category?.startsWith("Train")?7:p?.category==="Perform"?4:5;
  return Math.max(0,Math.round(min*factor));
}
function weeklyTrainingLoad(){
  const workouts=state.workouts.filter(x=>new Date(x.date).getTime()>=daysAgo(7));
  const breaths=state.breathSessions.filter(x=>new Date(x.date).getTime()>=daysAgo(7));
  const workout=workouts.reduce((sum,x)=>sum+workoutLoad(x),0);
  const breath=breaths.reduce((sum,x)=>sum+breathLoad(x),0);
  return {workout,breath,total:workout+breath};
}
function renderTrainingLoad(){
  const load=weeklyTrainingLoad();
  const total=Math.max(1,load.total);
  $("#weeklyLoadTotal").textContent=load.total;
  $("#weeklyWorkoutLoad").textContent=load.workout;
  $("#weeklyBreathLoad").textContent=load.breath;
  $("#weeklyWorkoutPct").textContent=`${Math.round(load.workout/total*100)}%`;
  $("#weeklyBreathPct").textContent=`${Math.round(load.breath/total*100)}%`;
  const targetLow=150,targetHigh=500;
  $("#weeklyLoadMeter").style.width=`${clamp(load.total/targetHigh*100,0,100)}%`;
  $("#weeklyLoadStatus").textContent=
    load.total<targetLow?"Building your week":
    load.total<=targetHigh?"You’re on track":"High load — prioritize recovery";
}


function currentPlannedSession(){
  const plan=generatePlan();
  if(!plan.length) return null;
  // Prefer first incomplete session in week 1 for the prototype until native calendar scheduling is added.
  for(const w of plan){
    for(let i=0;i<w.sessions.length;i++){
      const key=`w${w.week}s${i}`;
      if(!state.planCompletions[key]) return {...w.sessions[i],week:w.week,index:i,key};
    }
  }
  return {...plan[0].sessions[0],week:1,index:0,key:"w1s0"};
}
function planItemIcon(kind){
  if(kind==="breath") return `<svg viewBox="0 0 24 24"><path d="M3 8c3-3 5 3 8 0s5 3 10 0M3 12c3-3 5 3 8 0s5 3 10 0M3 16c3-3 5 3 8 0s5 3 10 0"></path></svg>`;
  if(kind==="hard") return `<svg viewBox="0 0 24 24"><path d="M4 18h3v-5H4zM10.5 18h3V9h-3zM17 18h3V5h-3z"></path></svg>`;
  return `<svg viewBox="0 0 24 24"><path d="M4 15c3 0 4-5 7-5 2 0 3 4 6 4 1 0 2-.3 3-1v4c-4 2-7 2-10 1-3-1-5-1-6-3z"></path></svg>`;
}
function renderTodaysPlan(){
  const root=$("#todaysPlanItems");
  if(!root) return;
  const s=currentPlannedSession();
  if(!s){
    root.innerHTML='<div class="empty-copy">No planned session yet.</div>';
    return;
  }
  const items=[];
  items.push({
    kind:s.kind,
    title:s.type,
    detail:`Week ${s.week} · ${s.detail}`,
    action:"Today",
    protocol:null
  });
  const addBreath=(id,action,when)=>{const p=protocols.find(x=>x.id===id);if(p)items.push({kind:"breath",title:p.name,detail:`${when} · ${p.minutes>=2?Math.round(p.minutes)+" min":"6 cycles"}`,action,protocol:id});};
  if(s.kind==="breath" && s.protocol){ addBreath(s.protocol,"Start","Breathing session"); }
  else { if(s.preBreath)addBreath(s.preBreath,"Before","Before workout"); if(s.postBreath)addBreath(s.postBreath,"After",s.kind==="recovery"?"Recovery":"After workout"); }
  root.innerHTML=items.map(item=>`<div class="plan-item" ${item.protocol?`data-protocol="${item.protocol}"`:""}>
    <div class="plan-item-icon">${planItemIcon(item.kind)}</div>
    <div class="plan-item-copy"><strong>${item.title}</strong><small>${item.detail}</small></div>
    <span class="plan-item-action">${item.action}</span>
  </div>`).join("");
  root.querySelectorAll("[data-protocol]").forEach(row=>row.addEventListener("click",()=>{
    state.selectedProtocol=row.dataset.protocol;saveState();navigate("breathe");
    requestAnimationFrame(()=>openProtocolDetail(row.dataset.protocol));
  }));
}
function applyTodayLayout(){
  const screen=document.querySelector('[data-screen="today"]');
  if(!screen)return;
  const layout=Array.isArray(state.todayLayout)?state.todayLayout:defaults.todayLayout;
  const widgets=[...screen.querySelectorAll(".today-widget")];
  const note=screen.querySelector("#todayEditHint");
  layout.forEach(id=>{
    const el=screen.querySelector(`.today-widget[data-widget-id="${id}"]`);
    if(el) screen.insertBefore(el,note);
  });
  widgets.filter(w=>!layout.includes(w.dataset.widgetId)).forEach(w=>screen.insertBefore(w,note));
}
let todayEditMode=false,todayHoldTimer=null,todayDragging=null;
function setTodayEditMode(on){
  todayEditMode=on;
  const screen=document.querySelector('[data-screen="today"]');
  if(!screen)return;
  screen.classList.toggle("today-edit-mode",on);
  $("#todayEditHint").hidden=!on;
}
function persistTodayOrder(){
  const screen=document.querySelector('[data-screen="today"]');
  state.todayLayout=[...screen.querySelectorAll(".today-widget")].map(x=>x.dataset.widgetId);
  saveState();
}

function captureWidgetPositions(){
  const screen=document.querySelector('[data-screen="today"]');
  const map=new Map();
  if(!screen) return map;
  screen.querySelectorAll(".today-widget").forEach(el=>map.set(el,el.getBoundingClientRect()));
  return map;
}
function animateWidgetReflow(before){
  const screen=document.querySelector('[data-screen="today"]');
  if(!screen)return;
  screen.querySelectorAll(".today-widget").forEach(el=>{
    const first=before.get(el),last=el.getBoundingClientRect();
    if(!first)return;
    const dy=first.top-last.top;
    if(Math.abs(dy)<1)return;
    el.animate([{transform:`translateY(${dy}px)`},{transform:"translateY(0)"}],
      {duration:220,easing:"cubic-bezier(.2,.8,.2,1)"});
  });
}
function wireTodayReorder(){
  const screen=document.querySelector('[data-screen="today"]');
  if(!screen)return;

  let active=null,placeholder=null,hold=null,startY=0,grabOffset=0;
  let dragging=false;

  function begin(widget,clientY){
    clearTimeout(hold);
    startY=clientY;
    hold=setTimeout(()=>{
      const rect=widget.getBoundingClientRect();
      dragging=true;
      active=widget;
      setTodayEditMode(true);

      placeholder=document.createElement("div");
      placeholder.className="today-drop-placeholder";
      placeholder.style.height=`${rect.height}px`;
      widget.after(placeholder);

      widget.classList.add("dragging","editing","floating-drag");
      widget.style.width=`${rect.width}px`;
      widget.style.left=`${rect.left}px`;
      widget.style.top=`${rect.top}px`;
      widget.style.height=`${rect.height}px`;
      grabOffset=clientY-rect.top;
      document.body.appendChild(widget);

      widget.animate([
        {transform:"scale(1)",boxShadow:"0 0 0 rgba(0,0,0,0)"},
        {transform:"scale(1.018)",boxShadow:"0 20px 46px rgba(0,0,0,.32)"}
      ],{duration:180,easing:"ease-out",fill:"forwards"});
    },430);
  }

  function move(clientY,event){
    if(!dragging || !active)return;
    if(event?.cancelable)event.preventDefault();

    const top=clientY-grabOffset;
    active.style.top=`${top}px`;

    const before=captureWidgetPositions();
    const widgets=[...screen.querySelectorAll(".today-widget")];
    let inserted=false;
    for(const target of widgets){
      const r=target.getBoundingClientRect();
      if(clientY<r.top+r.height/2){
        target.before(placeholder);
        inserted=true;
        break;
      }
    }
    if(!inserted){
      const hint=$("#todayEditHint");
      if(hint)screen.insertBefore(placeholder,hint);
      else screen.appendChild(placeholder);
    }
    animateWidgetReflow(before);
  }

  function finish(){
    clearTimeout(hold);
    if(!dragging){active=null;return;}
    const finalRect=placeholder.getBoundingClientRect();
    active.style.transition="top .18s ease,left .18s ease,transform .18s ease";
    active.style.top=`${finalRect.top}px`;
    active.style.left=`${finalRect.left}px`;
    active.style.transform="scale(1)";
    setTimeout(()=>{
      placeholder.replaceWith(active);
      active.classList.remove("dragging","editing","floating-drag");
      active.removeAttribute("style");
      persistTodayOrder();
      active=null;placeholder=null;dragging=false;
    },190);
  }

  screen.querySelectorAll(".today-widget").forEach(widget=>{
    widget.addEventListener("touchstart",e=>{
      if(e.target.closest("button,input,select,a") || e.touches.length!==1)return;
      begin(widget,e.touches[0].clientY);
    },{passive:true});
    widget.addEventListener("touchmove",e=>{
      if(!dragging && active==null && Math.abs((e.touches[0]?.clientY||0)-startY)>10){
        clearTimeout(hold);
      }
      if(e.touches.length===1)move(e.touches[0].clientY,e);
    },{passive:false});
    widget.addEventListener("touchend",finish,{passive:true});
    widget.addEventListener("touchcancel",finish,{passive:true});
  });
}

function renderToday(){
  const latest=latestVo2();
  $("#todayGreeting").textContent = state.profile.name ? `Hi ${state.profile.name}. Keep the next useful step simple.` : "Your training, breathing, and progress in one place.";
  $("#currentVo2").textContent = latest ? latest.value.toFixed(1) : "--";
  $("#vo2Tier").textContent = latest ? vo2Tier(latest.value) : "No baseline";
  $("#vo2Gauge").style.width = latest ? `${clamp(latest.value/70*100,4,100)}%` : "0%";

  const values=sortedVo2();
  if(values.length>=2){
    const diff=round1(values.at(-1).value-values[0].value);
    $("#vo2Trend").textContent=`${diff>=0?"↑":"↓"} ${Math.abs(diff).toFixed(1)} since ${formatDate(values[0].date)}`;
  }else if(latest){
    $("#vo2Trend").textContent=`Baseline logged ${formatDate(latest.date)}`;
  }else{
    $("#vo2Trend").textContent="Log a test to establish your baseline.";
  }

  $("#restingHrMetric").textContent=state.profile.restingHR || "--";
  const breath7=state.breathSessions.filter(x=>new Date(x.date).getTime()>=daysAgo(7)).reduce((s,x)=>s+x.minutes,0);
  const workouts7=state.workouts.filter(x=>new Date(x.date).getTime()>=daysAgo(7)).length;
  $("#breathMinutesMetric").textContent=Math.round(breath7);
  $("#workoutCountMetric").textContent=workouts7;

  const next = chooseNextAction();
  $("#nextActionTitle").textContent=next.title;
  $("#nextActionCopy").textContent=next.copy;
  $("#nextActionButton").textContent=next.button;
  $("#nextActionButton").onclick=next.action;
  renderChart($("#todayChart"), values.slice(-6));
}
function chooseNextAction(){
  if(!state.profile.age || !state.profile.level){
    return {title:"Set up your profile",copy:"Your training frequency and starting level drive the plan.",button:"Set up profile",action:openProfile};
  }
  if(!latestVo2()){
    return {
      title:"Establish your VO₂ baseline",
      copy:"No VO₂ max is available yet. In the native app we’ll check Apple Health first; field tests are the fallback.",
      button:"Log a test",
      action:()=>navigate("log")
    };
  }
  const today=new Date().getDay();
  const breathRecent=state.breathSessions.some(x=>new Date(x.date).getTime()>=daysAgo(2));
  if(!breathRecent){
    return {title:"Add a short breathing session",copy:"A recovery or control session takes 4–8 minutes.",button:"Start breathing",action:()=>navigate("breathe")};
  }
  return {title:"Continue your 4-week build",copy:"Complete the next planned aerobic session, then mark it done.",button:"View training",action:()=>navigate("train")};
}

function renderChart(container, points){
  if(!points.length){
    container.innerHTML='<div class="chart-empty">No VO₂ milestones yet</div>'; return;
  }
  const vals=points.map(x=>x.value), min=Math.min(...vals), max=Math.max(...vals);
  const spread=Math.max(4,max-min);
  container.innerHTML=points.map((p,i)=>{
    const h=34+((p.value-min)/spread)*100;
    return `<div class="chart-col" title="${p.value.toFixed(1)}"><div class="chart-bar" style="height:${h}px"></div><span class="chart-label">${formatDate(p.date)}</span></div>`;
  }).join("");
}

function renderPlanControls(){
  $("#planLevel").value=state.profile.level || "intermediate";
  $("#planDays").value=String(state.profile.daysPerWeek || 4);
  $("#planWeeks").value=String(state.profile.planWeeks || 4);
}
$("#regeneratePlan").addEventListener("click",()=>{
  state.profile.level=$("#planLevel").value;
  state.profile.daysPerWeek=Number($("#planDays").value);
  state.profile.planWeeks=Number($("#planWeeks").value);
  state.planCompletions={};
  saveState(); renderAll(); showToast("Plan regenerated");
});
$("#planLevel").addEventListener("change",()=>{});
$("#planDays").addEventListener("change",()=>{});

function adaptiveMode(){
  const recent=Object.values(state.planCompletions).filter(Boolean).length;
  const workouts14=state.workouts.filter(x=>new Date(x.date).getTime()>=daysAgo(14)).length;
  if(recent>=6 || workouts14>=6) return "progress";
  return "base";
}
function generatePlan(){
  const level=state.profile.level || "intermediate";
  const days=Number(state.profile.daysPerWeek || 4);
  const weeks=clamp(Number(state.profile.planWeeks || 4),4,8);
  const mode=adaptiveMode();
  const zoneBase=level==="beginner"?25:level==="intermediate"?35:45;
  const intervalBase=level==="beginner"?4:level==="intermediate"?5:6;

  return Array.from({length:weeks},(_,idx)=>{
    const week=idx+1;
    const midReset=weeks>=7 && week===4;
    const finalConsolidation=week===weeks;
    const recoveryWeek=midReset || finalConsolidation;

    let buildIndex=week-1+(mode==="progress"?1:0);
    if(weeks>=7 && week>4) buildIndex-=1;

    const z=zoneBase+(recoveryWeek?5:Math.min(buildIndex,4)*5);
    const reps=recoveryWeek ? intervalBase : intervalBase+Math.min(Math.max(buildIndex,0),2);

    let sessions=[
      {type:"Zone 2",detail:`${z} min conversational aerobic work`,kind:"aerobic",postBreath:"recoveryDownshift"},
      {type:"Intervals",detail:`${reps} × 3 min hard / 3 min easy; controlled, not maximal`,kind:"hard",preBreath:"performancePrimer",postBreath:"recoveryDownshift"},
      {type:"Zone 2",detail:`${z+10} min easy-moderate endurance`,kind:"aerobic",postBreath:"recovery55"},
      {type:"Breath",detail:recoveryWeek?"5 min focus breathing":"10 min dedicated slow breathing",kind:"breath",protocol:recoveryWeek?"box4":"resonance6"},
      {type:"Recovery",detail:"20–30 min easy movement + recovery breathing",kind:"recovery",postBreath:"recovery55"},
      {type:"Optional",detail:"Easy aerobic volume only if well recovered",kind:"optional"}
    ];

    if(recoveryWeek){
      sessions=sessions.map(s=>{
        if(s.type==="Intervals") return {...s,detail:`${Math.max(3,reps-1)} × 2 min controlled hard / 3 min easy; lower-volume consolidation`};
        if(s.type==="Zone 2") return {...s,detail:s.detail.replace(/\d+ min/,`${Math.max(20,z-5)} min`)};
        return s;
      });
    }

    sessions=sessions.slice(0,days);
    const names=["Mon","Tue","Wed","Thu","Fri","Sat"];
    return {
      week,
      deload:recoveryWeek,
      label:midReset?"RESET":finalConsolidation?"CONSOLIDATE":"BUILD",
      sessions:sessions.map((s,i)=>({...s,day:names[i]}))
    };
  });
}

function renderBreathCompanion(session){
  if(session.kind==="hard"){
    return `<div class="breath-companion">
      <button class="breath-tag" data-breath-id="primer">Pre · 3 min Primer</button>
      <button class="breath-tag" data-breath-id="recovery55">Post · Recovery Breathing</button>
    </div>`;
  }
  if(session.kind==="aerobic"){
    return `<div class="breath-companion"><button class="breath-tag" data-breath-id="recovery55">Post · Recovery Breathing</button></div>`;
  }
  if(session.kind==="recovery"){
    return `<div class="breath-companion"><button class="breath-tag" data-breath-id="extended">During/after · Extended Exhale</button></div>`;
  }
  if(session.kind==="breath"){
    return `<div class="breath-companion"><button class="breath-tag" data-breath-id="co2">Complete on Breathe tab</button></div>`;
  }
  return "";
}

function renderTrainingPlan(){
  const plan=generatePlan();
  $("#trainingPlan").innerHTML=plan.map(w=>{
    const done=w.sessions.filter((_,i)=>state.planCompletions[`w${w.week}s${i}`]).length;
    return `<article class="week-card">
      <div class="week-header"><div><p class="eyebrow">${w.label || (w.deload?"CONSOLIDATE":"BUILD")}</p><h2>Week ${w.week}</h2></div><small>${done}/${w.sessions.length} done</small></div>
      ${w.sessions.map((s,i)=>{
        const key=`w${w.week}s${i}`, completed=!!state.planCompletions[key];
        return `<div class="training-session">
          <div class="day-pill">${s.day}</div>
          <div class="session-copy"><strong>${s.type}</strong><small>${s.detail}</small>${renderBreathCompanion(s)}</div>
          <button class="complete-button ${completed?"done":""}" data-complete="${key}" aria-label="Mark ${s.type} complete">${completed?"✓":"○"}</button>
        </div>`;
      }).join("")}
    </article>`;
  }).join("");
  $$(".breath-tag").forEach(tag=>tag.addEventListener("click",()=>{
    const protocolId=tag.dataset.breathId;
    if(protocolId && protocols.some(p=>p.id===protocolId)){
      state.selectedProtocol=protocolId;
      saveState();
    }
    navigate("breathe");
    requestAnimationFrame(()=>openProtocolDetail(state.selectedProtocol));
  }));
  $$("[data-complete]").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.complete; state.planCompletions[key]=!state.planCompletions[key];
    saveState(); renderTrainingPlan(); renderToday();
  }));
}

function selectedProtocol(){ return protocols.find(p=>p.id===state.selectedProtocol)||protocols[0]; }
function renderProtocols(){
  const currentIndex=Math.max(0,protocols.findIndex(p=>p.id===state.selectedProtocol));
  $("#protocolCounter").textContent=`${currentIndex+1} / ${protocols.length}`;
  $("#protocolCards").innerHTML=protocols.map((p,i)=>`<button data-protocol="${p.id}" data-index="${i}" tabindex="-1">${p.name}</button>`).join("");
  $("#protocolDots").innerHTML=protocols.map((p,i)=>`<button class="protocol-dot ${i===currentIndex?"active":""}" data-dot-index="${i}" aria-label="${p.name}"></button>`).join("");
  $$("[data-dot-index]").forEach(dot=>dot.addEventListener("click",()=>{
    const next=Number(dot.dataset.dotIndex);
    const current=Math.max(0,protocols.findIndex(p=>p.id===state.selectedProtocol));
    const direction=next===current?0:(next>current?1:-1);
    if(!direction) return;
    animateProtocolChange(direction,next);
  }));
  setBreathPlayer(selectedProtocol(), false);
  updateBreatheHeader();
}

function updateBreatheHeader(){
  const p=selectedProtocol();
  updateDetailTheme(p);
  $("#breatheTitle").textContent=p.name;
  const idx=protocols.findIndex(x=>x.id===p.id);
  if($("#protocolCounter")) $("#protocolCounter").textContent=`${idx+1} / ${protocols.length}`;
  $$(".protocol-dot").forEach((d,i)=>d.classList.toggle("active",i===idx));
}
function selectProtocolByIndex(index){
  const i=(index+protocols.length)%protocols.length;
  if(breathRuntime.running) stopBreath(false);
  state.selectedProtocol=protocols[i].id;
  saveState();
  setBreathPlayer(protocols[i]);
  renderProtocols();
}
function animateProtocolChange(direction,nextIndex){
  const deck=$("#breathSwipeDeck");
  if(!deck){ selectProtocolByIndex(nextIndex); return; }
  const outX=direction>0?-68:68;
  const inX=-outX;
  const out=deck.animate([
    {transform:"translateX(0)",opacity:1},
    {transform:`translateX(${outX}px)`,opacity:.28}
  ],{duration:240,easing:"cubic-bezier(.3,.0,.7,1)",fill:"forwards"});
  out.finished.catch(()=>{}).then(()=>{
    selectProtocolByIndex(nextIndex);
    deck.animate([
      {transform:`translateX(${inX}px)`,opacity:.28},
      {transform:"translateX(0)",opacity:1}
    ],{duration:300,easing:"cubic-bezier(.2,.75,.2,1)",fill:"both"});
  });
}
function selectAdjacentProtocol(delta){
  const idx=protocols.findIndex(p=>p.id===state.selectedProtocol);
  const next=(idx+delta+protocols.length)%protocols.length;
  animateProtocolChange(delta,next);
}
let breatheSwipeStartX=null,breatheSwipeStartY=null,breatheSwipeDx=0;

const PRIMARY_TABS=["today","train","breathe","log","progress"];
let tabSwipeStartX=null,tabSwipeStartY=null,tabSwipeDx=0,tabSwipeScreen=null,tabSwipeLocked=false;

function activePrimaryScreen(){
  return document.querySelector('.screen.active[data-screen]');
}
function isTabSwipeExcluded(target){
  if(target.closest('#breathSwipeDeck, input, select, textarea, a, .today-widget.dragging, .floating-drag, .modal, .settings-sheet')) return true;
  const button=target.closest('button');
  if(button && !button.classList.contains('library-protocol-row')) return true;
  return false;
}
function wirePrimaryTabSwipe(){
  const main=document.querySelector("main");
  if(!main)return;

  main.addEventListener("touchstart",e=>{
    if(e.touches.length!==1 || isTabSwipeExcluded(e.target))return;
    const screen=activePrimaryScreen();
    if(!screen)return;
    tabSwipeStartX=e.touches[0].clientX;
    tabSwipeStartY=e.touches[0].clientY;
    tabSwipeDx=0;
    tabSwipeScreen=screen;
    tabSwipeLocked=false;
    screen.getAnimations().forEach(a=>a.cancel());
  },{passive:true});

  main.addEventListener("touchmove",e=>{
    if(tabSwipeStartX==null || !tabSwipeScreen || e.touches.length!==1)return;
    const t=e.touches[0];
    const dx=t.clientX-tabSwipeStartX;
    const dy=t.clientY-tabSwipeStartY;

    if(!tabSwipeLocked){
      if(Math.abs(dy)>14 && Math.abs(dy)>Math.abs(dx)){
        tabSwipeStartX=null; tabSwipeScreen=null; return;
      }
      if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.15) tabSwipeLocked=true;
    }
    if(!tabSwipeLocked)return;

    if(e.cancelable)e.preventDefault();
    tabSwipeDx=dx;
    const x=Math.max(-86,Math.min(86,dx*.55));
    tabSwipeScreen.style.transform=`translateX(${x}px)`;
    tabSwipeScreen.style.opacity=String(1-Math.min(.22,Math.abs(x)/390));
  },{passive:false});

  const finish=()=>{
    if(tabSwipeStartX==null || !tabSwipeScreen)return;
    const screen=tabSwipeScreen;
    const dx=tabSwipeDx;
    const currentName=screen.dataset.screen;
    tabSwipeStartX=tabSwipeStartY=null;
    tabSwipeDx=0;tabSwipeScreen=null;tabSwipeLocked=false;

    const current=PRIMARY_TABS.indexOf(currentName);
    const direction=dx<0?1:-1;
    const next=current+direction;

    if(Math.abs(dx)>58 && next>=0 && next<PRIMARY_TABS.length){
      const outX=direction>0?-105:105;
      screen.animate([
        {transform:screen.style.transform||"translateX(0)",opacity:screen.style.opacity||1},
        {transform:`translateX(${outX}px)`,opacity:.12}
      ],{duration:150,easing:"ease-out",fill:"forwards"}).finished.catch(()=>{}).then(()=>{
        screen.style.transform="";
        screen.style.opacity="";
        navigate(PRIMARY_TABS[next]);
        const incoming=activePrimaryScreen();
        if(incoming){
          incoming.animate([
            {transform:`translateX(${direction>0?72:-72}px)`,opacity:.2},
            {transform:"translateX(0)",opacity:1}
          ],{duration:220,easing:"cubic-bezier(.2,.75,.2,1)"});
        }
      });
    }else{
      screen.animate([
        {transform:screen.style.transform||"translateX(0)",opacity:screen.style.opacity||1},
        {transform:"translateX(0)",opacity:1}
      ],{duration:180,easing:"ease-out"});
      screen.style.transform="";
      screen.style.opacity="";
    }
  };
  main.addEventListener("touchend",finish,{passive:true});
  main.addEventListener("touchcancel",finish,{passive:true});
}

function wireBreatheSwipe(){
  const deck=$("#breathSwipeDeck");
  if(!deck)return;
  deck.addEventListener("touchstart",e=>{
    if(e.touches.length!==1)return;
    breatheSwipeStartX=e.touches[0].clientX;
    breatheSwipeStartY=e.touches[0].clientY;
    breatheSwipeDx=0;
    deck.getAnimations().forEach(a=>a.cancel());
    deck.style.transition="none";
  },{passive:true});
  deck.addEventListener("touchmove",e=>{
    if(breatheSwipeStartX==null || e.touches.length!==1)return;
    const t=e.touches[0];
    const dx=t.clientX-breatheSwipeStartX;
    const dy=t.clientY-breatheSwipeStartY;
    if(Math.abs(dx)>Math.abs(dy)*1.15){
      breatheSwipeDx=dx;
      const x=Math.max(-92,Math.min(92,dx*.72));
      deck.style.transform=`translateX(${x}px)`;
      deck.style.opacity=String(1-Math.min(.28,Math.abs(x)/330));
    }
  },{passive:true});
  deck.addEventListener("touchend",()=>{
    if(breatheSwipeStartX==null)return;
    const dx=breatheSwipeDx;
    breatheSwipeStartX=breatheSwipeStartY=null;
    breatheSwipeDx=0;
    deck.style.transition="";
    if(Math.abs(dx)>52){
      const direction=dx<0?1:-1;
      const current=protocols.findIndex(p=>p.id===state.selectedProtocol);
      const next=(current+direction+protocols.length)%protocols.length;
      const currentX=Math.max(-92,Math.min(92,dx*.72));
      deck.animate([
        {transform:`translateX(${currentX}px)`,opacity:deck.style.opacity||1},
        {transform:`translateX(${direction>0?-115:115}px)`,opacity:.18}
      ],{duration:180,easing:"ease-out",fill:"forwards"}).finished.catch(()=>{}).then(()=>{
        selectProtocolByIndex(next);
        deck.animate([
          {transform:`translateX(${direction>0?92:-92}px)`,opacity:.18},
          {transform:"translateX(0)",opacity:1}
        ],{duration:290,easing:"cubic-bezier(.2,.75,.2,1)",fill:"both"});
        deck.style.transform="";
        deck.style.opacity="";
      });
    }else{
      const currentX=Math.max(-92,Math.min(92,dx*.72));
      deck.animate([
        {transform:`translateX(${currentX}px)`,opacity:deck.style.opacity||1},
        {transform:"translateX(0)",opacity:1}
      ],{duration:220,easing:"ease-out"});
      deck.style.transform="";
      deck.style.opacity="";
    }
  },{passive:true});
}

function setBreathPlayer(p, reset=true){
  if(p.id==="hypoxicTolerance" && !localStorage.getItem("vo2HypoxicSafetySeen")){
    alert("Hypoxic Tolerance is an advanced breath-hold exercise. Practice seated or lying down. Never use breath holds while driving, during moving exercise, or in/near water. Do not hyperventilate before a hold. Stop if you feel dizzy, faint, visually altered, or significantly uncomfortable.");
    localStorage.setItem("vo2HypoxicSafetySeen","1");
  }
  updateBreatheHeader();
  $("#breathInstruction").textContent=p.instruction;
  if(!breathRuntime.running){
    const previewTimeline=customTimelineFor(p);
    const previewSeconds=previewTimeline
      ? previewTimeline.reduce((sum,phase)=>sum+phase.sec,0)
      : p.minutes*60;
    $("#breathRemaining").textContent=formatTimer(previewSeconds);
    $("#breathPhase").textContent="Ready";
    const readyValue=p.id==="boltReset" ? 60 : p.inhale;
    $("#breathPhaseTimer").textContent=formatPhaseValue(readyValue);
    $("#breathPhaseUnit").textContent="seconds";
    $("#breathRateMetric").textContent=protocolRateLabel(p);
    if($("#breathCycleProgress")) $("#breathCycleProgress").textContent="Ready";
    renderPhaseCards(p);
    const summaries={
      performancePrimer:"4/4 → 3/3 → 2/2",
      morningRise:"2/2 → 3/3 → normal",
      box4:"4 in · 4 hold · 4 out · 4 hold",
      extendedBox:"4 in · 4 hold · 8 out · 4 hold",
      "478":"4 in · 7 hold · 8 out · 6 cycles",
      boltReset:"Normal exhale · comfortable hold · 3 rounds",
      hypoxicTolerance:"Exhale holds · 6 → 8 → 10 → 12 sec"
    };
    $("#breathPatternSummary").textContent=summaries[p.id] || `${p.inhale}s in · ${p.exhale}s out`;
    $("#breathProgress").style.width="0%";
    $("#breathOrb").style.transition="transform .3s ease";
    stopBreathFrame();
    $("#breathOrb").dataset.currentScale=".82";
    $("#breathOrb").style.transform="scale(.82)";
  }
}

function pauseBreath(){
  if(!breathRuntime.running || breathRuntime.paused)return;
  breathRuntime.paused=true;
  breathRuntime.pauseStartedAt=performance.now();
  clearInterval(breathRuntime.timer); breathRuntime.timer=null;
  stopBreathFrame();
  $("#breathStart").textContent="Resume session";
  if($("#breathCycleProgress")) $("#breathCycleProgress").textContent="Paused";
}
function resumeBreath(){
  if(!breathRuntime.running || !breathRuntime.paused)return;
  const now=performance.now();
  const pausedFor=now-breathRuntime.pauseStartedAt;
  breathRuntime.startedAt+=pausedFor;
  breathRuntime.phaseStartedAt+=pausedFor;
  breathRuntime.paused=false;

  const phase=breathRuntime.currentPhase;
  if(phase){
    const elapsedInPhase=now-breathRuntime.phaseStartedAt;
    const remaining=Math.max(120,breathRuntime.phaseDuration-elapsedInPhase);
    const orb=$("#breathOrb");
    const currentScale=parseFloat(orb?.dataset.currentScale || ".82");
    const targetScale=Number.isFinite(phase.scale)
      ? phase.scale
      : (phase.name==="Inhale"?1.14:phase.name==="Exhale"?.82:currentScale);
    animateBreathScale(currentScale,targetScale,remaining);
  }
  $("#breathStart").textContent="Pause session";
  breathRuntime.timer=setInterval(updateBreath,100);
  acquireWakeLock();
}

$("#breathStart").addEventListener("click",()=>{
  if(!breathRuntime.running){ startBreath(); return; }
  if(breathRuntime.paused) resumeBreath();
  else pauseBreath();
});
$("#breatheBackButton")?.addEventListener("click",closeProtocolDetail);

async function getAudioContext(){
  if(!breathRuntime.audio) return null;
  try{
    if(!breathRuntime.audioContext){
      breathRuntime.audioContext=new (window.AudioContext||window.webkitAudioContext)();
    }
    if(breathRuntime.audioContext.state==="suspended"){
      await breathRuntime.audioContext.resume();
    }
    return breathRuntime.audioContext;
  }catch(_){ return null; }
}
async function unlockAudio(){
  const ctx=await getAudioContext();
  if(!ctx) return;
  try{
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    gain.gain.value=.0001;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+.025);
  }catch(_){}
}
async function tone(freq=520,duration=.16){
  const ctx=await getAudioContext(); if(!ctx) return;
  try{
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type="sine";
    osc.frequency.setValueAtTime(freq,ctx.currentTime);
    gain.gain.setValueAtTime(.14,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+duration);
  }catch(_){}
}
function tryWebHaptic(){
  if(!breathRuntime.haptics) return;
  try{
    if("vibrate" in navigator) navigator.vibrate(35);
  }catch(_){}
}
async function acquireWakeLock(){
  try{ if("wakeLock" in navigator) breathRuntime.wakeLock=await navigator.wakeLock.request("screen"); }catch(_){}
}

function customTimelineFor(p){
  const mk=(name,sec,scale,tone)=>({name,sec,scale,tone});

  if(p.id==="hypoxicTolerance"){
    const out=[];
    // 60 sec preparation at 4 in / 6 out.
    for(let i=0;i<6;i++){
      out.push(mk("Inhale",4,1.14,580),mk("Exhale",6,.82,390));
    }
    [6,8,10,12].forEach((hold,index)=>{
      out.push(
        mk("Inhale",4,1.14,580),
        mk("Exhale",6,.82,390),
        mk(`Hold · Round ${index+1}`,hold,.82,300),
        mk("Recover",60,.94,390)
      );
    });
    return out;
  }

  if(p.id==="boltReset"){
    const out=[mk("Nasal breathing",60,.94,390)];
    for(let i=0;i<3;i++){
      out.push(
        mk("Normal exhale",4,.82,390),
        mk(`Comfortable hold · Round ${i+1}`,8,.82,300),
        mk("Recover",60,.94,390)
      );
    }
    return out;
  }

  return null;
}

async function startBreath(){
  const p=selectedProtocol();
  breathRuntime.running=true; breathRuntime.paused=false; breathRuntime.protocol=p;
  breathRuntime.audio=state.settings.sound!==false;
  breathRuntime.haptics=state.settings.haptics!==false;
  $("#watchHr").textContent=state.health?.connected?"Live":"—";
  $("#watchHrv").textContent=state.health?.connected?"After":"—";
  breathRuntime.customTimeline=customTimelineFor(p);
  breathRuntime.startedAt=performance.now();
  breathRuntime.durationMs=breathRuntime.customTimeline
    ? breathRuntime.customTimeline.reduce((sum,phase)=>sum+phase.sec,0)*1000
    : p.minutes*60000;
  breathRuntime.phaseIndex=0;
  $("#breathStart").textContent="Pause session";
  if($("#breathCycleProgress")) $("#breathCycleProgress").textContent="0%";
  await unlockAudio();
  acquireWakeLock();
  beginPhase();
  breathRuntime.timer=setInterval(updateBreath,100);
}
function phaseSequence(p){
  const mk=(name,sec,scale,tone)=>({name,sec,scale,tone});

  if(p.id==="box4"){
    return [
      mk("Inhale",4,1.14,580),
      mk("Hold",4,1.14,300),
      mk("Exhale",4,.82,390),
      mk("Hold",4,.82,300)
    ];
  }

  if(p.id==="extendedBox"){
    return [
      mk("Inhale",4,1.14,580),
      mk("Hold",4,1.14,300),
      mk("Exhale",8,.82,390),
      mk("Hold",4,.82,300)
    ];
  }

  if(p.id==="478"){
    return [
      mk("Inhale",4,1.14,580),
      mk("Hold",7,1.14,300),
      mk("Exhale",8,.82,390)
    ];
  }

  if(p.id==="performancePrimer"){
    const elapsed=(performance.now()-breathRuntime.startedAt)/1000;
    const seconds=elapsed<60?4:elapsed<120?3:2;
    return [mk("Inhale",seconds,1.14,580),mk("Exhale",seconds,.82,390)];
  }

  if(p.id==="morningRise"){
    const elapsed=(performance.now()-breathRuntime.startedAt)/1000;
    if(elapsed>=240) return [mk("Breathe normally",6,.94,390)];
    const seconds=elapsed<120?2:3;
    return [mk("Inhale",seconds,1.14,580),mk("Exhale",seconds,.82,390)];
  }

  return [
    mk("Inhale",p.inhale,1.14,580),
    mk("Exhale",p.exhale,.82,390)
  ];
}

function easeInOutSine(t){
  return -(Math.cos(Math.PI*t)-1)/2;
}
function stopBreathFrame(){
  if(breathRuntime.breathFrame){
    cancelAnimationFrame(breathRuntime.breathFrame);
    breathRuntime.breathFrame=null;
  }
}
function animateBreathScale(fromScale,toScale,durationMs){
  stopBreathFrame();
  const orb=$("#breathOrb");
  if(!orb)return;
  const started=performance.now();

  const tick=(now)=>{
    const raw=Math.min(1,Math.max(0,(now-started)/durationMs));
    const eased=easeInOutSine(raw);
    const scale=fromScale+(toScale-fromScale)*eased;
    orb.style.transform=`scale(${scale})`;
    orb.dataset.currentScale=String(scale);

    if(raw<1){
      breathRuntime.breathFrame=requestAnimationFrame(tick);
    }else{
      breathRuntime.breathFrame=null;
      orb.style.transform=`scale(${toScale})`;
      orb.dataset.currentScale=String(toScale);
    }
  };
  breathRuntime.breathFrame=requestAnimationFrame(tick);
}

function beginPhase(){
  const seq=breathRuntime.customTimeline || phaseSequence(breathRuntime.protocol);
  const phase=breathRuntime.customTimeline
    ? seq[breathRuntime.phaseIndex]
    : seq[breathRuntime.phaseIndex%seq.length];
  if(!phase){ finishBreath(); return; }
  breathRuntime.currentPhase=phase;
  breathRuntime.phaseStartedAt=performance.now(); breathRuntime.phaseDuration=phase.sec*1000;
  $("#breathPhase").textContent=phase.name;
  $("#breathPhaseTimer").textContent=formatPhaseValue(phase.sec);
  $("#breathPhaseUnit").textContent="seconds";
  const orb=$("#breathOrb");
  orb.style.transition="none";
  const currentScale=parseFloat(orb.dataset.currentScale || ".90");
  const targetScale=Number.isFinite(phase.scale)
    ? phase.scale
    : (phase.name==="Inhale"?1.14:phase.name==="Exhale"?.82:currentScale);
  animateBreathScale(currentScale,targetScale,phase.sec*1000);
  tone(phase.tone);
  if(phase.name==="Inhale") tryWebHaptic();
}
function updateBreath(){
  if(!breathRuntime.running) return;
  const now=performance.now(), elapsed=now-breathRuntime.startedAt, p=breathRuntime.protocol;
  const remain=Math.max(0,(breathRuntime.durationMs-elapsed)/1000);
  $("#breathRemaining").textContent=formatTimer(remain);
  $("#breathProgress").style.width=`${clamp(elapsed/breathRuntime.durationMs*100,0,100)}%`;
  const phaseRemain=Math.max(0,(breathRuntime.phaseDuration-(now-breathRuntime.phaseStartedAt))/1000);
  $("#breathPhaseTimer").textContent =
    (Number(breathRuntime.currentPhase?.sec)%1!==0)
      ? Math.max(0,phaseRemain).toFixed(1)
      : Math.max(0,Math.ceil(phaseRemain));
  if($("#breathCycleProgress")) $("#breathCycleProgress").textContent=sessionProgressLabel();
  if(now-breathRuntime.phaseStartedAt>=breathRuntime.phaseDuration){
    breathRuntime.phaseIndex++;
    if(breathRuntime.customTimeline && breathRuntime.phaseIndex>=breathRuntime.customTimeline.length){
      finishBreath();
      return;
    }
    beginPhase();
  }
  if(elapsed>=breathRuntime.durationMs) finishBreath();
}
function stopBreath(save=false){
  clearInterval(breathRuntime.timer); breathRuntime.timer=null;
  stopBreathFrame();
  const elapsed=breathRuntime.running?(performance.now()-breathRuntime.startedAt):0;
  breathRuntime.running=false;
  breathRuntime.paused=false;
  breathRuntime.currentPhase=null;
  breathRuntime.customTimeline=null;
  $("#breathStart").textContent="Start session";
  $("#watchHr").textContent="—";
  $("#watchHrv").textContent=state.health?.latestHRV || "—";
  try{breathRuntime.wakeLock?.release();}catch(_){}
  breathRuntime.wakeLock=null;
  if(save && elapsed>30000) saveBreathSession(elapsed);
  setBreathPlayer(selectedProtocol());
}
function finishBreath(){
  const elapsed=performance.now()-breathRuntime.startedAt;
  clearInterval(breathRuntime.timer); breathRuntime.timer=null; breathRuntime.running=false;
  breathRuntime.paused=false;
  breathRuntime.currentPhase=null;
  breathRuntime.customTimeline=null;
  tone(760,.15);
  try{breathRuntime.wakeLock?.release();}catch(_){}
  saveBreathSession(elapsed);
  $("#breathStart").textContent="Start session";
  setBreathPlayer(selectedProtocol());
  showToast("Breathing session saved");
}
function saveBreathSession(elapsed){
  const p=breathRuntime.protocol || selectedProtocol();
  state.breathSessions.push({id:cryptoId(),date:nowISO(),protocolId:p.id,protocol:p.name,minutes:round1(elapsed/60000)});
  saveState(); renderBreathStats(); renderToday(); renderTrainingLoad(); renderProgress();
}
function renderBreathStats(){
  const recent=state.breathSessions.filter(x=>new Date(x.date).getTime()>=daysAgo(7));
  $("#weeklyBreathSessions").textContent=`${recent.length} session${recent.length===1?"":"s"}`;
  const dots=[];
  for(let i=6;i>=0;i--){
    const d=new Date(Date.now()-i*86400000), key=d.toISOString().slice(0,10);
    const done=state.breathSessions.some(x=>x.date.slice(0,10)===key);
    dots.push(`<div class="week-dot ${done?"done":""}"><i></i><span>${d.toLocaleDateString(undefined,{weekday:"narrow"})}</span></div>`);
  }
  $("#breathWeekDots").innerHTML=dots.join("");
  const latest=state.co2Assessments.at(-1);
  $("#co2Latest").textContent=latest?`Latest: ${latest.seconds}s · ${formatDate(latest.date)}`:"No assessment saved yet.";
}
$("#saveCo2").addEventListener("click",()=>{
  const n=validNumber($("#co2Seconds").value,5,90);
  if(n==null){showToast("Enter 5–90 seconds");return;}
  state.co2Assessments.push({id:cryptoId(),date:nowISO(),seconds:Math.round(n)});
  $("#co2Seconds").value=""; saveState(); renderBreathStats(); renderProgress(); showToast("Assessment saved");
});

function switchLogPanel(name){
  $$("[data-log-panel]").forEach(b=>b.classList.toggle("active",b.dataset.logPanel===name));
  $$("[data-panel]").forEach(p=>p.classList.toggle("active",p.dataset.panel===name));
}
$$("[data-log-panel]").forEach(b=>b.addEventListener("click",()=>switchLogPanel(b.dataset.logPanel)));
function prefillLogForms(){
  if(!$("#workoutDate").value) $("#workoutDate").value=todayISO();
  if(state.profile.age) $("#rockAge").value=state.profile.age;
  if(state.profile.sex) $("#rockSex").value=state.profile.sex;
  if(state.profile.weightLb) $("#rockWeight").value=state.profile.weightLb;
}
$("#saveWorkout").addEventListener("click",()=>{
  const date=$("#workoutDate").value||todayISO();
  const duration=validNumber($("#workoutDuration").value,1,600);
  const distance=$("#workoutDistance").value===""?null:validNumber($("#workoutDistance").value,0,200);
  const hr=$("#workoutHr").value===""?null:validNumber($("#workoutHr").value,30,240);
  const rpe=$("#workoutRpe").value===""?null:validNumber($("#workoutRpe").value,1,10);
  if(duration==null){$("#workoutMessage").textContent="Enter a valid duration.";return;}
  if($("#workoutDistance").value!==""&&distance==null){$("#workoutMessage").textContent="Check distance.";return;}
  if($("#workoutHr").value!==""&&hr==null){$("#workoutMessage").textContent="Check average heart rate.";return;}
  state.workouts.push({id:cryptoId(),date,type:$("#workoutType").value,duration,distance,avgHR:hr,rpe});
  saveState();
  $("#workoutMessage").textContent="Workout saved.";
  ["#workoutDuration","#workoutDistance","#workoutHr","#workoutRpe"].forEach(s=>$(s).value="");
  renderToday(); renderTrainingLoad(); renderProgress(); showToast("Workout saved");
});
function estimateRunVO2(totalMinutes){
  if(!Number.isFinite(totalMinutes)||totalMinutes<6||totalMinutes>60) throw new Error("Enter a realistic 1.5-mile time.");
  const v=3.5+483/totalMinutes;
  if(v<10||v>100) throw new Error("Result is outside a plausible range.");
  return round1(v);
}
function estimateRockport({age,sex,weightLb,timeMinutes,postHR}){
  if(validNumber(age,13,100)==null||validNumber(weightLb,66,660)==null||validNumber(timeMinutes,7,40)==null||validNumber(postHR,50,220)==null) throw new Error("Check the Rockport inputs.");
  if(sex!=="male"&&sex!=="female") throw new Error("Select the equation sex coefficient.");
  const v=132.853-.0769*weightLb-.3877*age+6.315*(sex==="male"?1:0)-3.2649*timeMinutes-.1565*postHR;
  if(v<10||v>100) throw new Error("Result is outside a plausible range.");
  return round1(v);
}
function saveVo2(value,method){
  state.vo2.push({id:cryptoId(),date:todayISO(),value,method}); saveState(); renderAll();
}
$("#calculateRun").addEventListener("click",()=>{
  try{
    const min=Number($("#runMinutes").value||0), sec=Number($("#runSeconds").value||0);
    if(sec<0||sec>59) throw new Error("Seconds must be 0–59.");
    const v=estimateRunVO2(min+sec/60); saveVo2(v,"1.5-mile run");
    $("#runResult").textContent=`Estimated VO₂ max: ${v.toFixed(1)} ml/kg/min · ${vo2Tier(v)}`; showToast("VO₂ milestone saved");
  }catch(e){$("#runResult").textContent=e.message;}
});
$("#calculateRockport").addEventListener("click",()=>{
  try{
    const sec=Number($("#rockSeconds").value||0); if(sec<0||sec>59) throw new Error("Seconds must be 0–59.");
    const v=estimateRockport({
      age:Number($("#rockAge").value),sex:$("#rockSex").value,weightLb:Number($("#rockWeight").value),
      timeMinutes:Number($("#rockMinutes").value||0)+sec/60,postHR:Number($("#rockHr").value)
    });
    saveVo2(v,"Rockport 1-mile walk");
    $("#rockportResult").textContent=`Estimated VO₂ max: ${v.toFixed(1)} ml/kg/min · ${vo2Tier(v)}`; showToast("VO₂ milestone saved");
  }catch(e){$("#rockportResult").textContent=e.message;}
});

function renderProgress(){
  const vo2=sortedVo2(), workouts30=state.workouts.filter(x=>new Date(x.date).getTime()>=daysAgo(30)), breath30=state.breathSessions.filter(x=>new Date(x.date).getTime()>=daysAgo(30));
  if(vo2.length>=2){
    const diff=round1(vo2.at(-1).value-vo2[0].value); $("#progressVo2Change").textContent=`${diff>=0?"+":""}${diff.toFixed(1)}`;
  }else $("#progressVo2Change").textContent="--";
  $("#progressWorkoutCount").textContent=workouts30.length;
  $("#progressBreathMinutes").textContent=`${Math.round(breath30.reduce((s,x)=>s+x.minutes,0))}m`;
  $("#progressCo2").textContent=state.co2Assessments.length?`${state.co2Assessments.at(-1).seconds}s`:"--";
  renderChart($("#progressVo2Chart"),vo2.slice(-12));
  $("#vo2History").innerHTML=vo2.length?[...vo2].reverse().slice(0,10).map(x=>`<div class="history-row"><div><strong>${x.method}</strong><span>${formatDate(x.date)}</span></div><div class="history-value">${x.value.toFixed(1)}</div></div>`).join(""):'<div class="empty-copy">No VO₂ milestones yet.</div>';
  $("#workoutHistory").innerHTML=state.workouts.length?[...state.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10).map(x=>`<div class="history-row"><div><strong>${x.type}</strong><span>${formatDate(x.date)} · ${x.duration} min${x.distance!=null?` · ${x.distance} mi`:""}</span></div><div class="history-value">${x.avgHR?`${x.avgHR} bpm`:""}</div></div>`).join(""):'<div class="empty-copy">No workouts logged yet.</div>';
  $("#breathHistory").innerHTML=state.breathSessions.length?[...state.breathSessions].reverse().slice(0,10).map(x=>`<div class="history-row"><div><strong>${x.protocol}</strong><span>${formatDate(x.date)}</span></div><div class="history-value">${x.minutes.toFixed(1)} min</div></div>`).join(""):'<div class="empty-copy">No breathing sessions yet.</div>';
}

function openProfile(){
  $("#profileName").value=state.profile.name||"";
  $("#profileAge").value=state.profile.age||"";
  $("#profileSex").value=state.profile.sex||"";
  $("#profileWeight").value=state.profile.weightLb||"";
  $("#profileRhr").value=state.profile.restingHR||"";
  $("#profileLevel").value=state.profile.level||"intermediate";
  $("#profileDays").value=String(state.profile.daysPerWeek||4);
  $("#profileWeeks").value=String(state.profile.planWeeks||4);
  $("#profileGoal").value=state.profile.vo2Goal||"";
  $("#profileMessage").textContent="";
  $("#settingsSound").checked=state.settings.sound!==false;
  $("#settingsHaptics").checked=state.settings.haptics!==false;
  $("#settingsBreathReminders").checked=!!state.settings.breathingReminders;
  $("#settingsNotifications").checked=!!state.settings.notifications;
  $("#modalBackdrop").hidden=false;
}
function closeProfile(){ $("#modalBackdrop").hidden=true; }
$("#profileButton").addEventListener("click",openProfile);
$("#doneTodayEdit").addEventListener("click",()=>setTodayEditMode(false));
$("#healthConnectButton").addEventListener("click",explainHealthConnection);
$("#profileHealthButton").addEventListener("click",explainHealthConnection);
$("#planPreferencesButton").addEventListener("click",()=>{
  const section=$("#planPreferencesSection");
  section.classList.add("settings-section-highlight");
  section.scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>section.classList.remove("settings-section-highlight"),900);
});
$("#closeProfile").addEventListener("click",closeProfile);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeProfile();});
$("#saveProfile").addEventListener("click",()=>{
  const age=$("#profileAge").value===""?"":validNumber($("#profileAge").value,13,100);
  const wt=$("#profileWeight").value===""?"":validNumber($("#profileWeight").value,66,660);
  const rhr=$("#profileRhr").value===""?"":validNumber($("#profileRhr").value,30,140);
  const goal=$("#profileGoal").value===""?"":validNumber($("#profileGoal").value,15,90);
  if(age===null||wt===null||rhr===null||goal===null){$("#profileMessage").textContent="Check the highlighted numeric ranges.";return;}
  state.profile={
    name:$("#profileName").value.trim().slice(0,30),age,sex:$("#profileSex").value,weightLb:wt,restingHR:rhr,
    level:$("#profileLevel").value,
    daysPerWeek:Number($("#profileDays").value),
    planWeeks:Number($("#profileWeeks").value),
    vo2Goal:goal
  };
  state.settings={
    sound:$("#settingsSound").checked,
    haptics:$("#settingsHaptics").checked,
    breathingReminders:$("#settingsBreathReminders").checked,
    notifications:$("#settingsNotifications").checked,
    planPreferencesSaved:true
  };
  breathRuntime.audio=state.settings.sound;
  breathRuntime.haptics=state.settings.haptics;
  saveState(); closeProfile(); renderAll(); showToast("Settings saved");
});
$("#resetData").addEventListener("click",()=>{
  if(!confirm("Reset all locally stored VO₂, workout, breathing, and profile data?"))return;
  localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_VO2);
  state=JSON.parse(JSON.stringify(defaults)); closeProfile(); renderAll(); showToast("Local data reset");
});

window.addEventListener("beforeunload",()=>{ if(breathRuntime.running) stopBreath(false); });


async function tryLockPortrait(){
  try{
    if(screen.orientation?.lock){
      await screen.orientation.lock("portrait");
    }
  }catch(_){}
}
window.addEventListener("orientationchange",()=>{ if(window.matchMedia("(orientation:portrait)").matches) tryLockPortrait(); });

breathRuntime.audio=state.settings.sound!==false;
breathRuntime.haptics=state.settings.haptics!==false;
renderAll();
wireTodayReorder();
wireBreatheSwipe();
wirePrimaryTabSwipe();
tryLockPortrait();
if(!state.settings.planPreferencesSaved){
  setTimeout(openProfile,250);
}else{
  navigate("today");
}

})();
