
export interface RopePoint {
    x: number;
    y: number;
    px: number;
    py: number;
    pinned: boolean;
  }
  
  export interface RopeConfig {
    segments: number;
    length: number;
    gravity: number;
    damping: number;
    iterations: number;
  }
  
  const DEFAULTS: RopeConfig = {
    segments: 18,
    length: 90,
    gravity: 2600,
    damping: 0.982,
    iterations: 16,
  };
  
  export class Rope {
    points: RopePoint[] = [];
    anchor = { x: 0, y: 0 };
    force = { x: 0, y: 0 };
    cfg: RopeConfig;
  
    constructor(anchor: { x: number; y: number }, cfg: Partial<RopeConfig> = {}) {
      this.cfg = { ...DEFAULTS, ...cfg };
      this.anchor = { ...anchor };
      this.reset();
    }
  
    reset() {
      const seg = this.segLength;
      this.points = [];
      for (let i = 0; i <= this.cfg.segments; i++) {
        const y = this.anchor.y + seg * i;
        this.points.push({
          x: this.anchor.x,
          y,
          px: this.anchor.x,
          py: y,
          pinned: i === 0,
        });
      }
    }
  
    get segLength() {
      return this.cfg.length / this.cfg.segments;
    }

    get tip() {
      return this.points[this.points.length - 1];
    }
  
    get neck() {
      return this.points[this.points.length - 2];
    }
  
    get held() {
      return this.tip.pinned;
    }
  
    setAnchor(x: number, y: number) {
      this.anchor.x = x;
      this.anchor.y = y;
    }
  
    setLength(length: number) {
      this.cfg.length = length;
    }
  

    holdTip(x: number, y: number, ease = 0.32) {
      const t = this.tip;
      t.pinned = true;
      t.px = t.x;
      t.py = t.y;
      t.x += (x - t.x) * ease;
      t.y += (y - t.y) * ease;
    }
  
    releaseTip(maxSpeed = 40) {
      const t = this.tip;
      t.pinned = false;
  
      let vx = t.x - t.px;
      let vy = t.y - t.py;
      const speed = Math.hypot(vx, vy);
  

      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
      }
  
      t.px = t.x - vx;
      t.py = t.y - vy;
    }

    step(dt: number) {
      const { damping, gravity, iterations } = this.cfg;
      const ax = this.force.x;
      const ay = this.force.y + gravity;
      const dt2 = dt * dt;

      for (const p of this.points) {
        if (p.pinned) continue;
        const vx = (p.x - p.px) * damping;
        const vy = (p.y - p.py) * damping;
        p.px = p.x;
        p.py = p.y;
        p.x += vx + ax * dt2;
        p.y += vy + ay * dt2;
      }
      const seg = this.segLength;
      for (let k = 0; k < iterations; k++) {
        const a = this.points[0];
        a.x = this.anchor.x;
        a.y = this.anchor.y;
  
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
  
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const diff = (dist - seg) / dist;

          const w1 = p1.pinned ? 0 : 1;
          const w2 = p2.pinned ? 0 : 1;
          const total = w1 + w2;
          if (total === 0) continue;
  
          if (w1) {
            p1.x += dx * diff * (w1 / total);
            p1.y += dy * diff * (w1 / total);
          }
          if (w2) {
            p2.x -= dx * diff * (w2 / total);
            p2.y -= dy * diff * (w2 / total);
          }
        }
      }
    }
  }
  

  export function ropePath(points: RopePoint[]): string {
    if (points.length < 2) return "";
  
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const n = points[i + 1];
      const mx = (p.x + n.x) / 2;
      const my = (p.y + n.y) / 2;
      d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
  
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  
    return d;
  }