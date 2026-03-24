import { canvasHeight, canvasWidth, initialZoom, zoomThreshold } from './data/constants';
import type { StageDef } from './data/maps';
import type { Marble } from './marble';
import type { VectorLike } from './types/VectorLike';

export class Camera {
  private static readonly RESULT_OVERVIEW_CYCLE_MS = 48000;
  private static readonly RESULT_OVERVIEW_DELAY_MS = 7000;
  private static readonly POSITION_LERP_DIVISOR = 26;
  private static readonly ZOOM_LERP_DIVISOR = 16;
  private _position: VectorLike = { x: 0, y: 0 };
  private _targetPosition: VectorLike = { x: 0, y: 0 };
  private _zoom: number = 1;
  private _targetZoom: number = 1;
  private _locked = false;
  private _shouldFollowMarbles = false;
  private _resultOverviewStartedAt: number | null = null;

  get zoom() {
    return this._zoom;
  }
  set zoom(v: number) {
    this._targetZoom = v;
  }

  get x() {
    return this._position.x;
  }
  set x(v: number) {
    this._targetPosition.x = v;
  }
  get y() {
    return this._position.y;
  }
  set y(v: number) {
    this._targetPosition.y = v;
  }

  get position() {
    return this._position;
  }

  setPosition(v: VectorLike, force: boolean = false) {
    if (force) {
      return (this._position = { x: v.x, y: v.y });
    }
    return (this._targetPosition = { x: v.x, y: v.y });
  }

  lock(v: boolean) {
    this._locked = v;
  }

  startFollowingMarbles() {
    this._shouldFollowMarbles = true;
    this._resultOverviewStartedAt = null;
  }

  initializePosition(center?: VectorLike, zoom?: number) {
    const x = center?.x ?? 12.95;
    const y = center?.y ?? 2;
    const z = zoom ?? 1;

    this._position = { x, y };
    this._targetPosition = { x, y };
    this._zoom = z;
    this._targetZoom = z;
    this._shouldFollowMarbles = false;
    this._resultOverviewStartedAt = null;
  }

  update({
    marbles,
    stage,
    needToZoom,
    targetIndex,
    elapsedMs,
    winnerCount,
    requiredWinnerCount,
  }: {
    marbles: Marble[];
    stage: StageDef;
    needToZoom: boolean;
    targetIndex: number;
    elapsedMs: number;
    winnerCount: number;
    requiredWinnerCount: number;
  }) {
    // set target position
    if (!this._locked) {
      this._calcTargetPositionAndZoom(marbles, stage, needToZoom, targetIndex, elapsedMs, winnerCount, requiredWinnerCount);
    }

    this._clampTargetToStage(stage);

    // interpolate position
    this._position.x = this._interpolation(this.x, this._targetPosition.x, Camera.POSITION_LERP_DIVISOR);
    this._position.y = this._interpolation(this.y, this._targetPosition.y, Camera.POSITION_LERP_DIVISOR);

    // interpolate zoom
    this._zoom = this._interpolation(this._zoom, this._targetZoom, Camera.ZOOM_LERP_DIVISOR);
  }

  private _calcTargetPositionAndZoom(
    marbles: Marble[],
    stage: StageDef,
    needToZoom: boolean,
    targetIndex: number,
    elapsedMs: number,
    winnerCount: number,
    requiredWinnerCount: number
  ) {
    if (!this._shouldFollowMarbles) {
      return;
    }

    if (winnerCount >= requiredWinnerCount) {
      this._renderResultOverview(marbles, stage, elapsedMs);
      return;
    }

    this._resultOverviewStartedAt = null;

    if (marbles.length > 0) {
      const leader = marbles[0];
      this.setPosition(leader.position);
      const bossEntered = winnerCount === 0 && leader.y >= stage.goalY - 13.4;
      if (bossEntered) {
        this.zoom = 1.9;
      } else if (needToZoom) {
        const goalDist = Math.abs(stage.zoomY - this._position.y);
        this.zoom = Math.max(0.88, (1 - goalDist / zoomThreshold) * 3.5);
      } else {
        this.zoom = 0.88;
      }
    } else {
      this.zoom = 0.88;
    }
  }

  private _renderResultOverview(marbles: Marble[], stage: StageDef, elapsedMs: number) {
    if (this._resultOverviewStartedAt === null) {
      this._resultOverviewStartedAt = elapsedMs;
    }

    const overviewElapsed = elapsedMs - this._resultOverviewStartedAt;
    if (overviewElapsed < Camera.RESULT_OVERVIEW_DELAY_MS) {
      this.setPosition({ x: stage.width / 2, y: stage.goalY - 6 });
      this.zoom = 0.88;
      return;
    }

    const sweepElapsed = overviewElapsed - Camera.RESULT_OVERVIEW_DELAY_MS;
    const bottomY = stage.goalY - 6;
    const topY = marbles.length > 0 ? Math.min(...marbles.map((marble) => marble.y)) : stage.topY + 8;
    const cycleProgress = (sweepElapsed % Camera.RESULT_OVERVIEW_CYCLE_MS) / Camera.RESULT_OVERVIEW_CYCLE_MS;
    const sweep = (1 - Math.cos(cycleProgress * Math.PI * 2)) / 2;

    this.setPosition({
      x: stage.width / 2,
      y: bottomY + (topY - bottomY) * sweep,
    });
    this.zoom = 0.88;
  }

  private _clampTargetToStage(stage: StageDef) {
    const safeZoom = Math.max(this._targetZoom, 0.8);
    const halfWidth = canvasWidth / (initialZoom * 2 * safeZoom);
    const halfHeight = canvasHeight / (initialZoom * 2 * safeZoom);

    if (stage.width <= halfWidth * 2) {
      this._targetPosition.x = stage.width / 2;
    } else {
      const minX = halfWidth;
      const maxX = stage.width - halfWidth;
      this._targetPosition.x = Math.min(maxX, Math.max(minX, this._targetPosition.x));
    }

    const minY = stage.topY + halfHeight;
    const maxY = Math.max(minY, stage.goalY - halfHeight + 2.2);
    this._targetPosition.y = Math.min(maxY, Math.max(minY, this._targetPosition.y));
  }

  private _interpolation(current: number, target: number, divisor: number) {
    const d = target - current;
    if (Math.abs(d) < 1 / initialZoom) {
      return target;
    }

    return current + d / divisor;
  }

  renderScene(ctx: CanvasRenderingContext2D, callback: (ctx: CanvasRenderingContext2D) => void) {
    const zoomFactor = initialZoom * 2 * this._zoom;
    ctx.save();
    ctx.translate(-this.x * this._zoom, -this.y * this._zoom);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(ctx.canvas.width / zoomFactor, ctx.canvas.height / zoomFactor);
    callback(ctx);
    ctx.restore();
  }
}
