const state = { manifest: [], cache: {}, recipe: null, stepIndex: 0 };

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
  sideUl.innerHTML = filtered.map(r=>`<li><a href='#${r.id}' data-id='${r.id}'>${r.title}<span>${r.time} min</span></a></li>`).join('');
  const homeUl = document.getElementById('homeList');
  homeUl.innerHTML = state.manifest.map(r=>`<li><a href='#${r.id}'>${r.title}<span>${r.time} min</span></a></li>`).join('');
}

async function loadRecipe(id){
  if(!state.cache[id]){
    const res = await fetch(`data/recipes/${id}.json`);
    if(!res.ok){ goHome(); return; }
    state.cache[id] = await res.json();
  }
  state.recipe = state.cache[id];
  state.stepIndex = 0;
  showStage();
  renderStep();
}

function goHome(){
  state.recipe = null;
  document.getElementById('home').hidden = false;
  document.getElementById('stage').hidden = true;
  document.getElementById('headerTitle').textContent = 'Recipes';
  document.getElementById('timePill').hidden = true;
}

function showStage(){
  document.getElementById('home').hidden = true;
  document.getElementById('stage').hidden = false;
  document.getElementById('headerTitle').textContent = state.recipe.title;
}

function renderStep(){
  const steps = state.recipe.steps;
  const i = state.stepIndex;
  const step = steps[i];
  document.getElementById('stepIcon').innerHTML = step.icon;
  document.getElementById('stepTitle').textContent = step.title;
  document.getElementById('stepText').textContent = step.instruction;
  const pill = document.getElementById('timePill');
  pill.hidden = false;
  pill.textContent = step.time ? `${step.time} min` : 'serve';
  document.getElementById('counter').textContent = `${i+1} / ${steps.length}`;
  const dots = document.getElementById('dots');
  dots.innerHTML = steps.map((_,idx)=>`<span class='dot ${idx===i?'active':''}'></span>`).join('');
}

function nextStep(){
  if(!state.recipe) return;
  if(state.stepIndex < state.recipe.steps.length -1){
    state.stepIndex++;
    renderStep();
  }
}
function prevStep(){
  if(!state.recipe) return;
  if(state.stepIndex>0){
    state.stepIndex--;
    renderStep();
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

document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('scrim').addEventListener('click', closeSidebar);
document.getElementById('searchInput').addEventListener('input', renderLists);
document.getElementById('recipeList').addEventListener('click', e=>{
  if(e.target.closest('a')) closeSidebar();
});

document.getElementById('zoneLeft').addEventListener('click', prevStep);
document.getElementById('zoneRight').addEventListener('click', nextStep);

window.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight') nextStep();
  if(e.key==='ArrowLeft') prevStep();
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
