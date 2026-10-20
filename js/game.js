let questions=[],categories=[],currentCategory=null,active=null,solved=new Set(JSON.parse(localStorage.getItem('find-me-solved')||'[]'));
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// 並び順はブラウザに保存し、問題一覧と前後移動で共通利用する
const SORT_KEY = 'veil-kakurenbo-question-sort';
const SORT_OPTIONS = ['new', 'old', 'easy', 'hard'];
let questionSort = localStorage.getItem(SORT_KEY) || 'old';
if (!SORT_OPTIONS.includes(questionSort)) questionSort = 'old';
$('questionSort').value = questionSort;
$('questionSort').addEventListener('change', event => {
  questionSort = SORT_OPTIONS.includes(event.target.value) ? event.target.value : 'old';
  localStorage.setItem(SORT_KEY, questionSort);
  if (currentCategory) render();
});

function orderedQuestions(categoryId) {
  const list = questions.map((q, index) => ({ q, index }))
    .filter(item => (item.q.category || 'uncategorized') === categoryId);
  list.sort((a, b) => {
    if (questionSort === 'new') return b.index - a.index;
    if (questionSort === 'old') return a.index - b.index;
    const diff = Number(a.q.difficulty) - Number(b.q.difficulty);
    return questionSort === 'easy' ? (diff || a.index - b.index) : (-diff || a.index - b.index);
  });
  return list.map(item => item.q);
}

function distance(q,x,y){const img=$('photoimg');
const w=img.naturalWidth,h=img.naturalHeight;
return Math.hypot((x-q.answer.x)*w/100,(y-q.answer.y)*h/100)/Math.min(w,h)*100}
function mark(q){const img=$('photoimg'),m=$('answerMark');
const d=q.answer.radius*2*Math.min(img.naturalWidth,img.naturalHeight)/img.naturalWidth;
m.style.left=q.answer.x+'%';
m.style.top=q.answer.y+'%';
m.style.width=d+'%';
m.style.height=(q.answer.radius*2*Math.min(img.naturalWidth,img.naturalHeight)/img.naturalHeight)+'%';
m.style.borderWidth = (window.matchMedia('(max-width: 600px)').matches && q.answer.radius <= 2) ? '1.5px' : '3px';
m.hidden=false}
function showHome() {
  active = null;
  currentCategory = null;
  $('home').hidden = false;
  $('questionList').hidden = true;
  $('play').hidden = true;
  $('homeButton').hidden = true;
  $('back').hidden = true;
  resetZoom();
  window.scrollTo(0, 0);
}

function showCategory(id) {
  currentCategory = id;
  active = null;
  $('home').hidden = true;
  $('questionList').hidden = false;
  $('play').hidden = true;
  $('homeButton').hidden = false;
  $('back').hidden = true;

  const category = categories.find(c => c.id === id);
  const title = $('categoryTitle');

  title.replaceChildren();

  if (category?.image) {
      const img = document.createElement('img');
      img.src = category.image;
      img.alt = '';
      title.append(img);
  }

  const name = document.createElement('span');
  name.textContent = category?.name || '問題一覧';
  title.append(name);
  
  render();
  window.scrollTo(0, 0);
}

// 問題ごとの共有URLとブラウザの「戻る」「進む」を管理する
function pageUrl(state) {
  const url = new URL(window.location.href);
  url.searchParams.delete('question');
  url.searchParams.delete('category');
  if (state.page === 'category') {
    url.searchParams.set('category', state.category);
  } else if (state.page === 'question') {
    url.searchParams.set('category', state.category);
    url.searchParams.set('question', String(state.questionId));
  }
  return url.pathname + url.search + url.hash;
}

function navigate(state) {
  const next = { veilKakurenbo: true, ...state };
  const url = pageUrl(state);
  const previous = history.state;
  if (previous?.veilKakurenbo &&
      previous.page === state.page &&
      previous.category === state.category &&
      String(previous.questionId ?? '') === String(state.questionId ?? '')) {
    if (location.pathname + location.search + location.hash !== url) {
      history.replaceState(next, '', url);
    }
    return;
  }
  history.pushState(next, '', url);
}

function stateFromUrl() {
  const params = new URLSearchParams(location.search);
  const category = params.get('category');
  const questionId = params.get('question');
  if (questionId !== null) {
    const q = questions.find(q => String(q.id) === questionId &&
      (category === null || (q.category || 'uncategorized') === category));
    if (q) return { veilKakurenbo: true, page: 'question',
      category: q.category || 'uncategorized', questionId: q.id };
  }
  if (category && categories.some(c => c.id === category)) {
    return { veilKakurenbo: true, page: 'category', category };
  }
  return { veilKakurenbo: true, page: 'home' };
}

const renderHome = showHome;
const renderCategory = showCategory;
const renderQuestion = openQuestion;

showHome = function () {
  navigate({ page: 'home' });
  renderHome();
};

showCategory = function (id) {
  navigate({ page: 'category', category: id });
  renderCategory(id);
};

openQuestion = function (q) {
  navigate({ page: 'question', category: q.category, questionId: q.id });
  renderQuestion(q);
};

function restorePage(state) {
  if (state?.veilKakurenbo && state.page === 'question') {
    const q = questions.find(q => String(q.id) === String(state.questionId) &&
      (q.category || 'uncategorized') === state.category);
    if (q) {
      currentCategory = q.category;
      renderQuestion(q);
      return;
    }
  }
  if (state?.veilKakurenbo && state.page === 'category' &&
      categories.some(c => c.id === state.category)) {
    renderCategory(state.category);
    return;
  }
  renderHome();
}

window.addEventListener('popstate', event => {
  if (questions.length && categories.length) restorePage(event.state?.veilKakurenbo ? event.state : stateFromUrl());
});

function renderCategories() {
  const root = $('categories');
  root.replaceChildren();
  categories.forEach(category => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'category-card';
    const symbol = document.createElement('span');
    symbol.className = 'category-symbol';
    if (category.image) {
      const iconImage = document.createElement('img');
      iconImage.className = 'category-image';
      iconImage.src = category.image;
      iconImage.alt = '';
      iconImage.loading = 'lazy';
      iconImage.onerror = () => {
        symbol.replaceChildren();
        symbol.textContent = category.icon || '🔎';
      };
      symbol.append(iconImage);
    } else {
      symbol.textContent = category.icon || '🔎';
    }
    const name = document.createElement('strong');
    name.textContent = category.name;
    const count = document.createElement('span');
    count.className = 'category-count';
    count.textContent = questions.filter(q => (q.category || 'uncategorized') === category.id).length + ' 問';
    card.append(symbol, name, count);
    card.onclick = () => showCategory(category.id);
    root.append(card);
  });
}


// クリア記録（localStorage）から全体・キャラクター別の進捗を計算
function renderClearProgress() {
  const root = $('clearProgress');
  if (!root) return;
  root.replaceChildren();
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const progressRow = (label, entries, overall = false) => {
    const total = entries.length;
    const done = entries.filter(q => solved.has(q.id)).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const block = make('div', overall ? 'progress-item progress-overall' : 'progress-item');
    const header = make('div', 'progress-heading');
    header.append(make('strong', '', label), make('span', '', `${done} / ${total}問（${pct}%）`));
    const track = make('div', 'progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label + 'のクリア率');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(pct));
    const fill = make('div', 'progress-fill');
    fill.style.width = pct + '%';
    track.append(fill);
    block.append(header, track);
    return block;
  };
  root.append(progressRow('全体', questions, true));
  const groups = make('div', 'progress-groups');
  for (const category of categories) {
    const entries = questions.filter(q => (q.category || 'uncategorized') === category.id);
    if (entries.length) groups.append(progressRow(category.name, entries));
  }
  root.append(groups);
}

// 新着問題のお知らせ：同日の追加はまとめ、最新5日分を初期表示
let updateEntries = [];
let updatesExpanded = false;

function normalizeUpdates(records) {
  const grouped = new Map();
  if (!Array.isArray(records)) return [];
  for (const record of records) {
    if (!record || typeof record.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !Array.isArray(record.additions)) continue;
    if (!grouped.has(record.date)) grouped.set(record.date, new Map());
    const day = grouped.get(record.date);
    for (const item of record.additions) {
      if (!item || typeof item.category !== 'string' ||
          !categories.some(c => c.id === item.category)) continue;
      const count = Number(item.count);
      if (!Number.isSafeInteger(count) || count <= 0) continue;
      day.set(item.category, (day.get(item.category) || 0) + count);
    }
  }
  return [...grouped.entries()]
    .map(([date, additions]) => ({date, additions: [...additions.entries()]}))
    .filter(entry => entry.additions.length)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderUpdates() {
  const list = $('updatesList');
  const more = $('updatesMore');
  list.replaceChildren();
  if (!updateEntries.length) {
    list.textContent = '新しい問題の追加情報はまだありません。';
    more.hidden = true;
    return;
  }
  const visible = updatesExpanded ? updateEntries : updateEntries.slice(0, 5);
  for (const entry of visible) {
    const article = document.createElement('article');
    article.className = 'updates-entry';
    const date = document.createElement('time');
    date.dateTime = entry.date;
    date.textContent = entry.date.replaceAll('-', '.');
    article.append(date);
    const ul = document.createElement('ul');
    for (const [categoryId, count] of entry.additions) {
      const category = categories.find(c => c.id === categoryId);
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = pageUrl({page: 'category', category: categoryId});
      link.textContent = category.name;
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        showCategory(categoryId);
      });
      li.append(link, document.createTextNode(` の問題を${count}問追加しました！`));
      ul.append(li);
    }
    article.append(ul);
    list.append(article);
  }
  more.hidden = updateEntries.length <= 5;
  more.textContent = updatesExpanded ? '閉じる' : 'もっと見る';
  more.setAttribute('aria-expanded', String(updatesExpanded));
}

$('updatesMore').addEventListener('click', () => {
  updatesExpanded = !updatesExpanded;
  renderUpdates();
});

async function loadUpdates() {
  try {
    const response = await fetch('data/updates.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    updateEntries = normalizeUpdates(await response.json());
    renderUpdates();
  } catch (error) {
    $('updatesList').textContent = '更新履歴を読み込めませんでした。';
    $('updatesMore').hidden = true;
    console.warn('更新履歴の読み込み失敗', error);
  }
}

function render() {
  $('list').replaceChildren();
  const filtered = orderedQuestions(currentCategory);
  if (!filtered.length) {
    $('list').textContent = 'このキャラクターの問題はまだありません。';
    return;
  }
  filtered.forEach(q => {
    const card = document.createElement('article');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = q.image;
    img.alt = '問題写真';
    const h = document.createElement('h3');
    h.textContent = q.title;
    const photoWrap = document.createElement('div');
    photoWrap.className = 'card-photo';
    photoWrap.append(img);
    if (solved.has(q.id)) {
      const badge = document.createElement('span');
      badge.className = 'card-clear-badge';
      badge.textContent = '✓ クリア';
      photoWrap.append(badge);
    }
    const p = document.createElement('p');
    p.textContent = '★'.repeat(q.difficulty) + '☆'.repeat(5 - q.difficulty);
    const b = document.createElement('button');
    b.textContent = '挑戦する';
    b.onclick = () => openQuestion(q);
    card.append(photoWrap, h, p, b);
    $('list').append(card);
  });
}

// Zoom state is defined in image-relative coordinates, independent of CSS scaling.
const zoom={scale:1,x:0,y:0,pointers:new Map(),gesture:null,suppressClick:false};
const photo=$('photo'),layer=$('photoLayer'),photoimg=$('photoimg');
photoimg.draggable=false;
photo.addEventListener('dragstart',e=>e.preventDefault());
photo.addEventListener('selectstart',e=>e.preventDefault());
function constrain(){
 const w=photo.clientWidth,h=photo.clientHeight,s=zoom.scale;
 zoom.x=clamp(zoom.x,w*(1-s),0);
zoom.y=clamp(zoom.y,h*(1-s),0);
}
function drawZoom(){
 constrain();
layer.style.transform=`translate(${zoom.x}px,${zoom.y}px) scale(${zoom.scale})`;
 $('zoomLevel').textContent=Math.round(zoom.scale*100)+'%';
}
function setZoom(next,clientX,clientY){
 const r=photo.getBoundingClientRect(),px=clientX-r.left,py=clientY-r.top;
 const before=zoom.scale;
next=clamp(next,1,5);
 zoom.x=px-(px-zoom.x)*next/before;
 zoom.y=py-(py-zoom.y)*next/before;
 zoom.scale=next;
drawZoom();
}
function resetZoom(){zoom.scale=1;
zoom.x=0;
zoom.y=0;
zoom.pointers.clear();
zoom.gesture=null;
drawZoom()}
async function showCorrectEffect() {
    const effect = $('correctEffect');
    const image = $('correctImage');

    const correctImages = {
        buyoyo: 'images/correct/buyoyo.png',
        naputa: 'images/correct/naputa.png',
        pokke: 'images/correct/pokke.png'
    };

    const src = correctImages[active.category];
    if (!src) return;

    // いったん非表示にする
    effect.classList.remove('show');
    effect.hidden = true;

    // 新しい画像を読み込む
    image.src = src;

    try {
        await image.decode();
    } catch {
        return;
    }

    // 読み込み中に別の問題へ移動していたら表示しない
    if (!active || correctImages[active.category] !== src) return;

    // 画像の準備ができてからアニメーション開始
    effect.hidden = false;
    void effect.offsetWidth;
    effect.classList.add('show');
}

$('correctEffect').addEventListener('animationend', () => {
    $('correctEffect').classList.remove('show');
    $('correctEffect').hidden = true;
});
// 現在のキャラクター内で、問題一覧と同じ並び順を使う
function adjacentQuestions(q) {
  const sameCategory = orderedQuestions(q.category || 'uncategorized');
  const index = sameCategory.findIndex(item => String(item.id) === String(q.id));
  return {
    previous: index > 0 ? sameCategory[index - 1] : null,
    next: index >= 0 && index < sameCategory.length - 1 ? sameCategory[index + 1] : null
  };
}

// 問題画面の難易度とクリアバッジを更新する
function renderPlayInfo(q) {
  const info = $('info');
  info.replaceChildren();
  info.append(document.createTextNode('難易度：' + '★'.repeat(q.difficulty) + '☆'.repeat(5 - q.difficulty)));
  if (solved.has(q.id)) {
    const badge = document.createElement('span');
    badge.className = 'play-clear-badge';
    badge.textContent = '✓ クリア';
    info.append(badge);
  }
}

function openQuestion(q){
 active=q;
 const adjacent = adjacentQuestions(q);
 $('prevQuestion').disabled = !adjacent.previous;
 $('nextQuestion').disabled = !adjacent.next;
$('questionList').hidden=true;
$('home').hidden=true;
$('play').hidden=false;
$('homeButton').hidden = false;
$('back').hidden = false;
$('title').textContent=q.title;
renderPlayInfo(q);
const category = categories.find(c => c.id === q.category);
const characterName = category?.name || 'キャラ';

const description = document.querySelector('#play p.small');

if (description) {
    description.replaceChildren();
    description.classList.add('play-description');

    if (category?.image) {
        const img = document.createElement('img');
        img.src = category.image;
        img.alt = '';
        img.className = 'play-character-image';
        description.append(img);
    }

    const text = document.createElement('span');
    text.textContent =
        `写真の中の隠れた${characterName}をクリック・タップしよう！` +
        'ドラッグで移動！ホイール・ピンチで拡大縮小！';

    description.append(text);
}

$('message').textContent = ``;
$('answerMark').hidden=true;
$('correctEffect').classList.remove('show');
$('correctEffect').hidden = true;
$('correctImage').removeAttribute('src');
photoimg.src=q.image;
resetZoom();
 photoimg.onload=()=>{photo.style.aspectRatio=`${photoimg.naturalWidth}/${photoimg.naturalHeight}`;
drawZoom()};
 window.scrollTo(0,0);
}
// ヘッダーのロゴとタイトルをトップ画面へのリンクにする。
// 通常クリックは画面を切り替え、Ctrl+クリック等は通常のリンクとして扱う。
const siteTitle = document.querySelector('.site-title');
if (siteTitle) {
  const titleLink = document.createElement('a');
  titleLink.href = './';
  titleLink.setAttribute('aria-label', 'キャラクター選択画面に戻る');
  while (siteTitle.firstChild) titleLink.append(siteTitle.firstChild);
  siteTitle.append(titleLink);
  titleLink.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showHome();
  });
  const titleStyle = document.createElement('style');
  titleStyle.textContent = `
    .site-title > a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: inherit;
      color: inherit;
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .site-title > a:hover { opacity: 0.8; }
    .site-title > a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 4px; }
  `;
  document.head.append(titleStyle);
}

$('homeButton').onclick = showHome;
$('back').onclick = () => {
  if (currentCategory) showCategory(currentCategory);
  else showHome();
};

function answerAt(clientX,clientY){
 if(!active||!$('answerMark').hidden)return;
 const r=photo.getBoundingClientRect();
 const ix=(clientX-r.left-zoom.x)/zoom.scale,iy=(clientY-r.top-zoom.y)/zoom.scale;
 if(ix<0||iy<0||ix>r.width||iy>r.height)return;
 const x=ix/r.width*100,y=iy/r.height*100;
 if(distance(active,x,y)<=active.answer.radius){
     $('message').textContent='';
     solved.add(active.id);
     localStorage.setItem('find-me-solved',JSON.stringify([...solved]));
     renderClearProgress();
     renderPlayInfo(active);
     mark(active);
     showCorrectEffect();
 }
}
photo.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 photo.setPointerCapture(e.pointerId);
 zoom.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(zoom.pointers.size===1){
  zoom.gesture={type:'single',x:e.clientX,y:e.clientY,ox:zoom.x,oy:zoom.y,moved:false};
 }else if(zoom.pointers.size===2){
  const [a,b]=[...zoom.pointers.values()];
  zoom.gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),scale:zoom.scale,ox:zoom.x,oy:zoom.y,
   cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,moved:true};
 }
});
photo.addEventListener('pointermove',e=>{
 if(!zoom.pointers.has(e.pointerId))return;
 e.preventDefault();
 zoom.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const g=zoom.gesture;
if(!g)return;
 if(zoom.pointers.size===2){
  const [a,b]=[...zoom.pointers.values()];
  const d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
  if(g.type!=='pinch')return;
  const r=photo.getBoundingClientRect(),next=clamp(g.scale*d/Math.max(g.distance,1),1,5);
  const localX=g.cx-r.left,localY=g.cy-r.top;
  zoom.x=cx-r.left-(localX-g.ox)*next/g.scale;
  zoom.y=cy-r.top-(localY-g.oy)*next/g.scale;
  zoom.scale=next;
drawZoom();
return;
 }
 if(g.type==='single'){
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(Math.hypot(dx,dy)>6)g.moved=true;
  if(g.moved){zoom.x=g.ox+dx;
zoom.y=g.oy+dy;
drawZoom();
photo.classList.add('dragging')}
 }
});
function finishPointer(e,cancel=false){
 if(!zoom.pointers.has(e.pointerId))return;
 const g=zoom.gesture,wasSingle=zoom.pointers.size===1;
 zoom.pointers.delete(e.pointerId);
 photo.classList.remove('dragging');
 if(wasSingle&&g?.type==='single'&&!g.moved&&!cancel)answerAt(e.clientX,e.clientY);
 if(zoom.pointers.size===1){
  const p=[...zoom.pointers.values()][0];
  zoom.gesture={type:'single',x:p.x,y:p.y,ox:zoom.x,oy:zoom.y,moved:true};
 }else zoom.gesture=null;
}
photo.addEventListener('pointerup',e=>finishPointer(e));
photo.addEventListener('pointercancel',e=>finishPointer(e,true));
photo.addEventListener('lostpointercapture',e=>finishPointer(e,true));
photo.addEventListener('wheel',e=>{
 e.preventDefault();
setZoom(zoom.scale + (e.deltaY < 0 ? 0.15 : -0.15),e.clientX,e.clientY);
},{passive:false});
$('zoomIn').onclick=()=>{const r=photo.getBoundingClientRect();
setZoom(zoom.scale+0.5,r.left+r.width/2,r.top+r.height/2)};
$('zoomOut').onclick=()=>{const r=photo.getBoundingClientRect();
setZoom(zoom.scale-0.5,r.left+r.width/2,r.top+r.height/2)};
$('zoomReset').onclick=resetZoom;
$('prevQuestion').onclick = () => {
  if (!active) return;
  const previous = adjacentQuestions(active).previous;
  if (previous) openQuestion(previous);
};
$('nextQuestion').onclick = () => {
  if (!active) return;
  const next = adjacentQuestions(active).next;
  if (next) openQuestion(next);
};
window.addEventListener('resize',drawZoom);
$('hint').onclick=()=>{if(!active)return;
const x=active.answer.x,y=active.answer.y;
$('message').textContent=`ヒント：写真の${y<33?'上':y>67?'下':'中央'}・${x<33?'左':x>67?'右':'中央'}あたり！`};
$('reveal').onclick=()=>{if(active){mark(active);
$('message').textContent='ここにいたよ！'}};
Promise.all([
  fetch('data/categories.json').then(r => {
    if (!r.ok) throw Error('カテゴリデータの読み込み失敗');
    return r.json();
  }),
  fetch('data/questions.json').then(r => {
    if (!r.ok) throw Error('問題データの読み込み失敗');
    return r.json();
  })
]).then(([categoryData, questionData]) => {
  categories = categoryData;
  questions = questionData;
  if (questions.some(q => !q.category) && !categories.some(c => c.id === 'uncategorized')) {
    categories.push({ id: 'uncategorized', name: '未分類（既存の問題）', icon: '📷' });
  }
  renderCategories();
  renderClearProgress();
  loadUpdates();
  // 共有リンクから直接アクセスした場合も対象の問題を開く
  const initialState = stateFromUrl();
  history.replaceState(initialState, '', pageUrl(initialState));
  restorePage(initialState);
}).catch(error => {
  $('categories').textContent = 'データを読み込めませんでした。GitHub Pagesで開いてください。';
  console.error(error);
});
