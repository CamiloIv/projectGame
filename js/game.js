/**
 * game.js — Core game logic
 * Mutates State, delega todo rendering a ui.js.
 */

import { State, resetProgress, reshuffle } from './state.js';
import {
  renderQuestions, renderAnswers,
  updateScoreBar, showFeedback, hideFeedback,
  setDropZoneOver, showToast, launchConfetti,
} from './ui.js';

// ── Public API ─────────────────────────────────────────

export function initGame() {
  resetProgress();
  reshuffle();
  renderAll();
}

export function resetGame() {
  resetProgress();
  hideFeedback();
  renderAll();
}

export function shuffleAnswers() {
  reshuffle();
  renderAnswers(onDragStart, onDragEnd);
}

export function checkAnswers() {
  const total   = State.pairs.length;
  const matched = Object.keys(State.matches).length;

  if (!total) { showToast('⚠️ No hay preguntas cargadas'); return false; }
  if (matched < total) { showToast(`⚠️ Faltan ${total - matched} respuesta(s)`); return false; }

  let correctCount = 0;
  const results = [];

  State.pairs.forEach((pair, qi) => {
    const ai        = State.matches[qi];
    const isCorrect = ai === qi;
    if (isCorrect) correctCount++;
    State.results[qi] = isCorrect;

    results.push({
      qi,
      isCorrect,
      correctA: pair.a,
      givenA:   State.pairs[ai]?.a ?? '—',
    });
  });

  State.checked = true;
  renderAll(false);
  updateScoreBar(correctCount, total - correctCount);
  showFeedback(results);
  if (correctCount === total) launchConfetti();
  return true;
}

// ── Drag & Drop ────────────────────────────────────────

function onDragStart(e, ai) {
  State.draggingAnswerIndex = ai;
  e.currentTarget.classList.add('a-chip--dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(ai)); // required for Firefox
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('a-chip--dragging');
  State.draggingAnswerIndex = null;
}

function onDragOver(e, qi) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  setDropZoneOver(qi, true);
}

function onDragLeave(e, qi) {
  setDropZoneOver(qi, false);
}

function onDrop(e, qi) {
  e.preventDefault();
  setDropZoneOver(qi, false);

  const ai = State.draggingAnswerIndex;
  if (ai === null || ai === undefined) return;

  // Si este answer ya estaba en otra pregunta, liberarlo
  for (const [existingQi, existingAi] of Object.entries(State.matches)) {
    if (Number(existingAi) === ai) delete State.matches[existingQi];
  }

  State.matches[qi] = ai;

  // Drop limpia el estado verificado
  if (State.checked) {
    State.checked = false;
    State.results = {};
    hideFeedback();
  }

  renderAll();
}

function onRemoveMatch(qi) {
  delete State.matches[qi];
  if (State.checked) {
    State.checked = false;
    State.results = {};
    hideFeedback();
  }
  renderAll();
}

// ── Internal ───────────────────────────────────────────

function renderAll(updateScore = true) {
  renderQuestions(onDragOver, onDragLeave, onDrop, onRemoveMatch);
  renderAnswers(onDragStart, onDragEnd);
  if (updateScore) updateScoreBar();
}