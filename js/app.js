// ═══════════════════════════════════════════════════════
// app.js — Todo el JS en un solo archivo, sin ES Modules
// Compatible con file://, GitHub Pages, cualquier servidor
// ═══════════════════════════════════════════════════════

// ─── STATE ────────────────────────────────────────────
const State = {
  pairs: [],
  shuffleOrder: [],
  matches: {},
  checked: false,
  results: {},
  draggingAnswerIndex: null,
  fileData: null,
  timer: {
    enabled: false,
    totalSecs: 120,
    remaining: 120,
    running: false,
    expired: false,
    intervalId: null,
  },
};

// ─── DATA ─────────────────────────────────────────────
const DEFAULT_PAIRS = [
  { q: "Es el tiempo que transcurre desde que una dirección de memoria es visible para los circuitos de la memoria hasta que el dato está disponible para ser utilizado.", a: "Tiempo de Acceso" },
  { q: "Componente que se coloca como una memoria intermedia entre la memoria principal y el procesador.", a: "Memoria Caché" },
  { q: "Espacio de memoria que se encuentra dentro del procesador, integrado dentro del mismo chip de este.", a: "Registro" },
  { q: "Conjunto de elementos del computador que son visibles desde el punto de vista del programador.", a: "Arquitectura de Computador" },
  { q: "Memorias de capacidad reducida pero más rápidas que la memoria principal; utilizan acceso asociativo y se pueden encontrar dentro del chip del procesador o cerca de él.", a: "Memoria Caché" },
  { q: "Se organiza como un vector en el que cada elemento individual tiene una dirección única; se accede a una posición determinada proporcionando la dirección.", a: "Acceso Aleatorio" },
  { q: "Se accede desde la última posición a la que se ha accedido, leyendo en orden todas las posiciones hasta llegar a la posición deseada.", a: "Acceso Secuencial" },
  { q: "Sistema de propósito general capaz de hacer operaciones aritméticas y lógicas básicas, a partir de las cuales se pueden resolver problemas complejos.", a: "Procesador" },
  { q: "Organización en bloques donde cada bloque tiene una dirección única; se accede directamente al principio del bloque y dentro de este se hace secuencia hasta llegar a la posición deseada.", a: "Acceso Directo" },
  { q: "Se refiere a las unidades funcionales del computador y cómo están interconectadas.", a: "Estructura de Computador" },
  { q: "Necesita de una corriente eléctrica para mantener su estado. Incluyen registros, memoria caché y memoria principal.", a: "Memoria Volátil" },
];

const TEMPLATE_CSV = `pregunta,respuesta
¿Cuál es la capital de Francia?,París
¿Cuánto es 12 × 12?,144
¿Quién escribió Don Quijote?,Miguel de Cervantes
¿En qué año llegó el hombre a la Luna?,1969
¿Cuál es el elemento más abundante en la corteza terrestre?,Oxígeno`;

// ─── UTILS ────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function q(id) { return document.getElementById(id); }
function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ''}` : `${s}s`;
}
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── TOAST ────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = q('toast');
  el.textContent = msg;
  el.classList.add('toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast--show'), 3000);
}

// ─── MODALS ───────────────────────────────────────────
function openModal(id)  { q(id).classList.add('modal-overlay--open'); }
function closeModal(id) { q(id).classList.remove('modal-overlay--open'); }

// ─── START SCREEN ─────────────────────────────────────
function showStartScreen() {
  const t = State.timer;
  q('start-q-count').textContent   = State.pairs.length;
  q('start-timer-val').textContent = t.enabled ? fmtSecs(t.totalSecs) : 'Sin límite';
  q('start-screen').classList.add('start-screen--open');
}
function hideStartScreen() {
  q('start-screen').classList.remove('start-screen--open');
}

// ─── TIMER ────────────────────────────────────────────
function renderTimer() {
  const t = State.timer;
  q('timer-wrap').style.display = t.enabled ? 'flex' : 'none';
  updateTimerDisplay(t.remaining);
}

function beginCountdown() {
  const t = State.timer;
  if (!t.enabled) return;
  t.remaining = t.totalSecs;
  t.expired   = false;
  t.running   = true;
  updateTimerDisplay(t.remaining);
  updateTimerBtn();
  t.intervalId = setInterval(() => {
    t.remaining -= 1;
    updateTimerDisplay(t.remaining);
    if (t.remaining <= 0) {
      clearInterval(t.intervalId);
      t.running = false;
      t.expired = true;
      updateTimerBtn();
      showToast('⏱ ¡Tiempo agotado! Verificando…');
      setTimeout(() => checkAnswers(), 800);
    }
  }, 1000);
}

function pauseResumeTimer() {
  const t = State.timer;
  if (t.expired) return;
  if (t.running) {
    clearInterval(t.intervalId);
    t.running = false;
  } else {
    t.running = true;
    t.intervalId = setInterval(() => {
      t.remaining -= 1;
      updateTimerDisplay(t.remaining);
      if (t.remaining <= 0) {
        clearInterval(t.intervalId);
        t.running = false;
        t.expired = true;
        updateTimerBtn();
        showToast('⏱ ¡Tiempo agotado! Verificando…');
        setTimeout(() => checkAnswers(), 800);
      }
    }, 1000);
  }
  updateTimerBtn();
}

function resetTimerUI() {
  const t = State.timer;
  clearInterval(t.intervalId);
  t.running   = false;
  t.expired   = false;
  t.remaining = t.totalSecs;
  updateTimerDisplay(t.remaining);
  updateTimerBtn();
}

function stopTimer() {
  const t = State.timer;
  clearInterval(t.intervalId);
  t.running = false;
}

function updateTimerDisplay(remaining) {
  const t   = State.timer;
  const m   = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s   = (remaining % 60).toString().padStart(2, '0');
  q('timer-display').textContent = `${m}:${s}`;

  const pct  = t.totalSecs > 0 ? (remaining / t.totalSecs) * 100 : 0;
  q('timer-fill').style.width = `${pct}%`;

  const warn   = t.totalSecs * 0.30;
  const danger = t.totalSecs * 0.10;
  const disp   = q('timer-display');
  const fill   = q('timer-fill');
  const label  = q('timer-label');

  disp.className = 'timer__display';
  fill.className = 'timer__fill';

  if (remaining <= 0) {
    disp.classList.add('timer__display--done');
    label.textContent = 'Tiempo agotado';
  } else if (remaining <= danger) {
    disp.classList.add('timer__display--danger');
    fill.classList.add('timer__fill--danger');
    label.textContent = '⚠ ¡Apúrate!';
  } else if (remaining <= warn) {
    disp.classList.add('timer__display--warning');
    fill.classList.add('timer__fill--warning');
    label.textContent = 'Tiempo restante';
  } else {
    disp.classList.add('timer__display--normal');
    label.textContent = 'Tiempo restante';
  }
}

function updateTimerBtn() {
  const t = State.timer;
  const btn = q('timer-btn-play');
  btn.textContent = t.expired ? '✓' : t.running ? '⏸' : '▶';
  btn.disabled    = t.expired;
}

// ─── RENDER ───────────────────────────────────────────
function renderQuestions() {
  const col = q('questions-col');
  col.innerHTML = '';

  State.pairs.forEach((pair, qi) => {
    const matchedAi = State.matches[qi];
    const hasMatch  = matchedAi !== undefined;
    const isChecked = State.checked;
    const isCorrect = State.results[qi];

    let cardMod = '';
    if      (isChecked && isCorrect === true)  cardMod = 'q-card--correct';
    else if (isChecked && isCorrect === false) cardMod = 'q-card--wrong';
    else if (hasMatch)                          cardMod = 'q-card--matched';

    let dzMod   = '';
    let dzInner = `<span style="pointer-events:none;font-style:italic;color:var(--text-muted);font-size:.8rem">Arrastra una respuesta aquí</span>`;

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

    const dz = card.querySelector('.drop-zone');
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drop-zone--over'); });
    dz.addEventListener('dragleave', ()  => dz.classList.remove('drop-zone--over'));
    dz.addEventListener('drop',      e => onDrop(e, qi));
    card.addEventListener('click', e => {
      const btn = e.target.closest('.drop-zone__remove');
      if (btn) removeMatch(parseInt(btn.dataset.qi));
    });

    col.appendChild(card);
  });
}

function renderAnswers() {
  const col    = q('answers-col');
  col.innerHTML = '';
  const usedAis = new Set(Object.values(State.matches).map(Number));

  State.shuffleOrder.forEach(ai => {
    const used = usedAis.has(ai);
    const chip = document.createElement('div');
    chip.className  = `a-chip${used ? ' a-chip--used' : ''}`;
    chip.draggable  = !used;
    chip.dataset.ai = ai;
    chip.innerHTML  = `<span class="a-chip__handle">⠿⠿</span>${esc(State.pairs[ai].a)}`;

    if (!used) {
      chip.addEventListener('dragstart', e => {
        State.draggingAnswerIndex = ai;
        chip.classList.add('a-chip--dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(ai));
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('a-chip--dragging');
        State.draggingAnswerIndex = null;
      });
    }
    col.appendChild(chip);
  });
}

function renderAll(updateScore = true) {
  renderQuestions();
  renderAnswers();
  if (updateScore) updateScoreBar();
}

function updateScoreBar(correct = 0, wrong = 0) {
  const total   = State.pairs.length;
  const matched = Object.keys(State.matches).length;
  const pct     = total > 0 ? Math.round((matched / total) * 100) : 0;
  q('sc-correct').textContent         = correct;
  q('sc-wrong').textContent           = wrong;
  q('sc-total').textContent           = total;
  q('progress-fill').style.width      = `${pct}%`;
  q('progress-label-pct').textContent = `${pct}%`;
}

// ─── GAME LOGIC ───────────────────────────────────────
function reshuffle() {
  State.shuffleOrder = State.pairs.map((_, i) => i);
  shuffleArray(State.shuffleOrder);
}

function resetProgress() {
  State.matches = {};
  State.checked = false;
  State.results = {};
}

function onDrop(e, qi) {
  e.preventDefault();
  const dz = q(`dz-${qi}`);
  if (dz) dz.classList.remove('drop-zone--over');

  const ai = State.draggingAnswerIndex;
  if (ai === null || ai === undefined) return;

  // liberar si ya estaba en otra pregunta
  for (const [eQi, eAi] of Object.entries(State.matches)) {
    if (Number(eAi) === ai) delete State.matches[eQi];
  }
  State.matches[qi] = ai;

  if (State.checked) {
    State.checked = false;
    State.results = {};
    hideFeedback();
  }
  renderAll();
}

function removeMatch(qi) {
  delete State.matches[qi];
  if (State.checked) { State.checked = false; State.results = {}; hideFeedback(); }
  renderAll();
}

function checkAnswers() {
  const total   = State.pairs.length;
  const matched = Object.keys(State.matches).length;
  if (!total)          { showToast('⚠️ No hay preguntas'); return; }
  if (matched < total) { showToast(`⚠️ Faltan ${total - matched} respuesta(s)`); return; }

  let correctCount = 0;
  const results = [];
  State.pairs.forEach((pair, qi) => {
    const ai        = State.matches[qi];
    const isCorrect = Number(ai) === qi;
    if (isCorrect) correctCount++;
    State.results[qi] = isCorrect;
    results.push({ qi, isCorrect, correctA: pair.a, givenA: State.pairs[ai]?.a ?? '—' });
  });

  State.checked = true;
  renderAll(false);
  updateScoreBar(correctCount, total - correctCount);
  showFeedback(results);
  if (correctCount === total) launchConfetti();
}

function initGame() {
  resetProgress();
  reshuffle();
  renderAll();
  hideFeedback();
}

function resetGame() {
  resetProgress();
  renderAll();
  hideFeedback();
}

// ─── FEEDBACK ─────────────────────────────────────────
function showFeedback(results) {
  const total   = State.pairs.length;
  const correct = results.filter(r => r.isCorrect).length;
  const pct     = Math.round((correct / total) * 100);
  const emoji   = correct === total ? '🎉' : correct >= total*.7 ? '👍' : correct >= total*.5 ? '💪' : '📚';

  q('feedback-title').innerHTML = `${emoji} ${correct}/${total} correctas &nbsp;·&nbsp; ${pct}%`;
  q('feedback-items').innerHTML = results.map(r => `
    <div class="feedback-item">
      <span class="feedback-item__icon">${r.isCorrect ? '✅' : '❌'}</span>
      <div>
        <div class="feedback-item__q">Q${r.qi+1}: ${esc(State.pairs[r.qi].q)}</div>
        ${r.isCorrect
          ? `<span class="feedback-item__correct">✓ ${esc(r.correctA)}</span>`
          : `<span class="feedback-item__given">Tu resp: ${esc(r.givenA)}</span><br>
             <span class="feedback-item__correct">Correcta: ${esc(r.correctA)}</span>`}
      </div>
    </div>`).join('');

  q('feedback-panel').classList.add('feedback-panel--show');
  q('feedback-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideFeedback() {
  q('feedback-panel').classList.remove('feedback-panel--show');
}

// ─── CSV ──────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].toLowerCase();
  const start = (first.includes('pregunta') || first.includes('question')) ? 1 : 0;
  const pairs = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    if (parts.length >= 2) {
      const qv = parts[0].trim(), av = parts.slice(1).join(',').trim();
      if (qv && av) pairs.push({ q: qv, a: av });
    }
  }
  return pairs;
}

function splitCSVLine(line) {
  const result = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"')      inQ = !inQ;
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'plantilla_matchit.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── FILE UPLOAD ──────────────────────────────────────
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

function renderPreview(pairs) {
  const slice = pairs.slice(0, 8);
  q('preview-body').innerHTML =
    slice.map((p, i) => `<tr><td>${i+1}</td><td>${esc(p.q)}</td><td>${esc(p.a)}</td></tr>`).join('')
    + (pairs.length > 8 ? `<tr><td colspan="3" style="color:var(--text-muted);font-style:italic">… y ${pairs.length-8} más</td></tr>` : '');
  q('preview-area').style.display     = 'block';
  q('load-confirm-btn').style.display = 'inline-flex';
}

// ─── EDIT MODAL ───────────────────────────────────────
function renderEditPairs(pairs) {
  const data = pairs.length ? pairs : [{ q: '', a: '' }];
  q('edit-pairs').innerHTML = data.map((p, i) => editPairHTML(i, p.q, p.a)).join('');
}

function editPairHTML(i, qv = '', av = '') {
  return `<div class="edit-pair" id="ep-${i}">
    <input type="text" value="${esc(qv)}" placeholder="Pregunta…">
    <input type="text" value="${esc(av)}" placeholder="Respuesta…">
    <button class="edit-pair__remove">✕</button>
  </div>`;
}

function getEditPairs() {
  const pairs = [];
  document.querySelectorAll('#edit-pairs .edit-pair').forEach(row => {
    const [qi, ai] = row.querySelectorAll('input');
    const qv = qi.value.trim(), av = ai.value.trim();
    if (qv && av) pairs.push({ q: qv, a: av });
  });
  return pairs;
}

// ─── LOAD PAIRS ───────────────────────────────────────
function loadPairs(pairs) {
  State.pairs    = pairs;
  State.fileData = null;
  stopTimer();
  State.timer.remaining = State.timer.totalSecs;
  State.timer.expired   = false;
  renderTimer();
  q('preview-area').style.display     = 'none';
  q('load-confirm-btn').style.display = 'none';
  q('file-input').value = '';
  initGame();
  updateScoreBar();
  showStartScreen();
  showToast(`✅ ${pairs.length} pares cargados`);
}

// ─── CONFETTI ─────────────────────────────────────────
function launchConfetti() {
  const canvas = q('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors  = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#f43f5e','#a78bfa'];
  const pieces  = Array.from({ length: 130 }, () => ({
    x: Math.random()*canvas.width, y: Math.random()*-canvas.height,
    r: Math.random()*7+4, c: colors[Math.floor(Math.random()*colors.length)],
    vx: (Math.random()-.5)*4, vy: Math.random()*4+2,
    angle: Math.random()*360, spin: (Math.random()-.5)*9,
  }));
  let frame = 0;
  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle*Math.PI/180);
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1-frame/160);
      ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.55); ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.angle+=p.spin;
    });
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  };
  draw();
}

// ─── BOOTSTRAP ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Header buttons
  q('btn-download-template').addEventListener('click', () => { downloadTemplate(); showToast('✅ Plantilla descargada'); });
  q('btn-load').addEventListener('click', () => openModal('modal-load'));
  q('btn-edit').addEventListener('click', () => { renderEditPairs(State.pairs); openModal('modal-edit'); });
  q('btn-play-again').addEventListener('click', () => {
    resetGame();
    stopTimer();
    State.timer.remaining = State.timer.totalSecs;
    State.timer.expired = false;
    renderTimer();
    showStartScreen();
  });

  // In-game controls
  q('btn-check').addEventListener('click', () => checkAnswers());
  q('btn-reset').addEventListener('click', () => {
    resetGame(); stopTimer();
    State.timer.remaining = State.timer.totalSecs;
    State.timer.expired = false;
    renderTimer();
    showToast('↺ Reiniciado');
  });
  q('btn-shuffle-ctrl').addEventListener('click', () => {
    shuffleArray(State.shuffleOrder);
    renderAnswers();
    showToast('🔀 Mezcladas');
  });

  // Timer bar buttons
  q('timer-btn-play').addEventListener('click', pauseResumeTimer);
  q('timer-btn-reset').addEventListener('click', resetTimerUI);

  // Modal: close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
    });
  });

  // Modal: Load
  const fileArea  = q('file-drop-area');
  const fileInput = q('file-input');
  fileArea.addEventListener('click', () => fileInput.click());
  fileArea.addEventListener('dragover',  e => { e.preventDefault(); fileArea.classList.add('file-drop-area--over'); });
  fileArea.addEventListener('dragleave', ()  => fileArea.classList.remove('file-drop-area--over'));
  fileArea.addEventListener('drop', e => {
    e.preventDefault(); fileArea.classList.remove('file-drop-area--over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  q('load-confirm-btn').addEventListener('click', () => {
    if (!State.fileData?.length) return;
    loadPairs(State.fileData);
    closeModal('modal-load');
  });
  q('load-cancel-btn').addEventListener('click', () => closeModal('modal-load'));

  // Modal: Edit
  q('btn-add-pair').addEventListener('click', () => {
    const c = q('edit-pairs');
    c.insertAdjacentHTML('beforeend', editPairHTML(c.children.length));
  });
  q('edit-pairs').addEventListener('click', e => {
    const btn = e.target.closest('.edit-pair__remove');
    if (btn) btn.closest('.edit-pair').remove();
  });
  q('edit-save-btn').addEventListener('click', () => {
    const pairs = getEditPairs();
    if (pairs.length < 2) { showToast('⚠️ Necesitas al menos 2 pares'); return; }
    loadPairs(pairs);
    closeModal('modal-edit');
  });
  q('edit-cancel-btn').addEventListener('click', () => closeModal('modal-edit'));

  // Start screen — timer config inline
  const startToggle  = q('start-timer-toggle');
  const startOptions = q('start-timer-options');
  const startPresets = document.querySelectorAll('#start-screen .timer-preset');
  const startCustom  = q('start-timer-custom');

  startToggle.addEventListener('change', () => {
    State.timer.enabled = startToggle.checked;
    startOptions.style.display = startToggle.checked ? 'block' : 'none';
    q('start-timer-val').textContent = startToggle.checked ? fmtSecs(State.timer.totalSecs) : 'Sin límite';
  });

  startPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      startPresets.forEach(b => b.classList.remove('timer-preset--active'));
      btn.classList.add('timer-preset--active');
      State.timer.totalSecs = parseInt(btn.dataset.secs);
      startCustom.value = Math.floor(State.timer.totalSecs / 60) || 1;
      q('start-timer-val').textContent = fmtSecs(State.timer.totalSecs);
    });
  });

  startCustom.addEventListener('input', () => {
    const mins = Math.max(1, Math.min(120, parseInt(startCustom.value) || 1));
    State.timer.totalSecs = mins * 60;
    startPresets.forEach(b => b.classList.remove('timer-preset--active'));
    q('start-timer-val').textContent = fmtSecs(State.timer.totalSecs);
  });

  // Botón JUGAR — el más importante
  q('btn-start-game').addEventListener('click', () => {
    State.timer.remaining = State.timer.totalSecs;
    State.timer.expired   = false;
    renderTimer();
    hideStartScreen();
    beginCountdown(); // solo actúa si timer está habilitado
  });

  // Cargar pares por defecto y mostrar pantalla de inicio
  loadPairs([...DEFAULT_PAIRS]);
});