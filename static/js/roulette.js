/* ============================================================
   HackByte Roulette Spinner — roulette.js
   Handles: uploads, participant management, spin animation,
            winner modal, results history, confetti
   ============================================================ */

'use strict';

// ── State ────────────────────────────────────────────────────
let participants = [];     // array of {id, name, image_path, active}
let isSpinning = false;

// ── DOM refs ─────────────────────────────────────────────────
const fileInput           = document.getElementById('file-input');
const dropZone            = document.getElementById('drop-zone');
const uploadStatus        = document.getElementById('upload-status');
const participantsGrid    = document.getElementById('participants-grid');
const emptyState          = document.getElementById('empty-state');
const activeCountBadge    = document.getElementById('active-count');
const spinBtn             = document.getElementById('spin-btn');
const spinHint            = document.getElementById('spin-hint');
const spinIdle            = document.getElementById('spin-idle');
const rouletteStripCont   = document.getElementById('roulette-strip-container');
const rouletteStrip       = document.getElementById('roulette-strip');
const winnerModal         = document.getElementById('winner-modal');
const winnerImg           = document.getElementById('winner-img');
const winnerName          = document.getElementById('winner-name');
const winnerTime          = document.getElementById('winner-time');
const closeModalBtn       = document.getElementById('close-modal-btn');
const resultsList         = document.getElementById('results-list');
const resultsEmpty        = document.getElementById('results-empty');
const clearResultsBtn     = document.getElementById('clear-results-btn');
const confettiContainer   = document.getElementById('confetti-container');

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  fetchParticipants();
  fetchResults();
  setupDragDrop();
});

// ── Fetch Helpers ─────────────────────────────────────────────
async function fetchParticipants() {
  try {
    const res = await fetch('/participants');
    participants = await res.json();
    renderParticipants();
  } catch (e) {
    console.error('Failed to load participants:', e);
  }
}

async function fetchResults() {
  try {
    const res = await fetch('/results');
    const results = await res.json();
    renderResults(results);
  } catch (e) {
    console.error('Failed to load results:', e);
  }
}

// ── Upload ────────────────────────────────────────────────────
fileInput.addEventListener('change', () => uploadFiles(fileInput.files));

function setupDragDrop() {
  dropZone.addEventListener('click', (e) => {
    if (!e.target.closest('label')) fileInput.click();
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    uploadFiles(e.dataTransfer.files);
  });
}

async function uploadFiles(files) {
  if (!files || files.length === 0) return;

  const formData = new FormData();
  for (const file of files) formData.append('files', file);

  showStatus('Uploading…', '');
  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    const count = data.added.length;
    showStatus(`✅ Added ${count} participant${count !== 1 ? 's' : ''}!`, 'success');
    participants = [...participants, ...data.added];
    renderParticipants();
    fileInput.value = '';
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error');
  }
}

function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = 'upload-status' + (type ? ` ${type}` : '');
  uploadStatus.classList.remove('hidden');
  if (type) setTimeout(() => uploadStatus.classList.add('hidden'), 4000);
}

// ── Render Participants ───────────────────────────────────────
function renderParticipants() {
  const cards = participantsGrid.querySelectorAll('.participant-card');
  cards.forEach(c => c.remove());

  const activeCount = participants.filter(p => p.active).length;
  activeCountBadge.textContent = `${activeCount} active`;

  if (participants.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    participants.forEach(p => participantsGrid.appendChild(createCard(p)));
  }

  updateSpinButton(activeCount);
}

function createCard(participant) {
  const card = document.createElement('div');
  card.className = 'participant-card' + (participant.active ? '' : ' inactive');
  card.dataset.id = participant.id;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'participant-img-wrap';
  const img = document.createElement('img');
  img.src = '/' + participant.image_path;
  img.alt = participant.name;
  img.loading = 'lazy';
  imgWrap.appendChild(img);

  const nameEl = document.createElement('div');
  nameEl.className = 'participant-name';
  nameEl.textContent = participant.name;
  nameEl.title = 'Click to rename';
  nameEl.addEventListener('click', () => startRename(participant.id, nameEl));

  const actions = document.createElement('div');
  actions.className = 'participant-actions';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn-icon';
  toggleBtn.textContent = participant.active ? '🟢' : '🔴';
  toggleBtn.title = participant.active ? 'Deactivate' : 'Activate';
  toggleBtn.addEventListener('click', () => toggleParticipant(participant.id));

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon';
  removeBtn.textContent = '🗑️';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', () => removeParticipant(participant.id));

  actions.appendChild(toggleBtn);
  actions.appendChild(removeBtn);

  card.appendChild(imgWrap);
  card.appendChild(nameEl);
  card.appendChild(actions);
  return card;
}

// ── Rename ────────────────────────────────────────────────────
function startRename(id, nameEl) {
  nameEl.contentEditable = 'true';
  nameEl.focus();
  // select all text
  const range = document.createRange();
  range.selectNodeContents(nameEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finish = async () => {
    nameEl.contentEditable = 'false';
    const newName = nameEl.textContent.trim();
    if (!newName) { nameEl.textContent = participants.find(p => p.id === id)?.name || ''; return; }
    try {
      const res = await fetch(`/participant/${id}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = participants.findIndex(p => p.id === id);
        if (idx !== -1) participants[idx].name = updated.name;
      }
    } catch (e) { console.error(e); }
    nameEl.removeEventListener('blur', finish);
    nameEl.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish();
    }
    if (e.key === 'Escape') {
      nameEl.contentEditable = 'false';
      nameEl.textContent = participants.find(p => p.id === id)?.name || '';
      nameEl.removeEventListener('blur', finish);
      nameEl.removeEventListener('keydown', onKey);
    }
  };

  nameEl.addEventListener('blur', finish, { once: true });
  nameEl.addEventListener('keydown', onKey);
}

// ── Toggle / Remove ───────────────────────────────────────────
async function toggleParticipant(id) {
  try {
    const res = await fetch(`/toggle/${id}`, { method: 'POST' });
    if (!res.ok) return;
    const updated = await res.json();
    const idx = participants.findIndex(p => p.id === id);
    if (idx !== -1) participants[idx] = updated;
    renderParticipants();
  } catch (e) { console.error(e); }
}

async function removeParticipant(id) {
  try {
    const res = await fetch(`/participant/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    participants = participants.filter(p => p.id !== id);
    renderParticipants();
  } catch (e) { console.error(e); }
}

// ── Spin Button State ─────────────────────────────────────────
function updateSpinButton(activeCount) {
  if (isSpinning) return;
  if (activeCount >= 2) {
    spinBtn.disabled = false;
    spinHint.textContent = `${activeCount} participants ready — let's spin!`;
  } else {
    spinBtn.disabled = true;
    spinHint.textContent = 'Add at least 2 active participants to spin';
  }
}

// ── Spin Animation ────────────────────────────────────────────
spinBtn.addEventListener('click', startSpin);

async function startSpin() {
  const active = participants.filter(p => p.active);
  if (active.length < 2 || isSpinning) return;

  isSpinning = true;
  spinBtn.disabled = true;
  spinHint.textContent = 'Spinning…';

  // Call backend to get winner
  let winner;
  try {
    const res = await fetch('/spin', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    winner = data.winner;
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error');
    isSpinning = false;
    updateSpinButton(active.length);
    return;
  }

  // Show strip, hide idle
  spinIdle.classList.add('hidden');
  rouletteStripCont.classList.remove('hidden');

  // Build the strip: many random frames + winner at the end
  buildStrip(active, winner);

  // Animate
  await animateStrip(winner);

  // Show winner
  showWinnerModal(winner);
  isSpinning = false;
  updateSpinButton(participants.filter(p => p.active).length);
  fetchResults();
}

function buildStrip(active, winner) {
  rouletteStrip.innerHTML = '';

  // Add centre-line highlight overlay
  let centerLine = rouletteStripCont.querySelector('.center-line');
  if (!centerLine) {
    centerLine = document.createElement('div');
    centerLine.className = 'center-line';
    rouletteStripCont.appendChild(centerLine);
  }

  // Build a long sequence of random images (60–80 frames) with winner at end
  const frameCount = 70;
  const items = [];
  for (let i = 0; i < frameCount; i++) {
    items.push(active[Math.floor(Math.random() * active.length)]);
  }
  // Last item is winner
  items.push(winner);

  items.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'strip-item';
    if (idx === items.length - 1) el.classList.add('winner-slot');
    const img = document.createElement('img');
    img.src = '/' + p.image_path;
    img.alt = p.name;
    el.appendChild(img);
    rouletteStrip.appendChild(el);
  });

  // Reset position
  rouletteStrip.style.transition = 'none';
  rouletteStrip.style.transform = 'translateX(0)';
}

function animateStrip(winner) {
  return new Promise(resolve => {
    const ITEM_WIDTH = 160 + 12; // width + gap
    const totalItems = rouletteStrip.children.length;
    const containerWidth = rouletteStripCont.offsetWidth;
    const centerOffset = containerWidth / 2 - ITEM_WIDTH / 2;

    // Target: last item (winner) centred in container
    const targetX = -(totalItems - 1) * ITEM_WIDTH - 12 + centerOffset;

    // Force reflow before starting transition
    void rouletteStrip.offsetWidth;

    const duration = 5.5; // seconds
    rouletteStrip.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.8, 0.4, 1)`;
    rouletteStrip.style.transform = `translateX(${targetX}px)`;

    setTimeout(() => {
      // Mark winner item
      const winnerSlot = rouletteStrip.querySelector('.winner-slot');
      if (winnerSlot) winnerSlot.classList.add('winner-item');
      setTimeout(resolve, 600);
    }, duration * 1000);
  });
}

// ── Winner Modal ──────────────────────────────────────────────
function showWinnerModal(winner) {
  winnerImg.src = '/' + winner.image_path;
  winnerName.textContent = winner.name;
  winnerTime.textContent = new Date().toLocaleString();
  winnerModal.classList.remove('hidden');
  launchConfetti();
}

closeModalBtn.addEventListener('click', () => {
  winnerModal.classList.add('hidden');
  // Reset spin section
  spinIdle.classList.remove('hidden');
  rouletteStripCont.classList.add('hidden');
  rouletteStrip.innerHTML = '';
});

// close modal on backdrop click
winnerModal.addEventListener('click', (e) => {
  if (e.target === winnerModal) closeModalBtn.click();
});

// ── Confetti ──────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f0c040', '#7c4dff', '#e53935', '#00e5ff', '#69f0ae', '#ff6090'];

function launchConfetti() {
  confettiContainer.innerHTML = '';
  const count = 120;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const startX = Math.random() * 100;
    const delay = Math.random() * 1.8;
    const duration = 2.5 + Math.random() * 2;
    const size = 6 + Math.random() * 10;
    piece.style.cssText = `
      left: ${startX}%;
      background: ${color};
      width: ${size}px;
      height: ${size * 1.4}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    confettiContainer.appendChild(piece);
  }
  // Clean up after animation
  setTimeout(() => { confettiContainer.innerHTML = ''; }, 6500);
}

// ── Results ───────────────────────────────────────────────────
function renderResults(results) {
  const items = resultsList.querySelectorAll('.result-item');
  items.forEach(i => i.remove());

  if (!results || results.length === 0) {
    resultsEmpty.classList.remove('hidden');
    return;
  }

  resultsEmpty.classList.add('hidden');
  // Show most recent first
  [...results].reverse().forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'result-item';

    const medal = document.createElement('span');
    medal.className = 'result-medal';
    medal.textContent = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️';

    const thumb = document.createElement('img');
    thumb.className = 'result-thumb';
    thumb.src = '/' + r.image_path;
    thumb.alt = r.name;

    const info = document.createElement('div');
    info.className = 'result-info';

    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = r.name;

    const time = document.createElement('div');
    time.className = 'result-time';
    time.textContent = r.timestamp;

    info.appendChild(name);
    info.appendChild(time);

    item.appendChild(medal);
    item.appendChild(thumb);
    item.appendChild(info);
    resultsList.appendChild(item);
  });
}

clearResultsBtn.addEventListener('click', async () => {
  if (!confirm('Clear all results history?')) return;
  try {
    await fetch('/clear-results', { method: 'POST' });
    renderResults([]);
  } catch (e) { console.error(e); }
});
