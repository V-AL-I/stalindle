import { ParticleSystem } from './particles';

export interface RenderState {
  array: number[];
  keptIndices: boolean[];
  currentIndex: number; // Current sweep position [0..array.length]
  maxVal: number;
  isComplete: boolean;
  activeInspectIndex?: number;
}

export interface DyingBar {
  x: number;
  y: number;
  w: number;
  h: number;
  val: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class StalinRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private width: number = 800;
  private height: number = 380;
  private dpr: number = 1;

  // Active dying / falling purged bars
  private dyingBars: DyingBar[] = [];

  constructor(canvas: HTMLCanvasElement, particleSystem: ParticleSystem) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
    this.particleSystem = particleSystem;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public clearDyingBars() {
    this.dyingBars = [];
  }

  public triggerBarDeath(x: number, y: number, w: number, h: number, val: number) {
    // Spawn dying bar with upward pop and gravity tumble
    this.dyingBars.push({
      x,
      y,
      w,
      h,
      val,
      vx: (Math.random() - 0.5) * 2.0,
      vy: -3.0, // Upward pop
      rotation: 0,
      vRot: (Math.random() - 0.5) * 0.14,
      alpha: 1,
      life: 0,
      maxLife: 42,
    });

    this.particleSystem.spawnPurgeSparks(x + w * 0.5, y);
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.width = Math.max(320, Math.floor(rect.width));
    this.height = Math.max(260, Math.floor(rect.height || 360));

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
  }

  public render(state: RenderState) {
    const { array, currentIndex, maxVal, isComplete, activeInspectIndex } = state;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const size = array.length;
    const safeMax = Math.max(1, maxVal);

    // Padding
    const padTop = 38;
    const padBottom = 34;
    const plotHeight = h - padTop - padBottom;
    const floorY = h - padBottom;

    // 1. Dark Bunker Tactical Background
    ctx.fillStyle = '#0c0d12';
    ctx.fillRect(0, 0, w, h);

    // 2. Grid Lines & Scale Markers (Bigger text for readability)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = padTop + (plotHeight * i) / 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const valLabel = Math.round(safeMax * (1 - i / 3));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '700 12px "Share Tech Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(valLabel.toLocaleString(), w - 10, y - 5);
    }

    // 3. Render Bars (Static & Inspected)
    if (size <= 15) {
      this.renderSquadBars(state, floorY, plotHeight, safeMax);
    } else if (size <= 60) {
      this.renderPlatoonBars(state, floorY, plotHeight, safeMax);
    } else {
      this.renderCompanyBars(state, floorY, plotHeight, safeMax);
    }

    // 4. Render Dying / Falling Purged Bars
    this.updateAndDrawDyingBars(ctx);

    // 5. Active Inspection Spotlight & Laser Beam
    const inspectIdx = activeInspectIndex !== undefined ? activeInspectIndex : currentIndex;
    if (!isComplete && inspectIdx < size) {
      const sweepX = this.getBarCenterX(inspectIdx, size);

      // Glow behind laser
      const laserGrad = ctx.createLinearGradient(sweepX - 14, 0, sweepX + 14, 0);
      laserGrad.addColorStop(0, 'rgba(230, 57, 70, 0)');
      laserGrad.addColorStop(0.5, 'rgba(255, 26, 53, 0.4)');
      laserGrad.addColorStop(1, 'rgba(230, 57, 70, 0)');
      ctx.fillStyle = laserGrad;
      ctx.fillRect(sweepX - 14, padTop - 10, 28, plotHeight + 15);

      // Sharp central blade
      ctx.strokeStyle = '#ff1a35';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff1a35';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sweepX, padTop - 14);
      ctx.lineTo(sweepX, floorY + 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pointer chevron
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(sweepX - 6, padTop - 16);
      ctx.lineTo(sweepX + 6, padTop - 16);
      ctx.lineTo(sweepX, padTop - 4);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Base Line (Floor)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();

    // Prominent Echelon title watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.font = '700 22px "Bebas Neue", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      size === 10 ? 'ECHELON 1: THE SQUAD (10)' : size === 50 ? 'ECHELON 2: THE PLATOON (50)' : 'ECHELON 3: THE COMPANY (100)',
      16,
      h - 9
    );

    // Particles (Sparks, Chimes, Celebrations)
    this.particleSystem.updateAndDraw(ctx);
  }

  public getBarRect(index: number, size: number): { x: number; y: number; w: number; h: number } {
    const w = this.width;
    const h = this.height;
    const padTop = 38;
    const padBottom = 34;
    const plotHeight = h - padTop - padBottom;

    if (size <= 15) {
      const margin = 34;
      const availableW = w - margin * 2;
      const barW = Math.min(68, (availableW / size) * 0.74);
      const gap = (availableW - barW * size) / (size - 1);
      const x = margin + index * (barW + gap);
      return { x, y: 0, w: barW, h: plotHeight };
    } else if (size <= 60) {
      const margin = 18;
      const availableW = w - margin * 2;
      const barW = Math.max(4, (availableW / size) * 0.75);
      const gap = (availableW - barW * size) / (size - 1);
      const x = margin + index * (barW + gap);
      return { x, y: 0, w: barW, h: plotHeight };
    } else {
      const margin = 12;
      const availableW = w - margin * 2;
      const barW = Math.max(2, (availableW / size) * 0.78);
      const gap = (availableW - barW * size) / (size - 1);
      const x = margin + index * (barW + gap);
      return { x, y: 0, w: barW, h: plotHeight };
    }
  }

  private getBarCenterX(index: number, size: number): number {
    const rect = this.getBarRect(index, size);
    return rect.x + rect.w * 0.5;
  }

  // Tier 1: 10 Bars (Wide, large bold readable numbers)
  private renderSquadBars(
    state: RenderState,
    floorY: number,
    plotHeight: number,
    safeMax: number
  ) {
    const { array, keptIndices, currentIndex, activeInspectIndex } = state;
    const size = array.length;
    const ctx = this.ctx;

    for (let i = 0; i < size; i++) {
      const val = array[i];
      const normH = Math.max(0.04, val / safeMax);
      const barH = normH * plotHeight;
      const rect = this.getBarRect(i, size);
      const x = rect.x;
      const barW = rect.w;
      const y = floorY - barH;

      const isInspected = i < currentIndex;
      const isCurrent = i === (activeInspectIndex !== undefined ? activeInspectIndex : currentIndex);

      if (isCurrent) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, barW, 4);
      } else if (!isInspected) {
        // Uninspected
        ctx.fillStyle = '#1c1f2b';
        ctx.fillRect(x, y, barW, barH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        // Big value text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '700 15px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), x + barW * 0.5, y - 7);
      } else {
        // Inspected
        if (keptIndices[i]) {
          // Loyal survivor!
          const grad = ctx.createLinearGradient(0, y, 0, floorY);
          grad.addColorStop(0, '#ffd166');
          grad.addColorStop(0.18, '#06d6a0');
          grad.addColorStop(1, '#057a55');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barW, barH);

          // Gold cap
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(x, y, barW, 4);

          // Star on top (enlarged)
          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#ffd166';
          ctx.textAlign = 'center';
          ctx.fillText('★', x + barW * 0.5, y - 20);

          // Big bold number above bar
          ctx.font = '700 16px "Share Tech Mono", monospace';
          ctx.fillStyle = '#06d6a0';
          ctx.fillText(String(val), x + barW * 0.5, y - 5);
        } else {
          // Purged!
          ctx.fillStyle = 'rgba(230, 57, 70, 0.08)';
          ctx.fillRect(x, y, barW, barH);
          ctx.strokeStyle = 'rgba(230, 57, 70, 0.25)';
          ctx.strokeRect(x, y, barW, barH);

          // Red execution base mark
          ctx.fillStyle = '#ff1a35';
          ctx.fillRect(x, floorY - 3.5, barW, 3.5);

          // Red "✕" on floor
          ctx.fillStyle = 'rgba(230, 57, 70, 0.6)';
          ctx.font = '700 12px "Share Tech Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('✕', x + barW * 0.5, floorY - 8);
        }
      }

      // Soldier index # label at bottom (enlarged)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '700 12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1}`, x + barW * 0.5, floorY + 16);
    }
  }

  // Tier 2: 50 Bars
  private renderPlatoonBars(
    state: RenderState,
    floorY: number,
    plotHeight: number,
    safeMax: number
  ) {
    const { array, keptIndices, currentIndex, activeInspectIndex } = state;
    const size = array.length;
    const ctx = this.ctx;

    for (let i = 0; i < size; i++) {
      const val = array[i];
      const normH = Math.max(0.04, val / safeMax);
      const barH = normH * plotHeight;
      const rect = this.getBarRect(i, size);
      const x = rect.x;
      const barW = rect.w;
      const y = floorY - barH;

      const isInspected = i < currentIndex;
      const isCurrent = i === (activeInspectIndex !== undefined ? activeInspectIndex : currentIndex);

      if (isCurrent) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x, y, barW, barH);
      } else if (!isInspected) {
        ctx.fillStyle = '#1c1f2b';
        ctx.fillRect(x, y, barW, barH);
      } else if (keptIndices[i]) {
        // Survivor
        const grad = ctx.createLinearGradient(0, y, 0, floorY);
        grad.addColorStop(0, '#ffd166');
        grad.addColorStop(0.2, '#06d6a0');
        grad.addColorStop(1, '#057a55');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);

        // Gold tip
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x, y, barW, 2.5);

        // Text label on top for survivors (enlarged)
        ctx.fillStyle = '#ffd166';
        ctx.font = '700 11px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), x + barW * 0.5, y - 5);
      } else {
        // Purged
        ctx.fillStyle = 'rgba(230, 57, 70, 0.08)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = 'rgba(230, 57, 70, 0.45)';
        ctx.fillRect(x, floorY - 2.5, barW, 2.5);
      }
    }
  }

  // Tier 3: 100 Bars
  private renderCompanyBars(
    state: RenderState,
    floorY: number,
    plotHeight: number,
    safeMax: number
  ) {
    const { array, keptIndices, currentIndex, activeInspectIndex } = state;
    const size = array.length;
    const ctx = this.ctx;

    for (let i = 0; i < size; i++) {
      const val = array[i];
      const normH = Math.max(0.03, val / safeMax);
      const barH = normH * plotHeight;
      const rect = this.getBarRect(i, size);
      const x = rect.x;
      const barW = rect.w;
      const y = floorY - barH;

      const isInspected = i < currentIndex;
      const isCurrent = i === (activeInspectIndex !== undefined ? activeInspectIndex : currentIndex);

      if (isCurrent) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x, y, barW, barH);
      } else if (!isInspected) {
        ctx.fillStyle = '#1c1f2b';
        ctx.fillRect(x, y, barW, barH);
      } else if (keptIndices[i]) {
        // Survivor
        ctx.fillStyle = '#06d6a0';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x, y, barW, 2.5);
      } else {
        // Purged
        ctx.fillStyle = 'rgba(230, 57, 70, 0.08)';
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = 'rgba(230, 57, 70, 0.35)';
        ctx.fillRect(x, floorY - 2, barW, 2);
      }
    }
  }

  // Update and draw dying/tumbling purged bars
  private updateAndDrawDyingBars(ctx: CanvasRenderingContext2D) {
    if (this.dyingBars.length === 0) return;

    ctx.save();
    for (let i = this.dyingBars.length - 1; i >= 0; i--) {
      const b = this.dyingBars[i];
      b.life++;
      if (b.life >= b.maxLife) {
        this.dyingBars.splice(i, 1);
        continue;
      }

      // Physics
      b.vy += 0.45; // Gravity acceleration
      b.x += b.vx;
      b.y += b.vy;
      b.rotation += b.vRot;
      b.alpha = Math.max(0, 1 - b.life / b.maxLife);

      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(b.x + b.w * 0.5, b.y + b.h * 0.5);
      ctx.rotate(b.rotation);

      // Red dying bar
      ctx.fillStyle = '#ff1a35';
      ctx.shadowColor = '#ff1a35';
      ctx.shadowBlur = 10;
      ctx.fillRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);

      // Top execution cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      const crossSize = Math.min(b.w * 0.6, 9);
      ctx.beginPath();
      ctx.moveTo(-crossSize, -b.h * 0.5 + 4);
      ctx.lineTo(crossSize, -b.h * 0.5 + 4 + crossSize * 2);
      ctx.moveTo(crossSize, -b.h * 0.5 + 4);
      ctx.lineTo(-crossSize, -b.h * 0.5 + 4 + crossSize * 2);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }
}
