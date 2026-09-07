const legacyRender = render;
templates.push(['petal', '单片花瓣'], ['petalShadow', '花瓣叠影'], ['petalStack', '微距花卉']);
const petalTemplateButton = document.createElement('button');
petalTemplateButton.className = 'template';
petalTemplateButton.dataset.template = 'petal';
petalTemplateButton.innerHTML = '<div class="thumb"></div><span>单片花瓣</span>';
$('#templates').append(petalTemplateButton);
const petalShadowTemplateButton = document.createElement('button');
petalShadowTemplateButton.className = 'template';
petalShadowTemplateButton.dataset.template = 'petalShadow';
petalShadowTemplateButton.innerHTML = '<div class="thumb"></div><span>花瓣叠影</span>';
$('#templates').append(petalShadowTemplateButton);
const petalStackTemplateButton = document.createElement('button');
petalStackTemplateButton.className = 'template';
petalStackTemplateButton.dataset.template = 'petalStack';
petalStackTemplateButton.innerHTML = '<div class="thumb"></div><span>微距花卉</span>';
$('#templates').append(petalStackTemplateButton);
document.querySelector('.templates .section-head span').textContent = '线上 9.1 的 8 个模板 + 3 个花卉模板';
const petalGridStyle = document.createElement('style');
petalGridStyle.textContent = '.template-grid{grid-template-columns:repeat(11,minmax(68px,1fr))}@media(max-width:900px){.template-grid{grid-template-columns:repeat(3,1fr)}}';
document.head.append(petalGridStyle);
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
  petal: [[.08, .10], [.30, .20], [.70, .55], [.94, .92]],
  petalShadow: [[.08, .48], [.28, .12], [.72, .18], [.95, .94]],
  petalStack: [[.08, .48], [.28, .12], [.72, .18], [.95, .94]],
};
const fieldProfiles = Object.fromEntries(
  Object.entries(fieldDefaults).map(([key, nodes], index) => [
    key,
    {
      nodes: nodes.map(node => [...node]),
      phase: .13 + index * .113,
      warp: .12 + (index % 3) * .025,
      mode: index,
      preference: {
        petalCount: 4,
        petalWidth: 1,
        floralStyle: 1,
        layerCount: 3,
        layerGap: .16,
        layerStagger: .28,
        rhythm: .78,
        sizeRatio: .56,
        growthPosition: 'right-bottom',
        crop: .42,
        overlap: .38,
        asymmetry: .74,
        warmArea: .13,
        spread: .62,
        depth: .76,
        sharpness: .62,
        curvature: .58,
        fan: .60,
        edgeDefinition: .54,
        cyanShare: .60,
        lightArea: .28,
      },
    },
  ]),
);
const fieldRandomRules = {
  bloom: { jitterX: .14, jitterY: .13, warp: [.15, .23] },
  sky: { jitterX: .12, jitterY: .055, warp: [.04, .085] },
  cloud: { jitterX: .13, jitterY: .10, warp: [.13, .22] },
  aurora: { jitterX: .075, jitterY: .12, warp: [.08, .15] },
  petal: { jitterX: .085, jitterY: .07, warp: [.035, .085] },
  petalShadow: { jitterX: .075, jitterY: .075, warp: [.025, .065] },
  petalStack: { jitterX: .075, jitterY: .075, warp: [.025, .065] },
};
Object.assign(fieldProfiles.petal.preference, {
  floralStyle: 0, layerCount: 1, petalCount: 1, layerGap: .10,
  layerStagger: .12, rhythm: .64, sizeRatio: .72, crop: .38,
  overlap: .22, asymmetry: .48, spread: .68, depth: .58,
});
Object.assign(fieldProfiles.petalShadow.preference, {
  floralStyle: 1, layerCount: 2, petalCount: 4, layerGap: .18,
  layerStagger: .31, rhythm: .76, sizeRatio: .54, crop: .42,
  overlap: .36, asymmetry: .70, spread: .66, depth: .78,
});
let fieldProgram = null;
let legacyPetalProgram = null;
let fieldBuffer = null;
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

let fieldFragment = `
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
uniform float petalCount;
uniform float petalRatio;
uniform float petalOverlap;
uniform float petalWarm;
uniform float petalDepth;
uniform float petalSharpness;
uniform float petalCurvature;
uniform float petalFan;
uniform float petalEdge;
uniform float petalCyan;
uniform float petalLight;

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
float petalDistance(vec2 p, vec2 center, float aspect, float rotation, float size, float bend) {
  vec2 local = p - center;
  local.x *= mix(1., min(aspect, 2.4), .14);
  float cs = cos(rotation);
  float sn = sin(rotation);
  local = vec2(local.x * cs - local.y * sn, local.x * sn + local.y * cs) / size;
  local.x += bend * local.y * local.y;
  float y = local.y;
  float taper = max(0., 1. - pow(abs(y + .04), 1.65));
  float halfWidth = .48 * pow(taper, .56);
  float side = abs(local.x) - halfWidth;
  float cap = abs(y) - 1.;
  return max(side, cap);
}
float petalMask(vec2 p, vec2 center, float aspect, float rotation, float size, float bend, float feather) {
  return 1. - smoothstep(-feather, feather, petalDistance(p, center, aspect, rotation, size, bend));
}
float grownPetalDistance(vec2 p, vec2 tip, vec2 base, float width, float bend, float pointiness) {
  vec2 axis = base - tip;
  float axisLength = max(.001, length(axis));
  vec2 direction = axis / axisLength;
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 relative = p - tip;
  float t = dot(relative, direction) / axisLength;
  float across = dot(relative, normal) / axisLength;
  float boundedT = clamp(t, 0., 1.);
  float curve = bend * sin(boundedT * 3.14159) * (1. - boundedT * .34);
  float taper = pow(max(0., sin(boundedT * 3.14159)), mix(.34, 1.16, pointiness));
  float halfWidth = width * taper * mix(.72, 1.10, boundedT);
  float side = abs(across - curve) - halfWidth;
  float ends = max(-t, t - 1.);
  return max(side, ends);
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
  if (mode > 10.5 && mode < 11.5) {
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

  if (mode > 12.5) {
    float stackPhase = phase * 6.28318;
    vec2 stackBase = n3 + vec2(.05, .06);
    float secondaryRatio = mix(.34, .82, petalRatio);
    float baseScatter = mix(1.28, .42, petalOverlap);
    float depthStrength = mix(.62, 1.08, petalDepth);
    float curveStrength = mix(.35, 1.95, petalCurvature);
    float fanOffset = (petalFan - .5) * .34;
    float depthScatter = mix(.035, .18, petalDepth) * mix(1.12, .78, petalOverlap);
    vec2 stackTip0 = n1 + vec2(-.10 - fanOffset * .22, -.08) + vec2(sin(stackPhase) * .018, 0.);
    vec2 stackTip1 = n0 + vec2(-.20 - fanOffset, .04 + fanOffset * .10) + vec2(0., cos(stackPhase * .73) * .018);
    vec2 stackTip2 = n2 + vec2(.18 + fanOffset, -.22 - fanOffset * .08) + vec2(.34, -.22) * depthScatter + vec2(sin(stackPhase * .61) * .016, 0.);
    vec2 stackTip3 = mix(n1, n2, .62) + vec2(.02 + fanOffset * .52, -.30) + vec2(-.52, -.18) * depthScatter;
    vec2 stackTip4 = mix(n0, n2, .44) + vec2(-.08 - fanOffset * .46, -.20) + vec2(-.78, .16) * depthScatter;
    float stackD0 = grownPetalDistance(q, stackTip0, stackBase, .305, .070 * curveStrength, petalSharpness);
    float stackD1 = grownPetalDistance(q, stackTip1, stackBase + vec2(-.025, .025) * baseScatter, .305 * secondaryRatio, -.075 * curveStrength, petalSharpness);
    float stackD2 = grownPetalDistance(q, stackTip2, stackBase + vec2(.018, .018) * baseScatter, .276 * secondaryRatio, .060 * curveStrength, petalSharpness);
    float stackD3 = grownPetalDistance(q, stackTip3, stackBase + vec2(-.055, .045) * baseScatter, .238 * secondaryRatio, -.045 * curveStrength, petalSharpness);
    float stackD4 = grownPetalDistance(q, stackTip4, stackBase + vec2(.035, .036) * baseScatter, .205 * secondaryRatio, .052 * curveStrength, petalSharpness);
    float stackFeather = mix(.060, .022, petalEdge);
    float depthBlur = mix(1.18, 2.05, petalDepth);
    float stackP0 = 1. - smoothstep(-stackFeather * .72, stackFeather * .72, stackD0);
    float stackP1 = 1. - smoothstep(-stackFeather * .94, stackFeather * .94, stackD1);
    float stackP2 = 1. - smoothstep(-stackFeather * 1.18, stackFeather * 1.18, stackD2);
    float stackP3 = 1. - smoothstep(-stackFeather * 1.48 * depthBlur, stackFeather * 1.48 * depthBlur, stackD3);
    float stackP4 = 1. - smoothstep(-stackFeather * 1.82 * depthBlur, stackFeather * 1.82 * depthBlur, stackD4);
    float stackE0 = exp(-abs(stackD0) * 18.);
    float stackE1 = exp(-abs(stackD1) * 19.);
    float stackE2 = exp(-abs(stackD2) * 20.);
    float stackE3 = exp(-abs(stackD3) * 21.);
    float stackE4 = exp(-abs(stackD4) * 21.);
    float use1 = step(1.5, petalCount);
    float use2 = step(2.5, petalCount);
    float use3 = step(3.5, petalCount);
    float use4 = step(4.5, petalCount);
    vec3 stackBlue = mix(c7, c6, mix(.24, .78, petalCyan));
    vec3 stackColor = mix(stackBlue, c0, .12 + broad * .10);
    vec3 paleCyan = mix(c0, c2, mix(.36, .82, petalLight));
    float farFade = mix(.72, .38, petalDepth);
    stackColor = mix(stackColor, mix(c6, c2, .16), stackP4 * use4 * .42 * farFade);
    stackColor = mix(stackColor, mix(c7, c2, .10), stackP3 * use3 * .50 * farFade);
    stackColor = mix(stackColor, mix(c6, c2, .22), stackP2 * use2 * .60 * mix(.88, .64, petalDepth));
    stackColor = mix(stackColor, mix(c6, c7, .48), stackP1 * use1 * .82 * depthStrength);
    stackColor = mix(stackColor, paleCyan, stackP0 * .90 * depthStrength);
    float lightField = exp(-(pow(q.x - .52, 2.) / .30 + pow(q.y - .60, 2.) / .19));
    stackColor = mix(stackColor, c2, lightField * mix(.12, .32, petalLight));
    stackColor = mix(stackColor, c6, stackE1 * use1 * .18);
    stackColor = mix(stackColor, mix(c0, c2, .26), stackE0 * .15);
    stackColor = mix(stackColor, mix(c6, c2, .30), stackE2 * use2 * .08);
    float warmSpread = mix(.62, 1.06, petalWarm);
    vec2 warmAnchor = clamp(stackBase, vec2(.76, .78), vec2(.96, .94));
    vec2 warmDelta = q - warmAnchor;
    float stackCream = exp(-(pow(warmDelta.x + .07, 2.) / (.10 * warmSpread) + pow(warmDelta.y + .10, 2.) / (.18 * warmSpread))) * dreamina;
    float stackYellow = exp(-(pow(warmDelta.x - .018, 2.) / (.052 * warmSpread) + pow(warmDelta.y - .035, 2.) / (.095 * warmSpread))) * accent * dreamina;
    float stackOrange = exp(-(pow(warmDelta.x - .006, 2.) / (.021 * warmSpread) + pow(warmDelta.y - .010, 2.) / (.043 * warmSpread))) * accent * dreamina;
    float orangeCore = smoothstep(.10, .78, stackOrange);
    stackColor = mix(stackColor, mix(c2, c4, .30), stackCream * .40);
    stackColor = mix(stackColor, c4, stackYellow * .78);
    stackColor = mix(stackColor, c3, orangeCore * .94);
    float stackLuma = dot(stackColor, vec3(.2126, .7152, .0722));
    stackColor = mix(vec3(stackLuma), stackColor, min(1.10, saturation));
    float stackGrain = (hash(gl_FragCoord.xy + vec2(41.7, 83.1)) - .5) * grain;
    stackColor = clamp(stackColor + stackGrain * (.28 + stackColor * .34), 0., 1.);
    gl_FragColor = vec4(stackColor, 1.);
    return;
  }

  if (mode > 11.5) {
    float petalPhase = phase * 6.28318;
    float petalFeather = mix(.095, .055, softness);
    float wide = smoothstep(2.35, 4.2, aspect);
    vec3 brandBlue = mix(c7, c0, .38);
    vec3 petalColor;
    if (wide > .5) {
      float bannerFeather = mix(.14, .085, softness);
      float bd0 = petalDistance(q, vec2(.34, -.24) + (n1 - vec2(.42, .08)) * .10, aspect, -1.18 + sin(petalPhase) * .05, .82, .16);
      float bd1 = petalDistance(q, vec2(.80, .88) + (n3 - vec2(.92, .82)) * .12, aspect, .98 + cos(petalPhase * .73) * .05, .64, -.18);
      float bp0 = 1. - smoothstep(-bannerFeather, bannerFeather, bd0);
      float bp1 = 1. - smoothstep(-bannerFeather, bannerFeather, bd1);
      float bannerSeam = clamp(exp(-abs(bd0) * 8.) + exp(-abs(bd1) * 8.), 0., 1.);
      petalColor = mix(brandBlue, c0, .16 + broad * .06);
      petalColor = mix(petalColor, mix(c2, c0, .06), bp0 * .88);
      petalColor = mix(petalColor, mix(c2, c5, .28), bp1 * .74);
      petalColor = mix(petalColor, c0, bannerSeam * .075);
      float bannerPink = exp(-(pow(q.x - .86, 2.) / .035 + pow(q.y - .75, 2.) / .22)) * dreamina;
      float bannerOrange = exp(-(pow(q.x - 1.01, 2.) / .028 + pow(q.y - .94, 2.) / .11)) * accent * dreamina;
      float bannerYellow = exp(-(pow(q.x - 1.07, 2.) / .018 + pow(q.y - 1.05, 2.) / .07)) * accent * dreamina;
      petalColor = mix(petalColor, mix(c2, c5, .52), bannerPink * .62);
      petalColor = mix(petalColor, c3, bannerOrange * .58);
      petalColor = mix(petalColor, c4, bannerYellow * .84);
      float topLeftBlue = (1. - smoothstep(.03, .24, q.y)) * (1. - smoothstep(.32, .64, q.x));
      petalColor = mix(petalColor, brandBlue, topLeftBlue * .92);
    } else {
      vec2 petalTip = n1 + vec2(-.05, -.02);
      vec2 petalBase = n3 + vec2(.05, .08);
      vec2 petalAxis = normalize(petalBase - petalTip + vec2(.0001));
      vec2 petalNormal = vec2(-petalAxis.y, petalAxis.x);
      petalTip += petalNormal * sin(petalPhase) * .018;
      float mainD = grownPetalDistance(q, petalTip, petalBase, .34, .075, .62);
      float innerD = grownPetalDistance(
        q,
        petalTip + petalAxis * .10 + petalNormal * .018,
        petalBase - petalAxis * .09 + petalNormal * .035,
        .235,
        .050,
        .58
      );
      float mainPetal = 1. - smoothstep(-.050, .050, mainD);
      float innerPetal = 1. - smoothstep(-.046, .046, innerD);
      float petalEdge = exp(-abs(mainD) * 20.);
      float innerEdge = exp(-abs(innerD) * 22.) * mainPetal;
      petalColor = mix(brandBlue, c0, .20 + broad * .06);
      petalColor = mix(petalColor, mix(c2, c0, .065), mainPetal * .94);
      petalColor = mix(petalColor, mix(c2, c5, .18), innerPetal * .26);
      petalColor = mix(petalColor, mix(c0, c5, .18), petalEdge * .22);
      petalColor = mix(petalColor, c2, innerEdge * .11);
      float cornerBlue = exp(-(pow(q.x - n0.x, 2.) / .18 + pow(q.y - n0.y, 2.) / .16));
      petalColor = mix(petalColor, brandBlue, cornerBlue * .56);
      float pinkBridge = exp(-(pow(q.x - .88, 2.) / .055 + pow(q.y - .78, 2.) / .16)) * dreamina;
      float orangeField = exp(-(pow(q.x - 1.00, 2.) / .045 + pow(q.y - .96, 2.) / .095)) * accent * dreamina;
      float yellowCore = exp(-(pow(q.x - 1.06, 2.) / .028 + pow(q.y - 1.04, 2.) / .055)) * accent * dreamina;
      petalColor = mix(petalColor, mix(c2, c5, .54), pinkBridge * .70);
      petalColor = mix(petalColor, c3, orangeField * .62);
      petalColor = mix(petalColor, c4, yellowCore * .86);
    }
    float petalLuma = dot(petalColor, vec3(.2126, .7152, .0722));
    petalColor = mix(vec3(petalLuma), petalColor, min(1.10, saturation));
    float petalGrain = (hash(gl_FragCoord.xy + vec2(71.3, 19.7)) - .5) * grain;
    petalColor = clamp(petalColor + petalGrain * (.28 + petalColor * .34), 0., 1.);
    gl_FragColor = vec4(petalColor, 1.);
    return;
  }

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

// Keep the original online 9.1 shader small and unchanged for the eight
// established templates. The macro-floral template is rendered separately
// with Canvas2D, so its experimental GLSL branches must not affect this path.
const stripShaderRange = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  return start >= 0 && end > start ? source.slice(0, start) + source.slice(end) : source;
};
fieldFragment = stripShaderRange(fieldFragment, 'uniform float petalCount;', 'float hash(vec2 p)');
fieldFragment = stripShaderRange(fieldFragment, 'float petalDistance(vec2 p', 'vec3 toLinear(vec3 value)');
fieldFragment = stripShaderRange(fieldFragment, '  if (mode > 12.5) {', '  float radius = mix(.16, .42, softness);');
fieldFragment = fieldFragment.replace('if (mode > 10.5 && mode < 11.5)', 'if (mode > 10.5)');
fieldFragment = fieldFragment.replace('uniform float dreamina;\nfloat hash', 'uniform float dreamina;\n\nfloat hash');

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
    fieldBuffer = fieldGL.createBuffer();
    fieldGL.bindBuffer(fieldGL.ARRAY_BUFFER, fieldBuffer);
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

function initLegacyPetalGL() {
  if (legacyPetalProgram) return true;
  if (!initFieldGL() || typeof fieldFragment92 !== 'string') return false;
  try {
    legacyPetalProgram = fieldGL.createProgram();
    fieldGL.attachShader(legacyPetalProgram, fieldShader(fieldGL.VERTEX_SHADER, fieldVertex));
    fieldGL.attachShader(legacyPetalProgram, fieldShader(fieldGL.FRAGMENT_SHADER, fieldFragment92));
    fieldGL.linkProgram(legacyPetalProgram);
    if (!fieldGL.getProgramParameter(legacyPetalProgram, fieldGL.LINK_STATUS)) {
      throw new Error(fieldGL.getProgramInfoLog(legacyPetalProgram));
    }
    return true;
  } catch (error) {
    console.error('9.2v1 petal renderer unavailable', error);
    legacyPetalProgram = null;
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

function floralGrowthProgress(preference) {
  if (Number.isFinite(preference.growthPositionT)) return Math.max(0, Math.min(1, preference.growthPositionT));
  return { 'bottom-right': 0, 'right-bottom': .5, 'right-side': 1 }[preference.growthPosition] ?? .5;
}

function floralGrowthOrigin(preference) {
  const progress = floralGrowthProgress(preference);
  const stops = [[.82, 1.015], [.985, .975], [1.015, .72]];
  const segment = progress < .5 ? 0 : 1;
  const amount = progress * 2 - segment;
  return stops[segment].map((value, axis) => value + (stops[segment + 1][axis] - value) * amount);
}

function renderFloralGenerator(target, sceneKey, outputScale, templateKey = state.template) {
  const scene = scenes[sceneKey];
  const width = Math.max(1, Math.round(scene.size[0] * outputScale));
  const height = Math.max(1, Math.round(scene.size[1] * outputScale));
  const context = target.getContext('2d', { willReadFrequently: target === canvas });
  const profile = fieldProfiles[templateKey] || fieldProfiles.petalStack;
  const pref = profile.preference || {};
  const saturationFactor = Math.max(.35, Math.min(1.18, (state.sat ?? 166) / 166));
  const colors = fieldBrandColors().map(color => {
    const luma = color[0] * .2126 + color[1] * .7152 + color[2] * .0722;
    return color.map(channel => Math.max(0, Math.min(1, luma + (channel - luma) * saturationFactor)));
  });
  const css = (color, alpha = 1) => `rgba(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)},${alpha})`;
  const random = rng(((state.seed || 18) ^ Math.floor((profile.phase || 0) * 1e9)) >>> 0);
  target.width = width;
  target.height = height;

  const sky = context.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, css(colors[7]));
  sky.addColorStop(.30, css(colors[6]));
  sky.addColorStop(.64, css(colors[2]));
  sky.addColorStop(1, css(colors[0]));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const originRatio = floralGrowthOrigin(pref);
  const origin = [originRatio[0] * width, originRatio[1] * height];
  const minSide = Math.min(width, height);
  const aspect = width / Math.max(1, height);
  const horizontalStretch = Math.max(1, Math.pow(aspect, .52));
  const angleShift = ((state.angle ?? 0) * Math.PI) / 180;
  const softnessFactor = Math.max(.65, Math.min(1.40, .35 + .65 * ((state.blur ?? 60) / 60)));
  const warmStrength = Math.max(0, Math.min(1, (state.accent ?? 100) / 100));
  const style = templateKey === 'petal' ? 0 : templateKey === 'petalShadow' ? 1 : Math.max(0, Math.min(2, Math.round(pref.floralStyle ?? 1)));
  const styleNames = [
    { center: -2.48, span: 1.48, length: 1.02, width: .30 },
    { center: -2.34, span: 1.88, length: .92, width: .34 },
    { center: -2.58, span: 2.18, length: 1.08, width: .27 },
  ];
  const recipe = styleNames[style];
  const layerCount = templateKey === 'petal' ? 1 : templateKey === 'petalShadow' ? 2 : Math.max(1, Math.min(3, Math.round(pref.layerCount ?? 2)));
  const petalsPerLayer = templateKey === 'petal' ? 1 : Math.max(3, Math.min(4, Math.round(pref.petalCount ?? 4)));
  const widthFactor = Math.max(.5, Math.min(1.6, pref.petalWidth ?? 1));
  const gap = pref.layerGap ?? .16;
  const stagger = pref.layerStagger ?? .28;
  const rhythm = pref.rhythm ?? .78;
  const spread = pref.spread ?? .62;
  const sizeRatio = pref.sizeRatio ?? .56;
  const sharpness = pref.sharpness ?? .62;
  const curvature = pref.curvature ?? .58;
  const depth = pref.depth ?? .76;
  const asymmetry = pref.asymmetry ?? .74;
  const edge = pref.edgeDefinition ?? .54;
  const baseLength = minSide * recipe.length * (.78 + spread * .54) * ((state.scale ?? 100) / 100);

  const makePetalPath = (ctx, root, tip, widthValue, bend, pointiness) => {
    const dx = tip[0] - root[0];
    const dy = tip[1] - root[1];
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const ax = dx / length;
    const ay = dy / length;
    const shoulder = widthValue * (.72 + (1 - pointiness) * .34);
    const tipWidth = widthValue * (.025 + (1 - pointiness) * .11);
    const bendOffset = bend * widthValue;
    ctx.beginPath();
    ctx.moveTo(root[0], root[1]);
    ctx.bezierCurveTo(
      root[0] + ax * length * .20 + nx * widthValue * .42,
      root[1] + ay * length * .20 + ny * widthValue * .42,
      tip[0] - ax * length * .28 + nx * shoulder + nx * bendOffset,
      tip[1] - ay * length * .28 + ny * shoulder + ny * bendOffset,
      tip[0] + nx * tipWidth,
      tip[1] + ny * tipWidth
    );
    ctx.quadraticCurveTo(tip[0] + ax * length * .035, tip[1] + ay * length * .035, tip[0] - nx * tipWidth, tip[1] - ny * tipWidth);
    ctx.bezierCurveTo(
      tip[0] - ax * length * .28 - nx * shoulder + nx * bendOffset,
      tip[1] - ay * length * .28 - ny * shoulder + ny * bendOffset,
      root[0] + ax * length * .20 - nx * widthValue * .42,
      root[1] + ay * length * .20 - ny * widthValue * .42,
      root[0], root[1]
    );
    ctx.closePath();
  };

  for (let layer = layerCount - 1; layer >= 0; layer -= 1) {
    const far = layer / Math.max(1, layerCount - 1);
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerContext = layerCanvas.getContext('2d');
    const layerAlpha = 1 - far * (.24 + depth * .22);
    const layerLength = baseLength * (1 + layer * (.24 + gap * .78));
    const layerRootShift = minSide * layer * gap * .22;
    const layerAngleDrift = (random() - .5) * recipe.span * (.10 + rhythm * .22);
    const rootDriftX = (random() - .5) * minSide * rhythm * .12;
    const rootDriftY = (random() - .5) * minSide * rhythm * .09;
    const dominantPetal = Math.floor(random() * petalsPerLayer);
    for (let petal = 0; petal < petalsPerLayer; petal += 1) {
      const slot = petalsPerLayer === 1 ? 0 : petal / (petalsPerLayer - 1) - .5;
      const offset = (layer % 2 ? stagger : -stagger) * .34;
      const slotSkew = (random() - .5) * recipe.span * (.06 + rhythm * .13) * (.7 + Math.abs(slot));
      const jitter = (random() - .5) * (.18 + rhythm * .26) * asymmetry;
      const angle = recipe.center + angleShift + slot * recipe.span * (.72 + (pref.fan ?? .60) * .48) + offset + layerAngleDrift + slotSkew + jitter;
      const hierarchy = petal === dominantPetal ? 1.08 + rhythm * .12 : sizeRatio + .20 + random() * .18;
      const length = layerLength * (1 + (random() - .5) * (.22 + rhythm * .30) * asymmetry) * hierarchy;
      const root = [
        origin[0] + Math.cos(angle) * layerRootShift * horizontalStretch + rootDriftX,
        origin[1] + Math.sin(angle) * layerRootShift + rootDriftY,
      ];
      const tip = [
        root[0] + Math.cos(angle) * length * horizontalStretch,
        root[1] + Math.sin(angle) * length,
      ];
      const petalWidth = length * recipe.width * (.78 + (random() - .5) * (.20 + rhythm * .28)) * (style === 0 && petal === dominantPetal ? 1.18 : 1) * widthFactor;
      const petalFade = style === 2
        ? .52 + random() * .46 - far * random() * .20
        : .72 + random() * .28;
      const petalBlur = (2.8 + far * depth * (12 + random() * 13) + (style === 2 ? 4 + random() * 8 : random() * 2.5)) * softnessFactor;
      layerContext.globalAlpha = layerAlpha * petalFade;
      layerContext.filter = `blur(${petalBlur * outputScale}px)`;
      makePetalPath(layerContext, root, tip, petalWidth, (random() - .5) * curvature, sharpness);
      const petalGradient = layerContext.createLinearGradient(root[0], root[1], tip[0], tip[1]);
      if (layer === 0) {
        // The warm centre lives inside the nearest petals and follows their
        // direction; there is no separate circular flower-centre shape.
        petalGradient.addColorStop(0, css(colors[3], .58 * warmStrength));
        petalGradient.addColorStop(.10, css(colors[4], .50 * warmStrength));
        petalGradient.addColorStop(.25, css(colors[2], .72));
        petalGradient.addColorStop(.66, css(petal % 2 ? colors[6] : colors[7], .72));
        petalGradient.addColorStop(1, css(colors[2], .58));
      } else {
        petalGradient.addColorStop(0, css(colors[0], .42));
        petalGradient.addColorStop(.20, css(colors[6], .72));
        petalGradient.addColorStop(.66, css(petal % 2 ? colors[6] : colors[7], .72));
        petalGradient.addColorStop(1, css(colors[2], .58));
      }
      layerContext.fillStyle = petalGradient;
      layerContext.fill();
    }
    layerContext.globalAlpha = 1;
    layerContext.filter = 'none';
    context.drawImage(layerCanvas, 0, 0);
  }

  if (state.noise > 0) {
    context.save();
    context.globalAlpha = Math.min(.09, state.noise / 1400);
    for (let i = 0; i < Math.min(2200, Math.round(width * height / 900)); i += 1) {
      context.fillStyle = random() > .5 ? '#ffffff' : '#0bc9ff';
      const grain = Math.max(1, (state.grainSize ?? 1) * outputScale);
      context.fillRect(random() * width, random() * height, grain, grain);
    }
    context.restore();
  }
  if (target === canvas && !fieldDragging) updateContrast();
  return true;
}

function renderContinuousField(target, sceneKey, outputScale, useLegacyPetal = false) {
  if (useLegacyPetal ? !initLegacyPetalGL() : !initFieldGL()) return false;
  const activeProgram = useLegacyPetal ? legacyPetalProgram : fieldProgram;
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
  fieldGL.useProgram(activeProgram);
  fieldGL.bindBuffer(fieldGL.ARRAY_BUFFER, fieldBuffer);
  const position = fieldGL.getAttribLocation(activeProgram, 'p');
  fieldGL.enableVertexAttribArray(position);
  fieldGL.vertexAttribPointer(position, 2, fieldGL.FLOAT, false, 0, 0);
  const uniform = name => fieldGL.getUniformLocation(activeProgram, name);
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
  const preference = profile.preference || {};
  fieldGL.uniform1f(uniform('petalCount'), preference.petalCount || 4);
  fieldGL.uniform1f(uniform('petalRatio'), preference.sizeRatio ?? .56);
  fieldGL.uniform1f(uniform('petalOverlap'), preference.overlap ?? .38);
  fieldGL.uniform1f(uniform('petalWarm'), Math.max(0, Math.min(1, ((preference.warmArea ?? .13) - .06) / .14)));
  fieldGL.uniform1f(uniform('petalDepth'), preference.depth ?? .76);
  fieldGL.uniform1f(uniform('petalSharpness'), preference.sharpness ?? .62);
  fieldGL.uniform1f(uniform('petalCurvature'), preference.curvature ?? .58);
  fieldGL.uniform1f(uniform('petalFan'), preference.fan ?? .60);
  fieldGL.uniform1f(uniform('petalEdge'), preference.edgeDefinition ?? .54);
  fieldGL.uniform1f(uniform('petalCyan'), preference.cyanShare ?? .60);
  fieldGL.uniform1f(uniform('petalLight'), preference.lightArea ?? .28);
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
  if (state.template === 'petalStack') {
    renderFloralGenerator(target, sceneKey, outputScale, state.template);
    return;
  }
  const useLegacyPetal = state.template === 'petal' || state.template === 'petalShadow';
  if (!renderContinuousField(target, sceneKey, outputScale, useLegacyPetal)) {
    legacyRender(target, sceneKey, outputScale);
    return;
  }
  if (target === canvas && !fieldDragging) updateContrast();
};

const renderSelectedTemplatePreview = () => {
  fit();
  renderFieldAnchors();
  render(canvas, state.scene, 2);
};

const selectPetalTemplate = templateKey => {
  state.template = templateKey;
  $$('.template').forEach(element => {
    element.classList.toggle('active', element.dataset.template === state.template);
  });
  renderSelectedTemplatePreview();
  requestAnimationFrame(renderSelectedTemplatePreview);
  const templateName = templates.find(([key]) => key === templateKey)?.[1] || '花瓣';
  toast(`已切换${templateName}试验模板`);
};
petalTemplateButton.onclick = () => selectPetalTemplate('petal');
petalShadowTemplateButton.onclick = () => selectPetalTemplate('petalShadow');
petalStackTemplateButton.onclick = () => selectPetalTemplate('petalStack');

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
  if (['petal', 'petalShadow', 'petalStack'].includes(state.template)) {
    profile.preference = {
      floralStyle: state.template === 'petal' ? 0 : state.template === 'petalShadow' ? 1 : Math.floor(random() * 3),
      layerCount: state.template === 'petal' ? 1 : state.template === 'petalShadow' ? 2 : 1 + Math.floor(random() * 3),
      petalCount: state.template === 'petal' ? 1 : 3 + Math.floor(random() * 2),
      petalWidth: 1,
      layerGap: .09 + random() * .16,
      layerStagger: .10 + random() * .38,
      rhythm: .60 + random() * .38,
      sizeRatio: .36 + random() * .34,
      growthPosition: ['right-bottom', 'bottom-right', 'right-side'][Math.floor(random() * 3)],
      crop: .20 + random() * .42,
      overlap: .18 + random() * .40,
      asymmetry: .42 + random() * .56,
      warmArea: .09 + random() * .11,
      spread: .32 + random() * .58,
      depth: .55 + random() * .39,
      sharpness: .25 + random() * .68,
      curvature: .20 + random() * .72,
      fan: .20 + random() * .75,
      edgeDefinition: .28 + random() * .62,
      cyanShare: .42 + random() * .32,
      lightArea: .18 + random() * .20,
    };
  }
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
  const profile = fieldProfiles[state.template];
  profile.nodes = fieldDefaults[state.template].map(node => [...node]);
  profile.preference = {
    petalCount: 4,
    petalWidth: 1,
    floralStyle: 1,
    layerCount: 3,
    layerGap: .16,
    layerStagger: .28,
    rhythm: .78,
    sizeRatio: .56,
    growthPosition: 'right-bottom',
    crop: .42,
    overlap: .38,
    asymmetry: .74,
    warmArea: .13,
    spread: .62,
    depth: .76,
    sharpness: .62,
    curvature: .58,
    fan: .60,
    edgeDefinition: .54,
    cyanShare: .60,
    lightArea: .28,
  };
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
  const isMacroFloral = ['petalStack', 'treeShadow', 'oilBrush'].includes(state.template);
  if (!isMacroFloral && !document.hidden && !fieldDragging && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fieldMotion = (fieldMotion + elapsed * .000075) % 1;
    const useLegacyPetal = state.template === 'petal' || state.template === 'petalShadow';
    renderContinuousField(canvas, state.scene, 2, useLegacyPetal);
  }
  fieldAnimationFrame = requestAnimationFrame(animateField);
};
cancelAnimationFrame(fieldAnimationFrame);
fieldAnimationFrame = requestAnimationFrame(animateField);

new ResizeObserver(renderFieldAnchors).observe(frame);
renderFieldAnchors();
render();
paintThumbs();
