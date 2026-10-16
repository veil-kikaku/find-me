let questions=[],categories=[],currentCategory=null,active=null,solved=new Set(JSON.parse(localStorage.getItem('find-me-solved')||'[]'));
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function distance(q,x,y){const img=$('photoimg');
const w=img.naturalWidth,h=img.naturalHeight;
return Math.hypot((x-q.answer.x)*w/100,(y-q.answer.y)*h/100)/Math.min(w,h)*100}
function mark(q){const img=$('photoimg'),m=$('answerMark');
const d=q.answer.radius*2*Math.min(img.naturalWidth,img.naturalHeight)/img.naturalWidth;
m.style.left=q.answer.x+'%';
m.style.top=q.answer.y+'%';
m.style.width=d+'%';
m.style.height=(q.answer.radius*2*Math.min(img.naturalWidth,img.naturalHeight)/img.naturalHeight)+'%';
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
  $('categoryTitle').textContent = categories.find(c => c.id === id)?.name || '問題一覧';
  render();
  window.scrollTo(0, 0);
}

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

function render() {
  $('list').replaceChildren();
  const filtered = questions.filter(q => (q.category || 'uncategorized') === currentCategory);
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
    const p = document.createElement('p');
    p.textContent = '★'.repeat(q.difficulty) + '☆'.repeat(5 - q.difficulty) +
      (solved.has(q.id) ? '　✓ クリア' : '');
    const b = document.createElement('button');
    b.textContent = '挑戦する';
    b.onclick = () => openQuestion(q);
    card.append(img, h, p, b);
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
function showCorrectEffect() {
    const effect = $('correctEffect');

    effect.classList.remove('show');
    effect.hidden = false;

    // アニメーションを最初から再生
    void effect.offsetWidth;
    effect.classList.add('show');
}

$('correctEffect').addEventListener('animationend', () => {
    $('correctEffect').classList.remove('show');
    $('correctEffect').hidden = true;
});
function openQuestion(q){
 active=q;
$('questionList').hidden=true;
$('home').hidden=true;
$('play').hidden=false;
$('homeButton').hidden=true;
$('back').hidden=false;
$('title').textContent=q.title;
$('info').textContent =
    '難易度：' +
    '★'.repeat(q.difficulty) +
    '☆'.repeat(5 - q.difficulty);
const category = categories.find(c => c.id === q.category);
const characterName = category?.name || 'キャラ';

const description = document.querySelector('#play p.small');

if (description) {
    description.textContent =
        `写真の中の隠れた${characterName}をクリック・タップしよう！` +
        'ドラッグで移動、ホイール・ピンチで拡大縮小！';
}

$('message').textContent =
    `隠れた${characterName}をクリック・タップしてね`;
$('answerMark').hidden=true;
$('correctEffect').classList.remove('show');
$('correctEffect').hidden = true;
photoimg.src=q.image;
resetZoom();
 photoimg.onload=()=>{photo.style.aspectRatio=`${photoimg.naturalWidth}/${photoimg.naturalHeight}`;
drawZoom()};
 window.scrollTo(0,0);
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
     $('message').textContent='🎉 正解！';
     solved.add(active.id);
     localStorage.setItem('find-me-solved',JSON.stringify([...solved]));
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
setZoom(zoom.scale*(e.deltaY<0?1.15:1/1.15),e.clientX,e.clientY);
},{passive:false});
$('zoomIn').onclick=()=>{const r=photo.getBoundingClientRect();
setZoom(zoom.scale*1.5,r.left+r.width/2,r.top+r.height/2)};
$('zoomOut').onclick=()=>{const r=photo.getBoundingClientRect();
setZoom(zoom.scale/1.5,r.left+r.width/2,r.top+r.height/2)};
$('zoomReset').onclick=resetZoom;
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
  showHome();
}).catch(error => {
  $('categories').textContent = 'データを読み込めませんでした。GitHub Pagesで開いてください。';
  console.error(error);
});
