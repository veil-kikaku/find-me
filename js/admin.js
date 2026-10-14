// ベルプロかくれんぼ：管理画面（問題IDはカテゴリごとに自動採番）
const $ = id => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let categories = [];
let existingQuestions = [];
let questionsReady = false;
let selected = null;
let point = null;

function currentCategory() {
  return categories.find(c => c.id === $('category').value);
}

function nextQuestionId(category) {
  if (!category || !/^[a-z]$/i.test(category.idPrefix || '')) return null;
  const prefix = category.idPrefix.toLowerCase();
  const pattern = new RegExp('^' + prefix + '(\\d+)$', 'i');
  let maximum = 0;

  for (const question of existingQuestions) {
    const match = String(question.id).match(pattern);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }

  return prefix + String(maximum + 1).padStart(3, '0');
}

function refreshIdPreview() {
  const category = currentCategory();
  const id = questionsReady ? nextQuestionId(category) : null;
  $('idPreview').textContent = id || (questionsReady ? 'キャラクターを選択してください' : '読み込み中…');
  $('download').disabled = !(questionsReady && id && selected && point);
}

async function loadQuestions() {
  questionsReady = false;
  $('existingStatus').textContent = '公開中の data/questions.json を読み込み中…';
  refreshIdPreview();

  try {
    const response = await fetch('data/questions.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(q => q && typeof q.id === 'string')) {
      throw new Error('問題データの形式が正しくありません');
    }
    existingQuestions = data;
    questionsReady = true;
    $('existingStatus').textContent = `公開中の問題 ${data.length} 件を読み込みました`;
  } catch (error) {
    existingQuestions = [];
    $('existingStatus').textContent = '読み込み失敗：' + error.message + '。保存はできません。GitHub Pages上で開き、再読み込みしてください。';
  }

  refreshIdPreview();
}

async function loadCategories() {
  try {
    const response = await fetch('data/categories.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(c => c && c.id && c.name && /^[a-z]$/i.test(c.idPrefix || ''))) {
      throw new Error('カテゴリに idPrefix（アルファベット1文字）が必要です');
    }
    const prefixes = data.map(c => c.idPrefix.toLowerCase());
    if (new Set(prefixes).size !== prefixes.length) throw new Error('カテゴリ間で idPrefix が重複しています');

    categories = data;
    $('category').replaceChildren();
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      $('category').append(option);
    }
    refreshIdPreview();
  } catch (error) {
    categories = [];
    $('category').replaceChildren(new Option('カテゴリを読み込めません', ''));
    $('existingStatus').textContent += ' / カテゴリ読み込み失敗：' + error.message;
    refreshIdPreview();
  }
}

$('category').addEventListener('change', refreshIdPreview);
$('reloadQuestions').addEventListener('click', loadQuestions);

$('file').addEventListener('change', () => {
  const file = $('file').files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    alert('JPEG・PNG・WebP・GIFの画像を選んでください');
    return;
  }
  selected = file;
  point = null;
  const img = $('preview');
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.dataset.url = URL.createObjectURL(file);
  img.src = img.dataset.url;
  img.hidden = false;
  $('marker').hidden = true;
  $('coords').textContent = '探すキャラクターの中心をクリックしてください';
  refreshIdPreview();
});

function updateMarker() {
  if (!point) return;
  const img = $('preview');
  const marker = $('marker');
  const radius = Number($('radius').value);
  marker.style.left = point.x + '%';
  marker.style.top = point.y + '%';
  marker.style.width = 2 * radius * Math.min(img.naturalWidth, img.naturalHeight) / img.naturalWidth + '%';
  marker.style.height = 2 * radius * Math.min(img.naturalWidth, img.naturalHeight) / img.naturalHeight + '%';
  marker.hidden = false;
  $('coords').textContent = `正解位置 X ${point.x.toFixed(2)}% / Y ${point.y.toFixed(2)}%`;
}

$('editor').addEventListener('click', event => {
  const img = $('preview');
  if (img.hidden) return;
  const rect = img.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
  point = {
    x: clamp((event.clientX - rect.left) / rect.width * 100, 0, 100),
    y: clamp((event.clientY - rect.top) / rect.height * 100, 0, 100)
  };
  updateMarker();
  refreshIdPreview();
});
$('radius').addEventListener('input', updateMarker);

// 外部ライブラリを使わないZIP生成（無圧縮形式）
const encoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const [name, bytes] of entries) {
    const filename = encoder.encode(name);
    const crc = crc32(bytes);
    const size = bytes.length;
    const local = new Uint8Array(30 + filename.length + size);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, filename.length, true);
    local.set(filename, 30);
    local.set(bytes, 30 + filename.length);
    locals.push(local);

    const directory = new Uint8Array(46 + filename.length);
    const dv = new DataView(directory.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, size, true);
    dv.setUint32(24, size, true);
    dv.setUint16(28, filename.length, true);
    dv.setUint32(42, offset, true);
    directory.set(filename, 46);
    central.push(directory);
    offset += local.length;
  }

  const centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0);
  const end = new Uint8Array(22);
  const dv = new DataView(end.buffer);
  dv.setUint32(0, 0x06054b50, true);
  dv.setUint16(8, entries.length, true);
  dv.setUint16(10, entries.length, true);
  dv.setUint32(12, centralSize, true);
  dv.setUint32(16, offset, true);
  return new Blob([...locals, ...central, end], { type: 'application/zip' });
}

$('download').addEventListener('click', async () => {
  // ZIP作成直前にも公開中の問題を読み直し、最新番号で採番します。
  await loadQuestions();
  if (!questionsReady) return alert('公開中の問題データを取得できないため保存できません');

  const category = currentCategory();
  const id = nextQuestionId(category);
  const title = $('title').value.trim();
  const radius = Number($('radius').value);
  if (!category || !id) return alert('キャラクターを選んでください');
  if (existingQuestions.some(q => q.id === id)) return alert('問題IDが重複しています。再読み込みしてください');
  if (!title || !point || !selected) return alert('タイトル・写真・正解位置を設定してください');
  if (!(radius >= 1 && radius <= 30)) return alert('正解範囲は1〜30で設定してください');

  const extensions = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/jpeg': 'jpg' };
  const ext = extensions[selected.type];
  if (!ext) return alert('JPEG・PNG・WebP・GIFの画像を選んでください');

  const image = `images/${id}.${ext}`;
  const question = {
    id,
    title,
    category: category.id,
    difficulty: Number($('difficulty').value),
    image,
    answer: { x: +point.x.toFixed(3), y: +point.y.toFixed(3), radius }
  };

  const imageBytes = new Uint8Array(await selected.arrayBuffer());
  const jsonBytes = encoder.encode(JSON.stringify([...existingQuestions, question], null, 2));
  const archive = zip([['data/questions.json', jsonBytes], [image, imageBytes]]);
  const url = URL.createObjectURL(archive);
  const link = document.createElement('a');
  link.href = url;
  link.download = `veil-kakurenbo-${id}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

Promise.all([loadCategories(), loadQuestions()]);
