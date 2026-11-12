/**
 * The WebGL renderer: the only file that imports three.js. Named imports only, so the bundle
 * keeps to the renderer, geometry and shader pieces listed in HERO-SPEC 7.6; the island loads
 * this module with `await import()` after first paint.
 *
 * One interleaved buffer, two draws: the cards (page color, pushed back one unit) and the dots
 * on top, in one depth buffer. Colors are raw sRGB straight to the framebuffer, with no tone
 * mapping and no color-space step, so a token on the canvas equals the same token in CSS.
 */
import {
  BufferGeometry,
  Camera,
  Color,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { BREAK, MAX_PLATES, POINT_SIZE_HEADROOM } from "../../lib/hero/constants";
import type { Field, Palette, Renderer } from "../../lib/hero/project";
import { STRIDE } from "../../lib/hero/project";

const num = (v: number) => v.toFixed(3);

/** The same projection as `projectPoint`, five lines of it. */
const VERTEX = `
uniform vec2 uRes, uC, uEye;
uniform float uD, uP, uDot, uGap, uDpr, uBack, uPitch, uBackK, uMaxDot;
uniform vec3 uCol[${MAX_PLATES}], uBg;
attribute vec2 aux;
varying vec3 vCol;
void main() {
  float k = position.z;
  bool front = k < 0.5;
  float d = uD * k * uGap / (1.0 - k * uGap);
  float w = uD + d;
  float T = 0.0;
  bool back = k > uBackK - 0.5;
  if (!back) {
    T = clamp((uP - aux.x) / ${num(BREAK.span)}, 0.0, 1.0);
    w -= uD * (1.0 - exp(-${num(BREAK.zoomK)} * T)) * (uD + d) / uD;
  }
  vec2 e = uC + uEye;
  vec2 s = e + (uC + (position.xy + (front ? vec2((uPitch - uDot) * 0.5) : vec2(0.0)) - uC) * (uD + d) / uD - e) * uD / w;
  // The front plate is solid ink: dot = pitch, centred on the same cell.
  float size = min(uMaxDot, (front ? uPitch : uDot) * (uD + d) / w);
  if (back) {
    float t = smoothstep(${num(BREAK.lineFrom)}, ${num(BREAK.lineTo)}, uP);
    s = mix(s, vec2(aux.y * uRes.x, uRes.y - uDot * 0.5), t);
  }
  vCol = uBack > 0.5 ? uBg : uCol[int(k + 0.5)];
  if (uBack > 0.5) { if (!front) size *= (uPitch + 0.5) / uDot; w += 1.0; }
  gl_Position = T >= 1.0
    ? vec4(2.0, 2.0, 2.0, 1.0)
    : vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, clamp(w / (uD * 4.0), 0.0, 1.0) * 2.0 - 1.0, 1.0);
  gl_PointSize = size * uDpr;
}`;

const FRAGMENT = `varying vec3 vCol; void main() { gl_FragColor = vec4(vCol, 1.0); }`;

const raw = ([r, g, b]: readonly [number, number, number]) => new Color(r / 255, g / 255, b / 255);

export function createGlRenderer(canvas: HTMLCanvasElement, palette: Palette): Renderer {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new Camera();
  const geometry = new BufferGeometry();
  const uniforms = {
    uRes: { value: new Vector2() },
    uC: { value: new Vector2() },
    uEye: { value: new Vector2() },
    uD: { value: 1 },
    uP: { value: 0 },
    uDot: { value: 1 },
    uGap: { value: 0 },
    uDpr: { value: 1 },
    uBack: { value: 0 },
    uPitch: { value: 1 },
    uBackK: { value: 1 },
    uMaxDot: { value: BREAK.maxDot as number },
    uBg: { value: raw(palette.bg) },
    uCol: { value: Array.from({ length: MAX_PLATES }, () => new Color()) },
  };
  const setPalette = (next: Palette) => {
    uniforms.uBg.value = raw(next.bg);
    next.plates.forEach((rgb, i) => uniforms.uCol.value[i]?.copy(raw(rgb)));
  };
  setPalette(palette);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: true,
    depthWrite: true,
    transparent: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    setField(f: Field, dpr: number) {
      // A rebuild replaces the attributes: release the old ones' GPU buffers first.
      geometry.dispose();
      const buffer = new InterleavedBuffer(f.pts, STRIDE);
      geometry.setAttribute("position", new InterleavedBufferAttribute(buffer, 3, 0));
      geometry.setAttribute("aux", new InterleavedBufferAttribute(buffer, 2, 3));
      renderer.setPixelRatio(dpr);
      renderer.setSize(f.W, f.H, false);
      // A card is drawn (pitch + 0.5) / dot times the dot; both must fit the hardware's range.
      const limit = renderer
        .getContext()
        .getParameter(renderer.getContext().ALIASED_POINT_SIZE_RANGE) as Float32Array;
      const room = Math.floor(
        (limit[1] ?? POINT_SIZE_HEADROOM * dpr) / (dpr * ((f.g + 0.5) / f.dot)),
      );
      f.maxDot = Math.min(BREAK.maxDot, room);
      uniforms.uRes.value.set(f.W, f.H);
      uniforms.uC.value.set(f.C[0], f.C[1]);
      uniforms.uD.value = f.D;
      uniforms.uDot.value = f.dot;
      uniforms.uGap.value = f.c;
      uniforms.uPitch.value = f.g;
      uniforms.uDpr.value = dpr;
      uniforms.uBackK.value = f.plates - 1;
      uniforms.uMaxDot.value = f.maxDot;
    },
    setPalette,
    draw(_f, eye, p) {
      uniforms.uEye.value.set(eye[0], eye[1]);
      uniforms.uP.value = p;
      renderer.autoClear = true;
      uniforms.uBack.value = 1;
      renderer.render(scene, camera); // cards
      renderer.autoClear = false;
      uniforms.uBack.value = 0;
      renderer.render(scene, camera); // dots, same depth buffer
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Give the GPU context back now: browsers allow only a handful per page, and this
      // canvas is never reused (the island puts a fresh one in before the next start).
      renderer.forceContextLoss();
    },
  };
}
