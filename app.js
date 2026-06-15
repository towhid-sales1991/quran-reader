/* =========================================================
   AL-QURAN — App logic
   ========================================================= */

const API_BASE = 'https://api.alquran.cloud/v1';
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ';

// The "quran-uthmani" edition embeds the Bismillah text inside ayah 1 of
// every surah (except At-Tawbah). Since we show Bismillah separately as a
// heading, we fetch the exact string once and strip it from ayah 1 to
// avoid showing it twice.
let BISMILLAH_TEXT = BISMILLAH;
let bismillahFetched = false;
async function ensureBismillah(){
  if(bismillahFetched) return;
  try{
    const res = await fetch(`${API_BASE}/ayah/1/quran-uthmani`);
    const json = await res.json();
    if(json && json.data && json.data.text){
      BISMILLAH_TEXT = json.data.text.trim();
    }
  }catch(e){ /* keep fallback */ }
  bismillahFetched = true;
}
function stripBismillah(text){
  const t = text.trim();
  if(t.startsWith(BISMILLAH_TEXT)){
    return t.slice(BISMILLAH_TEXT.length).trim();
  }
  return text;
}
function ayahArabicText(a, surahNum){
  if(a.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9){
    const stripped = stripBismillah(a.text);
    if(stripped !== a.text.trim()) return stripped;
  }
  return a.text;
}

const els = {
  surahGrid: document.getElementById('surahGrid'),
  juzGrid: document.getElementById('juzGrid'),
  surahEmpty: document.getElementById('surahEmpty'),
  juzEmpty: document.getElementById('juzEmpty'),
  search: document.getElementById('searchInput'),
  tabs: document.querySelectorAll('.tab-btn'),
  views: document.querySelectorAll('.view'),
  readerBody: document.getElementById('readerBody'),
  readerFooter: document.getElementById('readerFooter'),
  readerTitleAr: document.getElementById('readerTitleAr'),
  readerTitleMeta: document.getElementById('readerTitleMeta'),
  backBtn: document.getElementById('backBtn'),
  brandHome: document.getElementById('brandHome'),
  navPrev: document.getElementById('navPrev'),
  navNext: document.getElementById('navNext'),
  navPrevName: document.getElementById('navPrevName'),
  navNextName: document.getElementById('navNextName'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  closeSettings: document.getElementById('closeSettings'),
  sizeDec: document.getElementById('sizeDec'),
  sizeInc: document.getElementById('sizeInc'),
  sizeVal: document.getElementById('sizeVal'),
  toggleTranslation: document.getElementById('toggleTranslation'),
  fontSelect: document.getElementById('fontSelect'),
  continueWrap: document.getElementById('continueWrap'),
  heroSection: document.getElementById('heroSection'),
};

let state = {
  activeTab: 'surah',   // 'surah' | 'juz'
  activeView: 'surah',  // 'surah' | 'juz' | 'reader'
  reader: null,         // {type:'surah'|'juz', num: 1}
};

/* =========================================================
   GRID RENDERING
   ========================================================= */
function starBadge(num){
  return `<div class="badge"><div class="star8"><i></i><i></i></div><span>${toBn(num)}</span></div>`;
}

function renderSurahGrid(filter=''){
  const f = normalize(filter);
  let shown = 0;
  els.surahGrid.innerHTML = SURAHS.map(s => {
    const [num, ar, tr, bn, meaning, ayahCount, type] = s;
    const hay = normalize(`${num} ${ar} ${tr} ${bn} ${meaning}`);
    if(f && !hay.includes(f)) return '';
    shown++;
    return `<div class="card" data-type="surah" data-num="${num}">
      ${starBadge(num)}
      <div class="info">
        <div class="ar">${ar}</div>
        <div class="tr">${tr} · ${bn}</div>
        <div class="meta">
          <span class="tag-type ${type}">${type==='M'?'মাক্কী':'মাদানী'}</span>
          <span class="dot"></span>
          <span>${toBn(ayahCount)} আয়াত</span>
        </div>
      </div>
    </div>`;
  }).join('');
  els.surahEmpty.style.display = shown===0 ? 'block' : 'none';
}

function renderJuzGrid(filter=''){
  const f = normalize(filter);
  let shown = 0;
  els.juzGrid.innerHTML = JUZ.map(j => {
    const [num, snippet, startSurah, startAyah] = j;
    const info = SURAHS[startSurah-1];
    const hay = normalize(`${num} ${BN_ORDINAL[num-1]} ${info[2]} ${info[3]} ${snippet}`);
    if(f && !hay.includes(f)) return '';
    shown++;
    return `<div class="card para" data-type="juz" data-num="${num}">
      ${starBadge(num)}
      <div class="info">
        <div class="ar">${snippet}</div>
        <div class="tr">${BN_ORDINAL[num-1]} পারা</div>
        <div class="meta">
          <span>সূরা ${info[3]}, আয়াত ${toBn(startAyah)} থেকে শুরু</span>
        </div>
      </div>
    </div>`;
  }).join('');
  els.juzEmpty.style.display = shown===0 ? 'block' : 'none';
}

function normalize(str){
  return String(str).toLowerCase().trim();
}

/* =========================================================
   VIEW / TAB SWITCHING
   ========================================================= */
function showView(name){
  state.activeView = name;
  els.views.forEach(v => v.classList.toggle('active', v.id === 'view-'+name));
  els.heroSection.style.display = name === 'reader' ? 'none' : '';
  if(name !== 'reader'){
    window.scrollTo(0,0);
    renderContinue();
  }
}

els.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    els.tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeTab = btn.dataset.view;
    els.search.value = '';
    if(state.activeTab === 'surah') renderSurahGrid();
    else renderJuzGrid();
    showView(btn.dataset.view);
  });
});

els.brandHome.addEventListener('click', () => {
  els.tabs.forEach(b => b.classList.toggle('active', b.dataset.view===state.activeTab));
  showView(state.activeTab);
});

els.backBtn.addEventListener('click', () => showView(state.activeTab));

/* =========================================================
   SEARCH
   ========================================================= */
els.search.addEventListener('input', (e) => {
  if(state.activeView === 'reader'){
    els.tabs.forEach(b => b.classList.toggle('active', b.dataset.view==='surah'));
    state.activeTab = 'surah';
    showView('surah');
  }
  const val = e.target.value;
  if(state.activeTab === 'surah') renderSurahGrid(val);
  else renderJuzGrid(val);
});

/* =========================================================
   CARD CLICKS -> OPEN READER
   ========================================================= */
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if(!card) return;
  const type = card.dataset.type;
  const num = parseInt(card.dataset.num, 10);
  openReader(type, num);
});

els.navPrev.addEventListener('click', () => {
  const r = state.reader;
  if(!r) return;
  const prevNum = r.num - 1;
  if(prevNum >= 1) openReader(r.type, prevNum);
});
els.navNext.addEventListener('click', () => {
  const r = state.reader;
  if(!r) return;
  const max = r.type === 'surah' ? 114 : 30;
  if(r.num + 1 <= max) openReader(r.type, r.num + 1);
});

/* =========================================================
   READER
   ========================================================= */
async function openReader(type, num){
  state.reader = {type, num};
  showView('reader');
  window.scrollTo(0,0);

  els.readerFooter.style.display = 'none';
  els.readerBody.innerHTML = `
    <div class="loader">
      <div class="ring"><i></i><i></i></div>
      <span>লোড হচ্ছে...</span>
    </div>`;

  // title placeholders
  if(type === 'surah'){
    const info = SURAHS[num-1];
    els.readerTitleAr.textContent = info[1];
    els.readerTitleMeta.textContent = `সূরা ${toBn(num)} · ${info[3]} · ${toBn(info[5])} আয়াত`;
  } else {
    els.readerTitleAr.textContent = JUZ[num-1][1];
    els.readerTitleMeta.textContent = `${BN_ORDINAL[num-1]} পারা`;
  }

  localStorage.setItem('quran_lastread', JSON.stringify({type, num}));

  try{
    await ensureBismillah();
    const endpoint = type === 'surah'
      ? `${API_BASE}/surah/${num}/editions/quran-uthmani,bn.bengali`
      : `${API_BASE}/juz/${num}/editions/quran-uthmani,bn.bengali`;
    const res = await fetch(endpoint);
    if(!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    const [arEdition, bnEdition] = json.data;
    renderAyahs(arEdition.ayahs, bnEdition.ayahs, type, num);
  }catch(err){
    els.readerBody.innerHTML = `
      <div class="empty">
        <div class="big">!</div>
        <h4 style="font-family:var(--display); color:var(--text); margin-bottom:6px;">লোড করা যায়নি</h4>
        <p>ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।</p>
        <button class="btn-icon" style="width:auto; height:auto; padding:10px 20px; border-radius:999px; margin-top:14px;" id="retryBtn">আবার চেষ্টা করুন</button>
      </div>`;
    document.getElementById('retryBtn').addEventListener('click', () => openReader(type, num));
  }

  renderFooterNav(type, num);
}

function renderAyahs(arAyahs, bnAyahs, type, num){
  let html = '';

  if(type === 'surah'){
    if(num !== 1 && num !== 9){
      html += `<div class="bismillah">${BISMILLAH_TEXT}</div>`;
    }
    for(let i=0;i<arAyahs.length;i++){
      const text = ayahArabicText(arAyahs[i], num);
      html += ayahHTML(text, bnAyahs[i], arAyahs[i].numberInSurah);
    }
  } else {
    let lastSurah = null;
    for(let i=0;i<arAyahs.length;i++){
      const a = arAyahs[i];
      const sNum = a.surah.number;
      if(sNum !== lastSurah){
        const info = SURAHS[sNum-1];
        html += `<div class="bismillah" style="font-size:20px; padding-top:${lastSurah===null?'0':'22px'};">
            <div style="font-family:var(--display); font-size:15px; color:var(--text); margin-bottom:10px; letter-spacing:.5px;">
              সূরা ${info[3]} <span style="color:var(--muted); font-family:var(--bangla);">— ${info[2]}</span>
            </div>
            ${(sNum !== 1 && sNum !== 9 && a.numberInSurah === 1) ? BISMILLAH_TEXT : ''}
          </div>`;
        lastSurah = sNum;
      }
      const text = ayahArabicText(a, sNum);
      html += ayahHTML(text, bnAyahs[i], a.numberInSurah);
    }
  }

  els.readerBody.innerHTML = html;
}

function ayahHTML(arText, bnAyah, displayNum){
  return `<div class="ayah">
    <div class="num">${toBn(displayNum)}</div>
    <div class="content">
      <div class="ar">${arText}</div>
      <div class="bn">${bnAyah ? bnAyah.text : ''}</div>
    </div>
  </div>`;
}

function renderFooterNav(type, num){
  const max = type === 'surah' ? 114 : 30;
  els.readerFooter.style.display = 'flex';

  if(num > 1){
    els.navPrev.style.visibility = 'visible';
    els.navPrevName.textContent = type === 'surah' ? SURAHS[num-2][2] : `${BN_ORDINAL[num-2]} পারা`;
  } else {
    els.navPrev.style.visibility = 'hidden';
  }

  if(num < max){
    els.navNext.style.visibility = 'visible';
    els.navNextName.textContent = type === 'surah' ? SURAHS[num][2] : `${BN_ORDINAL[num]} পারা`;
  } else {
    els.navNext.style.visibility = 'hidden';
  }
}

/* =========================================================
   CONTINUE READING
   ========================================================= */
function renderContinue(){
  const raw = localStorage.getItem('quran_lastread');
  if(!raw){ els.continueWrap.innerHTML=''; return; }
  try{
    const {type, num} = JSON.parse(raw);
    const label = type === 'surah'
      ? `সূরা ${SURAHS[num-1][2]} (${SURAHS[num-1][1]})`
      : `${BN_ORDINAL[num-1]} পারা`;
    els.continueWrap.innerHTML = `
      <button id="continueBtn" style="font-family:var(--bangla); font-size:13px; font-weight:600; color:var(--gold-soft); background:rgba(217,181,104,.08); border:1px solid var(--gold-dim); border-radius:999px; padding:10px 22px; cursor:pointer;">
        ↺ পড়া চালিয়ে যান — ${label}
      </button>`;
    document.getElementById('continueBtn').addEventListener('click', () => openReader(type, num));
  }catch(e){ els.continueWrap.innerHTML=''; }
}

/* =========================================================
   SETTINGS PANEL
   ========================================================= */
let fontSize = parseInt(localStorage.getItem('quran_fontsize')) || 26;
let showTranslation = localStorage.getItem('quran_translation') !== 'off';
let arabicFont = localStorage.getItem('quran_font') || 'amiri';

const FONT_STACKS = {
  amiri: `'Amiri Quran','Amiri',serif`,
  scheherazade: `'Scheherazade New','Amiri',serif`,
  naskh: `'Noto Naskh Arabic','Amiri',serif`,
  lateef: `'Lateef','Amiri',serif`,
};

function applySettings(){
  els.readerBody.style.setProperty('--ar-size', fontSize+'px');
  els.readerBody.style.setProperty('--bn-display', showTranslation ? 'block' : 'none');
  document.documentElement.style.setProperty('--quran-font', FONT_STACKS[arabicFont] || FONT_STACKS.amiri);
  els.sizeVal.textContent = fontSize;
  els.toggleTranslation.checked = showTranslation;
  els.fontSelect.value = arabicFont;
}

els.settingsBtn.addEventListener('click', () => els.settingsPanel.classList.add('open'));
els.closeSettings.addEventListener('click', () => els.settingsPanel.classList.remove('open'));
els.settingsPanel.addEventListener('click', (e) => { if(e.target === els.settingsPanel) els.settingsPanel.classList.remove('open'); });

els.sizeInc.addEventListener('click', () => {
  fontSize = Math.min(44, fontSize+2);
  localStorage.setItem('quran_fontsize', fontSize);
  applySettings();
});
els.sizeDec.addEventListener('click', () => {
  fontSize = Math.max(18, fontSize-2);
  localStorage.setItem('quran_fontsize', fontSize);
  applySettings();
});
els.toggleTranslation.addEventListener('change', (e) => {
  showTranslation = e.target.checked;
  localStorage.setItem('quran_translation', showTranslation ? 'on' : 'off');
  applySettings();
});
els.fontSelect.addEventListener('change', (e) => {
  arabicFont = e.target.value;
  localStorage.setItem('quran_font', arabicFont);
  applySettings();
});

/* =========================================================
   INIT
   ========================================================= */
renderSurahGrid();
renderJuzGrid();
applySettings();
renderContinue();
