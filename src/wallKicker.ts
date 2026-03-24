import type { StageKicker } from './data/maps';
import type { GameObject } from './gameObject';
import type { Marble } from './marble';
import type { ColorTheme } from './types/ColorTheme';

const ACTIVE_MS = 180;
const RESET_MS = 220;
const COOLDOWN_MS = 260;

export class WallKicker implements GameObject {
  isDestroy = false;

  private _state: 'idle' | 'active' | 'reset' = 'idle';
  private _elapsed = 0;
  private _cooldown = 0;
  private _currentAngle: number;

  constructor(private readonly config: StageKicker) {
    this._currentAngle = config.restAngle;
  }

  update(deltaTime: number): void {
    if (this._cooldown > 0) {
      this._cooldown = Math.max(0, this._cooldown - deltaTime);
    }

    if (this._state === 'idle') {
      this._currentAngle = this.config.restAngle;
      return;
    }

    this._elapsed += deltaTime;

    if (this._state === 'active') {
      const t = Math.min(1, this._elapsed / ACTIVE_MS);
      this._currentAngle = this.config.restAngle + (this.config.activeAngle - this.config.restAngle) * t;
      if (t >= 1) {
        this._state = 'reset';
        this._elapsed = 0;
      }
      return;
    }

    const t = Math.min(1, this._elapsed / RESET_MS);
    this._currentAngle = this.config.activeAngle + (this.config.restAngle - this.config.activeAngle) * t;
    if (t >= 1) {
      this._state = 'idle';
      this._elapsed = 0;
      this._currentAngle = this.config.restAngle;
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number, theme: ColorTheme): void {
    const { hingeX, hingeY, length, color, side } = this.config;
    const direction = side === 'left' ? 1 : -1;
    ctx.save();
    ctx.translate(hingeX, hingeY);
    ctx.rotate(this._currentAngle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    const drawX = direction > 0 ? 0 : -length * 2;
    ctx.fillRect(drawX, -0.08, length * 2, 0.16);
    ctx.strokeRect(drawX, -0.08, length * 2, 0.16);

    ctx.beginPath();
    ctx.fillStyle = theme.winnerBackground;
    ctx.strokeStyle = '#fff4dc';
    ctx.lineWidth = 1 / zoom;
    ctx.arc(0, 0, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  tryKick(marble: Marble): boolean {
    if (this._cooldown > 0 || this._state !== 'idle') return false;

    const { hingeX, hingeY, length, side } = this.config;
    const direction = side === 'left' ? 1 : -1;
    const endX = hingeX + Math.cos(this.config.restAngle) * length * 2 * direction;
    const endY = hingeY + Math.sin(this.config.restAngle) * length * 2 * direction;
    const segmentDx = endX - hingeX;
    const segmentDy = endY - hingeY;
    const segmentLengthSq = segmentDx * segmentDx + segmentDy * segmentDy;
    const marbleDx = marble.x - hingeX;
    const marbleDy = marble.y - hingeY;
    const projection =
      segmentLengthSq === 0 ? 0 : Math.max(0, Math.min(1, (marbleDx * segmentDx + marbleDy * segmentDy) / segmentLengthSq));
    if (projection < 0.5) return false;
    const closestX = hingeX + segmentDx * projection;
    const closestY = hingeY + segmentDy * projection;
    const dx = marble.x - closestX;
    const dy = marble.y - closestY;

    if (dx * dx + dy * dy > 0.75 * 0.75) return false;

    const correctSide = side === 'left' ? marble.x <= endX + 0.5 : marble.x >= endX - 0.5;
    const comingDown = marble.y >= hingeY - 0.8;
    if (!correctSide || !comingDown) return false;

    this._state = 'active';
    this._elapsed = 0;
    this._cooldown = COOLDOWN_MS;
    return true;
  }

  get impulse() {
    return this.config.impulse;
  }
}
