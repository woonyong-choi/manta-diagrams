// Minimal public Obsidian DOM boundary for media fixtures. Product views are imported unchanged.
function make(tag, options = {}) {
  if (typeof options === 'string') options = {cls: options};
  const el = document.createElement(tag);
  if (options.cls) el.className = [options.cls].flat().join(' ');
  if (options.text !== undefined) el.append(options.text);
  for (const key of ['type', 'placeholder', 'title']) if (options[key]) el.setAttribute(key, options[key]);
  for (const [key, value] of Object.entries(options.attr || {})) if (value !== null) el.setAttribute(key, String(value));
  return el;
}
window.createEl = make;
window.createSvg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
Object.assign(HTMLElement.prototype, {
  createEl(tag, options, callback) {const el = make(tag, options); this.append(el); callback?.(el); return el;},
  createDiv(options) {return this.createEl('div', options);},
  createSpan(options) {return this.createEl('span', options);},
  empty() {this.replaceChildren();}, setText(text) {this.textContent = text;},
  addClass(...names) {this.classList.add(...names);}, removeClass(...names) {this.classList.remove(...names);},
  hasClass(name) {return this.classList.contains(name);}, toggleClass(name, enabled) {this.classList.toggle(name, enabled);},
  findAll(selector) {return [...this.querySelectorAll(selector)];},
});
export const layout = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
export function frame(host, at, caption) {
  const copy = host.cloneNode(true);
  // The video has an alt description. Nonvisual accessibility labels and closed
  // diagnostics have no pixels to record and must not confuse the layout checker.
  copy.querySelectorAll('.rcb__sr-only,.linked-graph-preview-status,details:not([open]) > :not(summary)').forEach(el => el.remove());
  const icons = {'chevron-left':'m15 18-6-6 6-6','chevron-right':'m9 18 6-6-6-6','chevron-down':'m6 9 6 6 6-6','x':'m6 6 12 12M6 18 18 6','arrow-left':'m12 5-7 7 7 7M5 12h14','arrow-right':'m12 5 7 7-7 7M5 12h14','arrow-up-right':'M7 17 17 7M7 7h10v10','search':'M21 21l-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0','maximize-2':'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7','calendar-check':'M8 2v4M16 2v4M3 10h18M3 5h18v16H3ZM9 16l2 2 4-4','calendar-days':'M8 2v4M16 2v4M3 10h18M3 5h18v16H3ZM8 14h1M12 14h1M16 14h1M8 18h1M12 18h1','file-text':'M14 2H5v20h14V7ZM14 2v6h5M8 13h8M8 17h6','settings':'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0','list-tree':'M4 3v14h4M4 8h4M11 6h9M11 15h9','git-branch':'M6 3v12M6 15c0-7 12-2 12-10M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0','plus':'M12 5v14M5 12h14','minus':'M5 12h14','scan':'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5'};
  for (const el of copy.querySelectorAll('[data-icon]')) if (icons[el.dataset.icon]) el.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[el.dataset.icon]}"/></svg>`;
  copy.removeAttribute('id');
  copy.querySelectorAll('input').forEach(input => input.setAttribute('value', input.value));
  return {at, caption, html: copy.outerHTML};
}
export function film(frames) {
  const surface = document.querySelector('.screen');
  surface.replaceChildren();
  const timeline = gsap.timeline({paused: true});
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], box = document.createElement('div');
    box.className = 'shot'; box.id = `shot-${i}`; box.innerHTML = f.html;
    box.setAttribute('data-layout-allow-overlap', '');
    box.style.opacity = i === 0 ? '1' : '0';
    surface.append(box);
    const caption = document.createElement('p');
    caption.textContent = f.caption; caption.className = 'caption';
    caption.setAttribute('data-layout-allow-overlap', '');
    caption.style.opacity = i === 0 ? '1' : '0';
    document.querySelector('.details').append(caption);
    if (i) {
      timeline.set(surface.children[i - 1], {opacity: 0}, f.at);
      timeline.set(document.querySelector('.details').children[i - 1], {opacity: 0}, f.at);
      timeline.set(box, {opacity: 1}, f.at);
      timeline.set(caption, {opacity: 1}, f.at);
    }
  }
  // The final 400 ms exactly repeat the opening state; GIF metadata loops forever.
  timeline.to({}, {duration: 6}, 0);
  window.__timelines = {'manta-intro': timeline};
  document.body.dataset.ready = 'true';
  document.body.dataset.frames = String(frames.length);
  document.body.dataset.loop = String(frames[0].html === frames.at(-1).html && frames[0].caption === frames.at(-1).caption);
  // Local review only; the renderer controls the paused timeline itself.
  if (new URLSearchParams(location.search).has('play')) timeline.repeat(-1).play();
}
