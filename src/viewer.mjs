import {renderDocument} from './document.mjs';

/** A disposable, read-only viewer shared by Obsidian and the public demo. */
export function mountViewer(root, source, {sanitize, dark = false, onError = () => {}}) {
  const controller = new AbortController();
  const {signal} = controller;
  let disposed = false, result, gesture, revision = 0, original = false;
  let view = {x: 0, y: 0, width: 800, height: 500};
  const id = 'manta-' + (++mountViewer.serial);
  root.classList.add('manta-reader', 'md-surface');
  root.dataset.theme = dark ? 'dark' : 'light';
  const make = (tag, className, text, parent = root) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  };
  const toolbar = make('div', 'manta-reader-tools');
  toolbar.setAttribute('aria-label', 'Diagram controls');
  const status = make('p', 'manta-reader-status', 'Rendering…');
  status.setAttribute('role', 'status');
  const stage = make('div', 'manta-reader-stage');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'Diagram. Arrow keys pan, plus and minus zoom, zero fits.');
  const details = make('details', 'manta-reader-source');
  make('summary', '', 'Mermaid source', details);
  const code = make('pre', '', '', details);
  make('code', '', source, code);
  const controls = [];
  const button = (label, action) => {
    const node = make('button', '', label, toolbar);
    node.type = 'button';
    node.addEventListener('click', action, {signal});
    controls.push(node);
    return node;
  };
  const paint = () => {
    stage.querySelector('svg')?.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  };
  const fit = (read = false) => {
    if (!result || !stage.clientWidth || !stage.clientHeight) return;
    const ratio = stage.clientWidth / stage.clientHeight;
    const width = read ? stage.clientWidth : Math.max(result.width, result.height * ratio);
    view = {x: (result.x || 0) + (result.width - width) / 2,
      y: (result.y || 0) + (result.height - width / ratio) / 2, width, height: width / ratio};
    paint();
  };
  const zoom = factor => {
    if (!result) return;
    const width = Math.max(120, Math.min(30000, view.width * factor));
    const height = width * stage.clientHeight / stage.clientWidth;
    view = {x: view.x + (view.width - width) / 2, y: view.y + (view.height - height) / 2, width, height};
    paint();
  };
  button('Fit', () => fit());
  button('Reading size', () => fit(true));
  button('Zoom in', () => zoom(0.8));
  button('Zoom out', () => zoom(1.25));
  const native = button('Standard Mermaid', () => {original = !original; void update();});
  native.hidden = !/^\s*%%\s*layout\s*:/m.test(source);
  button('Save SVG', () => {
    if (!result) return;
    const svg = stage.querySelector('svg')?.cloneNode(true);
    if (!svg) return;
    svg.setAttribute('viewBox', `${result.x || 0} ${result.y || 0} ${result.width} ${result.height}`);
    svg.setAttribute('width', String(result.width)); svg.setAttribute('height', String(result.height));
    const probe = document.createElement('span');
    probe.hidden = true; root.append(probe);
    for (const name of ['paper','ink','muted','soft','border','rule','surface','accent','tint','series1','series2','series3','series4','depth']) {
      probe.style.color = `var(--md-${name})`;
      svg.style.setProperty('--md-' + name, getComputedStyle(probe).color);
    }
    probe.remove();
    svg.style.colorScheme = dark ? 'dark' : 'light';
    svg.style.fontFamily = 'system-ui, sans-serif';
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], {type: 'image/svg+xml'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'manta-diagram.svg'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  async function update() {
    const ticket = ++revision;
    result = undefined; gesture = undefined; stage.replaceChildren();
    controls.forEach(node => {node.disabled = true;}); status.textContent = 'Rendering…';
    root.dataset.renderStatus = 'rendering';
    try {
      const next = await renderDocument(source, {id, dark, original});
      if (disposed || ticket !== revision) return;
      stage.replaceChildren(sanitize(next.svg));
      const svg = stage.querySelector('svg');
      if (!svg) throw new Error('No diagram was produced.');
      const text = element => [...element.querySelectorAll('text,foreignObject')].map(node => node.textContent).join('').replace(/\s+/g, '');
      const before = new DOMParser().parseFromString(next.svg, 'text/html').querySelector('svg');
      if (text(svg) !== text(before)) throw new Error('Some labels could not be displayed safely. Review the unchanged Mermaid source below.');
      svg.removeAttribute('style'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
      // Callbacks are never bound. Safe anchors remain ordinary user-activated links.
      stage.querySelectorAll('a').forEach(anchor => {
        const href = anchor.getAttribute('href') || anchor.getAttribute('xlink:href') || '';
        if (!/^(https?:|mailto:|obsidian:|#)/i.test(href)) {anchor.removeAttribute('href'); anchor.removeAttribute('xlink:href');}
        anchor.setAttribute('rel', 'noopener noreferrer');
      });
      result = next; fit(); controls.forEach(node => {node.disabled = false;});
      native.textContent = original ? 'Manta layout' : 'Standard Mermaid';
      native.hidden = next.engine !== 'Manta' && !original;
      status.textContent = next.notice || `${next.engine} · Drag to move. Scroll with Ctrl or ⌘ to zoom.`;
      root.dataset.renderStatus = 'ready';
    } catch (error) {
      if (disposed || ticket !== revision) return;
      stage.replaceChildren(); root.dataset.renderStatus = 'error';
      status.textContent = 'Unable to render this diagram. The source below is unchanged.';
      details.open = true; make('p', 'manta-reader-error', error instanceof Error ? error.message : String(error), stage);
      onError(error);
    }
  }
  stage.addEventListener('pointerdown', event => {
    if (!result || event.button !== 0 || event.target.closest('a')) return;
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, view: {...view}};
    stage.setPointerCapture(event.pointerId); stage.classList.add('is-dragging'); event.preventDefault();
  }, {signal});
  stage.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    view.x = gesture.view.x - (event.clientX - gesture.x) * gesture.view.width / stage.clientWidth;
    view.y = gesture.view.y - (event.clientY - gesture.y) * gesture.view.height / stage.clientHeight;
    paint();
  }, {signal});
  for (const event of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(event, () => {
    gesture = undefined; stage.classList.remove('is-dragging');
  }, {signal});
  stage.addEventListener('wheel', event => {
    if (!result || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault(); zoom(event.deltaY > 0 ? 1.1 : 1 / 1.1);
  }, {signal, passive: false});
  stage.addEventListener('keydown', event => {
    if (!result) return;
    const amount = view.width * 0.06;
    if (event.key === 'ArrowLeft') view.x -= amount;
    else if (event.key === 'ArrowRight') view.x += amount;
    else if (event.key === 'ArrowUp') view.y -= amount;
    else if (event.key === 'ArrowDown') view.y += amount;
    else if (event.key === '+' || event.key === '=') zoom(0.8);
    else if (event.key === '-') zoom(1.25);
    else if (event.key === '0') fit();
    else return;
    event.preventDefault(); paint();
  }, {signal});
  const observer = new ResizeObserver(() => {if (result) fit();});
  observer.observe(stage);
  void update();
  return () => {disposed = true; revision++; controller.abort(); observer.disconnect(); root.replaceChildren();};
}
mountViewer.serial = 0;
