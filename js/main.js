/**
 * main.js — Application bootstrap
 */

import { State, reshuffle, stopTimer } from './state.js';
import { parseCSV, downloadTemplate, DEFAULT_PAIRS } from './data.js';
import { initGame, resetGame, shuffleAnswers, checkAnswers } from './game.js';
import { initTimer, renderTimer, beginCountdown } from './timer.js';
import {
  showToast, openModal, closeModal,
  showStartScreen, hideStartScreen,
  renderPreview,
  renderEditPairs, addEditPairRow, getEditPairs,
  updateScoreBar,
} from './ui.js';

// ── Bootstrap ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTimer({ onExpire: handleTimerExpire });
  wireButtons();
  wireModals();
  wireFileDrop();
  wireStartScreen();

  // Carga los pares por defecto y muestra la pantalla de inicio
  loadPairs([...DEFAULT_PAIRS], { showStart: true });
});

// ── Buttons ────────────────────────────────────────────
function wireButtons() {
  on('btn-download-template', 'click', () => { downloadTemplate(); showToast('✅ Plantilla descargada'); });
  on('btn-load',              'click', () => openModal('modal-load'));
  on('btn-edit',              'click', () => { renderEditPairs(State.pairs); openModal('modal-edit'); });

  // "Jugar" en el header → muestra start screen de nuevo
  on('btn-play-again', 'click', () => {
    resetGame();
    stopTimer();
    State.timer.remaining = State.timer.totalSecs;
    State.timer.expired   = false;
    renderTimer();
    showStartScreen();
  });

  // In-game controls
  on('btn-check',        'click', () => checkAnswers());
  on('btn-reset',        'click', handleReset);
  on('btn-shuffle-ctrl', 'click', () => { shuffleAnswers(); showToast('🔀 Mezcladas'); });
}

// ── Modals ─────────────────────────────────────────────
function wireModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
    });
  });

  // Load modal
  on('load-confirm-btn', 'click', () => {
    if (!State.fileData?.length) return;
    loadPairs(State.fileData, { showStart: true });
    closeModal('modal-load');
  });
  on('load-cancel-btn', 'click', () => closeModal('modal-load'));

  // Edit modal
  on('btn-add-pair',    'click', () => addEditPairRow());
  on('edit-save-btn',   'click', handleEditSave);
  on('edit-cancel-btn', 'click', () => closeModal('modal-edit'));
  document.getElementById('edit-pairs').addEventListener('click', e => {
    const btn = e.target.closest('.edit-pair__remove');
    if (btn) btn.closest('.edit-pair').remove();
  });
}

// ── File drop ──────────────────────────────────────────
function wireFileDrop() {
  const area  = document.getElementById('file-drop-area');
  const input = document.getElementById('file-input');

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('file-drop-area--over'); });
  area.addEventListener('dragleave', ()  => area.classList.remove('file-drop-area--over'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('file-drop-area--over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });
}

function handleFile(file) {
  if (!file.name.endsWith('.csv')) { showToast('⚠️ Solo archivos .csv'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const pairs = parseCSV(e.target.result);
    if (!pairs.length) { showToast('⚠️ Archivo vacío o formato incorrecto'); return; }
    State.fileData = pairs;
    renderPreview(pairs);
  };
  reader.readAsText(file);
}

// ── Start screen con timer config ──────────────────────
function wireStartScreen() {
  const toggle   = document.getElementById('start-timer-toggle');
  const options  = document.getElementById('start-timer-options');
  const presets  = document.querySelectorAll('#start-screen .timer-preset');
  const customIn = document.getElementById('start-timer-custom');

  // Toggle muestra/oculta opciones
  toggle.addEventListener('change', () => {
    State.timer.enabled = toggle.checked;
    options.style.display = toggle.checked ? 'block' : 'none';
    updateStartTimerDisplay();
  });

  // Presets
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(b => b.classList.remove('timer-preset--active'));
      btn.classList.add('timer-preset--active');
      State.timer.totalSecs = parseInt(btn.dataset.secs);
      customIn.value = Math.floor(State.timer.totalSecs / 60) || 1;
      updateStartTimerDisplay();
    });
  });

  // Custom input
  customIn.addEventListener('input', () => {
    const mins = Math.max(1, Math.min(120, parseInt(customIn.value) || 1));
    State.timer.totalSecs = mins * 60;
    presets.forEach(b => b.classList.remove('timer-preset--active'));
    updateStartTimerDisplay();
  });

  // Botón jugar
  on('btn-start-game', 'click', () => {
    State.timer.remaining = State.timer.totalSecs;
    State.timer.expired   = false;
    renderTimer();
    hideStartScreen();
    beginCountdown();
  });
}

function updateStartTimerDisplay() {
  const t = State.timer;
  document.getElementById('start-timer-val').textContent =
    t.enabled ? fmtSecs(t.totalSecs) : 'Sin límite';
}

// ── Handlers ───────────────────────────────────────────
function handleReset() {
  resetGame();
  stopTimer();
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
  renderTimer();
  showToast('↺ Juego reiniciado');
}

function handleEditSave() {
  const pairs = getEditPairs();
  if (pairs.length < 2) { showToast('⚠️ Necesitas al menos 2 pares'); return; }
  loadPairs(pairs, { showStart: true });
  closeModal('modal-edit');
}

function handleTimerExpire() {
  showToast('⏱ ¡Tiempo agotado! Verificando…');
  setTimeout(() => checkAnswers(), 800);
}

// ── Core loader ────────────────────────────────────────
function loadPairs(pairs, { showStart = false } = {}) {
  State.pairs    = pairs;
  State.fileData = null;

  stopTimer();
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
  renderTimer();

  // Reset preview
  document.getElementById('preview-area').style.display     = 'none';
  document.getElementById('load-confirm-btn').style.display = 'none';
  document.getElementById('file-input').value = '';

  initGame();
  updateScoreBar();

  if (showStart) {
    // Sync start screen UI with current state
    document.getElementById('start-q-count').textContent   = pairs.length;
    document.getElementById('start-timer-toggle').checked  = State.timer.enabled;
    document.getElementById('start-timer-options').style.display = State.timer.enabled ? 'block' : 'none';
    updateStartTimerDisplay();
    showStartScreen();
  }

  showToast(`✅ ${pairs.length} pares cargados`);
}

// ── Helpers ────────────────────────────────────────────
function on(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
  else console.warn(`[main] #${id} not found`);
}

function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ''}` : `${s}s`;
}
