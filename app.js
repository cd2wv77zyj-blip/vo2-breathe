
(() => {
"use strict";

const KEY = "vo2BreatheV2";
const LEGACY_VO2 = "vo2";

const defaults = {
  version: 6,
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
    notifications: false
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
  selectedProtocol: "recovery55"
};

const protocols = [
  { id:"recovery55", name:"5.5 Recovery", category:"Recovery", desc:"Slow, even breathing after training", inhale:5.5, exhale:5.5, hold:0, minutes:6, instruction:"Keep the breath quiet and comfortable. Avoid deliberately over-filling the lungs." },
  { id:"extended", name:"Extended Exhale", category:"Control", desc:"Gentle longer exhale for downshifting", inhale:4, exhale:7, hold:0, minutes:8, instruction:"Use a relaxed inhale and a smooth, unforced exhale." },
  { id:"co2", name:"CO₂ Comfort", category:"Tolerance", desc:"Brief, non-maximal pause practice", inhale:4, exhale:6, hold:2, minutes:8, instruction:"The pause should feel easy. Never turn this into a maximal breath-hold challenge." },
  { id:"primer", name:"Pre-Workout Primer", category:"Warm-up", desc:"Simple rhythmic breathing before training", inhale:4, exhale:4, hold:0, minutes:3, instruction:"Stay relaxed and alert. Finish feeling ready to move, not sedated." },
  { id:"easy", name:"Easy Reset", category:"Recovery", desc:"Short reset between stressful blocks", inhale:4, exhale:6, hold:0, minutes:4, instruction:"Let your breathing settle without forcing a specific depth." }
];

let state = loadState();
let breathRuntime = {
  running:false, protocol:null, startedAt:0, durationMs:0,
  phaseIndex:0, phaseStartedAt:0, phaseDuration:0, timer:null,
  audio:true, haptics:true, audioContext:null, wakeLock:null
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
    if(parsed && (parsed.version === 2 || parsed.version === 3 || parsed.version === 4 || parsed.version === 5 || parsed.version === 6)) {
      return {
        ...defaults,
        ...parsed,
        version: 6,
        health: {...defaults.health, ...(parsed.health || {})},
        settings: {...defaults.settings, ...(parsed.settings || {})},
        profile:{...defaults.profile,...parsed.profile}
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
  if(breathRuntime.running && name!=="breathe") stopBreath(false);
  $$("[data-screen]").forEach(el=>el.classList.toggle("active",el.dataset.screen===name));
  $$("[data-tab]").forEach(el=>el.classList.toggle("active",el.dataset.tab===name));
  window.scrollTo({top:0,behavior:"instant"});
  renderAll();
}
$$("[data-tab]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.tab)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));

function renderAll(){
  renderHeader();
  renderHealthStatus();
  renderToday();
  renderTrainingLoad();
  renderPlanControls();
  renderTrainingPlan();
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

function renderHeader(){
  $("#headerSubtitle").textContent = state.profile.name ? `${state.profile.name}'s aerobic performance` : "Aerobic performance";
}

function workoutLoad(workout){
  const duration=Number(workout.duration||0);
  const rpe=Number(workout.rpe||5);
  return Math.max(0,Math.round(duration*rpe*.55));
}
function breathLoad(session){
  const min=Number(session.minutes||0);
  const p=protocols.find(x=>x.id===session.protocolId);
  const factor=p?.category==="Tolerance"?7:p?.category==="Warm-up"?4:5;
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
      {type:"Zone 2",detail:`${z} min conversational aerobic work`,kind:"aerobic"},
      {type:"Intervals",detail:`${reps} × 3 min hard / 3 min easy; controlled, not maximal`,kind:"hard"},
      {type:"Zone 2",detail:`${z+10} min easy-moderate endurance`,kind:"aerobic"},
      {type:"Breath",detail:`${recoveryWeek?6:8} min breathing control or recovery`,kind:"breath"},
      {type:"Recovery",detail:"20–30 min easy movement + recovery breathing",kind:"recovery"},
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
      <button class="breath-tag" data-breath-id="recovery55">Post · 6 min Recovery</button>
    </div>`;
  }
  if(session.kind==="aerobic"){
    return `<div class="breath-companion"><button class="breath-tag" data-breath-id="recovery55">Post · 5.5 Recovery</button></div>`;
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
    requestAnimationFrame(()=>{
      setBreathPlayer(selectedProtocol());
      renderProtocols();
      const card=document.querySelector(`[data-protocol="${state.selectedProtocol}"]`);
      if(card) card.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
    });
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
  $("#protocolCards").innerHTML=protocols.map((p,i)=>`<button class="protocol-card ${p.id===state.selectedProtocol?"active":""}" data-protocol="${p.id}" data-index="${i}">
    <div><p class="eyebrow">${p.category}</p><strong>${p.name}</strong></div>
    <span>${p.minutes} min · ${p.desc}</span>
  </button>`).join("");
  $$("[data-protocol]").forEach(b=>b.addEventListener("click",()=>{
    if(breathRuntime.running) stopBreath(false);
    state.selectedProtocol=b.dataset.protocol;
    saveState();
    setBreathPlayer(selectedProtocol());
    renderProtocols();
    requestAnimationFrame(()=>b.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"}));
  }));
  setBreathPlayer(selectedProtocol(), false);
  const carousel=$("#protocolCards");
  let scrollTimer=null;
  carousel.onscroll=()=>{
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      const cards=[...carousel.querySelectorAll(".protocol-card")];
      if(!cards.length)return;
      const center=carousel.scrollLeft+carousel.clientWidth/2;
      let nearest=cards[0],best=Infinity;
      cards.forEach(card=>{
        const cardCenter=card.offsetLeft+card.offsetWidth/2;
        const dist=Math.abs(cardCenter-center);
        if(dist<best){best=dist;nearest=card;}
      });
      const id=nearest.dataset.protocol;
      if(id && id!==state.selectedProtocol){
        if(breathRuntime.running) stopBreath(false);
        state.selectedProtocol=id;
        saveState();
        setBreathPlayer(selectedProtocol());
        cards.forEach(card=>card.classList.toggle("active",card===nearest));
        $("#protocolCounter").textContent=`${Number(nearest.dataset.index)+1} / ${protocols.length}`;
      }
    },100);
  };
}
function setBreathPlayer(p, reset=true){
  $("#breathCategory").textContent=p.category;
  $("#breathProtocolName").textContent=p.name;
  $("#breathInstruction").textContent=p.instruction;
  if(!breathRuntime.running){
    $("#breathRemaining").textContent=formatTimer(p.minutes*60);
    $("#breathPhase").textContent="Ready";
    $("#breathPhaseTimer").textContent=Math.round(p.inhale);
    $("#breathPhaseUnit").textContent="seconds";
    $("#breathPatternSummary").textContent=`${p.inhale}s in · ${p.exhale}s out${p.hold?` · ${p.hold}s pause`:""}`;
    $("#breathProgress").style.width="0%";
    $("#breathOrb").style.transition="transform .3s ease";
    $("#breathOrb").style.transform="scale(.90)";
  }
}
$("#breathStart").addEventListener("click",()=>breathRuntime.running?stopBreath(false):startBreath());

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
async function startBreath(){
  const p=selectedProtocol();
  breathRuntime.running=true; breathRuntime.protocol=p;
  breathRuntime.audio=state.settings.sound!==false;
  breathRuntime.haptics=state.settings.haptics!==false;
  $("#watchHr").textContent=state.health?.connected?"Live":"—";
  $("#watchHrv").textContent=state.health?.connected?"After":"—";
  breathRuntime.startedAt=performance.now(); breathRuntime.durationMs=p.minutes*60000;
  breathRuntime.phaseIndex=0;
  $("#breathStart").textContent="Pause session";
  await unlockAudio();
  acquireWakeLock();
  beginPhase();
  breathRuntime.timer=setInterval(updateBreath,100);
}
function phaseSequence(p){
  const arr=[
    {name:"Inhale",sec:p.inhale,scale:1,tone:580},
    {name:"Exhale",sec:p.exhale,scale:.64,tone:390}
  ];
  if(p.hold>0) arr.push({name:"Pause",sec:p.hold,scale:.64,tone:300});
  return arr;
}
function beginPhase(){
  const seq=phaseSequence(breathRuntime.protocol), phase=seq[breathRuntime.phaseIndex%seq.length];
  breathRuntime.phaseStartedAt=performance.now(); breathRuntime.phaseDuration=phase.sec*1000;
  $("#breathPhase").textContent=phase.name;
  $("#breathPhaseTimer").textContent=Math.ceil(phase.sec);
  $("#breathPhaseUnit").textContent="seconds";
  const orb=$("#breathOrb");
  orb.style.transition=`transform ${phase.sec}s linear`;
  requestAnimationFrame(()=>orb.style.transform=`scale(${phase.scale})`);
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
  $("#breathPhaseTimer").textContent=Math.max(0,Math.ceil(phaseRemain));
  if(now-breathRuntime.phaseStartedAt>=breathRuntime.phaseDuration){
    breathRuntime.phaseIndex++; beginPhase();
  }
  if(elapsed>=breathRuntime.durationMs) finishBreath();
}
function stopBreath(save=false){
  clearInterval(breathRuntime.timer); breathRuntime.timer=null;
  const elapsed=breathRuntime.running?(performance.now()-breathRuntime.startedAt):0;
  breathRuntime.running=false;
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
$("#healthConnectButton").addEventListener("click",explainHealthConnection);
$("#profileHealthButton").addEventListener("click",explainHealthConnection);
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
    notifications:$("#settingsNotifications").checked
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
tryLockPortrait();
if(!state.profile.age && !state.profile.name) setTimeout(openProfile,350);

})();
