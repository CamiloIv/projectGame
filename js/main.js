/**
 * main.js — Application bootstrap
 * Composition root: conecta todos los módulos, cero lógica propia.
 */

import { State, reshuffle, stopTimer } from './state.js';
import { parseCSV, downloadTemplate, DEMO_PAIRS, DEFAULT_PAIRS } from './data.js';
import { initGame, resetGame, shuffleAnswers, checkAnswers } from './game.js';
import { initTimer, renderTimer, beginCountdown } from './timer.js';
import {
  showToast, openModal, closeModal,
  showStartScreen, hideStartScreen,
  showGameArea, showEmptyState,
  renderPreview,
  renderEditPairs, addEditPairRow, getEditPairs,
  updateScoreBar,
} from './ui.js';

// ── Bootstrap ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTimer({ onExpire: handleTimerExpire });
  wireAllButtons();
  wireAllModals();
  wireFileDrop();
  wireTimerConfig();
  loadPairs([...DEFAULT_PAIRS]);
});

// ── Buttons ────────────────────────────────────────────
function wireAllButtons() {
  // Header
  on('btn-download-template', 'click', () => { downloadTemplate(); showToast('✅ Plantilla descargada'); });
  on('btn-load',              'click', () => openModal('modal-load'));
  on('btn-edit',              'click', () => { renderEditPairs(State.pairs); openModal('modal-edit'); });
  on('btn-timer-config',      'click', () => { syncTimerModalUI(); openModal('modal-timer'); });
  on('btn-shuffle',           'click', () => { if (!State.pairs.length) return; shuffleAnswers(); showToast('🔀 Mezcladas'); });

  // Empty state
  on('btn-download-template-2', 'click', () => { downloadTemplate(); showToast('✅ Plantilla descargada'); });
  on('btn-load-2',              'click', () => openModal('modal-load'));
  on('btn-demo',                'click', () => loadPairs([...DEMO_PAIRS]));

  // In-game controls
  on('btn-check',       'click', () => checkAnswers());
  on('btn-reset',       'click', handleReset);
  on('btn-shuffle-ctrl','click', () => { shuffleAnswers(); showToast('🔀 Mezcladas'); });

  // Start screen
  on('btn-start-game', 'click', () => { hideStartScreen(); beginCountdown(); });
}

// ── Modals ─────────────────────────────────────────────
function wireAllModals() {
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
    });
  });

  // Load modal
  on('load-confirm-btn', 'click', () => {
    if (!State.fileData || !State.fileData.length) return;
    loadPairs(State.fileData);
    closeModal('modal-load');
  });
  on('load-cancel-btn', 'click', () => closeModal('modal-load'));

  // Edit modal
  on('btn-add-pair',   'click', () => addEditPairRow());
  on('edit-save-btn',  'click', handleEditSave);
  on('edit-cancel-btn','click', () => closeModal('modal-edit'));

  // Delegated remove inside edit modal
  document.getElementById('edit-pairs').addEventListener('click', e => {
    const btn = e.target.closest('.edit-pair__remove');
    if (btn) btn.closest('.edit-pair').remove();
  });

  // Timer modal
  on('timer-modal-save',   'click', handleTimerSave);
  on('timer-modal-cancel', 'click', () => closeModal('modal-timer'));
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

// ── Timer config ───────────────────────────────────────
function wireTimerConfig() {
  const presets = document.querySelectorAll('.timer-preset');

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(b => b.classList.remove('timer-preset--active'));
      btn.classList.add('timer-preset--active');
      State.timer.totalSecs = parseInt(btn.dataset.secs);
      document.getElementById('timer-custom-input').value = Math.floor(State.timer.totalSecs / 60) || 1;
    });
  });

  document.getElementById('timer-custom-input').addEventListener('input', e => {
    const mins = Math.max(1, Math.min(120, parseInt(e.target.value) || 1));
    State.timer.totalSecs = mins * 60;
    presets.forEach(b => b.classList.remove('timer-preset--active'));
  });

  document.getElementById('timer-enabled-toggle').addEventListener('change', e => {
    State.timer.enabled = e.target.checked;
  });
}

function handleTimerSave() {
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
  renderTimer();
  closeModal('modal-timer');
  const msg = State.timer.enabled
    ? `⏱ Temporizador: ${fmtSecs(State.timer.totalSecs)}`
    : '⏱ Temporizador desactivado';
  showToast(msg);
}

function syncTimerModalUI() {
  document.getElementById('timer-enabled-toggle').checked = State.timer.enabled;
  const mins = Math.floor(State.timer.totalSecs / 60) || 1;
  document.getElementById('timer-custom-input').value = mins;
  document.querySelectorAll('.timer-preset').forEach(btn => {
    btn.classList.toggle('timer-preset--active', parseInt(btn.dataset.secs) === State.timer.totalSecs);
  });
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
  loadPairs(pairs);
  closeModal('modal-edit');
}

function handleTimerExpire() {
  showToast('⏱ ¡Tiempo agotado! Verificando…');
  setTimeout(() => checkAnswers(), 800);
}

// ── Core loader ────────────────────────────────────────
function loadPairs(pairs) {
  State.pairs    = pairs;
  State.fileData = null;

  // Reset timer state
  stopTimer();
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
  renderTimer();

  // Reset preview area for next load
  document.getElementById('preview-area').style.display = 'none';
  document.getElementById('load-confirm-btn').style.display = 'none';
  document.getElementById('file-input').value = '';

  showGameArea();
  initGame();
  updateScoreBar();
  showStartScreen();
  showToast(`✅ ${pairs.length} pares cargados`);
}

// ── Helpers ────────────────────────────────────────────
function on(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
  else console.warn(`[main] Element #${id} not found`);
}

function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ''}` : `${s}s`;
}