import { Skills, STUCK_DELAY, Themes } from './data/constants';
import type { IPhysics } from './IPhysics';
import options from './options';
import type { ColorTheme } from './types/ColorTheme';
import type { VectorLike } from './types/VectorLike';
import { transformGuard } from './utils/transformGuard';
import { rad } from './utils/utils';
import { Vector } from './utils/Vector';

const STATUS_LIFETIME = 650;
const GHOST_DURATION = 700;
const EMOJI_SKINS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜',
  '🤪', '😝', '🤑', '🤗', '🤠', '😎', '🤓', '🧐', '🥳', '😺',
  '😸', '😹', '😻', '😼', '🙃', '😌', '😏', '😺', '😇', '😋',
];

export class Marble {
  private static emojiSpriteCache = new Map<string, CanvasImageSource>();
  type = 'marble' as const;
  name = '';
  size = 0.5;
  color = 'red';
  hue = 0;
  impact = 0;
  weight = 1;
  skill: Skills = Skills.None;
  isActive = false;

  private _skillRate = 0.0005;
  private _coolTime = 5000;
  private _maxCoolTime = 5000;
  private _stuckTime = 0;
  private _statusEffect: 'boost' | 'retire' | null = null;
  private _statusElapsed = 0;
  private _ghostElapsed = 0;
  private _windCooldown = 0;
  private _position = { x: 0, y: 0, angle: 0 };
  private lastPosition: VectorLike = { x: 0, y: 0 };
  private theme: ColorTheme = Themes.dark;
  private physics: IPhysics;
  private emoji: string;

  id: number;

  get position() {
    return this._position;
  }

  get x() {
    return this.position.x;
  }

  set x(v: number) {
    this.position.x = v;
  }

  get y() {
    return this.position.y;
  }

  set y(v: number) {
    this.position.y = v;
  }

  get angle() {
    return this.position.angle;
  }

  constructor(
    physics: IPhysics,
    order: number,
    max: number,
    name?: string,
    weight = 1,
    spawn?: VectorLike
  ) {
    this.name = name || `M${order}`;
    this.weight = weight;
    this.physics = physics;

    this._maxCoolTime = 1000 + (1 - this.weight) * 4000;
    this._coolTime = this._maxCoolTime * Math.random();
    this._skillRate = 0.2 * this.weight;

    const maxLine = Math.ceil(max / 10);
    const line = Math.floor(order / 10);
    const lineDelta = -Math.max(0, Math.ceil(maxLine - 5));
    this.hue = (360 / max) * order;
    this.color = `hsl(${this.hue} 100% 70%)`;
    this.id = order;
    this.emoji = EMOJI_SKINS[order % EMOJI_SKINS.length];

    const spawnX = spawn?.x ?? 10.25 + (order % 10) * 0.6;
    const spawnY = spawn?.y ?? maxLine - line + lineDelta;
    this._position = { x: spawnX, y: spawnY, angle: 0 };
    physics.createMarble(order, spawnX, spawnY);
  }

  syncPhysicsPosition() {
    const position = this.physics.getMarblePosition(this.id);
    if (position) {
      this._position = position;
    }
  }

  setCachedTransform(position: VectorLike, angle = this._position.angle) {
    this._position = { x: position.x, y: position.y, angle };
  }

  update(deltaTime: number) {
    if (this.isActive && Vector.lenSq(Vector.sub(this.lastPosition, this.position)) < 0.00001) {
      this._stuckTime += deltaTime;

      if (this._stuckTime > STUCK_DELAY) {
        this.physics.shakeMarble(this.id);
        this._stuckTime = 0;
      }
    } else {
      this._stuckTime = 0;
    }

    this.lastPosition = { x: this.position.x, y: this.position.y };
    this.skill = Skills.None;

    if (this.impact) {
      this.impact = Math.max(0, this.impact - deltaTime);
    }

    if (this._statusElapsed > 0) {
      this._statusElapsed = Math.max(0, this._statusElapsed - deltaTime);
      if (this._statusElapsed === 0) {
        this._statusEffect = null;
      }
    }

    if (this._ghostElapsed > 0) {
      this._ghostElapsed = Math.max(0, this._ghostElapsed - deltaTime);
    }

    if (this._windCooldown > 0) {
      this._windCooldown = Math.max(0, this._windCooldown - deltaTime);
    }

    if (!this.isActive) return;
    if (options.useSkills) {
      this._updateSkillInformation(deltaTime);
    }
  }

  private _updateSkillInformation(deltaTime: number) {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }

    if (this._coolTime <= 0) {
      this.skill = Math.random() < this._skillRate ? Skills.Impact : Skills.None;
      this._coolTime = this._maxCoolTime;
    }
  }

  showBoost() {
    this._statusEffect = 'boost';
    this._statusElapsed = STATUS_LIFETIME;
    this._ghostElapsed = GHOST_DURATION;
  }

  showRetire() {
    this._statusEffect = 'retire';
    this._statusElapsed = STATUS_LIFETIME;
    this._ghostElapsed = 0;
  }

  get isGhost() {
    return this._ghostElapsed > 0;
  }

  get canReceiveWind() {
    return this._windCooldown <= 0;
  }

  markWind() {
    this._windCooldown = 120;
  }

  render(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    outline: boolean,
    isMinimap = false,
    skin: CanvasImageSource | undefined,
    viewPort: { x: number; y: number; w: number; h: number; zoom: number },
    theme: ColorTheme
  ) {
    this.theme = theme;
    const viewPortHw = viewPort.w / viewPort.zoom / 2;
    const viewPortHh = viewPort.h / viewPort.zoom / 2;
    const viewPortLeft = viewPort.x - viewPortHw;
    const viewPortRight = viewPort.x + viewPortHw;
    const viewPortTop = viewPort.y - viewPortHh - this.size / 2;
    const viewPortBottom = viewPort.y + viewPortHh;

    if (
      !isMinimap &&
      (this.x < viewPortLeft || this.x > viewPortRight || this.y < viewPortTop || this.y > viewPortBottom)
    ) {
      return;
    }

    const transform = ctx.getTransform();
    if (isMinimap) {
      this._renderMinimap(ctx);
    } else {
      this._renderNormal(ctx, zoom, outline, skin);
    }
    ctx.setTransform(transform);
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    this._drawMarbleBody(ctx, true);
  }

  private _drawMarbleBody(ctx: CanvasRenderingContext2D, isMinimap: boolean) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, isMinimap ? this.size : this.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(ctx: CanvasRenderingContext2D, zoom: number, outline: boolean, skin?: CanvasImageSource) {
    this._drawEmojiFace(ctx);

    if (this._statusEffect) {
      this._drawStatusRing(ctx, zoom);
    }

    this._drawName(ctx, zoom);

    if (outline) {
      this._drawOutline(ctx, 2 / zoom);
    }

    if (options.useSkills) {
      this._renderCoolTime(ctx, zoom);
    }
  }

  private _drawEmojiFace(ctx: CanvasRenderingContext2D) {
    transformGuard(ctx, () => {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      if (this.isGhost) {
        ctx.globalAlpha = 0.42;
      }

      const halfSize = this.size / 2;
      const sprite = this._getEmojiSprite();
      ctx.drawImage(sprite, -halfSize, -halfSize, halfSize * 2, halfSize * 2);
    });
  }

  private _getEmojiSprite(): CanvasImageSource {
    const cached = Marble.emojiSpriteCache.get(this.emoji);
    if (cached) {
      return cached;
    }

    const spriteSize = 128;
    const canvas = document.createElement('canvas');
    canvas.width = spriteSize;
    canvas.height = spriteSize;
    const spriteCtx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const center = spriteSize / 2;
    const radius = spriteSize * 0.485;

    spriteCtx.beginPath();
    spriteCtx.fillStyle = '#ffd64f';
    spriteCtx.strokeStyle = '#fff4c6';
    spriteCtx.lineWidth = 3;
    spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
    spriteCtx.fill();
    spriteCtx.stroke();

    spriteCtx.fillStyle = '#0a0f18';
    spriteCtx.beginPath();
    spriteCtx.arc(center - spriteSize * 0.12, center - spriteSize * 0.08, spriteSize * 0.05, 0, Math.PI * 2);
    spriteCtx.arc(center + spriteSize * 0.12, center - spriteSize * 0.08, spriteSize * 0.05, 0, Math.PI * 2);
    spriteCtx.fill();

    spriteCtx.strokeStyle = '#0a0f18';
    spriteCtx.lineWidth = 3;
    spriteCtx.beginPath();
    spriteCtx.arc(center, center + spriteSize * 0.02, spriteSize * 0.16, rad(25), rad(155));
    spriteCtx.stroke();

    spriteCtx.beginPath();
    spriteCtx.strokeStyle = 'rgba(255,255,255,0.7)';
    spriteCtx.lineWidth = 2;
    spriteCtx.arc(center - spriteSize * 0.12, center - spriteSize * 0.12, spriteSize * 0.22, rad(210), rad(330));
    spriteCtx.stroke();

    spriteCtx.save();
    spriteCtx.beginPath();
    spriteCtx.arc(center, center, radius - 1, 0, Math.PI * 2);
    spriteCtx.clip();
    spriteCtx.font = '700 86px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    spriteCtx.textAlign = 'center';
    spriteCtx.textBaseline = 'middle';
    spriteCtx.fillText(this.emoji, center, center + 4);
    spriteCtx.restore();

    Marble.emojiSpriteCache.set(this.emoji, canvas);
    return canvas;
  }

  private _drawStatusRing(ctx: CanvasRenderingContext2D, zoom: number) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2 + 5 / zoom, 0, Math.PI * 2);
    ctx.lineWidth = 2.6 / zoom;
    ctx.strokeStyle = this._statusEffect === 'boost' ? this.theme.accent : this.theme.danger;
    ctx.stroke();
  }

  private _drawName(ctx: CanvasRenderingContext2D, zoom: number) {
    transformGuard(ctx, () => {
      ctx.font = '600 12pt "Trebuchet MS", sans-serif';
      ctx.strokeStyle = '#08101b';
      ctx.lineWidth = 2;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 0;
      ctx.translate(this.x, this.y + 0.25);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(this.name, 0, 0);
      ctx.fillText(this.name, 0, 0);
    });
  }

  private _drawOutline(ctx: CanvasRenderingContext2D, lineWidth: number) {
    ctx.beginPath();
    ctx.strokeStyle = this.theme.marbleWinningBorder;
    ctx.lineWidth = lineWidth;
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _renderCoolTime(ctx: CanvasRenderingContext2D, zoom: number) {
    ctx.strokeStyle = this.theme.coolTimeIndicator;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2 + 2 / zoom, rad(270), rad(270 + (360 * this._coolTime) / this._maxCoolTime));
    ctx.stroke();
  }
}
