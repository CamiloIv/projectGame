/**
 * ui.js — DOM rendering layer
 * Solo renderiza. Nunca modifica State directamente.
 */

import { State } from './state.js';

// ── Toast ──────────────────────────────────────────────
let _toastTimer;
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('toast--show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('toast--show'), 3000);
}

// ── Modals ─────────────────────────────────────────────
export function openModal(id)  { document.getElementById(id).classList.add('modal-overlay--open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('modal-overlay--open'); }

// ── Start screen ───────────────────────────────────────
export function showStartScreen() {
  const t = State.timer;
  document.getElementById('start-q-count').textContent  = State.pairs.length;
  document.getElementById('start-timer-val').textContent = t.enabled ? fmtSecs(t.totalSecs) : 'Sin límite';
  document.getElementById('start-screen').classList.add('start-screen--open');
}
export function hideStartScreen() {
  document.getElementById('start-screen').classList.remove('start-screen--open');
}

// ── Visibility ─────────────────────────────────────────
export function showGameArea() { // no-op, always visible
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('game-wrap').style.display   = 'block';
}
export function showEmptyState() {
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('game-wrap').style.display   = 'none';
}

// ── Questions column ───────────────────────────────────
export function renderQuestions(onDragOver, onDragLeave, onDrop, onRemove) {
  const col = document.getElementById('questions-col');
  col.innerHTML = '';

  State.pairs.forEach((pair, qi) => {
    const matchedAi = State.matches[qi];
    const hasMatch  = matchedAi !== undefined;
    const isChecked = State.checked;
    const isCorrect = State.results[qi];

    // Card modifier
    let cardMod = '';
    if      (isChecked && isCorrect === true)  cardMod = 'q-card--correct';
    else if (isChecked && isCorrect === false) cardMod = 'q-card--wrong';
    else if (hasMatch)                          cardMod = 'q-card--matched';

    // Drop zone content
    let dzMod     = '';
    let dzInner   = `<span style="pointer-events:none;font-style:italic;color:var(--text-muted);font-size:.8rem">Arrastra una respuesta aquí</span>`;

    if (hasMatch) {
      const answerText = esc(State.pairs[matchedAi].a);
      if (isChecked) {
        dzMod   = isCorrect ? 'drop-zone--correct' : 'drop-zone--wrong';
        dzInner = `<span class="drop-zone__text">${answerText}</span>`;
      } else {
        dzMod   = 'drop-zone--filled';
        dzInner = `<span class="drop-zone__text">${answerText}</span>
                   <button class="drop-zone__remove" data-qi="${qi}">✕</button>`;
      }
    }

    const card = document.createElement('div');
    card.className      = `q-card ${cardMod}`;
    card.dataset.qIndex = qi;
    card.innerHTML = `
      <span class="q-card__num">Q${qi + 1}</span>
      <div class="q-card__body">
        <div class="q-card__text">${esc(pair.q)}</div>
        <div class="drop-zone ${dzMod}" id="dz-${qi}" data-qi="${qi}">
          ${dzInner}
        </div>
      </div>`;

    // Drop zone events
    const dz = card.querySelector('.drop-zone');
    dz.addEventListener('dragover',  e => onDragOver(e, qi));
    dz.addEventListener('dragleave', e => onDragLeave(e, qi));
    dz.addEventListener('drop',      e => onDrop(e, qi));

    // Remove button (event on the card to avoid stale refs)
    card.addEventListener('click', e => {
      const btn = e.target.closest('.drop-zone__remove');
      if (btn) onRemove(parseInt(btn.dataset.qi));
    });

    col.appendChild(card);
  });
}

// ── Answers column ─────────────────────────────────────
export function renderAnswers(onDragStart, onDragEnd) {
  const col    = document.getElementById('answers-col');
  col.innerHTML = '';

  const usedAis = new Set(Object.values(State.matches));

  State.shuffleOrder.forEach(ai => {
    const used  = usedAis.has(ai);
    const chip  = document.createElement('div');
    chip.className  = `a-chip${used ? ' a-chip--used' : ''}`;
    chip.draggable  = !used;
    chip.dataset.ai = ai;
    chip.innerHTML  = `<span class="a-chip__handle">⠿⠿</span>${esc(State.pairs[ai].a)}`;

    if (!used) {
      chip.addEventListener('dragstart', e => onDragStart(e, ai));
      chip.addEventListener('dragend',   e => onDragEnd(e));
    }
    col.appendChild(chip);
  });
}

// ── Score bar ──────────────────────────────────────────
export function updateScoreBar(correct = 0, wrong = 0) {
  const total   = State.pairs.length;
  const matched = Object.keys(State.matches).length;
  const pct     = total > 0 ? Math.round((matched / total) * 100) : 0;

  document.getElementById('sc-correct').textContent         = correct;
  document.getElementById('sc-wrong').textContent           = wrong;
  document.getElementById('sc-total').textContent           = total;
  document.getElementById('progress-fill').style.width      = `${pct}%`;
  document.getElementById('progress-label-pct').textContent = `${pct}%`;
}

// ── Feedback panel ─────────────────────────────────────
export function showFeedback(results) {
  const panel   = document.getElementById('feedback-panel');
  const total   = State.pairs.length;
  const correct = results.filter(r => r.isCorrect).length;
  const pct     = Math.round((correct / total) * 100);

  const emoji = correct === total ? '🎉' : correct >= total * .7 ? '👍' : correct >= total * .5 ? '💪' : '📚';

  document.getElementById('feedback-title').innerHTML =
    `${emoji} ${correct}/${total} correctas &nbsp;·&nbsp; ${pct}%`;

  document.getElementById('feedback-items').innerHTML = results.map(r => `
    <div class="feedback-item">
      <span class="feedback-item__icon">${r.isCorrect ? '✅' : '❌'}</span>
      <div>
        <div class="feedback-item__q">Q${r.qi + 1}: ${esc(State.pairs[r.qi].q)}</div>
        ${r.isCorrect
          ? `<span class="feedback-item__correct">✓ ${esc(r.correctA)}</span>`
          : `<span class="feedback-item__given">Tu resp: ${esc(r.givenA)}</span><br>
             <span class="feedback-item__correct">Correcta: ${esc(r.correctA)}</span>`}
      </div>
    </div>`).join('');

  panel.classList.add('feedback-panel--show');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function hideFeedback() {
  document.getElementById('feedback-panel').classList.remove('feedback-panel--show');
}

// ── Drop zone highlight ────────────────────────────────
export function setDropZoneOver(qi, over) {
  const dz = document.getElementById(`dz-${qi}`);
  if (!dz) return;
  dz.classList.toggle('drop-zone--over', over);
}

// ── Load modal preview ─────────────────────────────────
export function renderPreview(pairs) {
  const slice = pairs.slice(0, 8);
  document.getElementById('preview-body').innerHTML =
    slice.map((p, i) => `<tr><td>${i+1}</td><td>${esc(p.q)}</td><td>${esc(p.a)}</td></tr>`).join('')
    + (pairs.length > 8
      ? `<tr><td colspan="3" style="color:var(--text-muted);font-style:italic">… y ${pairs.length - 8} más</td></tr>`
      : '');
  document.getElementById('preview-area').style.display     = 'block';
  document.getElementById('load-confirm-btn').style.display = 'inline-flex';
}

// ── Edit modal ─────────────────────────────────────────
export function renderEditPairs(pairs) {
  const data = pairs.length ? pairs : [{ q: '', a: '' }];
  document.getElementById('edit-pairs').innerHTML = data.map((p, i) => editPairHTML(i, p.q, p.a)).join('');
}

export function editPairHTML(i, q = '', a = '') {
  return `
    <div class="edit-pair" id="ep-${i}">
      <input type="text" value="${esc(q)}" placeholder="Pregunta…">
      <input type="text" value="${esc(a)}" placeholder="Respuesta…">
      <button class="edit-pair__remove" title="Eliminar">✕</button>
    </div>`;
}

export function addEditPairRow() {
  const c = document.getElementById('edit-pairs');
  c.insertAdjacentHTML('beforeend', editPairHTML(c.children.length));
}

export function getEditPairs() {
  const pairs = [];
  document.querySelectorAll('#edit-pairs .edit-pair').forEach(row => {
    const [qi, ai] = row.querySelectorAll('input');
    const q = qi.value.trim(), a = ai.value.trim();
    if (q && a) pairs.push({ q, a });
  });
  return pairs;
}

// ── Confetti ───────────────────────────────────────────
export function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#f43f5e','#a78bfa'];
  const pieces = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: Math.random() * 7 + 4,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 4 + 2,
    angle: Math.random() * 360,
    spin: (Math.random() - 0.5) * 9,
  }));

  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - frame / 160);
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.55);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.angle += p.spin;
    });
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  draw();
}

// ── Helpers ────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ''}` : `${s}s`;
}
