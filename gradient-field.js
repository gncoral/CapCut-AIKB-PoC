const legacyRender = render;
const fieldCanvas = document.createElement('canvas');
const fieldGL = fieldCanvas.getContext('webgl', {
  antialias: false,
  alpha: false,
  preserveDrawingBuffer: true,
});

const fieldDefaults = {
  soft: [[.12, .18], [.74, .16], [.36, .68], [.88, .82]],
  diffuse: [[.08, .72], [.68, .18], [.42, .52], [.92, .66]],
  horizon: [[.12, .22], [.82, .28], [.46, .62], [.72, .90]],
  halo: [[.16, .72], [.76, .20], [.48, .46], [.88, .78]],
  fold: [[.08, .28], [.72, .14], [.38, .76], [.92, .62]],
  focus: [[.10, .18], [.82, .72], [.48, .48], [.88, .18]],
  ripple: [[.08, .70], [.74, .26], [.38, .46], [.92, .82]],
  prism: [[.10, .16], [.72, .74], [.42, .42], [.90, .20]],
  bloom: [[.10, .18], [.88, .28], [.70, .52], [.28, .70]],
  sky: [[.14, .16], [.78, .13], [.46, .58], [.82, .88]],
  cloud: [[.12, .30], [.82, .22], [.48, .48], [.95, .86]],
  aurora: [[.14, .22], [.55, .16], [.42, .65], [.88, .72]],
};
const fieldProfiles = Object.fromEntries(
  Object.entries(fieldDefaults).map(([key, nodes], index) => [
    key,
    {
      nodes: nodes.map(node => [...node]),
      phase: .13 + index * .113,
      warp: .12 + (index % 3) * .025,
      mode: index,
    },
  ]),
);
const fieldRandomRules = {
  bloom: { jitterX: .14, jitterY: .13, warp: [.15, .23] },
  sky: { jitterX: .12, jitterY: .055, warp: [.04, .085] },
  cloud: { jitterX: .13, jitterY: .10, warp: [.13, .22] },
  aurora: { jitterX: .075, jitterY: .12, warp: [.08, .15] },
};
let fieldProgram = null;
let fieldDragging = false;
let fieldMotion = 0;
const fieldAnchorElements = () => $$('[data-field-anchor], [data-color-anchor]');

const fieldVertex = `
attribute vec2 p;
varying vec2 v;
void main() {
  v = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`;

const fieldFragment = `
precision highp float;
varying vec2 v;
uniform vec2 res;
uniform vec2 n0;
uniform vec2 n1;
uniform vec2 n2;
uniform vec2 n3;
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform vec3 c4;
uniform vec3 c5;
uniform vec3 c6;
uniform vec3 c7;
uniform float phase;
uniform float warp;
uniform float softness;
uniform float saturation;
uniform float accent;
uniform float grain;
uniform float angle;
uniform float scale;
uniform float mode;
uniform float dreamina;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(hash(i), hash(i + vec2(1., 0.)), f.x),
    mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float value = 0.;
  float amplitude = .5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 1.93 + vec2(5.2, 8.3);
    amplitude *= .5;
  }
  return value;
}
float influence(vec2 p, vec2 center, float aspect, float radius) {
  vec2 d = p - center;
  d.x *= mix(1., aspect, .16);
  return exp(-dot(d, d) / radius);
}
vec3 toLinear(vec3 value) {
  return mix(value / 12.92, pow((value + .055) / 1.055, vec3(2.4)), step(vec3(.04045), value));
}
vec3 toSrgb(vec3 value) {
  return mix(value * 12.92, 1.055 * pow(max(value, 0.), vec3(1. / 2.4)) - .055, step(vec3(.0031308), value));
}
void main() {
  vec2 uv = vec2(v.x, 1. - v.y);
  float aspect = res.x / max(res.y, 1.);
  float cs = cos(angle);
  float sn = sin(angle);
  vec2 q = uv - .5;
  q = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs) / max(.65, scale) + .5;

  float broad = fbm(q * .82 + vec2(phase * 4.7, 2.3));
  float broad2 = fbm(q.yx * .67 + vec2(7.1, phase * 3.9));
  vec2 drift = vec2(broad - .5, broad2 - .5) * warp;
  if (mode > .5 && mode < 1.5) drift += vec2(sin((q.y + phase) * 3.14159), cos((q.x - phase) * 3.14159)) * .035;
  if (mode > 1.5 && mode < 2.5) drift.y += (q.x - .5) * .075;
  if (mode > 2.5 && mode < 3.5) drift += vec2(q.y - .5, .5 - q.x) * .08;
  if (mode > 3.5 && mode < 4.5) drift.x += sin((q.y + phase) * 4.2) * .055;
  if (mode > 4.5 && mode < 5.5) drift += normalize(vec2(.001) + q - .5) * (broad - .5) * .08;
  if (mode > 5.5 && mode < 6.5) drift.y += sin((q.x * 1.4 + phase) * 5.1) * .045;
  if (mode > 6.5 && mode < 7.5) drift.x += (q.y - .5) * .105;
  if (mode > 7.5 && mode < 8.5) {
    drift += vec2(broad - .5, broad2 - .5) * .15;
    drift.x += sin(q.y * 3.4 + phase * 6.28318) * .045;
    drift.y += cos(q.x * 2.6 - phase * 4.) * .032;
  }
  if (mode > 8.5 && mode < 9.5) {
    drift.y += sin(q.x * 4.2 + phase * 6.28318) * .028;
    drift.x += (broad2 - .5) * .035;
  }
  if (mode > 9.5 && mode < 10.5) drift += vec2(broad - .5, broad2 - .5) * .16;
  if (mode > 10.5) {
    drift.x += sin(q.y * 7.2 + phase * 6.28318) * .075;
    drift.y += cos(q.x * 3.4 - phase * 3.) * .025;
  }
  float flowTime = phase * 6.28318;
  drift.x += (
    sin(q.y * 3.2 + flowTime) * .052 +
    sin(q.y * 6.4 - flowTime * .61) * .018
  ) * mix(.62, 1., dreamina);
  drift.y += (
    cos(q.x * 2.5 - flowTime * .72) * .034 +
    sin((q.x + q.y) * 4.1 + flowTime * .43) * .014
  ) * mix(.58, 1., dreamina);
  q += drift;

  float radius = mix(.16, .42, softness);
  float w0 = influence(q, n0, aspect, radius * mix(1., 1.08, dreamina)) * mix(1.32, 1.12, dreamina) + mix(.025, .026, dreamina);
  float w1 = influence(q, n1, aspect, radius * mix(1.08, 1.22, dreamina)) * mix(1.24, 1.48, dreamina) + mix(.03, .04, dreamina);
  float w2 = influence(q, n2, aspect, radius * mix(1.12, 1.22, dreamina)) * mix(.58, .94, dreamina) + mix(.006, .018, dreamina);
  float w3 = influence(q, n3, aspect, radius * mix(.96, .92, dreamina)) * mix(mix(.04, 1.22, accent), mix(.035, 1.16, accent), dreamina);
  float w4 = influence(q, n3 + vec2(.035, .11), aspect, radius * .88) * accent * .86 * dreamina;
  float w5 = 0.;
  float w6 = 0.;
  float w7 = 0.;
  float whiteVeil = smoothstep(.48, .78, broad * .62 + broad2 * .38) * .24 * dreamina;
  w2 += whiteVeil;

  if (mode > 7.5 && mode < 8.5) {
    float floralWash = smoothstep(.40, .72, broad * .64 + broad2 * .36);
    float paleWash = 1. - abs(broad - .5) * 2.;
    w0 += (1. - floralWash) * .12;
    w1 += (1. - floralWash) * .08;
    w2 += paleWash * .32;
    w3 += floralWash * .38 * accent;
    w4 += floralWash * .12 * dreamina;
    w5 += smoothstep(.42, .70, broad2 * .68 + broad * .32) * .64;
  }
  if (mode > 8.5 && mode < 9.5) {
    float horizon = exp(-pow(q.y - .62, 2.) / .035);
    float lowerSky = smoothstep(.50, 1., q.y);
    w0 += (1. - smoothstep(.08, .82, q.y)) * .42;
    w1 += (1. - smoothstep(.18, .72, q.y)) * .34;
    w2 += horizon * .92;
    w3 += lowerSky * .48;
    w4 += smoothstep(.66, 1., q.y) * .42 * dreamina;
  }
  if (mode > 9.5 && mode < 10.5) {
    float cloudMap = smoothstep(.48, .72, broad * .62 + broad2 * .38);
    w0 += (1. - cloudMap) * .28;
    w1 += (1. - cloudMap) * .18;
    w2 += cloudMap * .96;
  }
  if (mode > 10.5) {
    float ribbon = pow(.5 + .5 * sin(q.x * 11. + broad * 4. + phase * 6.28318), 4.);
    w1 += ribbon * .78;
    w2 += ribbon * .24;
    w4 += ribbon * smoothstep(.48, 1., q.y) * .26 * dreamina;
  }

  float pippit = 1. - dreamina;
  float handleFlow =
    (n0.y - .18) * influence(q, n0, aspect, radius * .78) +
    (n1.y - .16) * influence(q, n1, aspect, radius * .78) +
    (n2.y - .68) * influence(q, n2, aspect, radius * .82) +
    (n3.y - .82) * influence(q, n3, aspect, radius * .82);
  float purpleBoundary = .47 +
    sin(q.x * 2.7 + broad * 1.8 + phase * .72) * .085 -
    (q.x - .5) * .055 +
    handleFlow * .82;
  float purpleFloor = smoothstep(purpleBoundary - .14, purpleBoundary + .19, q.y);
  float paleCap = 1. - smoothstep(purpleBoundary - .16, purpleBoundary + .11, q.y);
  float lavenderRidge = exp(-pow(q.y - purpleBoundary, 2.) / .052);
  float cyanPocket = influence(
    q,
    mix(
      vec2(.83 + sin(phase * 2.1) * .018, .18 + cos(phase * 1.7) * .014),
      n1,
      .42
    ),
    aspect,
    radius * .54
  );
  w0 += purpleFloor * (1.02 + smoothstep(.54, 1., q.y) * .48) * pippit;
  w1 += (purpleFloor * .66 + lavenderRidge * .52) * pippit;
  w2 += paleCap * 1.62 * pippit;
  w3 += (lavenderRidge * .92 + paleCap * .24) * pippit;
  w4 += cyanPocket * smoothstep(.34, .68, q.x) * .64 * pippit;
  w5 += paleCap * .34 * pippit;

  float cool = w0 + w1;
  float warm = w3 + w4;
  float boundary = sqrt(max(0., cool * warm));
  float balance = min(cool, warm) / max(.001, max(cool, warm));
  float separationHalo = smoothstep(.14, .72, balance) *
    smoothstep(.025, .28, boundary) * dreamina;
  float separationCore = smoothstep(.54, .92, balance) *
    smoothstep(.08, .38, boundary) * dreamina;
  float separation = separationHalo * .58 + separationCore * .42;
  vec2 blueNode = mix(n0, n1, .46) + vec2(-.08, -.12);
  float blueField = influence(q, blueNode, aspect, radius * .92);
  float blueDepth = (sqrt(max(0., w0 * w1)) * .42 + blueField * .78) *
    (1. - separation * .88);
  w6 += blueDepth * dreamina;
  vec2 deepBlueNode = mix(n0, n1, .38) + vec2(-.18, -.16);
  float deepBlueField = influence(q, deepBlueNode, aspect, radius * .82);
  w7 += deepBlueField * .76 * dreamina * (1. - separation * .92);
  w2 += boundary * .15 + separationHalo * .46 + separationCore * .54;
  w0 *= 1. - separationCore * .16;
  w1 *= 1. - separationCore * .16;
  w3 *= 1. - separationCore * .08;
  w4 *= 1. - separationCore * .12;
  w6 *= 1. - separationCore * .16;
  w7 *= 1. - separationCore * .16;
  w4 += sqrt(max(0., w2 * w3)) * .48 * dreamina;
  w5 += boundary * .12 * dreamina;
  w3 *= 1. - smoothstep(mix(.52, .42, dreamina), mix(1.45, 1.24, dreamina), cool) * mix(.24, .18, dreamina);
  float chromaPower = mix(1., 1.18, dreamina);
  w0 = pow(w0, chromaPower);
  w1 = pow(w1, chromaPower);
  w2 = pow(w2, mix(1., 1.22, dreamina));
  w3 = pow(w3, chromaPower);
  w4 = pow(w4, mix(1.08, 1.42, dreamina));
  w5 = pow(w5, mix(1., 1.36, dreamina));
  w6 = pow(w6, 1.08);
  w7 = pow(w7, 1.04);

  vec3 linearColor = (
    toLinear(c0) * w0 +
    toLinear(c1) * w1 +
    toLinear(c2) * w2 +
    toLinear(c3) * w3 +
    toLinear(c4) * w4 +
    toLinear(c5) * w5 +
    toLinear(c6) * w6 +
    toLinear(c7) * w7
  ) / max(.001, w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7);
  vec3 color = toSrgb(linearColor);
  float luma = dot(color, vec3(.2126, .7152, .0722));
  float maxChannel = max(color.r, max(color.g, color.b));
  float minChannel = min(color.r, min(color.g, color.b));
  float chroma = maxChannel - minChannel;
  float vibrance = 1. + max(0., saturation - 1.) *
    (1. - smoothstep(.15, .85, chroma)) * .55;
  float effectiveSaturation = saturation < 1. ? saturation : vibrance;
  color = mix(vec3(luma), color, effectiveSaturation);
  color = clamp(color, 0., 1.);
  color = mix(color, pow(color, vec3(.88)), .38 * dreamina);
  float blueAccent = smoothstep(.08, .84, deepBlueField) *
    (1. - smoothstep(.04, .42, boundary)) * .42 * dreamina;
  color = mix(color, c7, blueAccent);
  color = mix(color, vec3(1.), separationCore * .16 * dreamina);
  float resolvedWarm = w3 + w4;
  float warmShare = resolvedWarm / max(.001, w0 + w1 + w2 + resolvedWarm + w5 + w6 + w7);
  float warmGate = smoothstep(.27, .58, warmShare) *
    (1. - separationCore * .82) * accent * dreamina;
  float orangeSpot = influence(q, n3 + vec2(.03, -.02), aspect, radius * .52);
  float yellowSpot = influence(q, n3 + vec2(-.18, .10), aspect, radius * .48);
  float orangeCore = smoothstep(.14, .72, orangeSpot) * warmGate * .84;
  float yellowCore = smoothstep(.14, .70, yellowSpot) * warmGate * .88;
  float warmCore = orangeCore + yellowCore;
  vec3 warmColor = (c3 * orangeCore + c4 * yellowCore) / max(.001, warmCore);
  color = mix(color, warmColor, min(.82, warmCore * .84));
  float pippitPaleCore = 1. - smoothstep(
    purpleBoundary - .20,
    purpleBoundary + .04,
    q.y
  );
  vec3 pippitPale = mix(c3, c2, smoothstep(.30, .74, broad * .58 + broad2 * .42));
  color = mix(color, pippitPale, pippitPaleCore * .66 * pippit);
  float pippitDeepCore = smoothstep(
    purpleBoundary + .08,
    purpleBoundary + .42,
    q.y
  );
  float pippitDepth = smoothstep(
    .58,
    1.04,
    q.y + (1. - q.x) * .16 + (broad - .5) * .08
  );
  vec3 pippitDeep = mix(c1, c0, pippitDepth);
  color = mix(color, pippitDeep, pippitDeepCore * .68 * pippit);
  float pippitTransition = exp(-pow(q.y - purpleBoundary, 2.) / .034);
  color = mix(color, c1, pippitTransition * .22 * pippit);
  float pippitCyan = smoothstep(.24, .72, cyanPocket) *
    smoothstep(.42, .78, q.x) * pippitPaleCore;
  color = mix(color, c4, pippitCyan * .42 * pippit);
  float micro = (hash(gl_FragCoord.xy + vec2(37.1, 91.7)) - .5) * grain;
  color = clamp(color + micro * (.35 + color * .45), 0., 1.);
  gl_FragColor = vec4(color, 1.);
}`;

function fieldShader(type, source) {
  const shader = fieldGL.createShader(type);
  fieldGL.shaderSource(shader, source);
  fieldGL.compileShader(shader);
  if (!fieldGL.getShaderParameter(shader, fieldGL.COMPILE_STATUS)) {
    throw new Error(fieldGL.getShaderInfoLog(shader));
  }
  return shader;
}

function initFieldGL() {
  if (fieldProgram) return true;
  if (!fieldGL) return false;
  try {
    fieldProgram = fieldGL.createProgram();
    fieldGL.attachShader(fieldProgram, fieldShader(fieldGL.VERTEX_SHADER, fieldVertex));
    fieldGL.attachShader(fieldProgram, fieldShader(fieldGL.FRAGMENT_SHADER, fieldFragment));
    fieldGL.linkProgram(fieldProgram);
    if (!fieldGL.getProgramParameter(fieldProgram, fieldGL.LINK_STATUS)) {
      throw new Error(fieldGL.getProgramInfoLog(fieldProgram));
    }
    fieldGL.useProgram(fieldProgram);
    const buffer = fieldGL.createBuffer();
    fieldGL.bindBuffer(fieldGL.ARRAY_BUFFER, buffer);
    fieldGL.bufferData(
      fieldGL.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      fieldGL.STATIC_DRAW,
    );
    const position = fieldGL.getAttribLocation(fieldProgram, 'p');
    fieldGL.enableVertexAttribArray(position);
    fieldGL.vertexAttribPointer(position, 2, fieldGL.FLOAT, false, 0, 0);
    return true;
  } catch (error) {
    console.error('Continuous field unavailable', error);
    fieldProgram = null;
    return false;
  }
}

function fieldColor(hexValue) {
  const value = parseInt(hexValue.slice(1), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
}

function fieldBrandColors() {
  const colors = brands[state.brand].colors;
  if (state.brand === 'dreamina') {
    return [colors[0], colors[1], colors[3], colors[4], colors[6], colors[5], colors[2], colors[7]].map(fieldColor);
  }
  return [colors[0], colors[1], colors[3], colors[2], colors[4], colors[3], colors[0], colors[1]].map(fieldColor);
}

function renderContinuousField(target, sceneKey, outputScale) {
  if (!initFieldGL()) return false;
  const scene = scenes[sceneKey];
  const width = Math.round(scene.size[0] * outputScale);
  const height = Math.round(scene.size[1] * outputScale);
  const previewSampling = target === canvas ? .5 : 1;
  const fieldWidth = Math.max(1, Math.round(width * previewSampling));
  const fieldHeight = Math.max(1, Math.round(height * previewSampling));
  const profile = fieldProfiles[state.template];
  const colors = fieldBrandColors();
  fieldCanvas.width = fieldWidth;
  fieldCanvas.height = fieldHeight;
  fieldGL.viewport(0, 0, fieldWidth, fieldHeight);
  fieldGL.useProgram(fieldProgram);
  const uniform = name => fieldGL.getUniformLocation(fieldProgram, name);
  fieldGL.uniform2f(uniform('res'), fieldWidth, fieldHeight);
  profile.nodes.forEach((node, index) => fieldGL.uniform2f(uniform(`n${index}`), node[0], node[1]));
  colors.forEach((color, index) => fieldGL.uniform3f(uniform(`c${index}`), color[0], color[1], color[2]));
  const livePhase = target === canvas ? fieldMotion : 0;
  fieldGL.uniform1f(uniform('phase'), profile.phase + (state.seed % 997) / 997 + livePhase);
  fieldGL.uniform1f(uniform('warp'), profile.warp * (.72 + state.blur / 140));
  fieldGL.uniform1f(uniform('softness'), state.blur / 100);
  fieldGL.uniform1f(uniform('saturation'), state.sat / 92);
  fieldGL.uniform1f(uniform('accent'), state.accent / 100);
  fieldGL.uniform1f(uniform('grain'), Math.min(.022, state.noise / 1900));
  fieldGL.uniform1f(uniform('angle'), state.angle * Math.PI / 180);
  fieldGL.uniform1f(uniform('scale'), state.scale / 100);
  fieldGL.uniform1f(uniform('mode'), profile.mode);
  fieldGL.uniform1f(uniform('dreamina'), state.brand === 'dreamina' ? 1 : 0);
  fieldGL.drawArrays(fieldGL.TRIANGLES, 0, 6);

  target.width = width;
  target.height = height;
  const context = target.getContext('2d', { willReadFrequently: target === canvas });
  context.clearRect(0, 0, width, height);
  context.drawImage(fieldCanvas, 0, 0, width, height);
  return fieldGL.getError() === fieldGL.NO_ERROR;
}

render = function renderField(target = canvas, sceneKey = state.scene, outputScale = 1) {
  if (target === canvas && outputScale === 1) outputScale = fieldDragging ? 1 : 2;
  if (!renderContinuousField(target, sceneKey, outputScale)) {
    legacyRender(target, sceneKey, outputScale);
    return;
  }
  if (target === canvas && !fieldDragging) updateContrast();
};

// The archived page registered several generations of drag handlers on these
// controls. Replacing the nodes gives this renderer one predictable input path.
fieldAnchorElements().forEach(anchor => {
  const cleanAnchor = anchor.cloneNode(true);
  cleanAnchor.removeAttribute('draggable');
  cleanAnchor.style.touchAction = 'none';
  anchor.replaceWith(cleanAnchor);
});

function renderFieldAnchors() {
  const profile = fieldProfiles[state.template];
  const colors = fieldBrandColors();
  const hidden = frame.classList.contains('anchors-hidden');
  fieldAnchorElements().forEach((anchor, index) => {
    const node = profile.nodes[index];
    if (!node || hidden) {
      anchor.style.display = 'none';
      return;
    }
    anchor.style.display = 'block';
    anchor.style.left = `${node[0] * 100}%`;
    anchor.style.top = `${node[1] * 100}%`;
    const [r, g, b] = colors[index].map(value => Math.round(value * 255));
    anchor.style.background = `rgb(${r},${g},${b})`;
  });
}

paintThumbs = function paintContinuousThumbs() {
  const currentTemplate = state.template;
  const currentNoise = state.noise;
  state.noise = 0;
  $$('.template').forEach((element, index) => {
    state.template = templates[index][0];
    const thumbnail = document.createElement('canvas');
    render(thumbnail, 'pc', .32);
    element.querySelector('.thumb').style.backgroundImage = `url(${thumbnail.toDataURL('image/jpeg', .82)})`;
  });
  state.template = currentTemplate;
  state.noise = currentNoise;
  renderFieldAnchors();
  render();
};

$('#random').onclick = () => {
  const profile = fieldProfiles[state.template];
  const random = rng(Math.floor(Math.random() * 1e9));
  const rule = fieldRandomRules[state.template] || {
    jitterX: .17,
    jitterY: .17,
    warp: [.10, .20],
  };
  profile.nodes = fieldDefaults[state.template].map(([x, y]) => [
    Math.max(.05, Math.min(.95, x + (random() - .5) * rule.jitterX * 2)),
    Math.max(.05, Math.min(.95, y + (random() - .5) * rule.jitterY * 2)),
  ]);
  profile.phase = random();
  profile.warp = rule.warp[0] + random() * (rule.warp[1] - rule.warp[0]);
  state.seed = Math.floor(random() * 1e9);
  renderFieldAnchors();
  render();
  paintThumbs();
  const templateName = templates.find(([key]) => key === state.template)?.[1] || '当前';
  toast(`已随机生成${templateName}，品牌色比例保持不变`);
};

const fieldToggle = $('#anchor-toggle') || $('#curve-toggle');
const fieldReset = $('#anchor-reset') || $('#curve-reset');

fieldToggle.onclick = event => {
  const hidden = frame.classList.toggle('anchors-hidden');
  frame.classList.toggle('curve-hidden', hidden);
  event.currentTarget.textContent = hidden ? '显示色场节点' : '隐藏色场节点';
  renderFieldAnchors();
};

fieldReset.onclick = () => {
  fieldProfiles[state.template].nodes = fieldDefaults[state.template].map(node => [...node]);
  renderFieldAnchors();
  render();
  paintThumbs();
  toast('当前模板节点已重置');
};

fieldAnchorElements().forEach((anchor, index) => {
  if (index >= 4) return;
  const moveAnchor = (clientX, clientY, renderNow = true) => {
    const bounds = frame.getBoundingClientRect();
    const node = fieldProfiles[state.template].nodes[index];
    node[0] = Math.max(.02, Math.min(.98, (clientX - bounds.left) / bounds.width));
    node[1] = Math.max(.02, Math.min(.98, (clientY - bounds.top) / bounds.height));
    renderFieldAnchors();
    if (renderNow) render();
  };
  anchor.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    try {
      anchor.setPointerCapture?.(event.pointerId);
    } catch {}
    fieldDragging = true;
    moveAnchor(event.clientX, event.clientY);
    let frameRequest = 0;
    const move = pointerEvent => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      moveAnchor(pointerEvent.clientX, pointerEvent.clientY, false);
      if (!frameRequest) {
        frameRequest = requestAnimationFrame(() => {
          frameRequest = 0;
          render();
        });
      }
    };
    const up = pointerEvent => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      try {
        anchor.releasePointerCapture?.(event.pointerId);
      } catch {}
      if (frameRequest) cancelAnimationFrame(frameRequest);
      fieldDragging = false;
      render();
      updateContrast();
      paintThumbs();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
});

let fieldAnimationTime = performance.now();
let fieldAnimationFrame = 0;
const animateField = now => {
  const elapsed = Math.min(80, now - fieldAnimationTime);
  fieldAnimationTime = now;
  if (!document.hidden && !fieldDragging && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fieldMotion = (fieldMotion + elapsed * .000075) % 1;
    renderContinuousField(canvas, state.scene, 2);
  }
  fieldAnimationFrame = requestAnimationFrame(animateField);
};
cancelAnimationFrame(fieldAnimationFrame);
fieldAnimationFrame = requestAnimationFrame(animateField);

new ResizeObserver(renderFieldAnchors).observe(frame);
renderFieldAnchors();
render();
paintThumbs();
