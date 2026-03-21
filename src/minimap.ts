import { initialZoom } from './data/constants';
import type { RenderParameters } from './rouletteRenderer';
import type { ColorTheme } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { Rect } from './types/rect.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';

const MAP_WIDTH = 104;
const MAP_HEIGHT = 190;

export class Minimap implements UIObject {
  private ctx!: CanvasRenderingContext2D;
  private lastParams: RenderParameters | null = null;
  private _onViewportChangeHandler: ((pos?: VectorLike) => void) | null = null;
  private boundingBox: Rect;
  private scale = 1;

  constructor() {
    this.boundingBox = {
      x: 14,
      y: 14,
      w: MAP_WIDTH,
      h: MAP_HEIGHT,
    };
  }

  getBoundingBox(): Rect | null {
    return this.boundingBox;
  }

  onViewportChange(callback: (pos?: VectorLike) => void) {
    this._onViewportChangeHandler = callback;
  }

  update(): void {}

  @bound
  onMouseMove(e?: { x: number; y: number }) {
    if (!e) {
      this._onViewportChangeHandler?.();
      return;
    }
    if (!this.lastParams) return;
    const stage = this.lastParams.stage;
    const worldX = e.x / this.scale;
    const worldY = stage.topY + e.y / this.scale;
    this._onViewportChangeHandler?.({ x: worldX, y: worldY });
  }

  render(ctx: CanvasRenderingContext2D, params: RenderParameters) {
    const { stage } = params;
    this.lastParams = params;
    this.ctx = ctx;

    const worldHeight = stage.goalY - stage.topY;
    this.scale = Math.min(MAP_WIDTH / stage.width, MAP_HEIGHT / worldHeight);
    this.boundingBox.w = stage.width * this.scale;
    this.boundingBox.h = worldHeight * this.scale;

    ctx.save();
    ctx.translate(this.boundingBox.x, this.boundingBox.y);
    ctx.fillStyle = params.theme.minimapBackground;
    ctx.fillRect(0, 0, this.boundingBox.w, this.boundingBox.h);
    ctx.scale(this.scale, this.scale);
    ctx.translate(0, -stage.topY);

    this.drawEntities(params.entities, params.theme);
    this.drawBoosts(params);
    this.drawHunters(params);
    this.drawMarbles(params);
    this.drawViewport(params);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = params.theme.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.boundingBox.x, this.boundingBox.y, this.boundingBox.w, this.boundingBox.h);
    ctx.restore();
  }

  private drawViewport(params: RenderParameters) {
    this.ctx.save();
    const { camera, size } = params;
    const zoom = camera.zoom * initialZoom;
    const width = size.x / zoom;
    const height = size.y / zoom;
    this.ctx.strokeStyle = params.theme.minimapViewport;
    this.ctx.lineWidth = 0.18;
    this.ctx.strokeRect(camera.x - width / 2, camera.y - height / 2, width, height);
    this.ctx.restore();
  }

  private drawEntities(entities: MapEntityState[], theme: ColorTheme) {
    this.ctx.save();
    entities.forEach((entity) => {
      this.ctx.save();
      this.ctx.fillStyle = entity.shape.color ?? theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? theme.entity[entity.shape.type].outline;
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      switch (entity.shape.type) {
        case 'box': {
          const width = entity.shape.width * 2;
          const height = entity.shape.height * 2;
          this.ctx.rotate(entity.shape.rotation);
          this.ctx.fillRect(-width / 2, -height / 2, width, height);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.shape.radius, 0, Math.PI * 2, false);
          this.ctx.fill();
          break;
        case 'polyline':
          if (entity.shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(entity.shape.points[0][0], entity.shape.points[0][1]);
            for (let index = 1; index < entity.shape.points.length; index++) {
              this.ctx.lineTo(entity.shape.points[index][0], entity.shape.points[index][1]);
            }
            this.ctx.stroke();
          }
          break;
      }
      this.ctx.restore();
    });
    this.ctx.restore();
  }

  private drawBoosts(params: RenderParameters) {
    this.ctx.save();
    params.boosts.forEach((boost) => {
      if (boost.consumed) return;
      this.ctx.fillStyle = params.theme.accent;
      this.ctx.beginPath();
      this.ctx.arc(boost.x, boost.y, boost.radius * 0.6, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  private drawHunters(params: RenderParameters) {
    this.ctx.save();
    params.hunters.forEach((hunter) => {
      this.ctx.fillStyle = hunter.color;
      this.ctx.beginPath();
      this.ctx.arc(hunter.currentX, hunter.currentY, hunter.radius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  private drawMarbles(params: RenderParameters) {
    const viewPort = {
      x: params.camera.x,
      y: params.camera.y,
      w: params.size.x,
      h: params.size.y,
      zoom: params.camera.zoom * initialZoom,
    };
    params.marbles.forEach((marble) => {
      marble.render(this.ctx, 1, false, true, undefined, viewPort, params.theme);
    });
  }
}
