import { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Skills, Themes, zoomThreshold } from './data/constants';
import { type StageBoost, type StageDef, type StageHunter, type StageHunterState, type StageWindZone, stages } from './data/maps';
import { FastForwader } from './fastForwader';
import type { GameObject } from './gameObject';
import type { IPhysics } from './IPhysics';
import { Marble } from './marble';
import { Minimap } from './minimap';
import options from './options';
import { ParticleManager } from './particleManager';
import { Box2dPhysics } from './physics-box2d';
import { RankRenderer } from './rankRenderer';
import { RouletteRenderer } from './rouletteRenderer';
import { SkillEffect } from './skillEffect';
import type { ColorTheme } from './types/ColorTheme';
import type { EntityCircleShape } from './types/MapEntity.type';
import type { MouseEventHandlerName, MouseEventName } from './types/mouseEvents.type';
import type { UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';
import { parseName, shuffle } from './utils/utils';
import { VideoRecorder } from './utils/videoRecorder';

export class Roulette extends EventTarget {
  private _marbles: Marble[] = [];
  private _retired: Marble[] = [];
  private _retiredIds = new Set<number>();
  private _magnetized = new Map<number, { remaining: number; angle: number; angularSpeed: number }>();
  private _hunterMagnetized = new Map<number, { remaining: number; hunterId: string; angle: number; angularSpeed: number }>();
  private _magnetCooldown = new Map<number, number>();
  private _pegBounceCooldown = new Map<number, number>();
  private _lastMagnetPulseAt = 0;
  private _lastHunterPulseAt = new Map<string, number>();
  private _lastWindPulseAt = new Map<string, number>();
  private _pegBouncers: Array<{ x: number; y: number; radius: number }> = [];
  private _boosts: StageBoost[] = [];
  private _hunters: StageHunter[] = [];
  private _raceElapsed = 0;

  private _lastTime = 0;
  private _elapsed = 0;
  private _updateInterval = 10;
  private _timeScale = 1;
  private _speed = 0.72;

  private _winners: Marble[] = [];
  private _particleManager = new ParticleManager();
  private _stage: StageDef | null = null;

  protected _camera: Camera = new Camera();
  protected _renderer: RouletteRenderer;

  private _effects: GameObject[] = [];
  private _winnerRank = 0;
  private _totalMarbleCount = 0;
  private _goalDist = Infinity;
  private _isRunning = false;
  private _winner: Marble | null = null;
  private _targetUnreachableAnnounced = false;
  private _crashed = false;

  private _uiObjects: UIObject[] = [];
  private _autoRecording = false;
  private _recorder!: VideoRecorder;
  private physics!: IPhysics;
  private _isReady = false;
  protected fastForwarder!: FastForwader;
  protected _theme: ColorTheme = Themes.dark;

  get isReady() {
    return this._isReady;
  }

  protected createRenderer(): RouletteRenderer {
    return new RouletteRenderer();
  }

  protected createFastForwader(): FastForwader {
    return new FastForwader();
  }

  constructor() {
    super();
    this._renderer = this.createRenderer();
    this._renderer.init().then(() => {
      this._init().then(() => {
        this._isReady = true;
        this._update();
      });
    });
  }

  public getZoom() {
    return initialZoom * this._camera.zoom;
  }

  private addUiObject(obj: UIObject) {
    this._uiObjects.push(obj);
    if (obj.onWheel) {
      this._renderer.canvas.addEventListener('wheel', obj.onWheel);
    }
    if (obj.onMessage) {
      obj.onMessage((msg) => {
        this.dispatchEvent(new CustomEvent('message', { detail: msg }));
      });
    }
  }

  @bound
  private _update() {
    if (this._crashed) return;

    try {
      if (!this._lastTime) this._lastTime = Date.now();
      const currentTime = Date.now();

      this._elapsed += (currentTime - this._lastTime) * this._speed * this.fastForwarder.speed;
      if (this._elapsed > 100) {
        this._elapsed %= 100;
      }
      this._lastTime = currentTime;

      const interval = (this._updateInterval / 1000) * this._timeScale;

      while (this._elapsed >= this._updateInterval) {
        this._raceElapsed += this._updateInterval;
        this._updateMagnetCooldowns(this._updateInterval);
        this._updatePegBounceCooldowns(this._updateInterval);
        this._updateBoostRespawns(this._updateInterval);
        this._applyMagnetPulse();
        this._applyHunterPulses();
        this._applyWindPulses();
        this.physics.step(interval);
        this._updateMarbles(this._updateInterval);
        this._particleManager.update(this._updateInterval);
        this._updateEffects(this._updateInterval);
        this._elapsed -= this._updateInterval;
        this._uiObjects.forEach((obj) => obj.update(this._updateInterval));
      }

      if (this._marbles.length > 1) {
        this._marbles.sort((a, b) => b.y - a.y);
      }

      if (this._stage) {
        this._camera.update({
          marbles: this._marbles,
          stage: this._stage,
          needToZoom: this._goalDist < zoomThreshold,
          targetIndex: this._winners.length > 0 ? this._winnerRank - this._winners.length : 0,
          elapsedMs: this._raceElapsed,
          winnerCount: this._winners.length,
          requiredWinnerCount: this._winnerRank + 1,
        });
      }

      this._render();
    } catch (error) {
      this._crashed = true;
      console.error('[Roulette update error]', error);
      this.dispatchEvent(
        new CustomEvent('message', {
          detail: `Runtime error: ${error instanceof Error ? error.message : String(error)}`,
        })
      );
      return;
    }

    window.requestAnimationFrame(this._update);
  }

  private _updateMarbles(deltaTime: number) {
    if (!this._stage) return;
    const hunterStates = options.useSkills ? this.getHunterStates() : [];

    for (let index = 0; index < this._marbles.length; index++) {
      const marble = this._marbles[index];
      marble.update(deltaTime);
      this._applyGhostDash(marble);
      this._applyGoalMagnet(marble, deltaTime);
      this._applyHunterMagnet(marble, deltaTime, hunterStates);
      this._applyPegBounce(marble);

      if (options.useSkills) {
        this._applyWallWind(marble, this._stage.windZones);
        this._checkBoostCollision(marble);
        this._checkHunterCollision(marble, hunterStates);
      }

      if (this._retiredIds.has(marble.id)) {
        continue;
      }

      if (marble.skill === Skills.Impact) {
        this._effects.push(new SkillEffect(marble.x, marble.y));
        this.physics.impact(marble.id);
      }

      if (marble.y > this._stage.goalY) {
        this._winners.push(marble);
        if (this._isRunning && this._winners.length === this._winnerRank + 1) {
          this._finishRace(marble, false);
        }
        setTimeout(() => {
          this.physics.removeMarble(marble.id);
        }, 500);
      }
    }

    const targetIndex = this._winnerRank - this._winners.length;
    const topY = this._marbles[targetIndex] ? this._marbles[targetIndex].y : 0;
    this._goalDist = Math.abs(this._stage.zoomY - topY);
    this._timeScale = this._calcTimeScale();

    this._marbles = this._marbles.filter((marble) => marble.y <= this._stage!.goalY && !this._retiredIds.has(marble.id));
    this._checkRaceCompletion();
  }

  private _checkBoostCollision(marble: Marble) {
    for (const boost of this._boosts) {
      if (boost.consumed) continue;
      const dx = marble.x - boost.x;
      const dy = marble.y - boost.y;
      const radius = boost.radius + marble.size / 2;
      if (dx * dx + dy * dy <= radius * radius) {
        boost.consumed = true;
        boost.respawnIn = 2000;
        this.physics.applyImpulse(marble.id, boost.impulse);
        marble.showBoost();
        this.dispatchEvent(new CustomEvent('message', { detail: `${marble.name} grabbed AI boost` }));
        break;
      }
    }
  }

  private _updateBoostRespawns(deltaTime: number) {
    for (const boost of this._boosts) {
      if (!boost.consumed) continue;
      const next = (boost.respawnIn ?? 2000) - deltaTime;
      if (next <= 0) {
        boost.consumed = false;
        boost.respawnIn = 0;
      } else {
        boost.respawnIn = next;
      }
    }
  }

  private _applyGhostDash(marble: Marble) {
    if (!marble.isGhost || !this._stage) return;

    const centerX = this._stage.width / 2;
    const centerPull = (centerX - marble.x) * 0.16;
    this.physics.applyImpulse(marble.id, {
      x: Math.max(-0.45, Math.min(0.45, centerPull)),
      y: 0.95,
    });
  }

  private _applyGoalMagnet(marble: Marble, deltaTime: number) {
    if (!this._stage || this._retiredIds.has(marble.id)) return;
    if (this._hunterMagnetized.has(marble.id)) return;
    if ((this._magnetCooldown.get(marble.id) ?? 0) > 0) return;

    const magnet = this._stage.magnet;
    const dx = magnet.x - marble.x;
    const dy = magnet.y - marble.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const existing = this._magnetized.get(marble.id);

    if (!existing && dist <= magnet.triggerRadius) {
      const startAngle = Math.atan2(marble.y - magnet.y, marble.x - magnet.x);
      const angularSpeed = (marble.x < magnet.x ? 1 : -1) * 0.95;
      this._magnetized.set(marble.id, {
        remaining: magnet.duration,
        angle: startAngle,
        angularSpeed,
      });
    }

    const state = this._magnetized.get(marble.id);
    if (!state) {
      return;
    }

    const nextRemaining = state.remaining - deltaTime;
    if (nextRemaining <= 0) {
      this._magnetized.delete(marble.id);
      this._magnetCooldown.set(marble.id, 1200);
      this.physics.setMarbleVelocity(marble.id, { x: 0, y: 1.8 });
      return;
    }
    state.remaining = nextRemaining;
    state.angle += state.angularSpeed * (deltaTime / 1000);

    const clingRadius = magnet.radius + marble.size * 0.78;
    const targetX = magnet.x + Math.cos(state.angle) * clingRadius;
    const targetY = magnet.y + Math.sin(state.angle) * clingRadius;

    this.physics.setMarbleVelocity(marble.id, { x: 0, y: 0 });
    this.physics.setMarbleTransform(marble.id, { x: targetX, y: targetY }, state.angle + Math.PI / 2);
  }

  private _applyHunterMagnet(marble: Marble, deltaTime: number, hunterStates: StageHunterState[]) {
    const state = this._hunterMagnetized.get(marble.id);
    if (!state) return;

    const hunter = hunterStates.find((candidate) => candidate.id === state.hunterId);
    if (!hunter) {
      this._hunterMagnetized.delete(marble.id);
      return;
    }

    const nextRemaining = state.remaining - deltaTime;
    if (nextRemaining <= 0) {
      this._hunterMagnetized.delete(marble.id);
      this._magnetCooldown.set(marble.id, 900);
      this.physics.setMarbleVelocity(marble.id, { x: 0, y: 1.4 });
      return;
    }

    state.remaining = nextRemaining;
    state.angle += state.angularSpeed * (deltaTime / 1000);
    const clingRadius = hunter.radius + marble.size * 0.65;
    const targetX = hunter.currentX + Math.cos(state.angle) * clingRadius;
    const targetY = hunter.currentY + Math.sin(state.angle) * clingRadius;

    this.physics.setMarbleVelocity(marble.id, { x: 0, y: 0 });
    this.physics.setMarbleTransform(marble.id, { x: targetX, y: targetY }, state.angle + Math.PI / 2);
  }

  private _updateMagnetCooldowns(deltaTime: number) {
    for (const [id, remaining] of this._magnetCooldown.entries()) {
      const next = remaining - deltaTime;
      if (next <= 0) {
        this._magnetCooldown.delete(id);
      } else {
        this._magnetCooldown.set(id, next);
      }
    }
  }

  private _updatePegBounceCooldowns(deltaTime: number) {
    for (const [id, remaining] of this._pegBounceCooldown.entries()) {
      const next = remaining - deltaTime;
      if (next <= 0) {
        this._pegBounceCooldown.delete(id);
      } else {
        this._pegBounceCooldown.set(id, next);
      }
    }
  }

  private _applyPegBounce(marble: Marble) {
    if (this._retiredIds.has(marble.id)) return;
    if ((this._pegBounceCooldown.get(marble.id) ?? 0) > 0) return;
    if (this._magnetized.has(marble.id) || this._hunterMagnetized.has(marble.id)) return;

    for (const peg of this._pegBouncers) {
      const dx = marble.x - peg.x;
      const dy = marble.y - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const triggerRadius = peg.radius + marble.size * 0.52 + 0.12;
      if (dist > triggerRadius) continue;

      const proximity = Math.max(0, triggerRadius - dist);
      const unitX = dist === 0 ? (Math.random() > 0.5 ? 1 : -1) : dx / dist;
      const unitY = dist === 0 ? -1 : dy / dist;
      const power = 2.4 + proximity * 7.5;

      this._pegBounceCooldown.set(marble.id, 130);
      this.physics.applyImpulse(marble.id, {
        x: unitX * power,
        y: unitY * power - 0.15,
      });
      break;
    }
  }

  private _applyMagnetPulse() {
    if (!this._stage || !this._isRunning) return;

    const magnet = this._stage.magnet;
    if (this._raceElapsed - this._lastMagnetPulseAt < magnet.pulseInterval) {
      return;
    }

    this._lastMagnetPulseAt = this._raceElapsed;
    this._effects.push(new SkillEffect(magnet.x, magnet.y));

    this._marbles.forEach((marble) => {
      if (this._retiredIds.has(marble.id)) return;

      const dx = marble.x - magnet.x;
      const dy = marble.y - magnet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0 || dist > magnet.pulseRadius) return;

      this._magnetized.delete(marble.id);
      this._magnetCooldown.set(marble.id, 1600);
      this.physics.setMarbleVelocity(marble.id, { x: 0, y: 0 });
      this.physics.applyImpulse(marble.id, {
        x: (dx / dist) * magnet.pulseForce,
        y: (dy / dist) * magnet.pulseForce + 1.2,
      });
    });
  }

  private _applyHunterPulses() {
    if (!this._isRunning || !options.useSkills) return;

    const hunterStates = this.getHunterStates();

    hunterStates.forEach((hunter) => {
      if (hunter.mode !== 'magnet') return;
      if (!hunter.pulseInterval || !hunter.pulseRadius || !hunter.pulseForce) return;
      const pulseInterval = hunter.pulseInterval;
      const pulseRadius = hunter.pulseRadius;
      const pulseForce = hunter.pulseForce;

      const lastPulseAt = this._lastHunterPulseAt.get(hunter.id) ?? 0;
      if (this._raceElapsed - lastPulseAt < pulseInterval) {
        return;
      }

      this._lastHunterPulseAt.set(hunter.id, this._raceElapsed);
      this._effects.push(new SkillEffect(hunter.currentX, hunter.currentY));

      this._marbles.forEach((marble) => {
        if (this._retiredIds.has(marble.id)) return;

        const dx = marble.x - hunter.currentX;
        const dy = marble.y - hunter.currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > pulseRadius) return;

        const attachedState = this._hunterMagnetized.get(marble.id);
        if (attachedState?.hunterId === hunter.id) {
          this._hunterMagnetized.delete(marble.id);
        }

        const fallbackAngle = attachedState?.angle ?? 0;
        const unitX = dist === 0 ? Math.cos(fallbackAngle) : dx / dist;
        const unitY = dist === 0 ? Math.sin(fallbackAngle) : dy / dist;

        this._magnetCooldown.set(marble.id, 1600);
        this.physics.setMarbleVelocity(marble.id, { x: 0, y: 0 });
        this.physics.applyImpulse(marble.id, {
          x: unitX * pulseForce,
          y: unitY * pulseForce + 1.1,
        });
      });
    });
  }

  private _applyWallWind(marble: Marble, windZones: StageWindZone[]) {
    if (marble.isGhost) return;
    if (this._hunterMagnetized.has(marble.id)) return;
    if (!marble.canReceiveWind) return;

    for (const zone of windZones) {
      const withinX = marble.x >= zone.x - zone.width / 2 && marble.x <= zone.x + zone.width / 2;
      const withinY = marble.y >= zone.y - zone.height / 2 && marble.y <= zone.y + zone.height / 2;
      if (!withinX || !withinY) continue;

      this.physics.applyImpulse(marble.id, {
        x: zone.direction === 'right' ? zone.strength : -zone.strength,
        y: 0.18,
      });
      marble.markWind();
      break;
    }
  }

  private _applyWindPulses() {
    if (!this._isRunning || !this._stage || !options.useSkills) return;

    this._stage.windZones.forEach((zone) => {
      const lastPulseAt = this._lastWindPulseAt.get(zone.id) ?? 0;
      if (this._raceElapsed - lastPulseAt < 5000) {
        return;
      }

      this._lastWindPulseAt.set(zone.id, this._raceElapsed);
      this._effects.push(new SkillEffect(zone.x, zone.y));

      const pulseHalfWidth = zone.width * 1.8;
      const pulseHalfHeight = zone.height * 1.7;
      const pulseForce = zone.strength * 6;

      this._marbles.forEach((marble) => {
        if (this._retiredIds.has(marble.id)) return;
        if (marble.isGhost) return;
        if (this._hunterMagnetized.has(marble.id)) return;

        const withinX = marble.x >= zone.x - pulseHalfWidth / 2 && marble.x <= zone.x + pulseHalfWidth / 2;
        const withinY = marble.y >= zone.y - pulseHalfHeight / 2 && marble.y <= zone.y + pulseHalfHeight / 2;
        if (!withinX || !withinY) return;

        this.physics.applyImpulse(marble.id, {
          x: zone.direction === 'right' ? pulseForce : -pulseForce,
          y: 0.42,
        });
        marble.markWind();
      });
    });
  }

  private _checkHunterCollision(marble: Marble, hunterStates: StageHunterState[]) {
    if (marble.isGhost) return;
    if (this._hunterMagnetized.has(marble.id)) return;
    if ((this._magnetCooldown.get(marble.id) ?? 0) > 0) return;
    for (const hunter of hunterStates) {
      const dx = marble.x - hunter.currentX;
      const dy = marble.y - hunter.currentY;
      const radius =
        (hunter.mode === 'magnet' ? hunter.magnetRange : hunter.radius) + marble.size / 2;
      if (dx * dx + dy * dy <= radius * radius) {
        if (hunter.mode === 'magnet') {
          this._hunterMagnetized.set(marble.id, {
            remaining: 1000,
            hunterId: hunter.id,
            angle: Math.atan2(marble.y - hunter.currentY, marble.x - hunter.currentX),
            angularSpeed: hunter.axis === 'x' ? 0.65 : -0.65,
          });
          this.dispatchEvent(new CustomEvent('message', { detail: `${hunter.label} held ${marble.name}` }));
        } else {
          this._retireMarble(marble, hunter.label);
        }
        break;
      }
    }
  }

  private _retireMarble(marble: Marble, source: string) {
    if (this._retiredIds.has(marble.id)) return;
    this._retiredIds.add(marble.id);
    marble.showRetire();
    this._retired.push(marble);
    this._effects.push(new SkillEffect(marble.x, marble.y, 'retire'));
    this.dispatchEvent(new CustomEvent('message', { detail: `${source} stunned ${marble.name} and retired them` }));
    setTimeout(() => {
      this.physics.removeMarble(marble.id);
    }, 220);
  }

  private _checkRaceCompletion() {
    if (!this._isRunning) return;

    const maxPossibleFinishers = this._winners.length + this._marbles.length;
    if (maxPossibleFinishers <= this._winnerRank && !this._targetUnreachableAnnounced) {
      this._targetUnreachableAnnounced = true;
      this.dispatchEvent(
        new CustomEvent('message', {
          detail: 'Target rank can no longer be reached. Waiting for the last surviving finisher.',
        })
      );
    }

    if (this._marbles.length === 0) {
      const fallbackWinner =
        this._winners[Math.min(this._winnerRank, this._winners.length - 1)] ?? this._winners[this._winners.length - 1] ?? null;
      this._finishRace(fallbackWinner, true);
    }
  }

  private _finishRace(winner: Marble | null, fallback: boolean) {
    this._winner = winner;
    this._isRunning = false;
    this._particleManager.shot(this._renderer.width, this._renderer.height);

    this.dispatchEvent(
      new CustomEvent('goal', {
        detail: {
          winner: winner?.name ?? 'No finisher',
          fallback,
        },
      })
    );

    setTimeout(() => {
      this._recorder.stop();
    }, 1000);
  }

  private _calcTimeScale(): number {
    if (!this._stage) return 1;
    const targetIndex = this._winnerRank - this._winners.length;
    if (this._winners.length < this._winnerRank + 1 && this._goalDist < zoomThreshold) {
      if (
        this._marbles[targetIndex] &&
        this._marbles[targetIndex].y > this._stage.zoomY - zoomThreshold * 1.2 &&
        (this._marbles[targetIndex - 1] || this._marbles[targetIndex + 1])
      ) {
        return Math.max(0.35, this._goalDist / zoomThreshold);
      }
    }
    return 1;
  }

  private _updateEffects(deltaTime: number) {
    this._effects.forEach((effect) => effect.update(deltaTime));
    this._effects = this._effects.filter((effect) => !effect.isDestroy);
  }

  private _triggerStartBurst() {
    if (this._marbles.length === 0) return;

    const topY = Math.min(...this._marbles.map((marble) => marble.y));
    const topRow = this._marbles.filter((marble) => Math.abs(marble.y - topY) <= 0.35);
    if (topRow.length === 0) return;

    const leftTop = topRow.reduce((best, marble) => (marble.x < best.x ? marble : best), topRow[0]);
    const rightTop = topRow.reduce((best, marble) => (marble.x > best.x ? marble : best), topRow[0]);
    const burstSources = [
      { x: leftTop.x, y: leftTop.y - 0.9 },
      ...(rightTop.id !== leftTop.id ? [{ x: rightTop.x, y: rightTop.y - 0.9 }] : []),
    ];

    burstSources.forEach((source) => {
      this._effects.push(new SkillEffect(source.x, source.y));

      this._marbles.forEach((marble) => {
        const dx = marble.x - source.x;
        const dy = marble.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const burstRadius = 4.4;
        if (dist > burstRadius) return;

        const unitX = dist === 0 ? (Math.random() > 0.5 ? 1 : -1) : dx / dist;
        const unitY = dist === 0 ? 1 : dy / dist;
        const power = Math.max(0.8, (1 - dist / burstRadius) * 4.8);

        this.physics.applyImpulse(marble.id, {
          x: unitX * power * 0.9,
          y: unitY * power + 0.8,
        });
      });
    });
  }

  private getHunterStates(): StageHunterState[] {
    return this._hunters.map((hunter) => {
      const wave = Math.sin(this._raceElapsed / 1000 * hunter.speed + hunter.phase) * hunter.amplitude;
      return {
        ...hunter,
        currentX: hunter.x + (hunter.axis === 'x' ? wave : 0),
        currentY: hunter.y + (hunter.axis === 'y' ? wave : 0),
      };
    });
  }

  private _render() {
    if (!this._stage) return;
    this._renderer.render(
      {
        camera: this._camera,
        stage: this._stage,
        entities: this.physics.getEntities(),
        marbles: this._marbles,
        retired: this._retired,
        winners: this._winners,
        boosts: this._boosts,
        hunters: this.getHunterStates(),
        particleManager: this._particleManager,
        effects: this._effects,
        winnerRank: this._winnerRank,
        winner: this._winner,
        size: { x: this._renderer.width, y: this._renderer.height },
        theme: this._theme,
      },
      this._uiObjects
    );
  }

  private async _init() {
    this._recorder = new VideoRecorder(this._renderer.canvas);

    this.physics = new Box2dPhysics();
    await this.physics.init();

    this.addUiObject(new RankRenderer());
    this.attachEvent();

    const minimap = new Minimap();
    minimap.onViewportChange((pos) => {
      if (pos) {
        this._camera.setPosition(pos, false);
        this._camera.lock(true);
      } else {
        this._camera.lock(false);
      }
    });
    this.addUiObject(minimap);

    this.fastForwarder = this.createFastForwader();
    this.addUiObject(this.fastForwarder);
    this._stage = stages[0];
    this._loadMap();
  }

  @bound
  private mouseHandler(eventName: MouseEventName, e: MouseEvent) {
    const handlerName = `on${eventName}` as MouseEventHandlerName;
    const sizeFactor = this._renderer.sizeFactor;
    const pos = { x: e.offsetX * sizeFactor, y: e.offsetY * sizeFactor };

    this._uiObjects.forEach((obj) => {
      if (!obj[handlerName]) return;
      const bounds = obj.getBoundingBox();
      if (!bounds) {
        obj[handlerName]!({ ...pos, button: e.button });
      } else if (
        pos.x >= bounds.x &&
        pos.y >= bounds.y &&
        pos.x <= bounds.x + bounds.w &&
        pos.y <= bounds.y + bounds.h
      ) {
        obj[handlerName]!({ x: pos.x - bounds.x, y: pos.y - bounds.y, button: e.button });
      } else {
        obj[handlerName]!(undefined);
      }
    });
  }

  private attachEvent() {
    const canvas = this._renderer.canvas;
    const onPointerRelease = (e: Event) => {
      this.mouseHandler('MouseUp', e as MouseEvent);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
    };

    canvas.addEventListener('pointerdown', (e: Event) => {
      this.mouseHandler('MouseDown', e as MouseEvent);
      window.addEventListener('pointerup', onPointerRelease);
      window.addEventListener('pointercancel', onPointerRelease);
    });

    ['MouseMove', 'DblClick'].forEach((eventName) => {
      canvas.addEventListener(eventName.toLowerCase().replace('mouse', 'pointer'), this.mouseHandler.bind(this, eventName));
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private _loadMap() {
    if (!this._stage) {
      throw new Error('No map has been selected');
    }

    this.physics.createStage(this._stage);
    this._pegBouncers = this._stage.entities
      .filter((entity): entity is typeof entity & { shape: EntityCircleShape } => entity.shape.type === 'circle')
      .map((entity) => ({
        x: entity.position.x,
        y: entity.position.y,
        radius: entity.shape.radius,
      }));
    const interactives = this._stage.createInteractives();
    this._boosts = interactives.boosts;
    this._hunters = interactives.hunters;
    this._camera.initializePosition({ x: this._stage.width / 2, y: 2 }, 1.6);
  }

  public clearMarbles() {
    this.physics.clearMarbles();
    this._winner = null;
    this._winners = [];
    this._retired = [];
    this._retiredIds.clear();
    this._magnetized.clear();
    this._hunterMagnetized.clear();
    this._magnetCooldown.clear();
    this._pegBounceCooldown.clear();
    this._lastMagnetPulseAt = 0;
    this._lastHunterPulseAt.clear();
    this._lastWindPulseAt.clear();
    this._marbles = [];
  }

  public start() {
    this._crashed = false;
    this._isRunning = true;
    this._winnerRank = options.winningRank;
    if (this._winnerRank >= this._marbles.length) {
      this._winnerRank = this._marbles.length - 1;
    }
    this._winner = null;
    this._retired = [];
    this._retiredIds.clear();
    this._magnetized.clear();
    this._hunterMagnetized.clear();
    this._magnetCooldown.clear();
    this._pegBounceCooldown.clear();
    this._lastMagnetPulseAt = 0;
    this._lastHunterPulseAt.clear();
    this._lastWindPulseAt.clear();
    this._raceElapsed = 0;
    this._targetUnreachableAnnounced = false;
    this._boosts.forEach((boost) => {
      boost.consumed = false;
      boost.respawnIn = 0;
    });
    this._camera.startFollowingMarbles();

    if (this._autoRecording) {
      this._recorder.start().then(() => {
        this.physics.start();
        this._marbles.forEach((marble) => (marble.isActive = true));
        this._triggerStartBurst();
      });
    } else {
      this.physics.start();
      this._marbles.forEach((marble) => (marble.isActive = true));
      this._triggerStartBurst();
    }
  }

  public setSpeed(value: number) {
    if (value <= 0) {
      throw new Error('Speed multiplier must larger than 0');
    }
    this._speed = value;
  }

  public setTheme(themeName: keyof typeof Themes) {
    this._theme = Themes[themeName];
  }

  public getSpeed() {
    return this._speed;
  }

  public setWinningRank(rank: number) {
    this._winnerRank = rank;
  }

  public setAutoRecording(value: boolean) {
    this._autoRecording = value;
  }

  public setMarbles(names: string[]) {
    this.reset();
    const arr = names.slice();

    let maxWeight = -Infinity;
    let minWeight = Infinity;

    const members = arr
      .map((nameString) => {
        const result = parseName(nameString);
        if (!result) return null;
        const { name, weight, count } = result;
        if (weight > maxWeight) maxWeight = weight;
        if (weight < minWeight) minWeight = weight;
        return { name, weight, count };
      })
      .filter((member): member is { name: string; weight: number; count: number } => !!member);

    const gap = maxWeight - minWeight;
    let totalCount = 0;
    members.forEach((member) => {
      member.weight = 0.1 + (gap ? (member.weight - minWeight) / gap : 0);
      totalCount += member.count;
    });

    const orders = shuffle(
      Array(totalCount)
        .fill(0)
        .map((_, index) => index)
    );

    const columns = Math.min(
      totalCount,
      Math.max(12, Math.min(18, Math.ceil(Math.sqrt(totalCount * 1.65))))
    );
    const rows = Math.ceil(totalCount / columns);
    const gapX = totalCount >= 150 ? 0.72 : totalCount >= 80 ? 0.68 : 0.64;
    const gapY = 0.58;
    const spawnCenterX = 13;
    const spawnTopY = 1.4;

    members.forEach((member) => {
      for (let countIndex = 0; countIndex < member.count; countIndex++) {
        const order = orders.pop() ?? 0;
        const row = Math.floor(order / columns);
        const col = order % columns;
        const rowOffset = row % 2 === 0 ? 0 : gapX * 0.5;
        const spawnX = spawnCenterX + (col - (columns - 1) / 2) * gapX + rowOffset;
        const spawnY = spawnTopY + row * gapY;
        this._marbles.push(
          new Marble(this.physics, order, totalCount, member.name, member.weight, {
            x: spawnX,
            y: spawnY,
          })
        );
      }
    });
    this._totalMarbleCount = totalCount;

    if (totalCount > 0) {
      const centerX = spawnCenterX + (rows > 1 ? gapX * 0.25 : 0);
      const centerY = spawnTopY + (rows - 1) * gapY * 0.5;

      const spawnWidth = Math.max((columns - 1) * gapX + gapX * 0.5, 1);
      const spawnHeight = Math.max((rows - 1) * gapY, 1);
      const margin = 3;
      const viewW = canvasWidth / initialZoom;
      const viewH = canvasHeight / initialZoom;
      const zoom = Math.max(
        1.35,
        Math.min(Math.min(viewW / (spawnWidth + margin * 2), viewH / (spawnHeight + margin * 2)), 2.4)
      );

      this._camera.initializePosition({ x: centerX, y: centerY }, zoom);
    }
  }

  private _clearMap() {
    this.physics.clear();
    this._marbles = [];
    this._boosts = [];
    this._hunters = [];
    this._pegBouncers = [];
  }

  public reset() {
    this.clearMarbles();
    this._clearMap();
    this._loadMap();
    this._goalDist = Infinity;
  }

  public getCount() {
    return this._marbles.length;
  }

  public getMaps() {
    return stages.map((stage, index) => ({
      index,
      title: stage.title,
    }));
  }

  public getStageInfo() {
    return this._stage;
  }

  public setMap(index: number) {
    if (index < 0 || index > stages.length - 1) {
      throw new Error('Incorrect map number');
    }
    const names = this._marbles.map((marble) => marble.name);
    this._stage = stages[index];
    this.setMarbles(names);
    this._camera.initializePosition({ x: this._stage.width / 2, y: 2 }, 1.6);
  }
}
