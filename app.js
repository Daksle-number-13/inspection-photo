'use strict';

// ═══════════════════════════════════════
// 외부 모듈 임포트
// ═══════════════════════════════════════
import CloudikeUploader from './cloudike-uploader.js';

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
// 사진 선택 & 미리보기 (다중)
// ═══════════════════════════════════════
let selectedFiles = [];

function addFiles(fileList) {
  Array.from(fileList).forEach(f => selectedFiles.push(f));
  renderPreviews();
}

function renderPreviews() {
  const area = $('preview-area');
  if (selectedFiles.length === 0) {
    area.innerHTML = '<span class="preview-placeholder">사진을 선택하면 여기에 표시됩니다</span>';
    return;
  }
  area.innerHTML = `
    <div class="preview-header">
      <span>${selectedFiles.length}장 선택됨</span>
      <button class="btn-clear-all" id="btn-clear-all">전체 삭제</button>
    </div>
    <div class="preview-grid" id="preview-grid"></div>
  `;
  $('btn-clear-all').addEventListener('click', () => {
    selectedFiles = [];
    renderPreviews();
  });
  selectedFiles.forEach((f, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'preview-thumb';
    thumb.innerHTML = `<button class="thumb-del" type="button">×</button>`;
    $('preview-grid').appendChild(thumb);
    thumb.querySelector('.thumb-del').addEventListener('click', e => {
      e.stopPropagation();
      const idx = selectedFiles.indexOf(f);
      if (idx !== -1) selectedFiles.splice(idx, 1);
      renderPreviews();
    });
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = `사진 ${i + 1}`;
      thumb.insertBefore(img, thumb.firstChild);
    };
    reader.readAsDataURL(f);
  });
}

// Cloudike 업로드는 cloudike-uploader.js 모듈에서 관리
const uploader = new CloudikeUploader();

// ═══════════════════════════════════════
// 업로드 실행
// ═══════════════════════════════════════
async function handleUpload() {
  // 유효성 검사
  const folderIdx = $('select-folder').value;
  if (folderIdx === '') { showStatus('업로드 폴더를 선택하세요.', 'error'); return; }
  if (selectedFiles.length === 0) { showStatus('사진을 먼저 선택하거나 촬영하세요.', 'error'); return; }

  const folders = getFolders();
  const folder = folders[parseInt(folderIdx, 10)];
  if (!folder) { showStatus('폴더 정보를 찾을 수 없습니다.', 'error'); return; }

  const date    = $('input-date').value || todayStr();
  const product = $('input-product').value.trim();
  const process = $('input-process').value.trim();
  const defect  = $('input-defect').value.trim();

  const folderName = `${safe(date)}_${safe(folder.tag)}_${safe(product)}_${safe(process)}_${safe(defect)}`;

  const btn = $('btn-upload');
  btn.disabled = true;

  // CloudikeUploader 모듈 사용
  const result = await uploader.uploadMultiple(selectedFiles, folder.url, folderName, (current, total) => {
    showStatus(`⏳ 업로드 중... (${current}/${total})`, 'loading');
  });

  btn.disabled = false;
  const total = result.total;
  const succeeded = result.succeeded;
  const errors = result.errors.map(e => `${e.index + 1}번: ${e.error.message}`);

  if (errors.length === 0) {
    addToHist(LS_HIST_PRODUCT, product);
    addToHist(LS_HIST_PROCESS, process);
    addToHist(LS_HIST_DEFECT,  defect);
    renderAllHist();
    $('done-filename').innerHTML = `
      <strong>${total}장</strong> 완료<br>
      📁 <code>${folderName}/</code>
    `;
    showStatus('✓ 업로드 완료!', 'success');
    setTimeout(() => showScreen('screen-done'), 500);
  } else if (succeeded > 0) {
    showStatus(`⚠️ ${succeeded}/${total}장 완료, 실패: ${errors[0]}`, 'error');
  } else {
    showStatus(`❌ ${errors[0]}`, 'error');
  }
}

function showStatus(msg, type = '') {
  const el = $('upload-status');

  // 로더 아이콘 추가
  let content = msg;
  if (type === 'loading') {
    content = '<span class="loader"></span> ' + msg;
  } else if (type === 'success') {
    content = '✓ ' + msg;
  } else if (type === 'error') {
    content = '✕ ' + msg;
  }

  el.innerHTML = content;
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

  // ── 카메라 버튼 (촬영마다 목록에 추가) ──
  $('btn-camera').addEventListener('click', () => $('file-camera').click());
  $('file-camera').addEventListener('change', e => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = ''; // 동일 파일 재선택 허용
  });

  // ── 갤러리 버튼 (여러 장 동시 선택) ──
  $('btn-gallery').addEventListener('click', () => $('file-gallery').click());
  $('file-gallery').addEventListener('change', e => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = '';
  });

  // ── 업로드 버튼 ──
  $('btn-upload').addEventListener('click', handleUpload);

  // ── 완료 → 메인 복귀 ──
  $('btn-done-ok').addEventListener('click', () => {
    selectedFiles = [];
    renderPreviews();
    $('upload-status').style.display = 'none';
    $('file-camera').value = '';
    $('file-gallery').value = '';
    showScreen('screen-main');
  });

  // ── 도움말 ──
  if ($('btn-help')) {
    $('btn-help').addEventListener('click', () => {
      alert(
        '📸 검사 사진 등록 가이드\n\n' +
        '1️⃣ 일시: 촬영 날짜 선택\n' +
        '2️⃣ 위치: 업로드할 폴더 선택\n' +
        '3️⃣ 정보: 제품명, 공정, 불량 입력\n' +
        '4️⃣ 사진: 촬영 또는 갤러리 선택\n' +
        '5️⃣ 업로드: ☁️ 버튼 클릭\n\n' +
        '💡 팁: 갤러리에서는 여러 장을 한 번에 선택할 수 있습니다.'
      );
    });
  }

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
