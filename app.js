const state = { manifest: [], cache: {}, recipe: null, stepIndex: 0, viewMode: 'stage', multiplier: 1 };

function formatTime(min){
  if(!min) return 'serve';
  if(min < 60) return `${min} min`;
  const h = Math.floor(min/60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const NUM = '\\d+(?:[.,]\\d+)?';
const AMOUNT_UNITS = ['kg','mg','ml','cl','g','l','EL','TL','Prise','Prisen','Liter','Litern','Tasse','Tassen','Glas','Gläser','Gläsern','Dose','Dosen','Packung','Packungen','Bund','Bünde','Stange','Stangen','Zweig','Zweige','Zehe','Zehen','Zwiebel','Zwiebeln','Ei','Eier','Scheibe','Scheiben','Blatt','Blätter','Blättern','Kugel','Kugeln','Stück','Stücke','Kopf','Köpfe','Schalotte','Schalotten','Tomate','Tomaten','Apfel','Äpfel'];
const COMPOUND_UNITS = '[A-Za-zÄÖÜäöüß-]*(?:zehen?|zwiebeln?|scheiben?|blättern?|blatt|kugeln?|stücken?|stück|köpfe?|kopf|eier?|ei|schalotten?|tomaten|tomate[n]?|äpfeln?|apfel)';
const amountRe = new RegExp('(' + NUM + ')((?:\\s*(?:bis|[-–])\\s*)(' + NUM + '))?(\\s*)(' + AMOUNT_UNITS.join('|') + '|' + COMPOUND_UNITS + ')(?![A-Za-zÄÖÜäöüß])', 'g');
const leadRe = /^(ca\.\s*)?(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*(?:bis|[-–])\s*\d+(?:[.,]\d+)?)?)(\s?)(.*)$/;
const tokenRe = new RegExp('\\d+/\\d+|' + NUM, 'g');

function formatAmount(n){
  const r = Math.round(n * 100) / 100;
  return (Number.isInteger(r) ? String(r) : String(parseFloat(r.toFixed(2)))).replace('.', ',');
}

function scaleToken(tok, m){
  if(tok.includes('/')){
    const [a,b] = tok.split('/').map(Number);
    return formatAmount((a / b) * m);
  }
  return formatAmount(parseFloat(tok.replace(',', '.')) * m);
}

function scaleInstruction(text, m){
  if(m === 1) return text;
  return text.replace(amountRe, (all, n1, range, n2, sp, unit) =>
    scaleToken(n1, m) + (range ? range.replace(new RegExp(NUM), tok => scaleToken(tok, m)) : '') + sp + unit
  );
}

function scaleIngredientLine(line, m){
  if(m === 1) return line;
  const lead = line.match(leadRe);
  if(!lead) return scaleInstruction(line, m);
  return (lead[1] || '') + lead[2].replace(tokenRe, tok => scaleToken(tok, m)) + lead[3] + scaleInstruction(lead[4], m);
}

function scaledStepText(step){
  const m = state.multiplier;
  if(m === 1) return step.instruction;
  if(step.title === 'Zutaten'){
    return step.instruction.split('\n')
      .map(l => l.replace(/^(\s*-\s*)(.*)$/, (a, p, rest) => p + scaleIngredientLine(rest, m)))
      .join('\n');
  }
  return scaleInstruction(step.instruction, m);
}

function readMultiplier(str){
  const t = String(str).trim().replace(',', '.');
  if(!/^\d{1,2}(\.\d)?$/.test(t)) return null;
  const n = parseFloat(t);
  if(!n) return null;
  return Math.min(n, 10);
}

function syncMultiplierInputs(skip){
  const val = formatAmount(state.multiplier);
  for(const el of [document.getElementById('multStageInput'), document.getElementById('multListInput')]){
    if(el !== skip) el.value = val;
  }
}

function applyMultiplier(n, skip){
  state.multiplier = n;
  syncMultiplierInputs(skip);
  if(state.viewMode === 'stage') renderStep(); else renderListView();
}

async function loadManifest(){
  const res = await fetch('data/manifest.json');
  state.manifest = await res.json();
  state.manifest.sort((a,b)=>a.title.localeCompare(b.title));
  renderLists();
}

function renderLists(){
  const term = (document.getElementById('searchInput').value||'').toLowerCase();
  const filtered = state.manifest.filter(r=>r.title.toLowerCase().includes(term));
  const sideUl = document.getElementById('recipeList');
  sideUl.innerHTML = filtered.map(r=>`<li><a href='#${r.id}' data-id='${r.id}'>${r.title}<span>${formatTime(r.time)}</span></a></li>`).join('');
  const homeUl = document.getElementById('homeList');
  homeUl.innerHTML = state.manifest.map(r=>`
    <li>
      <a href='#${r.id}'>
        <div class='home-icon'>${r.icon || ''}</div>
        <div class='home-info'>
          <span class='home-title'>${r.title}</span>
          <span class='home-time'>${formatTime(r.time)}</span>
        </div>
      </a>
    </li>`).join('');
}

async function loadRecipe(id){
  if(!state.cache[id]){
    const res = await fetch(`data/recipes/${id}.json`);
    if(!res.ok){ goHome(); return; }
    state.cache[id] = await res.json();
  }
  state.recipe = state.cache[id];
  state.stepIndex = 0;
  state.viewMode = 'stage';
  state.multiplier = 1;
  syncMultiplierInputs();
  showRecipe();
}

function goHome(){
  state.recipe = null;
  state.viewMode = 'stage';
  state.multiplier = 1;
  syncMultiplierInputs();
  document.getElementById('home').hidden = false;
  document.getElementById('stage').hidden = true;
  document.getElementById('listView').hidden = true;
  document.getElementById('homeBtn').hidden = true;
  document.getElementById('viewToggle').hidden = true;
  document.getElementById('headerTitle').textContent = 'Recipes';
  document.getElementById('timePill').hidden = true;
}

function showRecipe(){
  document.getElementById('home').hidden = true;
  document.getElementById('homeBtn').hidden = false;
  document.getElementById('viewToggle').hidden = false;
  document.getElementById('headerTitle').textContent = state.recipe.title;
  setViewMode(state.viewMode);
}

function setViewMode(mode){
  state.viewMode = mode;
  document.getElementById('stage').hidden = mode !== 'stage';
  document.getElementById('listView').hidden = mode !== 'list';
  document.getElementById('timePill').hidden = mode !== 'stage';
  const btn = document.getElementById('viewToggle');
  if(mode === 'stage'){
    btn.innerHTML = "<svg viewBox='0 0 24 24'><rect x='3' y='4' width='18' height='4' rx='1'/><rect x='3' y='10' width='18' height='4' rx='1'/><rect x='3' y='16' width='18' height='4' rx='1'/></svg>";
    btn.setAttribute('aria-label','Show all steps');
    renderStep();
  } else {
    btn.innerHTML = "<svg viewBox='0 0 24 24'><rect x='4' y='3' width='16' height='18' rx='2'/></svg>";
    btn.setAttribute('aria-label','Show step by step');
    renderListView();
  }
}

function renderStep(){
  const steps = state.recipe.steps;
  const i = state.stepIndex;
  const step = steps[i];
  document.getElementById('stepIcon').innerHTML = step.icon;
  document.getElementById('stepTitle').textContent = step.title;
  document.getElementById('stepText').innerHTML = scaledStepText(step).replace(/\n/g, '<br>');
  document.getElementById('multStage').hidden = step.title !== 'Zutaten';
  const pill = document.getElementById('timePill');
  pill.hidden = false;
  pill.textContent = formatTime(step.time);
  document.getElementById('counter').textContent = `${i+1} / ${steps.length}`;
  const dots = document.getElementById('dots');
  dots.innerHTML = steps.map((_,idx)=>`<span class='dot ${idx===i?'active':''}'></span>`).join('');
}

function animateStep(direction){
  const el = document.getElementById('stepView');
  el.classList.remove('anim-next','anim-prev');
  void el.offsetWidth;
  el.classList.add(direction === 'next' ? 'anim-next' : 'anim-prev');
}

function renderListView(){
  const steps = state.recipe.steps;
  const ol = document.getElementById('listItems');
  ol.innerHTML = steps.map((s,idx)=>`
    <li>
      <div class='list-icon'>${s.icon}</div>
      <div class='list-body'>
        <div class='list-head'>
          <span class='list-num'>${idx+1}</span>
          <h3>${s.title}</h3>
          <span class='list-time'>${formatTime(s.time)}</span>
        </div>
        <p>${scaledStepText(s).replace(/\n/g, '<br>')}</p>
      </div>
    </li>`).join('');
}

function nextStep(){
  if(!state.recipe) return;
  if(state.stepIndex < state.recipe.steps.length -1){
    state.stepIndex++;
    renderStep();
    animateStep('next');
  }
}
function prevStep(){
  if(!state.recipe) return;
  if(state.stepIndex>0){
    state.stepIndex--;
    renderStep();
    animateStep('prev');
  }
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('scrim').classList.add('show');
  document.getElementById('sidebar').setAttribute('aria-hidden','false');
  document.getElementById('searchInput').focus();
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.remove('show');
  document.getElementById('sidebar').setAttribute('aria-hidden','true');
}

document.getElementById('homeBtn').addEventListener('click', ()=>{ location.hash = ''; });
document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('scrim').addEventListener('click', closeSidebar);
document.getElementById('searchInput').addEventListener('input', renderLists);
document.getElementById('recipeList').addEventListener('click', e=>{
  if(e.target.closest('a')) closeSidebar();
});
document.getElementById('viewToggle').addEventListener('click', ()=>{
  setViewMode(state.viewMode === 'stage' ? 'list' : 'stage');
});

for(const el of [document.getElementById('multStageInput'), document.getElementById('multListInput')]){
  el.addEventListener('input', ()=>{
    const n = readMultiplier(el.value);
    if(n !== null) applyMultiplier(n, el);
  });
  el.addEventListener('blur', ()=>{
    const n = readMultiplier(el.value);
    if(n === null) el.value = formatAmount(state.multiplier);
    else applyMultiplier(n, null);
  });
  el.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); el.blur(); }
  });
}

document.getElementById('zoneLeft').addEventListener('click', prevStep);
document.getElementById('zoneRight').addEventListener('click', nextStep);

window.addEventListener('keydown', e=>{
  if(e.target.classList && e.target.classList.contains('mult-input')) return;
  if(state.viewMode === 'stage'){
    if(e.key==='ArrowRight') nextStep();
    if(e.key==='ArrowLeft') prevStep();
  }
  if(e.key==='Escape') closeSidebar();
});

let touchStartX=null, touchStartY=null;
const stageEl = document.getElementById('stage');
stageEl.addEventListener('touchstart', e=>{
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
},{passive:true});
stageEl.addEventListener('touchend', e=>{
  if(touchStartX===null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
    if(dx<0) nextStep(); else prevStep();
  }
  touchStartX=null; touchStartY=null;
},{passive:true});

window.addEventListener('hashchange', route);
function route(){
  const id = location.hash.replace('#','');
  if(id){ loadRecipe(id); } else { goHome(); }
}

loadManifest().then(route);
