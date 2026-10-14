import type { BreathFrame } from '../../lib/breath-controller';
import { easeInOut } from '../../lib/engine';
import {
  buildShape,
  distanceAt,
  pointAt,
  pointOnSide,
  pointsPath,
  resample,
  secondsLabel,
  type Point,
  type Shape,
} from '../../lib/shape';
import { cycleMs, type Technique } from '../../lib/techniques';
import type { StageMoment } from '../types';

/**
 * Draws the Pattern theme into an SVG with viewBox 0 0 100 100. Plain DOM updates, no React,
 * so following the breath costs a few attribute writes per frame.
 */
export interface PatternElements {
  svg: SVGSVGElement;
  fill: SVGPathElement;
  track: SVGPathElement;
  done: SVGPathElement;
  labels: SVGGElement;
  halo: SVGCircleElement;
  dot: SVGCircleElement;
}

/** Space around the shape for the side labels, in viewBox units. */
const PAD = 16;
const SPAN = 100 - PAD * 2;
const MORPH_MS = 700;
const MORPH_POINTS = 240;
const DOT_R = 2.6;
const HALO_MIN = 3.6;
const HALO_GROW = 3.4;
const SVG_NS = 'http://www.w3.org/2000/svg';

const map = (pt: Point): Point => ({ x: PAD + pt.x * SPAN, y: PAD + pt.y * SPAN });
const f = (n: number) => n.toFixed(2);

function shapePath(shape: Shape): string {
  const points = shape.sides.flatMap((side, i) => (i === 0 ? side.points : side.points.slice(1))).map(map);
  return pointsPath(points, 2);
}

function signature(technique: Technique): string {
  return technique.phases.map((p) => `${p.kind}${p.ms}`).join(' ');
}

/** How long the first-run drawing of a shape takes: about one breath, kept between 4.5 and 8 s. */
export function introDurationMs(technique: Technique): number {
  return Math.min(8000, Math.max(4500, cycleMs(technique) * 0.6));
}

export class PatternRenderer {
  private shape: Shape | null = null;
  private key = '';
  private outline: Point[] = [];
  private morph: { from: Point[]; to: Point[]; start: number } | null = null;
  private intro: { start: number; duration: number } | null = null;
  private moment: StageMoment = 'live';
  private frame: BreathFrame | null = null;
  private raf: number | null = null;
  private activeLabel = -1;
  private labelEls: SVGTextElement[] = [];
  private fontUnits = 5;

  constructor(
    private readonly els: PatternElements,
    private reducedMotion: boolean,
  ) {}

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  /** Called on resize with the size of one viewBox unit in CSS pixels. */
  resize(pxPerUnit: number) {
    if (!(pxPerUnit > 0)) return;
    // Labels stay at least 16px on a phone and grow a little with the stage, up to 24px.
    const px = Math.max(16, Math.min(24, pxPerUnit * 100 * 0.045));
    this.fontUnits = px / pxPerUnit;
    this.els.labels.setAttribute('font-size', f(this.fontUnits));
    this.placeLabels();
  }

  setMoment(moment: StageMoment) {
    if (moment === this.moment) return;
    this.moment = moment;
    this.els.svg.dataset.moment = moment;
    if (moment === 'intro' && this.frame) this.startIntro(this.frame.technique);
    else this.intro = null;
    if (moment !== 'intro') this.showLabels(this.shape ? this.shape.sides.length : 0);
    if (this.frame) this.draw(this.frame);
  }

  draw(frame: BreathFrame) {
    this.frame = frame;
    const key = signature(frame.technique);
    if (key !== this.key) this.setShape(frame.technique);
    if (this.morph || this.intro || !this.shape) return;

    const { breath, status } = frame;
    const total = this.shape.length * SPAN;
    if (this.moment === 'intro') {
      // The first-run drawing is finished (or was skipped for reduced motion): keep it whole.
      this.setDone(total, total);
      this.setDot(map(pointAt(this.shape, 0, 0)), 0.35, true);
      this.showLabels(this.shape.sides.length);
      return;
    }
    let along = 0;
    let at: Point;
    if (status === 'complete' || this.moment === 'complete') {
      along = total;
      at = pointAt(this.shape, 0, 0);
    } else if (status === 'ready') {
      at = pointAt(this.shape, 0, 0);
    } else {
      along = distanceAt(this.shape, breath.phaseIndex, breath.progress) * SPAN;
      at = pointAt(this.shape, breath.phaseIndex, breath.progress);
    }
    this.setDone(along, total);
    this.setDot(map(at), status === 'ready' ? 0.35 : breath.lungLevel, true);
    this.setActiveLabel(status === 'running' || status === 'paused' ? breath.phaseIndex : -1);
  }

  destroy() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private setShape(technique: Technique) {
    const next = buildShape(technique.phases);
    const nextOutline = resample(next, MORPH_POINTS).map(map);
    const animate = this.shape !== null && !this.reducedMotion;
    const from = this.morph ? this.currentMorphPoints(performance.now()) : this.outline;
    this.shape = next;
    this.key = signature(technique);
    this.outline = nextOutline;
    this.buildLabels();
    if (animate) {
      this.morph = { from, to: nextOutline, start: performance.now() };
      this.els.svg.dataset.morphing = 'true';
      this.setDone(0, 1);
      this.showLabels(0);
      this.setDot(map(pointAt(next, 0, 0)), 0.35, false);
      this.loop();
    } else {
      this.finishMorph();
    }
    if (this.moment === 'intro') this.startIntro(technique);
  }

  private finishMorph() {
    this.morph = null;
    delete this.els.svg.dataset.morphing;
    if (!this.shape) return;
    const d = shapePath(this.shape);
    this.els.track.setAttribute('d', d);
    this.els.done.setAttribute('d', d);
    this.els.fill.setAttribute('d', d);
    if (this.moment !== 'intro') this.showLabels(this.shape.sides.length);
    if (this.frame && !this.intro) this.draw(this.frame);
  }

  private currentMorphPoints(now: number): Point[] {
    if (!this.morph) return this.outline;
    const t = easeInOut((now - this.morph.start) / MORPH_MS);
    const { from, to } = this.morph;
    if (from.length !== to.length) return to;
    return to.map((b, i) => {
      const a = from[i]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    });
  }

  private startIntro(technique: Technique) {
    if (this.reducedMotion || !this.shape) {
      this.intro = null;
      this.showLabels(this.shape ? this.shape.sides.length : 0);
      this.setDone(this.shape ? this.shape.length * SPAN : 0, this.shape ? this.shape.length * SPAN : 1);
      return;
    }
    this.intro = { start: performance.now() + (this.morph ? MORPH_MS : 0), duration: introDurationMs(technique) };
    this.showLabels(0);
    this.loop();
  }

  private loop() {
    if (this.raf !== null) return;
    const step = (now: number) => {
      this.raf = null;
      if (this.morph) {
        const points = this.currentMorphPoints(now);
        const d = pointsPath(points, 2);
        this.els.track.setAttribute('d', d);
        this.els.fill.setAttribute('d', d);
        if (now - this.morph.start >= MORPH_MS) this.finishMorph();
      }
      if (this.intro && !this.morph && this.shape) this.drawIntro(now);
      if (this.morph || this.intro) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  /** The dot draws the shape once, side by side; each side's label appears as it is finished. */
  private drawIntro(now: number) {
    const shape = this.shape!;
    const intro = this.intro!;
    const t = Math.min(1, Math.max(0, (now - intro.start) / intro.duration));
    const along = shape.length * t;
    let index = 0;
    while (index < shape.sides.length - 1 && along >= shape.starts[index + 1]!) index++;
    const side = shape.sides[index]!;
    const within = side.length > 0 ? (along - shape.starts[index]!) / side.length : 0;
    this.setDone(along * SPAN, shape.length * SPAN);
    this.setDot(map(t >= 1 ? pointAt(shape, 0, 0) : pointOnSide(side, within)), 0.35, true);
    this.showLabels(t >= 1 ? shape.sides.length : index);
    this.setActiveLabel(t >= 1 ? -1 : index);
    if (t >= 1) this.intro = null;
  }

  private setDone(along: number, total: number) {
    const done = this.els.done;
    done.style.strokeDasharray = `${f(along)} ${f(total + 1)}`;
    done.style.opacity = along > 0.01 ? '1' : '0';
  }

  private setDot(at: Point, level: number, visible: boolean) {
    const { dot, halo } = this.els;
    dot.setAttribute('cx', f(at.x));
    dot.setAttribute('cy', f(at.y));
    dot.setAttribute('r', f(DOT_R));
    halo.setAttribute('cx', f(at.x));
    halo.setAttribute('cy', f(at.y));
    halo.setAttribute('r', f(HALO_MIN + HALO_GROW * Math.min(1, Math.max(0, level))));
    dot.style.opacity = visible ? '1' : '0';
    halo.style.opacity = visible ? '' : '0';
  }

  private buildLabels() {
    const group = this.els.labels;
    while (group.firstChild) group.removeChild(group.firstChild);
    this.labelEls = (this.shape?.sides ?? []).map((side) => {
      const text = document.createElementNS(SVG_NS, 'text');
      text.textContent = secondsLabel(side.ms);
      text.setAttribute('class', 'pattern-label');
      text.dataset.kind = side.kind;
      group.appendChild(text);
      return text;
    });
    this.activeLabel = -1;
    this.placeLabels();
  }

  private placeLabels() {
    if (!this.shape) return;
    const gap = this.fontUnits * 0.75;
    this.shape.sides.forEach((side, i) => {
      const text = this.labelEls[i];
      if (!text) return;
      const mid = map(side.middle);
      const { x: ox, y: oy } = side.outward;
      text.setAttribute('x', f(mid.x + ox * gap));
      text.setAttribute('y', f(mid.y + oy * gap));
      text.setAttribute('text-anchor', ox > 0.45 ? 'start' : ox < -0.45 ? 'end' : 'middle');
      text.setAttribute('dominant-baseline', oy > 0.45 ? 'hanging' : oy < -0.45 ? 'auto' : 'central');
    });
  }

  private showLabels(count: number) {
    this.labelEls.forEach((text, i) => {
      text.dataset.shown = i < count ? 'true' : 'false';
    });
  }

  private setActiveLabel(index: number) {
    if (index === this.activeLabel) return;
    this.labelEls[this.activeLabel]?.removeAttribute('data-active');
    this.labelEls[index]?.setAttribute('data-active', 'true');
    this.activeLabel = index;
  }
}
