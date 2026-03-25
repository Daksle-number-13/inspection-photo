'use strict';

// ═══════════════════════════════════════
// 상수 & localStorage 키
// ═══════════════════════════════════════
const LS_FOLDERS  = 'ip_folders';   // [{tag, url}, ...]
const LS_HIST_PRODUCT = 'ip_hist_product'; // [string, ...]
const LS_HIST_PROCESS = 'ip_hist_process';
const LS_HIST_DEFECT  = 'ip_hist_defect';

// ═══════════════════════════════════════
// 유틸
// ═══════════════════════════════════════
const $ = id => document.getElementById(id);

function loadJSON(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** 오늘 날짜 YYYY-MM-DD */
function todayStr() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '');
}

/** 파일명에 쓸 수 없는 문자 제거 */
function safe(str) {
  return (str || '').replace(/[\/\\:*?"<>|]/g, '_').trim() || '미입력';
}

// ═══════════════════════════════════════
// 화면 전환
// ═══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ═══════════════════════════════════════
// 업로드 폴더 (설정)
// ═══════════════════════════════════════
function getFolders() { return loadJSON(LS_FOLDERS); }
function saveFolders(list) { saveJSON(LS_FOLDERS, list); }

function renderFolderList() {
  const list = getFolders();
  const ul = $('folder-list');
  if (list.length === 0) {
    ul.innerHTML = '<li class="empty-msg">등록된 폴더가 없습니다</li>';
    return;
  }
  ul.innerHTML = list.map((f, i) => `
    <li class="folder-item">
      <div class="folder-item-info">
        <div class="folder-tag">🏷️ ${escHtml(f.tag)}</div>
        <div class="folder-url">${escHtml(f.url)}</div>
      </div>
      <button class="btn-del-folder" data-index="${i}" aria-label="삭제">🗑️</button>
    </li>
  `).join('');
  ul.querySelectorAll('.btn-del-folder').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const folders = getFolders();
      folders.splice(idx, 1);
      saveFolders(folders);
      renderFolderList();
      renderFolderDropdown();
    });
  });
}

function renderFolderDropdown() {
  const sel = $('select-folder');
  const prev = sel.value;
  const list = getFolders();
  sel.innerHTML = '<option value="">— 폴더 선택 —</option>' +
    list.map((f, i) => `<option value="${i}">${escHtml(f.tag)}</option>`).join('');
  // 이전 선택 유지
  sel.value = prev;
}

// ═══════════════════════════════════════
// 이력 드롭다운
// ═══════════════════════════════════════
const HIST_CONFIG = [
  { key: LS_HIST_PRODUCT, inputId: 'input-product', histId: 'hist-product', tagsId: 'hist-product-tags' },
  { key: LS_HIST_PROCESS, inputId: 'input-process', histId: 'hist-process', tagsId: 'hist-process-tags' },
  { key: LS_HIST_DEFECT,  inputId: 'input-defect',  histId: 'hist-defect',  tagsId: 'hist-defect-tags'  },
];

function renderHistDropdown(cfg) {
  const hist = loadJSON(cfg.key);
  const sel = $(cfg.histId);
  sel.innerHTML = '<option value="">이력</option>' +
    hist.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
}

function renderHistTags(cfg) {
  const hist = loadJSON(cfg.key);
  const container = $(cfg.tagsId);
  container.innerHTML = hist.map(v => `
    <span class="tag-item" data-val="${escHtml(v)}">
      ${escHtml(v)}
      <button class="tag-del" data-key="${cfg.key}" data-val="${escHtml(v)}" title="삭제">×</button>
    </span>
  `).join('');

  // 태그 클릭 → 입력창에 값 입력
  container.querySelectorAll('.tag-item').forEach(tag => {
    tag.addEventListener('click', e => {
      if (e.target.classList.contains('tag-del')) return;
      $(cfg.inputId).value = tag.dataset.val;
    });
  });

  // 삭제 버튼
  container.querySelectorAll('.tag-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const key = btn.dataset.key;
      const val = btn.dataset.val;
      const hist = loadJSON(key);
      saveJSON(key, hist.filter(v => v !== val));
      renderAllHist();
    });
  });
}

function renderAllHist() {
  HIST_CONFIG.forEach(cfg => {
    renderHistDropdown(cfg);
    renderHistTags(cfg);
  });
}

/** 입력값을 이력에 추가 (중복 제거, 최신 순 최대 20개) */
function addToHist(key, value) {
  if (!value) return;
  let hist = loadJSON(key);
  hist = [value, ...hist.filter(v => v !== value)].slice(0, 20);
  saveJSON(key, hist);
}

// ═══════════════════════════════════════
// 사진 선택 & 미리보기
// ═══════════════════════════════════════
let selectedFile = null;

function handleFileSelect(file) {
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = $('preview-img');
    img.src = e.target.result;
    img.style.display = 'block';
    $('preview-area').querySelector('.preview-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════
// Cloudike 업로드
// ═══════════════════════════════════════
async function uploadToCloudike(file, shareUrl, folderName, fileName) {
  // Cloudike 공유링크 업로드: PUT /{shareUrl}/{folderName}/{fileName}
  // 실제 Cloudike API 경로는 인스턴스 설정에 따라 다를 수 있습니다
  const uploadUrl = `${shareUrl.replace(/\/$/, '')}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;

  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });

  if (!resp.ok) {
    throw new Error(`업로드 실패: HTTP ${resp.status} ${resp.statusText}`);
  }
  return uploadUrl;
}

// ═══════════════════════════════════════
// 업로드 실행
// ═══════════════════════════════════════
async function handleUpload() {
  const statusEl = $('upload-status');

  // 유효성 검사
  const folderIdx = $('select-folder').value;
  if (folderIdx === '') {
    showStatus('업로드 폴더를 선택하세요.', 'error');
    return;
  }
  if (!selectedFile) {
    showStatus('사진을 먼저 선택하거나 촬영하세요.', 'error');
    return;
  }

  const folders = getFolders();
  const folder = folders[parseInt(folderIdx, 10)];
  if (!folder) {
    showStatus('폴더 정보를 찾을 수 없습니다.', 'error');
    return;
  }

  const date    = $('input-date').value || todayStr();
  const product = $('input-product').value.trim();
  const process = $('input-process').value.trim();
  const defect  = $('input-defect').value.trim();

  const folderName = `${safe(date)}_${safe(folder.tag)}_${safe(product)}_${safe(process)}_${safe(defect)}`;
  const ext = selectedFile.name.split('.').pop() || 'jpg';
  const ts  = Date.now();
  const fileName = `${folderName}_${ts}.${ext}`;

  const btn = $('btn-upload');
  btn.disabled = true;
  showStatus('⏳ 업로드 중...', 'loading');

  try {
    await uploadToCloudike(selectedFile, folder.url, folderName, fileName);

    // 이력 저장
    addToHist(LS_HIST_PRODUCT, product);
    addToHist(LS_HIST_PROCESS, process);
    addToHist(LS_HIST_DEFECT,  defect);
    renderAllHist();

    // 완료 화면
    $('done-filename').textContent = folderName + '/' + fileName;
    showScreen('screen-done');
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function showStatus(msg, type = '') {
  const el = $('upload-status');
  el.textContent = msg;
  el.className = 'upload-status ' + type;
  el.style.display = 'block';
}

// ═══════════════════════════════════════
// XSS 방지용 이스케이프
// ═══════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════
// 초기화
// ═══════════════════════════════════════
function init() {
  // 오늘 날짜 자동 입력
  $('input-date').value = new Date().toISOString().slice(0, 10);

  // 폴더 렌더링
  renderFolderList();
  renderFolderDropdown();

  // 이력 렌더링
  renderAllHist();

  // ── 이력 셀렉트 → 입력창 연동 ──
  HIST_CONFIG.forEach(cfg => {
    $(cfg.histId).addEventListener('change', e => {
      if (e.target.value) $(cfg.inputId).value = e.target.value;
      e.target.value = '';
    });
  });

  // ── 카메라 버튼 ──
  $('btn-camera').addEventListener('click', () => $('file-camera').click());
  $('file-camera').addEventListener('change', e => handleFileSelect(e.target.files[0]));

  // ── 갤러리 버튼 ──
  $('btn-gallery').addEventListener('click', () => $('file-gallery').click());
  $('file-gallery').addEventListener('change', e => handleFileSelect(e.target.files[0]));

  // ── 업로드 버튼 ──
  $('btn-upload').addEventListener('click', handleUpload);

  // ── 완료 → 메인 복귀 ──
  $('btn-done-ok').addEventListener('click', () => {
    // 폼 리셋
    selectedFile = null;
    $('preview-img').style.display = 'none';
    $('preview-img').src = '';
    $('preview-area').querySelector('.preview-placeholder').style.display = '';
    $('upload-status').style.display = 'none';
    $('file-camera').value = '';
    $('file-gallery').value = '';
    showScreen('screen-main');
  });

  // ── 설정 열기 ──
  $('btn-settings').addEventListener('click', () => {
    renderFolderList();
    showScreen('screen-settings');
  });

  // ── 설정 → 뒤로 ──
  $('btn-back').addEventListener('click', () => showScreen('screen-main'));

  // ── 폴더 추가 ──
  $('btn-add-folder').addEventListener('click', () => {
    const tag = $('setting-tag').value.trim();
    const url = $('setting-url').value.trim();
    if (!tag || !url) {
      alert('태그명과 URL을 모두 입력하세요.');
      return;
    }
    const folders = getFolders();
    folders.push({ tag, url });
    saveFolders(folders);
    $('setting-tag').value = '';
    $('setting-url').value = '';
    renderFolderList();
    renderFolderDropdown();
  });

  // ── Service Worker 등록 ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
