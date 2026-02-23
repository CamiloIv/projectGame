/**
 * timer.js — Configurable countdown timer
 *
 * Responsibilities:
 *  - Render the timer UI component
 *  - Provide start / pause / reset controls
 *  - Emit callbacks: onTick, onWarning, onDanger, onExpire
 *
 * Thresholds:
 *  - WARNING: ≤ 30% remaining
 *  - DANGER:  ≤ 10% remaining (+ pulse animation)
 */

import { State, startTimer, pauseTimer, stopTimer } from './state.js';

// ── DOM refs (populated on first render) ──────────────
let _elDisplay, _elFill, _elLabel, _elBtnPlay, _elBtnReset, _elWrap;

// ── External callbacks ────────────────────────────────
let _onExpire = () => {};

export function initTimer({ onExpire }) {
  _onExpire = onExpire;
  _elWrap     = document.getElementById('timer-wrap');
  _elDisplay  = document.getElementById('timer-display');
  _elFill     = document.getElementById('timer-fill');
  _elLabel    = document.getElementById('timer-label');
  _elBtnPlay  = document.getElementById('timer-btn-play');
  _elBtnReset = document.getElementById('timer-btn-reset');

  _elBtnPlay.addEventListener('click', togglePlayPause);
  _elBtnReset.addEventListener('click', resetTimer);

  renderTimer();
}

/** Show or hide the timer bar depending on enabled state */
export function renderTimer() {
  const t = State.timer;
  if (!_elWrap) return;
  _elWrap.style.display = t.enabled ? 'flex' : 'none';
  updateDisplay(t.remaining);
}

/** Start the countdown (called when game starts) */
export function beginCountdown() {
  const t = State.timer;
  if (!t.enabled) return;
  t.remaining = t.totalSecs;
  t.expired   = false;
  updateDisplay(t.remaining);

  startTimer(
    (rem) => updateDisplay(rem),
    () => {
      updateDisplay(0);
      _onExpire();
    }
  );
  updatePlayBtn();
}

function togglePlayPause() {
  const t = State.timer;
  if (t.expired) return;

  if (t.running) {
    pauseTimer();
  } else {
    startTimer(
      (rem) => updateDisplay(rem),
      () => {
        updateDisplay(0);
        _onExpire();
      }
    );
  }
  updatePlayBtn();
}

function resetTimer() {
  const t = State.timer;
  stopTimer();
  t.remaining = t.totalSecs;
  t.expired   = false;
  updateDisplay(t.remaining);
  updatePlayBtn();
}

// ── Display ───────────────────────────────────────────

function updateDisplay(remaining) {
  if (!_elDisplay) return;
  const t = State.timer;

  // Format mm:ss
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  _elDisplay.textContent = `${m}:${s}`;

  // Progress bar fill %
  const pct = t.totalSecs > 0 ? (remaining / t.totalSecs) * 100 : 0;
  _elFill.style.width = `${pct}%`;

  // Color states
  const warnThreshold   = t.totalSecs * 0.30;
  const dangerThreshold = t.totalSecs * 0.10;

  _elDisplay.className = 'timer__display';
  _elFill.className    = 'timer__fill';

  if (remaining <= 0) {
    _elDisplay.classList.add('timer__display--done');
    _elLabel.textContent = 'Tiempo agotado';
  } else if (remaining <= dangerThreshold) {
    _elDisplay.classList.add('timer__display--danger');
    _elFill.classList.add('timer__fill--danger');
    _elLabel.textContent = '⚠ ¡Apúrate!';
  } else if (remaining <= warnThreshold) {
    _elDisplay.classList.add('timer__display--warning');
    _elFill.classList.add('timer__fill--warning');
    _elLabel.textContent = 'Tiempo restante';
  } else {
    _elDisplay.classList.add('timer__display--normal');
    _elLabel.textContent = 'Tiempo restante';
  }

  updatePlayBtn();
}

function updatePlayBtn() {
  if (!_elBtnPlay) return;
  const t = State.timer;
  _elBtnPlay.textContent = t.expired ? '✓' : t.running ? '⏸' : '▶';
  _elBtnPlay.disabled = t.expired;
}
