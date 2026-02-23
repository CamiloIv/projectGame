/**
 * state.js — Single source of truth
 *
 * All game state lives here. Other modules import
 * and mutate this object; they NEVER hold state locally.
 * This makes debugging trivial and keeps modules stateless.
 */

export const State = {
  // Data
  pairs: [],
  shuffleOrder: [],

  // Game progress
  matches: {},
  checked: false,
  results: {},

  // Timer
  timer: {
    enabled:    false,
    totalSecs:  120,
    remaining:  120,
    running:    false,
    expired:    false,
    intervalId: null,
  },

  // UI transient
  draggingAnswerIndex: null,
  fileData: null,
};

export function resetProgress() {
  State.matches = {};
  State.checked = false;
  State.results = {};
}

export function resetAll() {
  resetProgress();
  stopTimer();
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
}

export function reshuffle() {
  State.shuffleOrder = State.pairs.map((_, i) => i);
  for (let i = State.shuffleOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [State.shuffleOrder[i], State.shuffleOrder[j]] =
    [State.shuffleOrder[j], State.shuffleOrder[i]];
  }
}

export function startTimer(onTick, onExpire) {
  const t = State.timer;
  if (!t.enabled || t.running || t.expired) return;
  t.running = true;
  t.intervalId = setInterval(() => {
    t.remaining -= 1;
    onTick(t.remaining);
    if (t.remaining <= 0) {
      t.remaining = 0;
      t.running   = false;
      t.expired   = true;
      clearInterval(t.intervalId);
      onExpire();
    }
  }, 1000);
}

export function pauseTimer() {
  const t = State.timer;
  if (!t.running) return;
  t.running = false;
  clearInterval(t.intervalId);
}

export function stopTimer() {
  const t = State.timer;
  t.running = false;
  clearInterval(t.intervalId);
}
