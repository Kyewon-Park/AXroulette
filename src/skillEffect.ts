import type { GameObject } from './gameObject';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';

const lifetime = 500;

export class SkillEffect implements GameObject {
  private _size: number = 0;
  position: VectorLike;
  private _elapsed: number = 0;
  isDestroy: boolean = false;
  private type: 'impact' | 'retire' | 'bossPulse';

  constructor(x: number, y: number, type: 'impact' | 'retire' | 'bossPulse' = 'impact') {
    this.position = { x, y };
    this.type = type;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    this._size = (this._elapsed / lifetime) * (this.type === 'bossPulse' ? 18 : 10);
    if (this._elapsed > lifetime) {
      this.isDestroy = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, zoom: number, theme: ColorTheme) {
    ctx.save();
    const rate = this._elapsed / lifetime;
    ctx.globalAlpha = 1 - rate * rate;
    const isBossPulse = this.type === 'bossPulse';
    ctx.strokeStyle = isBossPulse ? '#fff5d9' : theme.danger;
    ctx.lineWidth = (isBossPulse ? 2.2 : 1.2) / zoom;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this._size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isBossPulse ? theme.danger : theme.accentAlt;
    ctx.lineWidth = (isBossPulse ? 1.4 : 0.8) / zoom;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this._size * 0.58, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isBossPulse ? 'rgba(255,140,140,0.95)' : 'rgba(255,245,220,0.95)';
    ctx.lineWidth = (isBossPulse ? 1.1 : 0.6) / zoom;
    ctx.beginPath();
    for (let index = 0; index < (isBossPulse ? 10 : 6); index++) {
      const angle = (Math.PI * 2 * index) / (isBossPulse ? 10 : 6) + rate * (isBossPulse ? 2.4 : 1.6);
      const inner = this._size * 0.25;
      const outer = this._size * (isBossPulse ? 1.15 : 0.92);
      const x1 = this.position.x + Math.cos(angle) * inner;
      const y1 = this.position.y + Math.sin(angle) * inner;
      const x2 = this.position.x + Math.cos(angle) * outer;
      const y2 = this.position.y + Math.sin(angle) * outer;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    if (this.type === 'retire') {
      const emojiSize = 18 + rate * 34;
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = 'rgba(40,12,12,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText('😵', 0, -2);
      ctx.fillText('😵', 0, -2);
      ctx.restore();
    }
    ctx.restore();
  }
}
