const fieldFragment92 = `
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
float grownPetalDistance(vec2 p, vec2 tip, vec2 base, float width, float bend) {
  vec2 axis = base - tip;
  float axisLength = max(.001, length(axis));
  vec2 direction = axis / axisLength;
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 relative = p - tip;
  float t = dot(relative, direction) / axisLength;
  float across = dot(relative, normal) / axisLength;
  float boundedT = clamp(t, 0., 1.);
  float curve = bend * sin(boundedT * 3.14159) * (1. - boundedT * .34);
  float taper = pow(max(0., sin(boundedT * 3.14159)), .58);
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
    vec2 stackTip0 = n1 + vec2(-.10, -.08) + vec2(sin(stackPhase) * .018, 0.);
    vec2 stackTip1 = n0 + vec2(-.20, .04) + vec2(0., cos(stackPhase * .73) * .018);
    vec2 stackTip2 = n2 + vec2(.18, -.22) + vec2(sin(stackPhase * .61) * .016, 0.);
    vec2 stackTip3 = mix(n1, n2, .62) + vec2(.02, -.30);
    float stackD0 = grownPetalDistance(q, stackTip0, stackBase, .285, .070);
    float stackD1 = grownPetalDistance(q, stackTip1, stackBase + vec2(-.025, .025), .235, -.075);
    float stackD2 = grownPetalDistance(q, stackTip2, stackBase + vec2(.018, .018), .205, .060);
    float stackD3 = grownPetalDistance(q, stackTip3, stackBase + vec2(-.055, .045), .165, -.045);
    float stackP0 = 1. - smoothstep(-.052, .052, stackD0);
    float stackP1 = 1. - smoothstep(-.050, .050, stackD1);
    float stackP2 = 1. - smoothstep(-.048, .048, stackD2);
    float stackP3 = 1. - smoothstep(-.046, .046, stackD3);
    float stackE0 = exp(-abs(stackD0) * 18.);
    float stackE1 = exp(-abs(stackD1) * 19.);
    float stackE2 = exp(-abs(stackD2) * 20.);
    float stackE3 = exp(-abs(stackD3) * 21.);
    vec3 stackBlue = mix(c7, c0, .36);
    vec3 stackColor = mix(stackBlue, c0, .15 + broad * .06);
    stackColor = mix(stackColor, mix(c2, c0, .16), stackP1 * .78);
    stackColor = mix(stackColor, mix(c2, c0, .055), stackP0 * .90);
    stackColor = mix(stackColor, mix(c2, c5, .22), stackP2 * .72);
    stackColor = mix(stackColor, mix(c2, c7, .10), stackP3 * .58);
    stackColor = mix(stackColor, c0, stackE1 * .13);
    stackColor = mix(stackColor, mix(c0, c5, .22), stackE0 * .16);
    stackColor = mix(stackColor, mix(c5, c2, .60), stackE2 * .14);
    stackColor = mix(stackColor, c2, stackE3 * .09);
    float stackPink = exp(-(pow(q.x - .88, 2.) / .060 + pow(q.y - .78, 2.) / .17)) * dreamina;
    float stackOrange = exp(-(pow(q.x - 1.00, 2.) / .040 + pow(q.y - .96, 2.) / .090)) * accent * dreamina;
    float stackYellow = exp(-(pow(q.x - 1.06, 2.) / .026 + pow(q.y - 1.04, 2.) / .052)) * accent * dreamina;
    stackColor = mix(stackColor, mix(c2, c5, .52), stackPink * .66);
    stackColor = mix(stackColor, c3, stackOrange * .60);
    stackColor = mix(stackColor, c4, stackYellow * .84);
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
      float mainD = grownPetalDistance(q, petalTip, petalBase, .34, .075);
      float innerD = grownPetalDistance(
        q,
        petalTip + petalAxis * .10 + petalNormal * .018,
        petalBase - petalAxis * .09 + petalNormal * .035,
        .235,
        .050
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

