// Dependency-free SVG charts. Every chart returns an HTML string; hover is handled by
// one delegated tooltip that reads `data-tip` from hit targets (bigger than the marks).

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const niceMax = (v, step) => Math.max(step, Math.ceil(v / step) * step);
// Axis titles: x centred under the plot, y rotated along the left edge.
const axisTitles = (W, H, P, x, y) =>
  (x ? `<text x="${(P.l + W - P.r) / 2}" y="${H - 2}" class="axis" text-anchor="middle">${esc(x)}</text>` : '') +
  (y ? `<text x="11" y="${(P.t + H - P.b) / 2}" class="axis" text-anchor="middle" transform="rotate(-90 11 ${(P.t + H - P.b) / 2})">${esc(y)}</text>` : '');

// Fan chart: actual points so far, then the projected median with 50% / 80% bands.
export function fanChart({ past, band, safety, color, labels, total }) {
  const W = 640, H = 280, P = { l: 48, r: 40, t: 14, b: 44 };
  const n0 = past.length ? past[past.length - 1].k : 0;
  const xMax = total || n0 + band.length;
  // Focus on the run-in: the last ~12 played matches plus the projection.
  const xMin = Math.max(0, Math.min(n0 - 12, xMax - 20));
  past = past.filter(p => p.k >= xMin);
  const lo = Math.min(past[0]?.pts ?? 0, ...band.map(b => b.p10));
  const yMin = Math.max(0, Math.floor((lo - 2) / 5) * 5);
  const yMax = niceMax(Math.max(band.at(-1)?.p90 || 0, past.at(-1)?.pts || 0, safety?.p90 || 0) + 2, 5);
  const x = k => P.l + ((k - xMin) / (xMax - xMin)) * (W - P.l - P.r), y = v => H - P.b - ((v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const start = past.at(-1) || { k: 0, pts: 0 };
  const pts = [{ k: start.k, p10: start.pts, p25: start.pts, p50: start.pts, p75: start.pts, p90: start.pts }, ...band.map((b, i) => ({ k: start.k + i + 1, ...b }))];
  const area = (lo, hi) => `M${pts.map(p => `${x(p.k)},${y(p[hi])}`).join('L')}L${[...pts].reverse().map(p => `${x(p.k)},${y(p[lo])}`).join('L')}Z`;
  let g = '';
  const yStep = yMax - yMin > 30 ? 10 : 5;
  for (let v = yMin; v <= yMax; v += yStep) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${v}</text>`;
  for (let k = Math.ceil(xMin / 5) * 5; k <= xMax; k += 5) g += `<text x="${x(k)}" y="${H - P.b + 16}" class="tick" text-anchor="middle">${k}</text>`;
  g += axisTitles(W, H, P, labels.xTitle, labels.yTitle);
  if (safety) {
    g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(safety.p50)}" y2="${y(safety.p50)}" class="ref"/>`;
    g += `<text x="${P.l + 6}" y="${y(safety.p50) - 6}" class="lbl">${esc(labels.safety)} · ${safety.p50} ${esc(labels.pts)}</text>`;
  }
  g += `<path d="${area('p10', 'p90')}" fill="${color}" opacity=".12"/><path d="${area('p25', 'p75')}" fill="${color}" opacity=".22"/>`;
  g += `<path d="M${past.map(p => `${x(p.k)},${y(p.pts)}`).join('L')}" class="line" stroke="${color}"/>`;
  g += `<path d="M${pts.map(p => `${x(p.k)},${y(p.p50)}`).join('L')}" class="line proj" stroke="${color}"/>`;
  const end = pts.at(-1);
  g += `<circle cx="${x(end.k)}" cy="${y(end.p50)}" r="4.5" fill="${color}" class="dot"/>`;
  g += `<text x="${x(end.k) + 9}" y="${y(end.p50) + 4}" class="lbl strong">${end.p50}</text>`;
  const colW = (W - P.l - P.r) / (xMax - xMin);
  for (const p of past) g += `<rect x="${x(p.k) - colW / 2}" y="${P.t}" width="${colW}" height="${H - P.t - P.b}" class="hit" data-tip="${esc(`${labels.played} ${p.k}: <b>${p.pts}</b> ${labels.pts}`)}"/>`;
  for (const p of pts.slice(1)) g += `<rect x="${x(p.k) - colW / 2}" y="${P.t}" width="${colW}" height="${H - P.t - P.b}" class="hit" data-tip="${esc(`${labels.played} ${p.k}: <b>${p.p50}</b> ${labels.pts}<br>50%: ${p.p25}–${p.p75} · 80%: ${p.p10}–${p.p90}`)}"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(labels.aria)}">${g}</svg>`;
}

// Column distribution over finishing positions, with zone tints behind.
export function positionChart({ pos, color, zones, zoneLabel, labels }) {
  const W = 640, H = 230, P = { l: 48, r: 8, t: 22, b: 44 };
  const N = pos.length, max = niceMax(Math.max(...pos) * 100, 10) / 100;
  const bw = (W - P.l - P.r) / N, y = v => H - P.b - (v / max) * (H - P.t - P.b);
  let g = '';
  for (const [from, to, key] of zones || []) {
    g += `<rect x="${P.l + (from - 1) * bw}" y="${P.t - 16}" width="${(to - from + 1) * bw}" height="${H - P.t - P.b + 16}" class="zone z-${key}"/>`;
    g += `<text x="${P.l + (from - 1) * bw + 4}" y="${P.t - 5}" class="zlbl">${esc(zoneLabel(key))}</text>`;
  }
  for (let v = 0; v <= max + 1e-9; v += max / 2) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${Math.round(v * 100)}%</text>`;
  pos.forEach((p, i) => {
    const w = Math.min(22, bw - 4), cx = P.l + i * bw + bw / 2, top = y(p), h = H - P.b - top;
    if (h > 0.5) g += `<path d="${roundedTop(cx - w / 2, top, w, h, 4)}" fill="${color}"/>`;
    g += `<text x="${cx}" y="${H - P.b + 16}" class="tick" text-anchor="middle">${i + 1}</text>`;
    g += `<rect x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${H - P.t - P.b}" class="hit" data-tip="${esc(`${labels.ordinal(i + 1)}: <b>${labels.pct(p, 1)}</b>`)}"/>`;
  });
  g += axisTitles(W, H, P, labels.xTitle, labels.yTitle);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(labels.aria)}">${g}</svg>`;
}

function roundedTop(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// Multi-series line chart over time (probabilities). One y-axis, legend + end labels.
export function lineChart({ series, fmtX, fmtY, yMax = 1, labels, marks = [], xDomain, ticksAt }) {
  const W = 640, H = 260, P = { l: 52, r: 56, t: 14, b: 44 };
  const xs = series.flatMap(s => s.points.map(p => p.t));
  if (!xs.length) return '';
  const x0 = xDomain ? xDomain[0] : Math.min(...xs), x1 = xDomain ? xDomain[1] : Math.max(...xs);
  const x = t => P.l + ((t - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r), y = v => H - P.b - (v / yMax) * (H - P.t - P.b);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = (yMax * i) / 4; g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${fmtY(v)}</text>`; }
  const tickVals = ticksAt || Array.from({ length: 6 }, (_, i) => x0 + ((x1 - x0) * i) / 5);
  for (const tv of tickVals) g += `<text x="${x(tv)}" y="${H - P.b + 16}" class="tick" text-anchor="middle">${esc(fmtX(tv))}</text>`;
  g += axisTitles(W, H, P, labels.xTitle, labels.yTitle);
  for (const mk of marks) g += `<line x1="${x(mk.t)}" x2="${x(mk.t)}" y1="${P.t}" y2="${H - P.b}" class="ref"/><text x="${x(mk.t) + 4}" y="${P.t + 10}" class="lbl">${esc(mk.label)}</text>`;
  const ends = [];
  for (const s of series) {
    if (!s.points.length) continue;
    g += `<path d="M${s.points.map(p => `${x(p.t)},${y(p.v)}`).join('L')}" class="line${s.dash ? ' alt' : ''}" stroke="${s.color}"/>`;
    const e = s.points.at(-1);
    g += `<circle cx="${x(e.t)}" cy="${y(e.v)}" r="4.5" fill="${s.color}" class="dot"/>`;
    ends.push({ y: y(e.v), text: fmtY(e.v) });
  }
  // End labels: nudge apart only when they would overlap.
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  for (const e of ends) g += `<text x="${W - P.r + 8}" y="${e.y + 4}" class="lbl strong">${esc(e.text)}</text>`;
  const T = [...new Set(xs)].sort((a, b) => a - b);
  T.forEach((t, i) => {
    const l = i ? (x(T[i - 1]) + x(t)) / 2 : P.l, r = i < T.length - 1 ? (x(T[i + 1]) + x(t)) / 2 : W - P.r;
    const rows = series.map(s => { const p = s.points.find(q => q.t === t); return p ? `<i style="background:${s.color}"></i>${esc(s.name)}: <b>${fmtY(p.v)}</b>` : ''; }).filter(Boolean).join('<br>');
    g += `<rect x="${l}" y="${P.t}" width="${Math.max(1, r - l)}" height="${H - P.t - P.b}" class="hit" data-tip="${esc(`<span class=muted>${fmtX(t)}</span><br>${rows}`)}" data-x="${x(t)}"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(labels.aria)}">${g}</svg>`;
}

// Attack vs defence scatter: everyone muted, highlighted clubs colored and labeled.
export function strengthScatter({ points, labels }) {
  const W = 640, H = 340, P = { l: 44, r: 16, t: 16, b: 40 };
  const xv = points.map(p => p.x), yv = points.map(p => p.y);
  const pad = 0.1;
  const x0 = Math.min(...xv) - pad, x1 = Math.max(...xv) + pad, y0 = Math.min(...yv) - pad, y1 = Math.max(...yv) + pad;
  const x = v => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r), y = v => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
  let g = '';
  const step = 0.25;
  for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) g += `<line y1="${P.t}" y2="${H - P.b}" x1="${x(v)}" x2="${x(v)}" class="grid"/><text x="${x(v)}" y="${H - P.b + 16}" class="tick" text-anchor="middle">${v.toFixed(2)}</text>`;
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${v.toFixed(2)}</text>`;
  g += `<text x="${(P.l + W - P.r) / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(labels.x)} →</text>`;
  g += `<text x="12" y="${(P.t + H - P.b) / 2}" class="axis" text-anchor="middle" transform="rotate(-90 12 ${(P.t + H - P.b) / 2})">${esc(labels.y)} →</text>`;
  const ordered = [...points].sort((a, b) => (a.color ? 1 : 0) - (b.color ? 1 : 0));
  for (const p of ordered) {
    g += `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="${p.color ? 6 : 4.5}" fill="${p.color || 'var(--muted-mark)'}" class="dot"/>`;
    if (p.color || p.label) g += `<text x="${x(p.x) + 9}" y="${y(p.y) + 4}" class="lbl${p.color ? ' strong' : ''}">${esc(p.name)}</text>`;
    g += `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="12" class="hit" data-tip="${esc(p.tip)}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(labels.aria)}">${g}</svg>`;
}

// Reliability diagram.
export function calibrationChart({ points, labels }) {
  const S = 300, P = 36;
  const s = v => P + v * (S - 2 * P), yv = v => S - P - v * (S - 2 * P);
  let g = '';
  for (let v = 0; v <= 1.0001; v += 0.25) {
    g += `<line x1="${P}" x2="${S - P}" y1="${yv(v)}" y2="${yv(v)}" class="grid"/><line y1="${P}" y2="${S - P}" x1="${s(v)}" x2="${s(v)}" class="grid"/>`;
    g += `<text x="${P - 6}" y="${yv(v) + 4}" class="tick" text-anchor="end">${Math.round(v * 100)}</text><text x="${s(v)}" y="${S - P + 16}" class="tick" text-anchor="middle">${Math.round(v * 100)}</text>`;
  }
  g += `<line x1="${s(0)}" y1="${yv(0)}" x2="${s(1)}" y2="${yv(1)}" class="ref"/>`;
  g += `<path d="M${points.map(p => `${s(p.pred)},${yv(p.obs)}`).join('L')}" class="line" stroke="var(--accent)"/>`;
  for (const p of points) {
    g += `<circle cx="${s(p.pred)}" cy="${yv(p.obs)}" r="5" fill="var(--accent)" class="dot"/>`;
    g += `<circle cx="${s(p.pred)}" cy="${yv(p.obs)}" r="13" class="hit" data-tip="${esc(labels.tip(p))}"/>`;
  }
  g += `<text x="${S / 2}" y="${S - 4}" class="axis" text-anchor="middle">${esc(labels.x)}</text>`;
  g += `<text x="10" y="${S / 2}" class="axis" text-anchor="middle" transform="rotate(-90 10 ${S / 2})">${esc(labels.y)}</text>`;
  return `<svg viewBox="0 0 ${S} ${S}" class="chart square" role="img" aria-label="${esc(labels.aria)}">${g}</svg>`;
}

// Home / draw / away probability bar (HTML), 2px surface gaps between segments.
export function probBar(p, { colors = ['var(--home)', 'var(--draw)', 'var(--away)'], names = [] } = {}) {
  const parts = [p.pH, p.pD, p.pA];
  return `<div class="pbar" role="img" aria-label="${names.map((n, i) => `${n} ${Math.round(parts[i] * 100)}%`).join(', ')}">${parts.map((v, i) =>
    `<span style="flex:${Math.max(v, 0.001)};background:${colors[i]}" data-tip="${esc(`${names[i] || ''}: <b>${Math.round(v * 100)}%</b>`)}"></span>`).join('')}</div>`;
}

// Delegated tooltip — one element for the whole page.
export function installTooltip() {
  const tip = document.createElement('div');
  tip.className = 'tip glass'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let cross = null;
  const hide = () => { tip.classList.remove('on'); cross?.remove(); cross = null; };
  const show = (el, cx, cy) => {
    tip.innerHTML = el.getAttribute('data-tip');
    tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    let left = cx + 14, top = cy - r.height - 12;
    if (left + r.width > innerWidth - 8) left = cx - r.width - 14;
    if (top < 8) top = cy + 18;
    tip.style.transform = `translate(${Math.max(8, left)}px, ${top}px)`;
    cross?.remove(); cross = null;
    const dx = el.getAttribute('data-x');
    if (dx != null && el.ownerSVGElement) {
      const svg = el.ownerSVGElement, ns = 'http://www.w3.org/2000/svg';
      cross = document.createElementNS(ns, 'line');
      cross.setAttribute('x1', dx); cross.setAttribute('x2', dx);
      cross.setAttribute('y1', el.getAttribute('y')); cross.setAttribute('y2', +el.getAttribute('y') + +el.getAttribute('height'));
      cross.setAttribute('class', 'cross');
      svg.insertBefore(cross, svg.firstChild);
    }
  };
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else if (tip.classList.contains('on')) hide();
  }, { passive: true });
  document.addEventListener('focusin', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); }
  });
  document.addEventListener('scroll', hide, { passive: true });
}
