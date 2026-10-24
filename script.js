'use strict';

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
      document.getElementById('copy-status').textContent = 'BibTeX copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById(button.dataset.copy));
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Text selected';
      document.getElementById('copy-status').textContent = 'Citation selected. Press Control+C or Command+C to copy.';
    }
    window.setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 2500);
  });
});

const modal = document.querySelector('#figure-dialog');
if (modal && typeof modal.showModal === 'function') {
  document.querySelectorAll('[data-zoom]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const image = link.querySelector('img');
      modal.querySelector('img').src = image.src;
      modal.querySelector('img').alt = image.alt;
      modal.showModal();
    });
  });
  modal.querySelector('button').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
}

const guideStates = [
  {title:'Identify the user', dialogue:'The user requests a flight change. Their identity has not been established.', result:'Ask for the user ID before looking up the reservation.', gate:'MUTATION GATE · CLOSED', node:0},
  {title:'Check the request against policy', dialogue:'The user has been identified and the reservation loaded. Eligibility still needs to be checked.', result:'Check fare eligibility and the requested flight before offering the change.', gate:'MUTATION GATE · CLOSED', node:2},
  {title:'Obtain explicit confirmation', dialogue:'The change is eligible and its details have been presented. The user has not yet confirmed.', result:'Ask the user to confirm the complete change summary before proceeding.', gate:'MUTATION GATE · CLOSED', node:3},
  {title:'Authorize the requested change', dialogue:'Identity, reservation details, eligibility, and explicit confirmation are grounded in the conversation.', result:'Recommend the change with the verified arguments, then check the tool result.', gate:'MUTATION GATE · OPEN', node:4}
];
const guardStates = [
  {title:'A required step is missing', dialogue:'The agent found a flight and proposed booking it. The conversation contains no insurance offer or explicit confirmation.', result:'Offer insurance and ask the user to confirm the complete booking summary before calling the booking tool.', gate:'BLOCK + REMEDIATION'},
  {title:'The prerequisites are satisfied', dialogue:'The conversation establishes the required details, records the insurance decision, and includes explicit confirmation.', result:'The proposed booking may proceed once the verifier finds every applicable policy requirement satisfied.', gate:'PASS'}
];
document.querySelectorAll('[data-demo]').forEach(demo => {
  const states = demo.dataset.demo === 'guide' ? guideStates : guardStates;
  demo.querySelectorAll('[data-state]').forEach(button => {
    button.addEventListener('click', () => {
      const state = states[Number(button.dataset.state)];
      demo.querySelectorAll('[data-state]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      for (const key of ['title', 'dialogue', 'result', 'gate']) demo.querySelector(`[data-output="${key}"]`).textContent = state[key];
      demo.querySelectorAll('[data-node]').forEach(node => {
        const current = Number(node.dataset.node) === state.node;
        node.classList.toggle('active', current);
        if (current) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
      });
    });
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -60% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
}

(function () {
  'use strict';
  const root = document.querySelector('[data-explorer="pcoreset"]');
  if (!root) return;

  // Three-class probability vectors sum to one. These fixed synthetic points
  // explain the acquisition rule; they are not samples or results from the paper.
  const initial = [[0.83, 0.10, 0.07], [0.65, 0.23, 0.12]];
  const points = [
    [0.88, 0.07, 0.05], [0.78, 0.16, 0.06], [0.75, 0.08, 0.17],
    [0.70, 0.20, 0.10], [0.64, 0.13, 0.23], [0.64, 0.28, 0.08],
    [0.09, 0.85, 0.06], [0.16, 0.78, 0.06], [0.07, 0.77, 0.16],
    [0.20, 0.67, 0.13], [0.12, 0.65, 0.23], [0.26, 0.66, 0.08],
    [0.05, 0.08, 0.87], [0.14, 0.08, 0.78], [0.07, 0.17, 0.76],
    [0.23, 0.11, 0.66], [0.10, 0.25, 0.65], [0.16, 0.19, 0.65],
    [0.47, 0.45, 0.08], [0.41, 0.48, 0.11], [0.55, 0.34, 0.11],
    [0.07, 0.48, 0.45], [0.12, 0.40, 0.48], [0.09, 0.57, 0.34],
    [0.48, 0.07, 0.45], [0.43, 0.15, 0.42], [0.56, 0.10, 0.34],
    [0.34, 0.34, 0.32], [0.28, 0.39, 0.33], [0.39, 0.27, 0.34],
    [0.25, 0.29, 0.46], [0.44, 0.31, 0.25], [0.30, 0.48, 0.22]
  ];
  const svgNS = 'http://www.w3.org/2000/svg';
  const plot = root.querySelector('[data-pcore-plot]');
  const chart = root.querySelector('[data-pcore-chart]');
  const svg = chart.querySelector('svg');
  const budgetInput = root.querySelector('#pcore-budget');
  const budgetOutput = root.querySelector('#pcore-budget-value');
  const methodButtons = [...root.querySelectorAll('[data-pcore-method]')];
  const stepButton = root.querySelector('[data-pcore-step]');
  const resetButton = root.querySelector('[data-pcore-reset]');
  const metrics = root.querySelector('[data-pcore-metrics]');
  const status = root.querySelector('[data-pcore-status]');
  let method = 'greedy';

  const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
  const nearest = (point, covered) => covered.reduce((best, candidate) => {
    const gap = distance(point, candidate);
    return gap < best.gap ? { point: candidate, gap } : best;
  }, { point: covered[0], gap: Infinity });
  const xy = point => [320 * point[0] + 100 * point[1] + 540 * point[2],
    30 * point[0] + 411 * point[1] + 411 * point[2]];

  // A seeded Fisher-Yates shuffle provides one reproducible random comparator.
  const randomOrder = points.map((_, index) => index);
  let seed = 2026;
  for (let index = randomOrder.length - 1; index > 0; index--) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const swap = Math.floor(seed / 4294967296 * (index + 1));
    [randomOrder[index], randomOrder[swap]] = [randomOrder[swap], randomOrder[index]];
  }

  const greedyOrder = [];
  const covered = initial.slice();
  while (greedyOrder.length < 12) {
    let bestIndex = -1;
    let bestGap = -1;
    points.forEach((point, index) => {
      if (greedyOrder.includes(index)) return;
      const gap = nearest(point, covered).gap;
      if (gap > bestGap) { bestIndex = index; bestGap = gap; }
    });
    greedyOrder.push(bestIndex);
    covered.push(points[bestIndex]);
  }

  function getCoverage(order, budget) {
    const selected = order.slice(0, budget);
    const centers = initial.concat(selected.map(index => points[index]));
    let largest = { gap: -1, index: -1, neighbor: initial[0] };
    points.forEach((point, index) => {
      if (selected.includes(index)) return;
      const closest = nearest(point, centers);
      if (closest.gap > largest.gap) {
        largest = { gap: closest.gap, index, neighbor: closest.point };
      }
    });
    return { selected, largest };
  }

  function add(tag, attributes, text) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    plot.appendChild(node);
    return node;
  }

  function render(announce) {
    const budget = Number(budgetInput.value);
    const greedy = getCoverage(greedyOrder, budget);
    const random = getCoverage(randomOrder, budget);
    const active = method === 'greedy' ? greedy : random;
    const policyName = method === 'greedy' ? 'PCoreSet' : 'Fixed random order';
    // Preserve the probability-space geometry while keeping labels legible at
    // phone widths. SVG units compensate for the rendered viewBox scale.
    const renderedWidth = svg.getBoundingClientRect().width || chart.clientWidth || 640;
    const inverseScale = 640 / renderedWidth;
    const labelFont = Math.max(16, 12 * inverseScale);
    const numberFont = Math.max(11, 10 * inverseScale);
    const selectedRadius = Math.max(11, 11 * inverseScale);
    budgetOutput.value = String(budget);
    budgetOutput.textContent = String(budget);
    stepButton.disabled = budget === Number(budgetInput.max);
    methodButtons.forEach(button => button.setAttribute('aria-pressed',
      String(button.dataset.pcoreMethod === method)));
    plot.replaceChildren();

    add('polygon', { points: '320,30 100,411 540,411', fill: 'var(--soft)',
      stroke: 'var(--line)', 'stroke-width': 2 });
    const vertices = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    [0.25, 0.5, 0.75].forEach(level => {
      vertices.forEach((_, axis) => {
        const first = [0, 0, 0];
        const second = [0, 0, 0];
        first[axis] = second[axis] = level;
        first[(axis + 1) % 3] = 1 - level;
        second[(axis + 2) % 3] = 1 - level;
        const [x1, y1] = xy(first);
        const [x2, y2] = xy(second);
        add('line', { x1, y1, x2, y2, stroke: 'var(--line)', 'stroke-width': 1 });
      });
    });
    [['Class 1', 320, Math.max(17, labelFont)], ['Class 2', 100, 440], ['Class 3', 540, 440]].forEach(([label, x, y]) => {
      add('text', { x, y, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': labelFont }, label);
    });
    const [x1, y1] = xy(points[active.largest.index]);
    const [x2, y2] = xy(active.largest.neighbor);
    add('line', { x1, y1, x2, y2, stroke: 'var(--ink)', 'stroke-width': 2,
      'stroke-dasharray': '5 5' });
    points.forEach((point, index) => {
      if (active.selected.includes(index)) return;
      const [cx, cy] = xy(point);
      const circle = add('circle', { cx, cy, r: 5, fill: 'var(--paper)',
        stroke: 'var(--muted)', 'stroke-width': 1.5 });
      const title = document.createElementNS(svgNS, 'title');
      title.textContent = 'Candidate probabilities: ' + point.map(value => value.toFixed(2)).join(', ');
      circle.appendChild(title);
    });
    initial.forEach(point => {
      const [x, y] = xy(point);
      add('rect', { x: x - 6, y: y - 6, width: 12, height: 12,
        fill: 'var(--ink)', stroke: 'var(--paper)', 'stroke-width': 2 });
    });
    active.selected.forEach((index, rank) => {
      const [cx, cy] = xy(points[index]);
      add('circle', { cx, cy, r: selectedRadius, fill: 'var(--accent)',
        stroke: 'var(--paper)', 'stroke-width': 2 });
      add('text', { x: cx, y: cy + 0.5, fill: 'var(--paper)', 'font-size': numberFont,
        'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, rank + 1);
    });
    metrics.textContent = 'Largest remaining gap (probability L₂ distance) · PCoreSet: ' +
      greedy.largest.gap.toFixed(3) + ' · Fixed random order: ' + random.largest.gap.toFixed(3);
    if (announce !== false) {
      status.textContent = policyName + ': ' + budget + ' new labels selected, plus ' + initial.length +
        ' initially labeled examples. The largest remaining gap is ' + active.largest.gap.toFixed(3) +
        '. The dashed segment connects that candidate to its nearest covered example.';
    }
    root.querySelector('#pcore-chart-desc').textContent = status.textContent +
      ' Squares indicate initial labels, numbered circles show the selected order, and open circles are unlabeled candidates.';
  }

  root.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
  methodButtons.forEach(button => button.addEventListener('click', () => {
    method = button.dataset.pcoreMethod;
    render();
  }));
  budgetInput.addEventListener('input', render);
  stepButton.addEventListener('click', () => {
    budgetInput.value = String(Math.min(Number(budgetInput.max), Number(budgetInput.value) + 1));
    render();
  });
  resetButton.addEventListener('click', () => {
    method = 'greedy';
    budgetInput.value = '4';
    render();
  });
  chart.hidden = false;
  render();
  if ('ResizeObserver' in window) {
    let previousWidth = 0;
    new ResizeObserver(() => {
      const width = Math.round(svg.getBoundingClientRect().width);
      if (width === previousWidth) return;
      previousWidth = width;
      render(false);
    }).observe(chart);
  } else {
    window.addEventListener('resize', () => render(false));
  }
}());
