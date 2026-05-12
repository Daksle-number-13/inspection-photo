'use strict';

const APP_REV = 'r1.3'; // UI 리디자인 버전

// ═══════════════════════════════════════
// 상수 & localStorage 키
// ═══════════════════════════════════════
const LS_FOLDERS      = 'ip_folders';        // [{tag, url}, ...]
const LS_HIST_PRODUCT = 'ip_hist_product';   // [string, ...]
const LS_HIST_LOT     = 'ip_hist_lot';       // [string, ...]  ← 신규
const LS_HIST_PROCESS = 'ip_hist_process';
const LS_HIST_DEFECT  = 'ip_hist_defect';

// ─── History Input 설정 ───
const HIST_CONFIG = [
  { inputId: 'input-product', key: LS_HIST_PRODUCT, label: '제품 정보' },
  { inputId: 'input-lot',     key: LS_HIST_LOT,     label: '이력(Lot No.)' },
  { inputId: 'input-process', key: LS_HIST_PROCESS, label: '발생 공정' },
  { inputId: 'input-defect',  key: LS_HIST_DEFECT,  label: '불량 유형'  },
];

// ═══════════════════════════════════════
// 유�
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
  return new Date().toISOString().slice(0, 10);
}

/** 현재 시각 HH:MM */
function nowTimeStr() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 파일명에 쓸 수 없는 문자 제거 */
function safe(str) {
  return (str || '').replace(/[\/\\:*?"<>|]/g, '_').trim() || '미입력';
}

/** XSS 방지용 이스케이프 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// ─── selectedFolder: 선택한 폴더 URL (string) ───
let selectedFolder = '';   // URL
let selectedFolderTag = ''; // 태그명

function renderFolderChips() {
  const picker = $('folder-picker');
  const folders = getFolders();

  if (folders.length === 0) {
    picker.innerHTML = `
      <button class="folder-empty-btn" id="btn-go-settings">
        ⚙ 설정에서 폴더를 먼저 등록해주세요
      </button>`;
    picker.querySelector('#btn-go-settings').addEventListener('click', () => {
      renderFolderList();
      showScreen('screen-settings');
    });
    return;
  }

  picker.innerHTML = folders.map((f, i) => `
    <button class="folder-chip${selectedFolder === f.url ? ' selected' : ''}"
            data-url="${escHtml(f.url)}" data-tag="${escHtml(f.tag)}" data-index="${i}">
      ${selectedFolder === f.url ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      ${escHtml(f.tag)}
    </button>
  `).join('');

  picker.querySelectorAll('.folder-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedFolder = chip.dataset.url;
      selectedFolderTag = chip.dataset.tag;
      renderFolderChips();
      updateStep();
      updateCta();
    });
  });
}

// ─── 설정 화면 폴더 목록 ───
function renderFolderList() {
  const list = getFolders();
  const container = $('folder-list');
  const badge = $('folder-count-badge');

  if (badge) badge.textContent = `${list.length}개`;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-msg">등록된 폴더가 없습니다</div>';
    return;
  }

  container.innerHTML = list.map((f, i) => `
    <div class="folder-item">
      <div class="folder-item-icon">📁</div>
      <div class="folder-item-info">
        <div class="folder-item-tag">${escHtml(f.tag)}</div>
        <div class="folder-item-url">${escHtml(f.url)}</div>
      </div>
      <button class="btn-del-folder" data-index="${i}" aria-label="삭제">×</button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-del-folder').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const folders = getFolders();
      if (folders[idx] && folders[idx].url === selectedFolder) {
        selectedFolder = '';
        selectedFolderTag = '';
      }
      folders.splice(idx, 1);
      saveFolders(folders);
      renderFolderList();
      renderFolderChips();
      updateStep();
      updateCta();
    });
  });
}

// ─── 설정 내보내기 ───
function exportSettings() {
  const settings = {
    folders: getFolders(),
    histProduct: loadJSON(LS_HIST_PRODUCT),
    histLot:     loadJSON(LS_HIST_LOT),
    histProcess: loadJSON(LS_HIST_PROCESS),
    histDefect:  loadJSON(LS_HIST_DEFECT),
    exportDate: new Date().toISOString()
  };

  const json = JSON.stringify(settings, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inspection-photo-settings_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── 설정 가져오기 ───
function importSettings(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const settings = JSON.parse(e.target.result);
      saveFolders(settings.folders || []);
      saveJSON(LS_HIST_PRODUCT, settings.histProduct || []);
      saveJSON(LS_HIST_LOT,     settings.histLot     || []);
      saveJSON(LS_HIST_PROCESS, settings.histProcess || []);
      saveJSON(LS_HIST_DEFECT,  settings.histDefect  || []);
      renderFolderList();
      renderFolderChips();
      setupHistInputs();
      alert('✓ 설정이 복원되었습니다');
    } catch (err) {
      alert('✕ 설정 파일 읽기 실패: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════
// 이력 History Input
// ═══════════════════════════════════════

/** 입력값을 이력에 추가 (중복 제거, 최신 순 최대 20개) */
function addToHist(key, value) {
  if (!value) return;
  let hist = loadJSON(key);
  hist = [value, ...hist.filter(v => v !== value)].slice(0, 20);
  saveJSON(key, hist);
}

/**
 * 4개의 History Input 드롭다운 초기화
 * - 입력 시 실시간 필터링
 * - 화살표 클릭 시 전체 이력 열기/닫기
 * - 바깥 클릭 시 닫힐
 */
function setupHistInputs() {
  HIST_CONFIG.forEach(cfg => {
    const inputEl  = $(cfg.inputId);
    const boxId    = 'box-'      + cfg.inputId.replace('input-', '');
    const arrowId  = 'arrow-'    + cfg.inputId.replace('input-', '');
    const dropId   = 'dropdown-' + cfg.inputId.replace('input-', '');

    const boxEl   = $(boxId);
    const arrowEl = $(arrowId);
    const dropEl  = $(dropId);

    if (!inputEl || !boxEl || !arrowEl || !dropEl) return;

    function openDrop() {
      const hist = loadJSON(cfg.key);
      const q    = inputEl.value.toLowerCase();
      const filtered = q
        ? hist.filter(v => v.toLowerCase().includes(q))
        : hist;

      if (filtered.length === 0) {
        dropEl.innerHTML = '<div class="hist-dropdown-empty">이력이 없습니다</div>';
      } else {
        dropEl.innerHTML = filtered.map(v => `
          <div class="hist-dropdown-item" data-val="${escHtml(v)}">
            <span class="hist-icon">🕐</span>
            <span>${escHtml(v)}</span>
          </div>
        `).join('');
        dropEl.querySelectorAll('.hist-dropdown-item').forEach(item => {
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            inputEl.value = item.dataset.val;
            closeDrop();
            updateStep();
            updateCta();
          });
        });
      }
      dropEl.style.display = 'block';
      boxEl.classList.add('open');
      arrowEl.classList.add('open');
    }

    function closeDrop() {
      dropEl.style.display = 'none';
      boxEl.classList.remove('open');
      arrowEl.classList.remove('open');
    }

    function toggleDrop() {
      if (dropEl.style.display === 'none') {
        openDrop();
        inputEl.focus();
      } else {
        closeDrop();
      }
    }

    inputEl.addEventListener('focus', openDrop);
    inputEl.addEventListener('blur',  () => setTimeout(closeDrop, 150));
    inputEl.addEventListener('input', () => {
      if (dropEl.style.display !== 'none') openDrop();
      updateStep();
      updateCta();
    });

    arrowEl.addEventListener('click', toggleDrop);
  });
}

// ═══════════════════════════════════════
// 사진 선택 & 캐러셀
// ═══════════════════════════════════════
let selectedFiles  = [];
let carouselIndex  = 0;

// 파일 DataURL 캐시 (렌더링 속도 개선)
const urlCache = new WeakMap();

function getFileURL(file) {
  if (!urlCache.has(file)) {
    urlCache.set(file, URL.createObjectURL(file));
  }
  return urlCache.get(file);
}

function addFiles(fileList) {
  Array.from(fileList).forEach(f => selectedFiles.push(f));
  carouselIndex = Math.max(0, selectedFiles.length - 1);
  renderCarousel();
  updateStep();
  updateCta();
}

/**
 * 사진 캐러셀 렌더링
 */
function renderCarousel() {
  const area  = $('photo-area');
  const badge = $('photo-count-badge');
  const n     = selectedFiles.length;

  if (n === 0) {
    badge.style.display = 'none';
    area.innerHTML = `
      <div class="photo-empty">
        <div class="photo-empty-text">사진을 촬영하거나 갤러리에서 선택하세요</div>
      </div>`;
    return;
  }

  badge.style.display = '';
  badge.textContent = `${n}장 선택`;

  if (carouselIndex >= n) carouselIndex = n - 1;

  const slides = selectedFiles.map((f, i) => `
    <div class="carousel-slide" data-idx="${i}">
      <img src="${getFileURL(f)}" alt="사진 ${i + 1}" draggable="false" />
    </div>
  `).join('');

  const thumbs = selectedFiles.map((f, i) => `
    <div class="carousel-thumb${i === carouselIndex ? ' active' : ''}" data-idx="${i}">
      <img src="${getFileURL(f)}" alt="썸네일 ${i + 1}" draggable="false" />
    </div>
  `).join('');

  const dots = selectedFiles.map((_, i) => `
    <div class="carousel-dot${i === carouselIndex ? ' active' : ''}"></div>
  `).join('');

  const showPrev = carouselIndex > 0;
  const showNext = carouselIndex < n - 1;

  area.innerHTML = `
    <div class="carousel-wrap">
      <div class="carousel-viewer" id="carousel-viewer">
        <div class="carousel-track-wrap">
          <div class="carousel-track" id="carousel-track" style="transform: translateX(-${carouselIndex * 100}%)">
            ${slides}
          </div>
        </div>
        <div class="carousel-overlay"></div>
        <button class="carousel-delete" id="carousel-delete" aria-label="삭제">×</button>
        <div class="carousel-counter">${carouselIndex + 1}/${n}</div>
        <div class="carousel-dots" id="carousel-dots">${dots}</div>
        ${showPrev ? '<button class="carousel-arrow carousel-arrow-prev" id="carousel-prev">‹</button>' : ''}
        ${showNext ? '<button class="carousel-arrow carousel-arrow-next" id="carousel-next">›</button>' : ''}
      </div>
      <div class="carousel-thumbs" id="carousel-thumbs">${thumbs}</div>
    </div>
  `;

  $('carousel-delete').addEventListener('click', () => {
    selectedFiles.splice(carouselIndex, 1);
    carouselIndex = Math.min(carouselIndex, selectedFiles.length - 1);
    if (carouselIndex < 0) carouselIndex = 0;
    renderCarousel();
    updateStep();
    updateCta();
  });

  if ($('carousel-prev')) {
    $('carousel-prev').addEventListener('click', () => {
      if (carouselIndex > 0) { carouselIndex--; renderCarousel(); }
    });
  }
  if ($('carousel-next')) {
    $('carousel-next').addEventListener('click', () => {
      if (carouselIndex < selectedFiles.length - 1) { carouselIndex++; renderCarousel(); }
    });
  }

  $('carousel-thumbs').querySelectorAll('.carousel-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      carouselIndex = parseInt(thumb.dataset.idx, 10);
      renderCarousel();
    });
  });

  setupCarouselSwipe();
}

function setupCarouselSwipe() {
  const viewer = $('carousel-viewer');
  if (!viewer) return;

  let startX = 0;
  let isDragging = false;

  viewer.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  viewer.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 44) return;
    if (dx < 0 && carouselIndex < selectedFiles.length - 1) {
      carouselIndex++;
    } else if (dx > 0 && carouselIndex > 0) {
      carouselIndex--;
    }
    renderCarousel();
  }, { passive: true });
}

// ═══════════════════════════════════════
// 스텝 인디케이터
// ═══════════════════════════════════════
function updateStep() {
  const product = $('input-product') ? $('input-product').value.trim() : '';
  const hasPhoto = selectedFiles.length > 0;
  const hasFolder = !!selectedFolder;

  let activeStep;
  if (hasPhoto) {
    activeStep = 3;
  } else if (product || selectedFolder) {
    activeStep = 2;
  } else {
    activeStep = 1;
  }

  for (let s = 1; s <= 3; s++) {
    const circle = $(`step-circle-${s}`);
    const item   = $(`step-${s}`);
    if (!circle || !item) continue;

    circle.className = 'step-circle';
    item.className   = 'step-item';

    if (s < activeStep) {
      circle.className += ' done';
      item.className   += ' done';
      circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (s === activeStep) {
      circle.className += ' active';
      item.className   += ' active';
      circle.textContent = s;
    } else {
      circle.textContent = s;
    }
  }

  const line1 = $('step-line-1');
  const line2 = $('step-line-2');
  if (line1) line1.className = 'step-line' + (activeStep > 1 ? ' done' : '');
  if (line2) line2.className = 'step-line' + (activeStep > 2 ? ' done' : '');
}

function setupStepClick() {
  for (let s = 1; s <= 3; s++) {
    const item = $(`step-${s}`);
    if (item) {
      item.addEventListener('click', () => {
        const section = $(`section-${s}`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }
}

// ═══════════════════════════════════════
// CTA 버튼
// ═══════════════════════════════════════
function updateCta() {
  const btn  = $('btn-upload');
  const text = $('cta-text');
  if (!btn || !text) return;

  const hasFolder = !!selectedFolder;
  const hasPhoto  = selectedFiles.length > 0;

  if (!hasFolder) {
    btn.className  = 'cta-btn cta-disabled';
    text.innerHTML = '업로드 위치를 선택하세요';
  } else if (!hasPhoto) {
    btn.className  = 'cta-btn cta-disabled';
    text.innerHTML = '사진을 선택하세요';
  } else {
    btn.className  = 'cta-btn cta-active';
    text.innerHTML = `Cloudike 업로드 · ${selectedFiles.length}장
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="margin-left:4px">
        <path d="M9 12V3M9 3L5.5 6.5M9 3L12.5 6.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 13v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
}

// ═══════════════════════════════════════
// 업로드 중 화면
// ═══════════════════════════════════════
function showUploadingScreen(n) {
  $('uploading-desc').textContent = `${n}장 저장 중...`;
  $('progress-pct').textContent   = '0%';
  $('progress-bar').style.width   = '0%';

  const thumbsEl = $('uploading-thumbs');
  const previewFiles = selectedFiles.slice(0, 6);
  thumbsEl.innerHTML = previewFiles.map((f, i) => `
    <div class="uploading-thumb" id="uthumb-${i}">
      <img src="${getFileURL(f)}" alt="사진 ${i + 1}" />
    </div>
  `).join('');

  showScreen('screen-uploading');
}

function updateUploadProgress(current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  $('progress-pct').textContent = `${pct}%`;
  $('progress-bar').style.width = `${pct}%`;

  for (let i = 0; i < Math.min(current, 6); i++) {
    const th = $(`uthumb-${i}`);
    if (th && !th.classList.contains('done')) {
      th.classList.add('done');
      th.innerHTML += '<div class="uploading-thumb-check">✓</div>';
    }
  }
}

// ═══════════════════════════════════════
// Cloudike 업로드
// ═══════════════════════════════════════
async function uploadToCloudike(file, shareUrl, folderName, fileName) {
  const url = new URL(shareUrl.trim());
  const hash = url.pathname.split('/').filter(Boolean).pop();
  const filePath = '/' + folderName + '/' + fileName;

  const APOLLO = 'https://apollo.cloudike.kr/graphql';
  const createRes = await fetch(APOLLO + '?o=CreatePublicFile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'CreatePublicFile',
      variables: {
        input: { hash, path: filePath, size: file.size, overwrite: true, multipart: false }
      },
      query: `mutation CreatePublicFile($input: CreateFileInput!) {
        createPublicFile(input: $input) { url confirmUrl }
      }`
    })
  });

  const createData = await createRes.json();
  const uploadUrl  = createData?.data?.createPublicFile?.url;
  const confirmUrl = createData?.data?.createPublicFile?.confirmUrl;

  if (!uploadUrl) {
    const msg = createData?.errors?.[0]?.message || JSON.stringify(createData).slice(0, 120);
    throw new Error(`업로드 URL 생성 실패: ${msg}`);
  }

  let contentType = file.type || 'image/jpeg';
  try {
    const signedType = new URL(uploadUrl).searchParams.get('content-type') ||
                       new URL(uploadUrl).searchParams.get('Content-Type');
    if (signedType) contentType = decodeURIComponent(signedType);
  } catch (_) {}

  let putRes;
  try {
    putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });
  } catch (_) {
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(uploadUrl);
    putRes = await fetch(proxyUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });
  }

  if (!putRes.ok) {
    throw new Error(`파일 전송 실패: HTTP ${putRes.status}`);
  }

  if (confirmUrl) {
    fetch(confirmUrl, { method: 'GET' }).catch(() => {});
  }

  return filePath;
}

// ═══════════════════════════════════════
// 업로드 실행
// ═══════════════════════════════════════
async function handleUpload() {
  if (!selectedFolder)          { updateCta(); return; }
  if (selectedFiles.length === 0) { updateCta(); return; }

  const date    = ($('input-date').value  || todayStr()).replace(/-/g, '');
  const time    = ($('input-time').value  || nowTimeStr()).replace(':', '');
  const product = $('input-product').value.trim();
  const lot     = $('input-lot').value.trim();
  const process = $('input-process').value.trim();
  const defect  = $('input-defect').value.trim();

  const folderName = `${safe(date)}_${safe(time)}_${safe(selectedFolderTag)}_${safe(product)}_${safe(lot)}_${safe(process)}_${safe(defect)}`;

  const total = selectedFiles.length;

  showUploadingScreen(total);

  const errors = [];
  let completed = 0;

  for (let i = 0; i < total; i++) {
    const file = selectedFiles[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}_${String(i + 1).padStart(3, '0')}.${ext}`;

    try {
      await uploadToCloudike(file, selectedFolder, folderName, fileName);
    } catch (err) {
      errors.push(`${i + 1}번: ${err.message}`);
    }
    completed++;
    updateUploadProgress(completed, total);
  }

  const succeeded = total - errors.length;

  if (errors.length === 0) {
    addToHist(LS_HIST_PRODUCT, product);
    addToHist(LS_HIST_LOT,     lot);
    addToHist(LS_HIST_PROCESS, process);
    addToHist(LS_HIST_DEFECT,  defect);
    setupHistInputs();

    setTimeout(() => showScreen('screen-done'), 600);
  } else if (succeeded > 0) {
    setTimeout(() => {
      alert(`⚠️ ${succeeded}/${total}장 완료\n실패: ${errors[0]}`);
      showScreen('screen-main');
    }, 400);
  } else {
    setTimeout(() => {
      alert(`❌ 업로드 실패\n${errors[0]}`);
      showScreen('screen-main');
    }, 400);
  }
}

// ─── 메인 화면 초기화 (사진·입력 리셋) ───
function resetMain() {
  selectedFiles    = [];
  carouselIndex    = 0;
  selectedFolder   = '';
  selectedFolderTag = '';
  $('input-product').value = '';
  $('input-lot').value     = '';
  $('input-process').value = '';
  $('input-defect').value  = '';
  renderFolderChips();
  renderCarousel();
  updateStep();
  updateCta();
}

// ═══════════════════════════════════════
// 초기화
// ═══════════════════════════════════════
function init() {
  $('input-date').value = todayStr();
  $('input-time').value = nowTimeStr();

  renderFolderChips();
  setupHistInputs();
  renderCarousel();
  updateStep();
  updateCta();
  setupStepClick();

  $('btn-camera').addEventListener('click', () => {
    $('file-camera').click();
  });
  $('file-camera').addEventListener('change', e => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = '';
  });

  $('btn-gallery').addEventListener('click', () => {
    $('file-gallery').click();
  });
  $('file-gallery').addEventListener('change', e => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = '';
  });

  $('btn-upload').addEventListener('click', handleUpload);

  $('btn-done-new').addEventListener('click', () => {
    resetMain();
    showScreen('screen-main');
  });

  $('btn-done-back').addEventListener('click', () => {
    showScreen('screen-main');
  });

  $('btn-help').addEventListener('click', () => {
    alert(
      '📸 검사 사진 등록 가이드\n\n' +
      '1️⃣ 일시: 촬영 날짜·시각 선택\n' +
      '2️⃣ 위치: 업로드할 폴더 선택\n' +
      '3️⃣ 정보: 제품명, Lot, 공정, 불량 입력\n' +
      '4️⃣ 사진: 촬영 또는 갤러리 선택\n' +
      '5️⃣ 업로드: 버튼 클릭\n\n' +
      '💡 갤러리에서 여러 장을 한 번에 선택할 수 있습니다.'
    );
  });

  $('btn-settings').addEventListener('click', () => {
    renderFolderList();
    showScreen('screen-settings');
  });

  $('btn-back').addEventListener('click', () => {
    renderFolderChips();
    showScreen('screen-main');
  });

  const tagInput = $('setting-tag');
  const urlInput = $('setting-url');
  const addBtn   = $('btn-add-folder');

  function updateAddBtn() {
    const ok = tagInput.value.trim() && urlInput.value.trim();
    addBtn.className = 'btn-add-folder ' + (ok ? 'cta-active' : 'cta-disabled');
  }

  tagInput.addEventListener('input', updateAddBtn);
  urlInput.addEventListener('input', updateAddBtn);

  addBtn.addEventListener('click', () => {
    const tag = tagInput.value.trim();
    const url = urlInput.value.trim();
    if (!tag || !url) { alert('태그명과 URL을 모두 입력하세요.'); return; }
    const folders = getFolders();
    folders.push({ tag, url });
    saveFolders(folders);
    tagInput.value = '';
    urlInput.value = '';
    updateAddBtn();
    renderFolderList();
    renderFolderChips();
  });

  $('btn-export-settings').addEventListener('click', exportSettings);

  $('btn-import-settings').addEventListener('click', () => {
    $('file-import-settings').click();
  });
  $('file-import-settings').addEventListener('change', e => {
    if (e.target.files.length) {
      importSettings(e.target.files[0]);
      e.target.value = '';
    }
  });

  $('input-date').addEventListener('change', () => { updateStep(); updateCta(); });
  $('input-time').addEventListener('change', () => { updateStep(); updateCta(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`sw.js?v=${APP_REV}`, { updateViaCache: 'none' })
      .catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) { reloading = true; window.location.reload(); }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
