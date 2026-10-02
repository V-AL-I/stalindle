export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  shape: 'star' | 'circle' | 'spark' | 'cross';
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  public clear() {
    this.particles = [];
  }

  // Purge execution sparks & smoke
  public spawnPurgeSparks(x: number, y: number, count: number = 10) {
    const colors = ['#ff1a35', '#d90429', '#e63946', '#ffd166', '#8d99ae'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 1.2 + Math.random() * 3.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: 2.5 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        shape: Math.random() > 0.6 ? 'cross' : 'spark',
        life: 0,
        maxLife: 25 + Math.floor(Math.random() * 20),
      });
    }
  }

  // Survivor chime stars
  public spawnSurvivorChime(x: number, y: number, count: number = 8) {
    const colors = ['#06d6a0', '#ffd166', '#ffffff', '#2ec4b6'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.5 + Math.random() * 3.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: 'star',
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 20),
      });
    }
  }

  // Tier / Game celebration
  public spawnCelebration(width: number, height: number, count: number = 60) {
    const colors = ['#ffd166', '#ffb703', '#e63946', '#d90429', '#06d6a0', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const x = width * 0.5 + (Math.random() - 0.5) * width * 0.7;
      const y = height * 0.4 + (Math.random() - 0.5) * height * 0.4;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.3 ? 'star' : 'circle',
        life: 0,
        maxLife: 45 + Math.floor(Math.random() * 35),
      });
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // Gravity
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.alpha = 1 - p.life / p.maxLife;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'star') {
        this.drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
      } else if (p.shape === 'cross') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size);
        ctx.lineTo(p.size, p.size);
        ctx.moveTo(p.size, -p.size);
        ctx.lineTo(-p.size, p.size);
        ctx.stroke();
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // spark streak
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}
