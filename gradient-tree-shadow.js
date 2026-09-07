/* Dappled foliage: seeded projected branches, layered defocus and fine texture.
   The same renderer is used for thumbnails, live preview and PNG/ZIP exports. */
(() => {
  const KEY = 'treeShadow';
  const defaults = { density: 52, size: 100, softness: 58, depth: 62, direction: -32, breeze: 12, quiet: 72, grain: 18 };
  const presets = [
    { name: '疏叶透光', values: defaults },
    { name: '斜照枝影', values: { ...defaults, density: 55, size: 105, softness: 24, depth: 82, direction: -44, breeze: 4, quiet: 65 } },
    { name: '柔焦斑驳', values: { ...defaults, density: 64, size: 145, softness: 82, depth: 58, direction: -18, breeze: 28, quiet: 78 } },
  ];
  let settings = { ...defaults };
  let selectedPreset = 0;
  let seed = 314159;
  let raf = 0;
  const cache = new Map();
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v, 0, 255))).join(',')},${a})`;
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  templates.push([KEY, '斑驳树影']);
  fieldDefaults[KEY] = [[.12, .18], [.82, .18], [.35, .65], [.9, .86]];
  fieldProfiles[KEY] = { nodes: fieldDefaults[KEY].map(p => [...p]), phase: .4, warp: .1, mode: 0 };
  templateControlDefaults[KEY] = templateControlDefaults.soft.map(p => [...p]);
  Object.values(state.sceneTemplateControls).forEach(scene => { scene[KEY] = templateControlDefaults[KEY].map(p => [...p]); });

  const style = document.createElement('style');
  style.textContent = `
    .template-grid{grid-template-columns:repeat(6,minmax(68px,1fr))}
    .tree-panel[hidden]{display:none!important}
    .tree-note{font-size:10px;line-height:1.7;color:#8d919b;margin:0 0 14px}
    .tree-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:18px}
    .tree-presets button{background:#191b22;color:#aeb3c0;border:1px solid #343741;border-radius:7px;font-size:10px;padding:8px 3px;cursor:pointer}
    .tree-presets button.active{background:#f2f5fa;color:#15171d;border-color:#f2f5fa}
    .tree-panel .field{margin-bottom:17px}.tree-panel .field-head{font-size:11px}
    .tree-ends{display:flex;justify-content:space-between;font-size:9px;color:#747985;margin-top:4px}
    body[data-tree-active="true"] #preference-lab{display:none!important}
    body[data-tree-active="true"] [data-color-anchor],body[data-tree-active="true"] [data-field-anchor],body[data-tree-active="true"] .curve-anchor{display:none!important}
    body[data-tree-active="true"] #curve-toggle,body[data-tree-active="true"] .toolbar-right>.meta{display:none!important}
    body[data-tree-active="true"] .tree-shared-duplicate{display:none!important}
    @media(max-width:900px){.template-grid{grid-template-columns:repeat(3,minmax(68px,1fr))}}
  `;
  document.head.append(style);
  const panel = document.createElement('div');
  panel.className = 'group tree-panel';
  panel.hidden = true;
  panel.innerHTML = '<h3>树影细节</h3><p class="tree-note">柔焦树影叠在品牌色上。留白越多，文案附近的树影越轻。</p><div class="tree-presets"></div><div class="tree-fields"></div><button class="button" type="button" id="tree-shuffle">换一组树影</button>';
  const sharedGroup = [...document.querySelectorAll('.side > .group')].find(group => group.querySelector('h3')?.textContent === '形态与质感');
  sharedGroup.before(panel);
  ['scale', 'angle', 'blur', 'noise', 'grainSize'].forEach(id => document.getElementById(id).closest('.field').classList.add('tree-shared-duplicate'));
  sharedGroup.querySelector('.help')?.classList.add('tree-shared-duplicate');
  const controls = [
    ['density', '树影疏密', 15, 100, 1, ['疏朗', '繁密']],
    ['size', '树影大小', 55, 180, 1, ['细碎', '舒展']],
    ['softness', '边缘柔焦', 0, 100, 1, ['清晰', '朦胧']],
    ['depth', '树影深浅', 10, 95, 1, ['轻透', '浓郁']],
    ['direction', '光照方向', -90, 90, 1, ['向左倾斜', '向右倾斜']],
    ['breeze', '风拂拖影', 0, 65, 1, ['静止', '轻拂']],
    ['quiet', '文字区留白', 0, 100, 1, ['保留纹理', '柔和留白']],
    ['grain', '细颗粒质感', 0, 45, 1, ['光滑', '胶片感']],
  ];
  for (const [key, label, min, max, step, ends] of controls) {
    const field = document.createElement('div'); field.className = 'field';
    field.innerHTML = `<div class="field-head"><label for="tree-${key}">${label}</label><b data-tree-value="${key}"></b></div><input type="range" id="tree-${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}"><div class="tree-ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>`;
    field.querySelector('input').addEventListener('input', event => {
      settings[key] = Number(event.target.value); selectedPreset = -1; syncPanel();
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
    });
    field.querySelector('input').addEventListener('change', () => updateTreeThumbnail());
    panel.querySelector('.tree-fields').append(field);
  }
  presets.forEach((preset, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = preset.name;
    button.addEventListener('click', () => { settings = { ...preset.values }; selectedPreset = index; syncPanel(); render(); updateTreeThumbnail(); });
    panel.querySelector('.tree-presets').append(button);
  });
  function syncPanel() {
    for (const [key] of controls) {
      panel.querySelector(`#tree-${key}`).value = settings[key];
      panel.querySelector(`[data-tree-value="${key}"]`).textContent = `${settings[key]}${key === 'direction' ? '°' : '%'}`;
    }
    [...panel.querySelectorAll('.tree-presets button')].forEach((button, index) => button.classList.toggle('active', index === selectedPreset));
  }

  function foliageMask(w, h, layer) {
    const mask = makeCanvas(w, h), c = mask.getContext('2d');
    const random = rng(seed + layer * 9767);
    const unit = Math.min(w, h);
    const size = settings.size / 100;
    const density = settings.density / 100;
    c.strokeStyle = '#000'; c.fillStyle = '#000'; c.lineCap = 'round';
    c.translate(w * .5, h * .5);
    c.rotate(settings.direction * Math.PI / 180);
    c.translate(-w * .5, -h * .5);
    function leaf(x, y, length, angle, alpha) {
      c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha = alpha;
      const breadth = length * (.26 + random() * .18);
      c.beginPath(); c.moveTo(-length * .5, 0);
      c.bezierCurveTo(-length * .18, -breadth, length * .25, -breadth * .8, length * .5, 0);
      c.bezierCurveTo(length * .2, breadth * .5, -length * .3, breadth * .9, -length * .5, 0);
      c.fill(); c.restore();
    }
    const branchCount = 3 + Math.ceil(w / h) + layer;
    for (let branch = 0; branch < branchCount; branch++) {
      const side = branch % 2 ? -1 : 1;
      const start = [side > 0 ? -w * .08 : w * 1.08, h * (-.15 + random() * 1.3)];
      const length = unit * (.60 + random() * .75) * Math.sqrt(size);
      const angle = (side > 0 ? -.35 : Math.PI + .35) + (random() - .5) * 1.05;
      const bend = (random() - .5) * unit * .28;
      const end = [start[0] + Math.cos(angle) * length, start[1] + Math.sin(angle) * length];
      c.globalAlpha = .5 + random() * .3;
      c.lineWidth = unit * (.008 + random() * .009) * size * (1 - layer * .18);
      c.beginPath(); c.moveTo(...start);
      c.quadraticCurveTo((start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + bend, ...end); c.stroke();
      const twigs = 4 + Math.round(density * 7);
      for (let twig = 0; twig < twigs; twig++) {
        const t = .12 + twig / twigs * .80;
        const x = start[0] + (end[0] - start[0]) * t;
        const y = start[1] + (end[1] - start[1]) * t + 2 * (1 - t) * t * bend;
        const twigAngle = angle + (twig % 2 ? 1 : -1) * (.45 + random() * .65);
        const reach = unit * (.10 + random() * .22) * size;
        const tx = x + Math.cos(twigAngle) * reach, ty = y + Math.sin(twigAngle) * reach;
        c.lineWidth = unit * .0035 * size;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + tx) / 2, (y + ty) / 2 + bend * .15, tx, ty); c.stroke();
        const leaves = 2 + Math.round(density * 7);
        for (let n = 0; n < leaves; n++) {
          const p = .20 + n / leaves * .85;
          const spread = unit * .035 * size;
          const lx = x + (tx - x) * p + (random() - .5) * spread;
          const ly = y + (ty - y) * p + (random() - .5) * spread;
          leaf(lx, ly, unit * (.035 + random() * .08) * size, twigAngle + (n % 2 ? 1 : -1) * (.4 + random() * .7), .55 + random() * .45);
        }
      }
    }
    return mask;
  }

  // Independent, elongated light gaps share the canopy direction, not its leaf paths.
  // A continuous field avoids both a radial hotspot and repeated orange leaf stamps.
  function paintCanopyLight(c, w, h, palette, isDream, baseLight, copyArea) {
    const fw = Math.max(2, Math.round(480 * w / Math.max(w, h)));
    const fh = Math.max(2, Math.round(480 * h / Math.max(w, h)));
    const field = makeCanvas(fw, fh), fc = field.getContext('2d');
    const pixels = fc.createImageData(fw, fh);
    const random = rng(seed ^ 0x137ac);
    const lattice = Array.from({length: 4096}, () => random());
    const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
    function noise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
      const at = (a, b) => lattice[((a * 127 + b * 311) % 4096 + 4096) % 4096];
      return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v)
        + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
    }
    const angle = (settings.direction - 18) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const unit = Math.min(fw, fh), size = Math.sqrt(settings.size / 100);
    const accent = clamp(state.accent / 100);
    const cream = mix(palette[3], palette[4], isDream ? .10 : .08);
    const warm = isDream ? mix(mix(palette[4], palette[6], .22), palette[3], .36) : mix(palette[4], palette[3], .18);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const px = (x - fw * .5) / unit, py = (y - fh * .5) / unit;
      const u = (px * cos + py * sin) / size, v = (-px * sin + py * cos) / size;
      const bend = (noise(u * 1.6 + 10, v * 1.6 + 20) - .5) * .85;
      const broad = noise(u * 2.1 + 37, v * 4.6 + bend + 43);
      const detail = noise(u * 4.8 + 75, v * 9.2 + bend * 2 + 13);
      const light = broad * .8 + detail * .2;
      const dx = (x / fw - copyArea[0] - copyArea[2] * .5) / Math.max(.24, copyArea[2] * .72);
      const dy = (y / fh - copyArea[1] - copyArea[3] * .5) / Math.max(.26, copyArea[3] * .85);
      const copyCalm = 1 - Math.exp(-(dx * dx + dy * dy) * 2) * settings.quiet / 100 * .65;
      const veil = smooth(.28, .73, light);
      const warmth = smooth(.43, .91, light) * copyCalm;
      // A pale transition keeps orange/cyan intersections clean, without a white rim.
      let color = mix(baseLight, cream, veil * .94);
      color = mix(color, warm, warmth * .70);
      const i = (y * fw + x) * 4;
      pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2]; pixels.data[i + 3] = 255;
    }
    fc.putImageData(pixels, 0, 0);
    c.save(); c.globalAlpha = accent;
    c.filter = `blur(${Math.min(w, h) * .012}px)`;
    c.drawImage(field, -w * .015, -h * .015, w * 1.03, h * 1.03); c.restore();
  }

  function renderTree(target, sceneKey, outputScale) {
    const scene = scenes[sceneKey];
    const w = Math.max(1, Math.round(scene.size[0] * outputScale));
    const h = Math.max(1, Math.round(scene.size[1] * outputScale));
    const key = JSON.stringify([w, h, sceneKey, state.brand, state.sat, state.accent, settings, seed]);
    const out = target.getContext('2d', { willReadFrequently: target === canvas });
    target.width = w; target.height = h;
    if (cache.has(key)) { out.drawImage(cache.get(key), 0, 0); return; }
    const result = makeCanvas(w, h), c = result.getContext('2d');
    const palette = brands[state.brand].colors.map(hex);
    const isDream = state.brand === 'dreamina';
    const white = palette[3], main = palette[0], dark = isDream ? palette[7] : palette[0];
    const light = mix(main, white, isDream ? .46 : .58);
    const base = c.createLinearGradient(0, 0, w * .85, h);
    base.addColorStop(0, mixCSS(light, main, .15));
    base.addColorStop(.55, rgb(light));
    base.addColorStop(1, rgb(mix(light, white, .25)));
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    function mixCSS(a, b, t) { return rgb(mix(a, b, t)); }
    paintCanopyLight(c, w, h, palette, isDream, light, scene.copy);

    const maskScale = Math.min(1, 1500 / Math.max(w, h));
    const mw = Math.max(1, Math.round(w * maskScale)), mh = Math.max(1, Math.round(h * maskScale));
    const combined = makeCanvas(mw, mh), mc = combined.getContext('2d');
    for (let layer = 2; layer >= 0; layer--) {
      const raw = foliageMask(mw, mh, layer);
      mc.filter = `blur(${Math.min(mw, mh) * (.0015 + settings.softness / 100 * .012 + layer * .014)}px)`;
      const trail = settings.breeze / 100 * Math.min(mw, mh) * .20;
      const steps = trail > 1 ? 7 : 1;
      for (let step = 0; step < steps; step++) {
        mc.globalAlpha = [.76, .36, .20][layer] / steps;
        mc.drawImage(raw, (step / Math.max(1, steps - 1) - .5) * trail, 0);
      }
    }
    mc.filter = 'none'; mc.globalAlpha = 1;
    // Attenuate shadows smoothly over the scene's actual copy area.
    const safeArea = scene.copy;
    mc.globalCompositeOperation = 'destination-out';
    mc.save();
    mc.translate((safeArea[0] + safeArea[2] * .5) * mw, (safeArea[1] + safeArea[3] * .5) * mh);
    mc.scale(Math.max(.24, safeArea[2] * .72) * mw, Math.max(.26, safeArea[3] * .85) * mh);
    const quiet = mc.createRadialGradient(0, 0, 0, 0, 0, 1);
    quiet.addColorStop(0, `rgba(0,0,0,${settings.quiet / 100 * .98})`);
    quiet.addColorStop(.5, `rgba(0,0,0,${settings.quiet / 100 * .90})`);
    quiet.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = quiet; mc.fillRect(-1, -1, 2, 2); mc.restore();
    mc.globalCompositeOperation = 'source-in';
    const shadowColor = mix(dark, main, isDream ? .12 : .03);
    mc.fillStyle = rgb(shadowColor); mc.fillRect(0, 0, mw, mh);
    c.globalAlpha = settings.depth / 100;
    c.drawImage(combined, 0, 0, w, h); c.globalAlpha = 1;

    // Fine neutral grain retains the hue, with grain scale matched to export.
    const pixels = c.getImageData(0, 0, w, h), data = pixels.data;
    const random = rng(seed ^ 0x51a2);
    const sat = clamp(state.sat / 166, .4, 1.15);
    const amount = settings.grain / 45 * 16;
    for (let i = 0; i < data.length; i += 4) {
      const luma = data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722;
      const noise = (random() + random() - 1) * amount;
      for (let channel = 0; channel < 3; channel++) data[i + channel] = clamp(luma + (data[i + channel] - luma) * sat + noise, 0, 255);
    }
    c.putImageData(pixels, 0, 0);
    cache.set(key, result); if (cache.size > 5) cache.delete(cache.keys().next().value);
    out.drawImage(result, 0, 0);
  }

  const previousRender = render;
  render = function(target = canvas, sceneKey = state.scene, outputScale = 1) {
    if (state.template !== KEY) return previousRender(target, sceneKey, outputScale);
    if (target === canvas && outputScale === 1) outputScale = 2;
    renderTree(target, sceneKey, outputScale);
    if (target === canvas) updateContrast();
  };
  function updateTreeThumbnail() {
    const thumb = document.querySelector(`[data-template="${KEY}"] .thumb`);
    if (!thumb) return;
    const c = makeCanvas(128, 77); renderTree(c, 'pc', .32);
    thumb.style.backgroundImage = `url(${c.toDataURL('image/jpeg', .85)})`;
  }
  function syncVisibility() {
    const active = state.template === KEY;
    document.body.dataset.treeActive = String(active); panel.hidden = !active;
    document.querySelector('.templates .section-head span').textContent = `${templates.length} 种背景模板`;
    const button = document.querySelector(`[data-template="${KEY}"]`);
    if (button) button.onclick = () => { state.template = KEY; syncVisibility(); fit(); applyCopy(); render(); };
    if (active) { document.querySelectorAll('.template').forEach(el => el.classList.toggle('active', el.dataset.template === KEY)); }
  }
  const oldPaintUI = paintUI;
  paintUI = function() { oldPaintUI(); syncVisibility(); };
  const oldRandom = document.getElementById('random').onclick;
  function shuffle() { seed = Math.floor(Math.random() * 1e9); render(); updateTreeThumbnail(); toast('已换一组斑驳树影'); }
  document.getElementById('random').onclick = event => state.template === KEY ? shuffle() : oldRandom(event);
  panel.querySelector('#tree-shuffle').onclick = shuffle;
  const oldReset = fieldReset.onclick;
  fieldReset.onclick = event => {
    if (state.template !== KEY) return oldReset(event);
    settings = { ...defaults }; selectedPreset = 0; seed = 314159; syncPanel(); render(); updateTreeThumbnail();
    toast('已恢复树影默认效果');
  };
  document.getElementById('templates').addEventListener('click', () => syncVisibility());
  document.getElementById('brands').addEventListener('click', () => { syncVisibility(); updateTreeThumbnail(); });
  const button = document.createElement('button'); button.className = 'template'; button.dataset.template = KEY;
  button.innerHTML = '<div class="thumb"></div><span>斑驳树影</span>';
  document.getElementById('templates').append(button);
  syncPanel(); syncVisibility(); updateTreeThumbnail();
  if (new URLSearchParams(location.search).get('template') === KEY) {
    state.template = KEY; syncVisibility(); fit(); applyCopy(); render();
  }
})();
