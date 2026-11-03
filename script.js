// ==PURE-START
const INF = Infinity;

function randomEdges(n, ties) {
  const wmax = ties ? 5 : 20;
  const rw = () => 1 + Math.floor(Math.random() * wmax);
  const map = new Map();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < 0.35) map.set(i + ',' + j, { u: i, v: j, w: rw() });
    }
  }
  for (let j = 1; j < n; j++) {
    let has = false;
    for (const e of map.values()) { if (e.v === j) { has = true; break; } }
    if (!has) {
      const p = Math.floor(Math.random() * j);
      map.set(p + ',' + j, { u: p, v: j, w: rw() });
    }
  }
  return [...map.values()];
}

function reaches(edges, from, to) {
  const adj = new Map();
  edges.forEach(e => { if (!adj.has(e.u)) adj.set(e.u, []); adj.get(e.u).push(e.v); });
  const seen = new Set();
  const st = [from];
  while (st.length) {
    const x = st.pop();
    if (x === to) return true;
    if (seen.has(x)) continue;
    seen.add(x);
    (adj.get(x) || []).forEach(y => st.push(y));
  }
  return false;
}

function enumeratePaths(preds, src, dst, cap) {
  const res = [];
  const stack = [dst];
  (function walk(v) {
    if (res.length >= cap) return;
    if (v === src) { res.push(stack.slice().reverse()); return; }
    for (const p of preds[v]) {
      stack.push(p);
      walk(p);
      stack.pop();
      if (res.length >= cap) return;
    }
  })(dst);
  return res;
}

function countPaths(preds, src, dst) {
  const memo = new Map();
  const c = v => {
    if (v === src) return 1;
    if (memo.has(v)) return memo.get(v);
    let s = 0;
    for (const p of preds[v]) s += c(p);
    memo.set(v, s);
    return s;
  };
  return c(dst);
}

function runDijkstra(n, edges, src, dst) {
  const fmt = d => (d === INF ? '∞' : d);
  const out = Array.from({ length: n }, () => []);
  edges.forEach(e => out[e.u].push(e));
  out.forEach(l => l.sort((a, b) => a.v - b.v));

  const dist = Array(n).fill(INF);
  dist[src] = 0;
  const preds = Array.from({ length: n }, () => []);
  const visited = new Set();
  const heap = [[0, src]];
  const steps = [];

  const validQueue = () => heap
    .filter(([d, v]) => !visited.has(v) && d === dist[v])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const push = extra => steps.push(Object.assign({
    dist: dist.slice(),
    preds: preds.map(p => p.slice()),
    visited: new Set(visited),
    queue: validQueue(),
    current: null,
    active: null
  }, extra));

  push({
    kind: 'init',
    msg: `Empezamos en el vértice <b>${src}</b>: su distancia es 0 y la de los demás es ∞. Buscamos el camino más corto hasta el vértice <b>${dst}</b>.`,
    log: `Inicio · origen ${src}, destino ${dst}`
  });

  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const [d, u] = heap.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    const outs = out[u];
    push({
      kind: 'visit', current: u,
      msg: `Se visita el vértice <b>${u}</b>, el pendiente más cercano (distancia <b>${d}</b>). ` +
        (outs.length ? `Ahora se revisan sus ${outs.length} salida${outs.length === 1 ? '' : 's'}.` : 'No tiene salidas.'),
      log: `Visitando vértice ${u} (distancia acumulada = ${d})`
    });
    for (const e of outs) {
      const v = e.v, nd = dist[u] + e.w, old = dist[v];
      let outcome;
      if (nd < old) { dist[v] = nd; preds[v] = [u]; heap.push([nd, v]); outcome = 'better'; }
      else if (nd === old) { preds[v].push(u); outcome = 'tie'; }
      else { outcome = 'worse'; }
      const head = `<b>${u} → ${v}</b> (peso ${e.w}): ${dist[u]} + ${e.w} = <b>${nd}</b>`;
      let msg, log;
      if (outcome === 'better') {
        msg = `${head}, mejor que ${fmt(old)}. Nueva distancia mínima del vértice ${v}.`;
        log = `${u} → ${v} (peso ${e.w}): nueva distancia mínima = ${nd}`;
      } else if (outcome === 'tie') {
        msg = `${head}, igual que la distancia actual. Se guarda otro camino mínimo hacia el vértice ${v}.`;
        log = `${u} → ${v} (peso ${e.w}): otro camino con la misma distancia (${nd})`;
      } else {
        msg = `${head}, no mejora la distancia actual (${dist[v]}). Se descarta.`;
        log = `${u} → ${v} (peso ${e.w}): no mejora la distancia actual (${dist[v]})`;
      }
      push({ kind: 'relax', current: u, active: [u, v], outcome, msg, log });
    }
  }

  const reachable = dist[dst] !== INF;
  const paths = reachable ? enumeratePaths(preds, src, dst, 400) : [];
  const count = reachable ? countPaths(preds, src, dst) : 0;
  push({
    kind: 'end',
    msg: reachable
      ? `Fin del algoritmo. La distancia mínima de ${src} a ${dst} es <b>${dist[dst]}</b>, con <b>${count}</b> camino${count === 1 ? '' : 's'} mínimo${count === 1 ? '' : 's'}.`
      : `Fin del algoritmo. No existe un camino de ${src} a ${dst}.`,
    log: 'Fin del algoritmo'
  });

  return { steps, paths, count, distance: dist[dst] };
}
// ==PURE-END

(function () {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  const S = {
    n: 9, mode: 'random', ties: false, edges: [], src: 0, dst: 8,
    run: null, steps: [], i: 0, lastPainted: -1,
    playing: false, timer: null,
    pos: [], layer: [], r: 18, W: 900, H: 520,
    pick: 'src', hover: null, pinned: null
  };
  const svg = $('graph');
  const wrap = $('canvasWrap');
  let nodeEls = [], edgeEls = [], lastFinal = null, lastWidth = 0;

  /* ---------- Diseño del grafo (capas de izquierda a derecha) ---------- */
  function computeLayout() {
    const { n, edges, W, H } = S;
    const padX = 46, padY = 42;
    if (!edges.length) {
      const rows = 4, cols = Math.ceil(n / rows);
      S.r = 19; S.layer = Array(n).fill(0); S.pos = [];
      for (let v = 0; v < n; v++) {
        S.pos[v] = { x: W * (Math.floor(v / rows) + 0.5) / cols, y: padY + ((v % rows) + 0.5) * (H - 2 * padY) / rows };
      }
      return;
    }
    const adj = Array.from({ length: n }, () => []);
    const radj = Array.from({ length: n }, () => []);
    const deg = Array(n).fill(0);
    edges.forEach(e => { adj[e.u].push(e.v); radj[e.v].push(e.u); deg[e.v]++; });
    const layer = Array(n).fill(0);
    const q = [];
    for (let v = 0; v < n; v++) if (deg[v] === 0) q.push(v);
    while (q.length) {
      const u = q.shift();
      for (const v of adj[u]) { layer[v] = Math.max(layer[v], layer[u] + 1); if (--deg[v] === 0) q.push(v); }
    }
    const L = Math.max(...layer) + 1;
    const cols = Array.from({ length: L }, () => []);
    for (let v = 0; v < n; v++) cols[layer[v]].push(v);
    const yf = new Map();
    const setY = () => cols.forEach(c => c.forEach((v, k) => yf.set(v, (k + 1) / (c.length + 1))));
    setY();
    const bary = (v, nb) => nb[v].length ? nb[v].reduce((s, p) => s + yf.get(p), 0) / nb[v].length : yf.get(v);
    for (let it = 0; it < 4; it++) {
      for (let l = 1; l < L; l++) { cols[l].sort((a, b) => bary(a, radj) - bary(b, radj) || a - b); setY(); }
      for (let l = L - 2; l >= 0; l--) { cols[l].sort((a, b) => bary(a, adj) - bary(b, adj) || a - b); setY(); }
    }
    const maxCount = Math.max(...cols.map(c => c.length));
    const dx = L > 1 ? (W - 2 * padX) / (L - 1) : Infinity;
    const vs = (H - 2 * padY) / (maxCount + 1);
    S.r = clamp(Math.min(vs * 0.4, dx * 0.42), 11, 19);
    S.pos = [];
    cols.forEach((c, l) => {
      const x = L > 1 ? padX + l * dx : W / 2;
      c.forEach((v, k) => { S.pos[v] = { x, y: padY + (k + 1) * (H - 2 * padY) / (c.length + 1) }; });
    });
    S.layer = layer;
  }

  function edgeGeom(e) {
    const a = S.pos[e.u], b = S.pos[e.v], r = S.r;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const span = Math.abs(S.layer[e.v] - S.layer[e.u]);
    const bend = span > 1 ? ((e.u + e.v) % 2 ? 1 : -1) * Math.min(70, 10 * span + len * 0.06) : 0;
    const nx = -dy / len, ny = dx / len;
    const cx = (a.x + b.x) / 2 + nx * bend * 2, cy = (a.y + b.y) / 2 + ny * bend * 2;
    const ux = cx - a.x, uy = cy - a.y, ul = Math.hypot(ux, uy) || 1;
    const sx = a.x + ux / ul * r, sy = a.y + uy / ul * r;
    const vx = b.x - cx, vy = b.y - cy, vl = Math.hypot(vx, vy) || 1;
    const ex = b.x - vx / vl * (r + 2), ey = b.y - vy / vl * (r + 2);
    const t = 0.35 + ((e.u * 7 + e.v * 13) % 5) * 0.075;
    const lx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
    const ly = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
    return { d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`, lx, ly };
  }

  function buildDOM() {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${S.W} ${S.H}`);
    svg.style.width = S.W + 'px';
    svg.style.height = S.H + 'px';
    const defs = mk('defs', {}, svg);
    ['idle', 'tree', 'active', 'path'].forEach(k => {
      const m = mk('marker', { id: 'm-' + k, viewBox: '0 0 10 10', refX: '10', refY: '5', markerWidth: '11', markerHeight: '11', orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs);
      mk('path', { d: 'M0,1.2 L10,5 L0,8.8 z', class: 'mk mk-' + k }, m);
    });
    const gl = mk('g', {}, svg), gb = mk('g', {}, svg), gn = mk('g', {}, svg);
    edgeEls = S.edges.map(e => {
      const line = mk('path', { class: 'edge-line' }, gl);
      const lab = mk('g', { class: 'elabel' }, gb);
      const wd = String(e.w).length * 7 + 11;
      mk('rect', { rx: 8, ry: 8, width: wd, height: 16, x: -wd / 2, y: -8 }, lab);
      mk('text', {}, lab).textContent = e.w;
      return { e, line, lab, key: e.u + ',' + e.v, st: '' };
    });
    nodeEls = [];
    for (let v = 0; v < S.n; v++) {
      const g = mk('g', { class: 'node s-idle', 'data-v': v, tabindex: '0', role: 'button' }, gn);
      mk('circle', { class: 'halo', r: S.r + 7 }, g);
      mk('circle', { class: 'focusring', r: S.r + 5 }, g);
      mk('circle', { class: 'body', r: S.r }, g);
      const nid = mk('text', { class: 'nid' }, g);
      nid.textContent = v;
      nid.style.fontSize = Math.round(S.r * 0.82) + 'px';
      const dist = mk('text', { class: 'ndist', y: -(S.r + 7) }, g);
      const tag = mk('text', { class: 'ntag', y: S.r + 12 }, g);
      nodeEls.push({ el: g, dist, tag, halo: g.firstChild });
    }
    layoutDOM();
    edgeEls.forEach(o => { o.st = ''; });
  }

  function layoutDOM() {
    nodeEls.forEach((o, v) => { o.el.setAttribute('transform', `translate(${S.pos[v].x.toFixed(1)},${S.pos[v].y.toFixed(1)})`); });
    edgeEls.forEach(o => {
      const g = edgeGeom(o.e);
      o.line.setAttribute('d', g.d);
      o.lab.setAttribute('transform', `translate(${g.lx.toFixed(1)},${g.ly.toFixed(1)})`);
    });
  }

  /* ---------- Pintado ---------- */
  function paintGraph() {
    const s = S.steps[S.i], run = S.run, final = s.kind === 'end';
    const showPaths = final && run.paths.length > 0;
    const sel = S.hover != null ? S.hover : S.pinned;
    let keys = null;
    if (showPaths) {
      keys = new Set();
      const list = sel != null && run.paths[sel] ? [run.paths[sel]] : run.paths;
      list.forEach(p => { for (let k = 0; k < p.length - 1; k++) keys.add(p[k] + ',' + p[k + 1]); });
    }
    const hasSel = showPaths && sel != null && run.paths[sel];
    edgeEls.forEach(o => {
      let st = 'idle';
      if (showPaths) st = keys.has(o.key) ? 'path' : (hasSel ? 'dim' : 'idle');
      else if (s.active && s.active[0] === o.e.u && s.active[1] === o.e.v) st = 'active';
      else if (s.preds[o.e.v].includes(o.e.u)) st = 'tree';
      if (o.st !== st) {
        o.st = st;
        o.line.setAttribute('class', 'edge-line st-' + st);
        o.lab.setAttribute('class', 'elabel st-' + st);
        o.line.setAttribute('marker-end', 'url(#m-' + (st === 'dim' ? 'idle' : st) + ')');
        if (st === 'active' || st === 'path') {
          o.line.parentNode.appendChild(o.line);
          o.lab.parentNode.appendChild(o.lab);
        }
      }
    });
    nodeEls.forEach((o, v) => {
      let st = 'idle';
      if (v === s.current) st = 'cur';
      else if (v === S.src) st = 'org';
      else if (v === S.dst) st = 'dst';
      else if (s.visited.has(v)) st = 'vis';
      const d = s.dist[v];
      o.el.setAttribute('class', 'node s-' + st);
      o.dist.textContent = d === INF ? '∞' : d;
      o.tag.textContent = v === S.src && v === S.dst ? 'ORIGEN · DESTINO' : v === S.src ? 'ORIGEN' : v === S.dst ? 'DESTINO' : '';
      o.el.setAttribute('aria-label', `Vértice ${v}, distancia ${d === INF ? 'infinita' : d}${v === S.src ? ', origen' : ''}${v === S.dst ? ', destino' : ''}`);
    });
  }

  function renderTable(s, prev, animate) {
    const rows = [];
    for (let v = 0; v < S.n; v++) {
      const d = s.dist[v];
      const changed = animate && prev && (d !== prev.dist[v] || s.preds[v].join() !== prev.preds[v].join());
      let cls, label;
      if (v === s.current) { cls = 'st-cur'; label = 'actual'; }
      else if (s.visited.has(v)) { cls = 'st-vis'; label = 'visitado'; }
      else if (d !== INF) { cls = 'st-que'; label = 'en cola'; }
      else { cls = 'st-idle'; label = 'pendiente'; }
      const dotCls = v === S.src ? 'd-org' : v === S.dst ? 'd-dst' : cls;
      const role = v === S.src && v === S.dst ? 'origen · destino' : v === S.src ? 'origen' : v === S.dst ? 'destino' : '';
      rows.push(`<tr class="${changed ? 'flash' : ''} ${v === s.current ? 'is-cur' : ''}">
        <td><span class="vid ${dotCls}"><span class="dot"></span>${v}</span> <span class="role">${role}</span></td>
        <td class="num">${d === INF ? '∞' : d}</td>
        <td class="mono">${s.preds[v].length ? s.preds[v].join(', ') : '—'}</td>
        <td><span class="pill ${cls}">${label}</span></td></tr>`);
    }
    $('distBody').innerHTML = rows.join('');
  }

  function renderQueue(s) {
    $('queue').innerHTML = s.queue.length
      ? s.queue.map(([d, v]) => `<span class="qchip">(${d}, ${v})</span>`).join('')
      : '<p class="empty">La cola está vacía.</p>';
  }

  function renderLog() {
    const parts = [];
    for (let k = 0; k <= S.i; k++) {
      const st = S.steps[k];
      const kind = st.kind === 'relax' ? 'k-' + st.outcome : 'k-' + st.kind;
      parts.push(`<li class="${kind}${k === S.i ? ' now' : ''}">${st.log}</li>`);
    }
    const log = $('log');
    log.innerHTML = parts.join('');
    log.scrollTop = log.scrollHeight;
  }

  function renderResult(final) {
    const body = $('resultBody');
    const run = S.run;
    if (!final) {
      body.innerHTML = '<p class="muted" style="margin-bottom:12px">Aparecen cuando el algoritmo termina.</p><button type="button" class="btn" id="seeResult">Ver el resultado ahora</button>';
      $('seeResult').onclick = () => go(S.steps.length - 1);
      return;
    }
    if (!run.paths.length) {
      const extra = S.mode === 'random' ? ' En el grafo aleatorio las aristas siempre van de un número menor a uno mayor, así que el destino debe ser mayor que el origen.' : '';
      body.innerHTML = `<div class="sum"><div><span class="lab">Camino de ${S.src} a ${S.dst}</span><span class="big">Ninguno</span></div></div><p class="muted" style="margin-top:12px">Ningún camino llega al destino desde ese origen.${extra} Prueba con otro par de vértices.</p>`;
      return;
    }
    const items = run.paths.map((p, k) => `<li><button type="button" class="path" data-i="${k}" aria-pressed="false">
      <span class="pname">Camino ${k + 1}</span>
      <span class="chain">${p.map(v => `<span class="pn">${v}</span>`).join('<span class="ar">→</span>')}</span></button></li>`).join('');
    const more = run.count > run.paths.length ? `<p class="muted" style="margin-top:8px">Se muestran los primeros ${run.paths.length} de ${run.count}.</p>` : '';
    body.innerHTML = `<div class="sum">
        <div><span class="lab">Distancia mínima de ${S.src} a ${S.dst}</span><span class="big">${run.distance}</span></div>
        <div><span class="lab">Caminos mínimos</span><span class="big">${run.count}</span></div>
      </div>
      ${run.paths.length > 1 ? '<p class="muted" style="margin-top:12px">Pasa el cursor o toca un camino para verlo solo en el grafo.</p>' : ''}
      <ul class="paths" style="margin-top:12px">${items}</ul>${more}`;
    body.querySelectorAll('button.path').forEach(b => {
      const idx = +b.dataset.i;
      b.addEventListener('mouseenter', () => { S.hover = idx; paintGraph(); });
      b.addEventListener('mouseleave', () => { S.hover = null; paintGraph(); });
      b.addEventListener('focus', () => { S.hover = idx; paintGraph(); });
      b.addEventListener('blur', () => { S.hover = null; paintGraph(); });
      b.addEventListener('click', () => {
        S.pinned = S.pinned === idx ? null : idx;
        body.querySelectorAll('button.path').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.i === S.pinned)));
        paintGraph();
      });
    });
  }

  function updateControls() {
    const last = S.steps.length - 1;
    $('scrub').max = last;
    $('scrub').value = S.i;
    $('stepCount').textContent = `Paso ${S.i + 1} de ${last + 1}`;
    $('bPrev').disabled = S.i === 0;
    $('bReset').disabled = S.i === 0;
    $('bNext').disabled = S.i === last;
    $('bVertex').disabled = S.i === last;
    $('bEnd').disabled = S.i === last;
    $('bPlay').innerHTML = S.playing
      ? '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.6" height="12" rx="1"/><rect x="8.4" y="1" width="3.6" height="12" rx="1"/></svg>Pausar'
      : '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.4v11.2L12.4 7z"/></svg>Reproducir';
  }

  function paint() {
    const s = S.steps[S.i];
    const prev = S.i > 0 ? S.steps[S.i - 1] : null;
    const animate = S.lastPainted !== S.i && S.i > 0;
    S.lastPainted = S.i;
    paintGraph();
    $('status').innerHTML = s.msg;
    renderTable(s, prev, animate);
    renderQueue(s);
    renderLog();
    const final = s.kind === 'end';
    if (final !== lastFinal) { lastFinal = final; renderResult(final); }
    updateControls();
  }

  /* ---------- Reproducción ---------- */
  function go(k) { S.i = clamp(k, 0, S.steps.length - 1); paint(); }
  function stop() { S.playing = false; clearTimeout(S.timer); }
  function schedule() {
    clearTimeout(S.timer);
    S.timer = setTimeout(() => {
      if (!S.playing) return;
      if (S.i < S.steps.length - 1) go(S.i + 1);
      if (S.i >= S.steps.length - 1) { stop(); updateControls(); } else schedule();
    }, +$('speed').value);
  }
  function togglePlay() {
    if (S.playing) { stop(); updateControls(); return; }
    if (S.i >= S.steps.length - 1) go(0);
    S.playing = true; updateControls(); schedule();
  }
  function nextVertex() {
    for (let k = S.i + 1; k < S.steps.length; k++) {
      if (S.steps[k].kind === 'visit' || S.steps[k].kind === 'end') { go(k); return; }
    }
  }

  /* ---------- Datos del grafo ---------- */
  function startRun() {
    stop();
    S.run = runDijkstra(S.n, S.edges, S.src, S.dst);
    S.steps = S.run.steps;
    S.i = 0; S.lastPainted = -1; S.hover = null; S.pinned = null; lastFinal = null;
    paint();
  }

  function measure() {
    S.W = Math.max(wrap.clientWidth || 900, 640);
    S.H = clamp(Math.round(S.W * 0.58), 380, 600);
  }

  function applyGraph() {
    measure();
    computeLayout();
    buildDOM();
    renderEdgeList();
    updateHint();
    startRun();
  }

  function fillSelects() {
    ['src', 'dst', 'mFrom', 'mTo'].forEach(id => {
      const sel = $(id);
      const keep = sel.value;
      sel.innerHTML = Array.from({ length: S.n }, (_, v) => `<option value="${v}">${v}</option>`).join('');
      if (keep !== '' && +keep < S.n) sel.value = keep;
    });
    $('src').value = S.src;
    $('dst').value = S.dst;
  }

  function renderEdgeList() {
    const box = $('edgeList');
    if (!S.edges.length) { box.innerHTML = '<p class="empty">Todavía no hay conexiones. Agrega la primera arriba.</p>'; return; }
    const sorted = S.edges.map((e, idx) => ({ e, idx })).sort((a, b) => a.e.u - b.e.u || a.e.v - b.e.v);
    box.innerHTML = sorted.map(({ e, idx }) => `<button type="button" class="echip" data-idx="${idx}" aria-label="Quitar conexión de ${e.u} a ${e.v}, peso ${e.w}">${e.u} → ${e.v} · ${e.w}<span aria-hidden="true">×</span></button>`).join('');
  }

  function updateHint() {
    const next = S.pick === 'src' ? 'origen' : 'destino';
    const narrow = S.W > wrap.clientWidth ? ' Desliza el grafo para verlo completo.' : '';
    $('hint').innerHTML = `Toca un vértice para fijar el <b>${next}</b>. Arrástralo para acomodarlo.${narrow}`;
  }

  function pickNode(v) {
    if (S.pick === 'src') { S.src = v; S.pick = 'dst'; } else { S.dst = v; S.pick = 'src'; }
    $('src').value = S.src; $('dst').value = S.dst;
    updateHint();
    startRun();
  }

  /* ---------- Eventos ---------- */
  $('nodes').addEventListener('input', e => {
    S.n = +e.target.value;
    $('nodesOut').textContent = S.n;
    if (S.mode === 'random') { S.edges = randomEdges(S.n, S.ties); S.src = 0; S.dst = S.n - 1; }
    else {
      S.edges = S.edges.filter(x => x.u < S.n && x.v < S.n);
      if (S.src >= S.n) S.src = 0;
      if (S.dst >= S.n) S.dst = S.n - 1;
    }
    fillSelects();
    applyGraph();
  });
  $('modeRandom').addEventListener('click', () => {
    S.mode = 'random';
    $('modeRandom').setAttribute('aria-pressed', 'true'); $('modeManual').setAttribute('aria-pressed', 'false');
    $('manualPanel').hidden = true;
    S.edges = randomEdges(S.n, S.ties);
    applyGraph();
  });
  $('modeManual').addEventListener('click', () => {
    S.mode = 'manual';
    $('modeRandom').setAttribute('aria-pressed', 'false'); $('modeManual').setAttribute('aria-pressed', 'true');
    $('manualPanel').hidden = false;
    renderEdgeList();
  });
  $('regen').addEventListener('click', () => { S.edges = randomEdges(S.n, S.ties); applyGraph(); });
  $('ties').addEventListener('change', e => {
    S.ties = e.target.checked;
    if (S.mode === 'random') { S.edges = randomEdges(S.n, S.ties); applyGraph(); }
  });
  $('src').addEventListener('change', e => { S.src = +e.target.value; startRun(); });
  $('dst').addEventListener('change', e => { S.dst = +e.target.value; startRun(); });

  function setMsg(text, err) { const m = $('mMsg'); m.textContent = text; m.className = 'msg' + (err ? ' err' : ''); }
  $('mForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const u = +$('mFrom').value, v = +$('mTo').value, w = Number($('mW').value);
    if (!Number.isInteger(w) || w < 0) { setMsg('El peso debe ser un número entero, 0 o mayor.', true); return; }
    if (u === v) { setMsg('Un vértice no puede conectarse consigo mismo.', true); return; }
    if (reaches(S.edges, v, u)) { setMsg(`La conexión ${u} → ${v} formaría un ciclo, así que no se agregó.`, true); return; }
    const found = S.edges.find(x => x.u === u && x.v === v);
    if (found) { found.w = w; setMsg(`Se actualizó el peso de ${u} → ${v} a ${w}.`, false); }
    else { S.edges.push({ u, v, w }); setMsg(`Se agregó ${u} → ${v} con peso ${w}.`, false); }
    applyGraph();
  });
  $('mClear').addEventListener('click', () => { S.edges = []; setMsg('Grafo vacío. Agrega conexiones para empezar.', false); applyGraph(); });
  $('edgeList').addEventListener('click', ev => {
    const b = ev.target.closest('.echip');
    if (!b) return;
    const e = S.edges[+b.dataset.idx];
    S.edges.splice(+b.dataset.idx, 1);
    setMsg(`Se quitó la conexión ${e.u} → ${e.v}.`, false);
    applyGraph();
  });

  $('bReset').addEventListener('click', () => { stop(); go(0); });
  $('bPrev').addEventListener('click', () => { stop(); go(S.i - 1); });
  $('bNext').addEventListener('click', () => { stop(); go(S.i + 1); });
  $('bVertex').addEventListener('click', () => { stop(); nextVertex(); });
  $('bEnd').addEventListener('click', () => { stop(); go(S.steps.length - 1); });
  $('bPlay').addEventListener('click', togglePlay);
  $('scrub').addEventListener('input', e => { stop(); go(+e.target.value); });
  $('speed').addEventListener('change', () => { if (S.playing) schedule(); });

  document.addEventListener('keydown', ev => {
    const tag = ev.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (ev.key === 'ArrowRight') { stop(); go(S.i + 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { stop(); go(S.i - 1); ev.preventDefault(); }
    else if (ev.key === 'Home') { stop(); go(0); ev.preventDefault(); }
    else if (ev.key === 'End') { stop(); go(S.steps.length - 1); ev.preventDefault(); }
    else if (ev.key === ' ' && tag !== 'BUTTON' && !ev.target.closest('.node')) { togglePlay(); ev.preventDefault(); }
  });

  /* Arrastrar y elegir vértices */
  let drag = null;
  const svgPoint = ev => {
    const rc = svg.getBoundingClientRect();
    return { x: (ev.clientX - rc.left) * S.W / rc.width, y: (ev.clientY - rc.top) * S.H / rc.height };
  };
  svg.addEventListener('pointerdown', ev => {
    const g = ev.target.closest('.node');
    if (!g) return;
    const v = +g.dataset.v, p = svgPoint(ev);
    drag = { v, sx: p.x, sy: p.y, ox: S.pos[v].x, oy: S.pos[v].y, moved: false };
    try { svg.setPointerCapture(ev.pointerId); } catch (_) { /* sin captura */ }
    ev.preventDefault();
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return;
    const p = svgPoint(ev), dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    S.pos[drag.v] = { x: clamp(drag.ox + dx, S.r + 4, S.W - S.r - 4), y: clamp(drag.oy + dy, S.r + 16, S.H - S.r - 16) };
    layoutDOM();
  });
  const endDrag = ev => {
    if (!drag) return;
    const d = drag; drag = null;
    try { svg.releasePointerCapture(ev.pointerId); } catch (_) { /* nada */ }
    if (!d.moved && ev.type === 'pointerup') pickNode(d.v);
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('keydown', ev => {
    const g = ev.target.closest && ev.target.closest('.node');
    if (g && (ev.key === 'Enter' || ev.key === ' ')) { pickNode(+g.dataset.v); ev.preventDefault(); }
  });

  /* Reajuste al cambiar el ancho */
  let rz;
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (!w || w === lastWidth) return;
      lastWidth = w;
      clearTimeout(rz);
      rz = setTimeout(() => { measure(); computeLayout(); buildDOM(); updateHint(); paintGraph(); }, 120);
    }).observe(wrap);
  }

  /* Arranque con un grafo de ejemplo ya cargado */
  S.edges = randomEdges(S.n, S.ties);
  fillSelects();
  lastWidth = wrap.clientWidth;
  applyGraph();
})();
