import type { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Themes } from './data/constants';
import type { StageBoost, StageDef, StageHunterState, StageWindZone } from './data/maps';
import type { GameObject } from './gameObject';
import { KeywordService } from './keywordService';
import type { Marble } from './marble';
import type { ParticleManager } from './particleManager';
import type { ColorTheme } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';
import { rad } from './utils/utils';

export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  retired: Marble[];
  winners: Marble[];
  boosts: StageBoost[];
  hunters: StageHunterState[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winnerRank: number;
  winner: Marble | null;
  size: VectorLike;
  theme: ColorTheme;
};

export class RouletteRenderer {
  protected _canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  public sizeFactor = 1;
  protected _theme: ColorTheme = Themes.dark;
  protected _keywordService: KeywordService;
  private _bossImage: HTMLImageElement | null = null;
  private _bossBadge: CanvasImageSource | null = null;

  constructor() {
    this._keywordService = this.createKeywordService();
  }

  protected createKeywordService(): KeywordService {
    return new KeywordService();
  }

  get width() {
    return this._canvas.width;
  }

  get height() {
    return this._canvas.height;
  }

  get canvas() {
    return this._canvas;
  }

  async init() {
    this._bossImage = await this.loadImage(new URL('../ceo.png', import.meta.url).toString());
    this._bossBadge = this.createBossBadge();
    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this.ctx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      const width = Math.max(realSize.width / 2, 640);
      const height = (width / realSize.width) * realSize.height;
      this._canvas.width = width;
      this._canvas.height = height;
      this.sizeFactor = width / realSize.width;
    };

    const resizeObserver = new ResizeObserver(resizing);
    resizeObserver.observe(this._canvas);
    resizing();
  }

  private async loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', () => resolve(null));
      image.src = url;
    });
  }

  private getMarbleImage(_name: string): CanvasImageSource | undefined {
    return undefined;
  }

  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    this._theme = renderParameters.theme;
    this.renderBackdrop(renderParameters);

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt sans-serif';
    this.ctx.lineWidth = 3 / (renderParameters.camera.zoom + initialZoom);
    renderParameters.camera.renderScene(this.ctx, () => {
      this.renderCourseGlow(renderParameters.stage);
      this.renderEntities(renderParameters.entities);
      this.renderWindZones(renderParameters.stage.windZones);
      this.renderBoosts(renderParameters);
      this.renderHunters(renderParameters);
      this.renderGoalMagnet(renderParameters);
      this.renderEffects(renderParameters);
      this.renderMarbles(renderParameters);
      this.renderGoalBanner(renderParameters.stage);
    });
    this.ctx.restore();

    uiObjects.forEach((obj) => obj.render(this.ctx, renderParameters, this._canvas.width, this._canvas.height));
    renderParameters.particleManager.render(this.ctx);
    this.renderWinner(renderParameters);
  }

  private renderBackdrop({ stage }: RenderParameters) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this._canvas.height);
    gradient.addColorStop(0, this._theme.glowBackground);
    gradient.addColorStop(0.3, '#091224');
    gradient.addColorStop(0.75, '#050b16');
    gradient.addColorStop(1, '#02050d');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    const glow = this.ctx.createRadialGradient(this._canvas.width / 2, 0, 10, this._canvas.width / 2, 0, this._canvas.height * 0.6);
    glow.addColorStop(0, 'rgba(145, 242, 255, 0.5)');
    glow.addColorStop(0.3, 'rgba(112, 224, 255, 0.18)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    this.ctx.save();
    this.ctx.strokeStyle = this._theme.grid;
    this.ctx.lineWidth = 1;
    for (let y = 0; y < this._canvas.height; y += 28) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this._canvas.width, y);
      this.ctx.stroke();
    }
    for (let x = 0; x < this._canvas.width; x += 28) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this._canvas.height);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.renderSideColumns();

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.ctx.font = '700 13px "Trebuchet MS", sans-serif';
    this.ctx.fillText(stage.title.toUpperCase(), 18, 18);
    this.ctx.restore();
  }

  private renderSideColumns() {
    const drawSide = (x: number, colorA: string, colorB: string) => {
      for (let index = 0; index < 9; index++) {
        const y = 64 + index * 86;
        this.ctx.save();
        this.ctx.shadowBlur = 24;
        this.ctx.shadowColor = colorA;
        this.ctx.fillStyle = colorA;
        this.ctx.fillRect(x, y, 20, 58);
        this.ctx.fillStyle = colorB;
        this.ctx.fillRect(x + 22, y + 8, 8, 42);
        this.ctx.restore();
      }
    };

    drawSide(22, 'rgba(78, 232, 255, 0.9)', 'rgba(255, 178, 110, 0.9)');
    drawSide(this._canvas.width - 50, 'rgba(255, 178, 110, 0.9)', 'rgba(78, 232, 255, 0.9)');
  }

  private renderCourseGlow(stage: StageDef) {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(116, 239, 255, 0.24)';
    this.ctx.lineWidth = 0.08;
    for (let y = stage.topY; y < stage.goalY; y += 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(COURSE_GUIDE_LEFT, y);
      this.ctx.lineTo(COURSE_GUIDE_RIGHT, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private renderGoalBanner(stage: StageDef) {
    const bannerY = stage.goalY - 6.2;
    const centerX = stage.width / 2;
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowBlur = 28;
    this.ctx.shadowColor = this._theme.accent;
    this.ctx.fillStyle = this._theme.accent;
    this.ctx.strokeStyle = this._theme.accentAlt;
    this.ctx.lineWidth = 0.1;
    this.ctx.font = '900 2.05px "Trebuchet MS", sans-serif';
    this.ctx.strokeText('AX WINNER!!', centerX, bannerY - 0.12);
    this.ctx.fillText('AX WINNER!!', centerX, bannerY - 0.12);

    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this._theme.accentAlt;
    this.ctx.strokeStyle = this._theme.accentAlt;
    this.ctx.lineWidth = 0.08;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 4.2, bannerY + 1.25);
    this.ctx.lineTo(centerX + 4.2, bannerY + 1.25);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderGoalMagnet({ stage, camera }: Pick<RenderParameters, 'stage' | 'camera'>) {
    const magnet = stage.magnet;
    const pulse = 0.12 * Math.sin(Date.now() / 180);
    const radius = magnet.radius + pulse;
    const zoom = camera.zoom * initialZoom;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 120, 120, 0.9)';
    this.ctx.lineWidth = 0.1;
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = 'rgba(255, 90, 90, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(magnet.x, magnet.y, magnet.triggerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 200, 200, 0.82)';
    this.ctx.lineWidth = 0.07;
    this.ctx.beginPath();
    this.ctx.arc(magnet.x, magnet.y, magnet.triggerRadius - 0.55, 0, Math.PI * 2);
    this.ctx.stroke();

    for (let index = 0; index < 6; index++) {
      const angle = (Math.PI * 2 * index) / 6 + Date.now() / 900;
      const inner = magnet.triggerRadius - 0.8;
      const outer = magnet.triggerRadius + 0.45;
      this.ctx.beginPath();
      this.ctx.moveTo(magnet.x + Math.cos(angle) * inner, magnet.y + Math.sin(angle) * inner);
      this.ctx.lineTo(magnet.x + Math.cos(angle) * outer, magnet.y + Math.sin(angle) * outer);
      this.ctx.stroke();
    }

    const badge = this._bossBadge ?? this.createBossBadge();
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(magnet.x, magnet.y, radius, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.drawImage(badge, magnet.x - radius, magnet.y - radius, radius * 2, radius * 2);
    this.ctx.restore();

    this.ctx.strokeStyle = '#ffd9d9';
    this.ctx.lineWidth = 0.09;
    this.ctx.beginPath();
    this.ctx.arc(magnet.x, magnet.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.renderOrbitIcons(magnet.x, magnet.y, magnet.triggerRadius + 0.72, 6, zoom, '#fff3f3', '🧲');
    this.ctx.restore();
  }

  private renderOrbitIcons(
    x: number,
    y: number,
    ringRadius: number,
    count: number,
    zoom: number,
    color: string,
    icon: string
  ) {
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const iconX = x + Math.cos(angle) * ringRadius;
      const iconY = y + Math.sin(angle) * ringRadius;

      this.ctx.save();
      this.ctx.translate(iconX, iconY);
      this.ctx.rotate(angle + Math.PI * 1.5);
      this.ctx.scale(1 / zoom, 1 / zoom);
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = '700 16px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = 'rgba(36, 16, 16, 0.88)';
      this.ctx.fillStyle = color;
      this.ctx.strokeText(icon, 0, 0);
      this.ctx.fillText(icon, 0, 0);
      this.ctx.restore();
    }
  }

  private createBossBadge(): CanvasImageSource {
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const center = size / 2;
    const radius = size * 0.48;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();
    if (this._bossImage) {
      const sourceSize = Math.min(this._bossImage.width, this._bossImage.height);
      const sx = (this._bossImage.width - sourceSize) / 2;
      const sy = (this._bossImage.height - sourceSize) / 2;
      ctx.drawImage(this._bossImage, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
    } else {
      const skin = ctx.createRadialGradient(center, center * 0.95, 10, center, center, radius);
      skin.addColorStop(0, '#f4cfb2');
      skin.addColorStop(1, '#d8a985');
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, size, size);
    }

    ctx.restore();

    ctx.strokeStyle = '#fff0e3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    return canvas;
  }

  private renderEntities(entities: MapEntityState[]) {
    this.ctx.save();
    entities.forEach((entity) => {
      const transform = this.ctx.getTransform();
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      this.ctx.fillStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].outline;
      this.ctx.shadowBlur = this._theme.entity[entity.shape.type].bloomRadius;
      this.ctx.shadowColor = entity.shape.bloomColor ?? entity.shape.color ?? this._theme.entity[entity.shape.type].bloom;
      switch (entity.shape.type) {
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
        case 'box': {
          const width = entity.shape.width * 2;
          const height = entity.shape.height * 2;
          this.ctx.rotate(entity.shape.rotation);
          this.ctx.fillRect(-width / 2, -height / 2, width, height);
          this.ctx.strokeRect(-width / 2, -height / 2, width, height);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.shape.radius, 0, Math.PI * 2, false);
          this.ctx.fill();
          this.ctx.stroke();
          break;
      }
      this.ctx.setTransform(transform);
    });
    this.ctx.restore();
  }

  private renderWindZones(windZones: StageWindZone[]) {
    const drawChevron = (x: number, y: number, right: boolean, color: string) => {
      this.ctx.beginPath();
      if (right) {
        this.ctx.moveTo(x - 0.28, y - 0.22);
        this.ctx.lineTo(x + 0.18, y);
        this.ctx.lineTo(x - 0.28, y + 0.22);
      } else {
        this.ctx.moveTo(x + 0.28, y - 0.22);
        this.ctx.lineTo(x - 0.18, y);
        this.ctx.lineTo(x + 0.28, y + 0.22);
      }
      this.ctx.stroke();
    };

    this.ctx.save();
    windZones.forEach((zone) => {
      this.ctx.strokeStyle = zone.color;
      this.ctx.lineWidth = 0.08;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = zone.color;
      this.ctx.strokeRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height);
      for (let y = zone.y - zone.height / 2 + 1; y < zone.y + zone.height / 2; y += 2) {
        drawChevron(zone.x, y, zone.direction === 'right', zone.color);
      }
    });
    this.ctx.restore();
  }

  private renderBoosts({ boosts, camera }: RenderParameters) {
    const zoom = camera.zoom * initialZoom;
    boosts.forEach((boost) => {
      if (boost.consumed) return;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(107, 249, 255, 0.16)';
      this.ctx.strokeStyle = this._theme.accent;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = this._theme.accent;
      this.ctx.beginPath();
      this.ctx.arc(boost.x, boost.y, boost.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.translate(boost.x, boost.y - 0.15);
      this.ctx.scale(1 / zoom, 1 / zoom);
      this.ctx.font = '700 12px "Trebuchet MS", sans-serif';
      this.ctx.fillStyle = '#eaffff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(boost.label, 0, 0);
      this.ctx.restore();
    });
  }

  private renderHunters({ hunters, camera }: RenderParameters) {
    const zoom = camera.zoom * initialZoom;
    hunters.forEach((hunter) => {
      this.ctx.save();
      if (hunter.mode === 'magnet') {
        this.ctx.strokeStyle = `${hunter.color}80`;
        this.ctx.lineWidth = 0.08;
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = hunter.color;
        this.ctx.beginPath();
        this.ctx.arc(hunter.currentX, hunter.currentY, hunter.magnetRange, 0, Math.PI * 2);
        this.ctx.stroke();
        this.renderOrbitIcons(
          hunter.currentX,
          hunter.currentY,
          hunter.magnetRange + 0.48,
          4,
          zoom,
          '#fff6d5',
          '🧲'
        );
      }
      if (hunter.mode === 'retire') {
        this.renderOrbitIcons(hunter.currentX, hunter.currentY, hunter.radius + 0.54, 3, zoom, '#fff1f1', '☠️');
      }

      this.ctx.fillStyle = `${hunter.color}4d`;
      this.ctx.strokeStyle = hunter.color;
      this.ctx.shadowBlur = 22;
      this.ctx.shadowColor = hunter.color;
      this.ctx.beginPath();
      this.ctx.arc(hunter.currentX, hunter.currentY, hunter.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.translate(hunter.currentX, hunter.currentY);
      this.ctx.scale(1 / zoom, 1 / zoom);
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = '900 16px "Trebuchet MS", sans-serif';
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#220b02';
      this.ctx.fillStyle = '#fff7ef';
      this.ctx.strokeText(hunter.label, 0, 1);
      this.ctx.fillText(hunter.label, 0, 1);
      this.ctx.restore();
    });
  }

  private renderEffects({ effects, camera }: RenderParameters) {
    effects.forEach((effect) => effect.render(this.ctx, camera.zoom * initialZoom, this._theme));
  }

  private renderMarbles({ marbles, camera, winnerRank, winners, size }: RenderParameters) {
    const winnerIndex = winnerRank - winners.length;
    const viewPort = { x: camera.x, y: camera.y, w: size.x, h: size.y, zoom: camera.zoom * initialZoom };
    marbles.forEach((marble, index) => {
      marble.render(
        this.ctx,
        camera.zoom * initialZoom,
        index === winnerIndex,
        false,
        this.getMarbleImage(marble.name),
        viewPort,
        this._theme
      );
    });
  }

  private renderWinner({ winner, winners, winnerRank, theme }: RenderParameters) {
    if (!winner && winners.length === 0) return;
    const lockedWinners = winners.slice(0, Math.min(winners.length, winnerRank + 1));
    if (lockedWinners.length === 0) return;
    const displayedWinner = lockedWinners[lockedWinners.length - 1];

    const panelHeight = 112;
    const panelY = this._canvas.height - panelHeight - 20;
    this.ctx.save();
    this.ctx.fillStyle = theme.winnerBackground;
    this.ctx.strokeStyle = theme.accent;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(this._canvas.width - 340, panelY, 320, panelHeight, 18);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#fff4dc';
    this.ctx.font = '700 18px "Trebuchet MS", sans-serif';
    this.ctx.fillText('Winner Locked', this._canvas.width - 320, panelY + 24);

    this.ctx.font = '800 30px "Trebuchet MS", sans-serif';
    this.ctx.fillStyle = `hsl(${displayedWinner.hue} 100% ${theme.marbleLightness}%)`;
    this.ctx.fillText(`${lockedWinners.length}. ${displayedWinner.name}`, this._canvas.width - 320, panelY + 78);
    this.ctx.restore();
  }
}

const COURSE_GUIDE_LEFT = 3.4;
const COURSE_GUIDE_RIGHT = 22.6;
