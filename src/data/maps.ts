import type { MapEntity } from '../types/MapEntity.type';
import type { VectorLike } from '../types/VectorLike';

export type StageBoost = {
  id: string;
  label: 'AI';
  x: number;
  y: number;
  radius: number;
  color: string;
  impulse: VectorLike;
  consumed?: boolean;
  respawnIn?: number;
};

export type StageHunter = {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  magnetRange: number;
  color: string;
  mode: 'retire' | 'magnet';
  axis: 'x' | 'y';
  amplitude: number;
  speed: number;
  phase: number;
  pulseInterval?: number;
  pulseRadius?: number;
  pulseForce?: number;
  driftAmplitudeX?: number;
  driftAmplitudeY?: number;
  driftSpeedX?: number;
  driftSpeedY?: number;
  driftPhaseX?: number;
  driftPhaseY?: number;
  movement?: 'axis' | 'chaos';
};

export type StageHunterState = StageHunter & {
  currentX: number;
  currentY: number;
};

export type StageKicker = {
  id: string;
  side: 'left' | 'right';
  hingeX: number;
  hingeY: number;
  length: number;
  restAngle: number;
  activeAngle: number;
  color: string;
  impulse: VectorLike;
};

export type StageInteractives = {
  boosts: StageBoost[];
  hunters: StageHunter[];
  kickers: StageKicker[];
};

export type StageWindZone = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  strength: number;
  color: string;
};

export type StageMagnet = {
  x: number;
  y: number;
  radius: number;
  triggerRadius: number;
  pullStrength: number;
  swirlStrength: number;
  duration: number;
  pulseInterval: number;
  pulseRadius: number;
  pulseForce: number;
};

export type StageBackground = {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
};

export type StageDef = {
  title: string;
  description: string;
  goalY: number;
  zoomY: number;
  topY: number;
  width: number;
  background?: StageBackground;
  bossImage?: string;
  showCourseGuides?: boolean;
  entities: MapEntity[];
  windZones: StageWindZone[];
  magnet: StageMagnet;
  createInteractives: () => StageInteractives;
};

const COURSE_LEFT = 2.2;
const COURSE_RIGHT = 23.8;
const COURSE_WIDTH = 26;
const DEFAULT_BAR_SPIN = 1.65;
const map4SpaceBackground = './assets/images/map4-space.png';
const map5RaceBackground = './assets/images/map5-race.png';
const map6ForestBackground = './assets/images/map6-forest.png';
const aiRobotBossImage = './assets/images/boss-ai-robot.png';

const wall = (points: [number, number][], color?: string): MapEntity => ({
  position: { x: 0, y: 0 },
  type: 'static',
  shape: {
    type: 'polyline',
    points,
    rotation: 0,
    color,
    bloomColor: color,
  },
  props: { density: 1, angularVelocity: 0, restitution: 0 },
});

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
  color?: string,
  restitution = 0.08,
  angularVelocity = (x <= COURSE_WIDTH / 2 ? 1 : -1) * (DEFAULT_BAR_SPIN + Math.min(0.75, Math.abs(rotation) * 0.45))
): MapEntity => ({
  position: { x, y },
  type: 'kinematic',
  shape: { type: 'box', width, height, rotation, color, bloomColor: color },
  props: { density: 1, angularVelocity, restitution },
});

const staticBox = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
  color?: string,
  restitution = 0.08
): MapEntity => ({
  position: { x, y },
  type: 'static',
  shape: { type: 'box', width, height, rotation, color, bloomColor: color },
  props: { density: 1, angularVelocity: 0, restitution },
});

const spinner = (
  x: number,
  y: number,
  width: number,
  rotation: number,
  angularVelocity: number,
  color: string
): MapEntity => ({
  position: { x, y },
  type: 'kinematic',
  shape: { type: 'box', width, height: 0.15, rotation, color, bloomColor: color },
  props: { density: 1, angularVelocity, restitution: 0.15 },
});

const rotor = (
  x: number,
  y: number,
  armLength: number,
  angularVelocity: number,
  colorA: string,
  colorB: string
): MapEntity[] => [
  spinner(x, y, armLength, 0, angularVelocity, colorA),
  spinner(x, y, armLength * 0.8, Math.PI / 2, angularVelocity, colorB),
];

const peg = (x: number, y: number, radius: number, color: string, restitution = 1.2): MapEntity => ({
  position: { x, y },
  type: 'static',
  shape: { type: 'circle', radius, color, bloomColor: color },
  props: { density: 1, angularVelocity: 0, restitution },
});

function createFrame(topY: number, goalY: number, accent: string): MapEntity[] {
  return [
    wall(
      [
        [10.3, topY],
        [7.8, topY + 12],
        [4.5, topY + 26],
        [3.2, topY + 40],
        [3.2, goalY - 16],
        [7.2, goalY - 4],
        [11.5, goalY + 4],
      ],
      accent
    ),
    wall(
      [
        [15.7, topY],
        [18.2, topY + 12],
        [21.5, topY + 26],
        [22.8, topY + 40],
        [22.8, goalY - 16],
        [18.8, goalY - 4],
        [14.5, goalY + 4],
      ],
      accent
    ),
    wall(
      [
        [10.3, topY],
        [15.7, topY],
      ],
      '#8ce9ff'
    ),
  ];
}

function createSideRails(startY: number, endY: number): MapEntity[] {
  const rails: MapEntity[] = [];
  for (let y = startY; y <= endY; y += 18) {
    rails.push(staticBox(1.0, y, 0.7, 5.1, 0, '#48d7ff'));
    rails.push(staticBox(25.0, y, 0.7, 5.1, 0, '#ff9a4d'));
    rails.push(staticBox(1.8, y, 0.18, 4.5, 0, '#84f0ff'));
    rails.push(staticBox(24.2, y, 0.18, 4.5, 0, '#ffd08a'));
  }
  return rails;
}

function createDiagonalSwitchbackFrame(topY: number, goalY: number): MapEntity[] {
  return [
    wall(
      [
        [2.4, topY],
        [2.4, topY + 14],
        [7.2, topY + 14],
        [18.6, topY + 20.6],
        [18.6, topY + 25],
        [6.0, topY + 32.3],
        [6.0, topY + 37.8],
        [10.8, topY + 42],
        [10.6, goalY + 2],
      ],
      '#ffb26e'
    ),
    wall(
      [
        [23.6, topY],
        [23.6, topY + 14],
        [18.2, topY + 14],
        [23.6, topY + 21.8],
        [23.6, topY + 27],
        [9.2, topY + 34.3],
        [9.2, topY + 39.4],
        [18.4, topY + 43.6],
        [18.2, goalY + 2],
      ],
      '#79efff'
    ),
    wall(
      [
        [2.4, topY],
        [23.6, topY],
      ],
      '#ffe2b8'
    ),
  ];
}

function createPinchedFrame(topY: number, goalY: number): MapEntity[] {
  return [
    wall(
      [
        [4.2, topY],
        [4.2, topY + 7],
        [9.0, topY + 9],
        [13.9, topY + 24],
        [11.5, topY + 33],
        [6.2, topY + 48],
        [8.9, topY + 59],
        [12.9, goalY + 2],
      ],
      '#79efff'
    ),
    wall(
      [
        [21.8, topY],
        [21.8, topY + 7],
        [21.0, topY + 9],
        [21.8, topY + 24],
        [17.0, topY + 33],
        [11.9, topY + 48],
        [15.2, topY + 59],
        [19.2, goalY + 2],
      ],
      '#79efff'
    ),
    wall(
      [
        [4.2, topY],
        [21.8, topY],
      ],
      '#d9fdff'
    ),
  ];
}

function createChevronGrid(startY: number, rows: number, gap: number, colorA: string, colorB: string): MapEntity[] {
  const entities: MapEntity[] = [];
  for (let row = 0; row < rows; row++) {
    const y = startY + row * gap;
    const flip = row % 2 === 0 ? 1 : -1;
    entities.push(box(8.6, y, 1.4, 0.12, 0.62 * flip, colorA));
    entities.push(box(17.4, y, 1.4, 0.12, -0.62 * flip, colorB));
    entities.push(box(11.1, y + 4.4, 1.1, 0.1, -0.62 * flip, colorA));
    entities.push(box(14.9, y + 4.4, 1.1, 0.1, 0.62 * flip, colorB));
  }
  return entities;
}

function createScatterSlantedBars(
  entries: Array<[number, number, number, number, string]>
): MapEntity[] {
  return entries.map(([x, y, width, rotation, color]) => staticBox(x, y, width, 0.14, rotation, color, 0.42));
}

function createRotatingSlantedBars(
  entries: Array<[number, number, number, number, string, number?]>
): MapEntity[] {
  return entries.map(([x, y, width, rotation, color, angularVelocity]) =>
    box(x, y, width, 0.14, rotation, color, 0.42, angularVelocity ?? (x < COURSE_WIDTH / 2 ? 1.9 : -1.9))
  );
}

function createFunnelBars(
  centerX: number,
  centerY: number,
  width: number,
  colorA: string,
  colorB: string
): MapEntity[] {
  return [
    staticBox(centerX - 5.9, centerY, width, 0.16, 0.48, colorA, 0.52),
    staticBox(centerX + 5.9, centerY, width, 0.16, -0.48, colorB, 0.52),
  ];
}

function createWideWallFunnelBars(
  centerX: number,
  centerY: number,
  width: number,
  colorA: string,
  colorB: string
): MapEntity[] {
  return [
    staticBox(centerX - 8.6, centerY, width, 0.16, 0.34, colorA, 0.56),
    staticBox(centerX + 8.6, centerY, width, 0.16, -0.34, colorB, 0.56),
  ];
}

function createUpFunnelBars(
  apexX: number,
  apexY: number,
  width: number,
  colorA: string,
  colorB: string
): MapEntity[] {
  const angle = 0.62;
  const offsetX = Math.cos(angle) * width;
  const offsetY = Math.sin(angle) * width;
  return [
    staticBox(apexX - offsetX, apexY + offsetY, width, 0.16, -angle, colorA, 0.52),
    staticBox(apexX + offsetX, apexY + offsetY, width, 0.16, angle, colorB, 0.52),
  ];
}

function createWallPinballKickers(y: number, colorA: string, colorB: string): StageKicker[] {
  const wallAngle = Math.atan2(12, 4);
  return [
    {
      id: `left-kicker-${y}`,
      side: 'left',
      hingeX: 4.07,
      hingeY: y,
      length: 3.1,
      restAngle: wallAngle,
      activeAngle: wallAngle - 1.05,
      color: colorA,
      impulse: { x: 16.2, y: -25.8 },
    },
    {
      id: `right-kicker-${y}`,
      side: 'right',
      hingeX: 21.93,
      hingeY: y,
      length: 3.1,
      restAngle: -wallAngle,
      activeAngle: -wallAngle + 1.05,
      color: colorB,
      impulse: { x: -16.2, y: -25.8 },
    },
  ];
}

function createPegField(
  startY: number,
  rows: number,
  gapY: number,
  color: string,
  seedOffset = 0,
  blockedYRanges: Array<[number, number]> = []
): MapEntity[] {
  const pegs: MapEntity[] = [];
  const hash = (value: number) => {
    const x = Math.sin(value * 12.9898 + startY * 0.173 + seedOffset * 1.917) * 43758.5453;
    return x - Math.floor(x);
  };

  let previousX = 13;
  for (let row = 0; row < rows; row++) {
    const y = startY + row * gapY;
    if (blockedYRanges.some(([from, to]) => y >= from && y <= to)) {
      continue;
    }
    let x = 6.8 + hash(row + 1) * 12.4;
    const distanceFromPrevious = Math.abs(x - previousX);

    if (distanceFromPrevious < 1.35) {
      x += x < 13 ? -1.8 : 1.8;
    }

    x = Math.max(6.4, Math.min(19.6, x));
    previousX = x;
    pegs.push(peg(x, y, 0.22, color));
  }
  return pegs;
}

function createBumperGate(
  y: number,
  color: string,
  includeCenter = true,
  centerAngularVelocity = 0,
  sideAngularVelocity = 1.8
): MapEntity[] {
  const entities = [
    spinner(7.8, y, 1.7, 0.68, sideAngularVelocity, color),
    spinner(18.2, y, 1.7, -0.68, -sideAngularVelocity, color),
  ];

  if (includeCenter) {
    entities.splice(
      1,
      0,
      centerAngularVelocity === 0
        ? box(13.0, y + 1.2, 2.2, 0.16, 0, '#ffd2a3', 0.85)
        : spinner(13.0, y + 1.2, 2.2, 0, centerAngularVelocity, '#ffd2a3')
    );
  }

  return entities;
}

function createWallSpinners(startY: number, rows: number, gapY: number): MapEntity[] {
  const entities: MapEntity[] = [];
  for (let row = 0; row < rows; row++) {
    const y = startY + row * gapY;
    const velocity = row % 2 === 0 ? 2.8 : -2.6;
    entities.push(...rotor(4.6 + (row % 3) * 0.35, y, 1.38, velocity, '#ffb26e', '#74efff'));
    entities.push(...rotor(21.4 - (row % 3) * 0.35, y + 6, 1.38, -velocity, '#74efff', '#ffb26e'));
  }
  return entities;
}

function createChaosField(entries: Array<[number, number, number, number, number, string]>): MapEntity[] {
  return entries.map(([x, y, width, height, rotation, color]) => box(x, y, width, height, rotation, color, 0.34));
}

function createWallWindZones(startY: number, rows: number, gapY: number): StageWindZone[] {
  const zones: StageWindZone[] = [];
  for (let row = 0; row < rows; row++) {
    const y = startY + row * gapY;
    zones.push({
      id: `left-wind-${row}`,
      x: 4.8,
      y,
      width: 3.6,
      height: 10,
      direction: 'right',
      strength: 1.7 + (row % 3) * 0.18,
      color: 'rgba(116, 239, 255, 0.26)',
    });
    zones.push({
      id: `right-wind-${row}`,
      x: 21.2,
      y: y + 5,
      width: 3.6,
      height: 10,
      direction: 'left',
      strength: 1.7 + ((row + 1) % 3) * 0.18,
      color: 'rgba(255, 178, 110, 0.22)',
    });
  }
  return zones;
}

function createInteractives(topY: number, goalY: number, hunterOffset = 0): StageInteractives {
  const boosts: StageBoost[] = [];
  const kickers: StageKicker[] = topY === -42 ? createWallPinballKickers(222.6, '#ffd7a3', '#8df2ff') : [];
  const hunterRows = [64, 94, 102, 132, 156, 166, 188, 212];
  for (let index = 0; index < 22; index++) {
    const y = 24 + Math.random() * (goalY - 48);
    const x = 5.3 + Math.random() * 15.4;
    boosts.push({
      id: `ai-${index}`,
      label: 'AI',
      x,
      y,
      radius: 0.55,
      color: 'rgba(107, 249, 255, 0.95)',
      impulse: {
      x: (Math.random() - 0.5) * 0.1,
      y: 0.32 + Math.random() * 0.08,
      },
    });
  }

  const hunterDefs: Array<{
    label: string;
    x: number;
    y: number;
    color: string;
    mode: 'retire' | 'magnet';
    axis: 'x' | 'y';
    amplitude: number;
    speed: number;
    phase: number;
    movement?: 'axis' | 'chaos';
    driftAmplitudeX?: number;
    driftAmplitudeY?: number;
    driftSpeedX?: number;
    driftSpeedY?: number;
    driftPhaseX?: number;
    driftPhaseY?: number;
  }> = [
    { label: '현업1', x: 11.0, y: hunterRows[0] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.2, speed: 1.15, phase: 0 },
    { label: '현업2', x: 14.8, y: hunterRows[1] + hunterOffset, color: '#ff4d4d', mode: 'retire', axis: 'y', amplitude: 3.5, speed: 1.35, phase: Math.PI * 0.2 },
    { label: '현업3', x: 13.0, y: hunterRows[2] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.4, speed: 1.42, phase: Math.PI * 0.32 },
    { label: '현업4', x: 12.0, y: hunterRows[3] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 5.4, speed: 1.5, phase: Math.PI * 0.45 },
    { label: '현업5', x: 15.2, y: hunterRows[4] + hunterOffset, color: '#ff4d4d', mode: 'retire', axis: 'y', amplitude: 3.3, speed: 1.28, phase: Math.PI * 0.7 },
    { label: '현업6', x: 13.2, y: hunterRows[5] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.1, speed: 1.56, phase: Math.PI * 0.88 },
    { label: '현업7', x: 10.8, y: hunterRows[6] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.0, speed: 1.6, phase: Math.PI * 0.95 },
    {
      label: '현업8',
      x: 14.6,
      y: hunterRows[7] + hunterOffset,
      color: '#ff4d4d',
      mode: 'retire',
      axis: 'x',
      amplitude: 0.2,
      speed: 0.8,
      phase: Math.PI * 1.18,
      movement: 'chaos',
      driftAmplitudeX: 5.8,
      driftAmplitudeY: 4.1,
      driftSpeedX: 2.8,
      driftSpeedY: 3.9,
      driftPhaseX: Math.PI * 0.35,
      driftPhaseY: Math.PI * 1.1,
    },
  ];

  const hunters: StageHunter[] = hunterDefs.map((hunter, index) => ({
    id: `${hunter.label.toLowerCase()}-${index}`,
    label: hunter.label,
    x: hunter.x,
    y: hunter.y,
    radius: hunter.mode === 'retire' ? 0.6 : 0.9,
    magnetRange: hunter.mode === 'magnet' ? 1.4 : 0.6,
    color: hunter.color,
    mode: hunter.mode,
    axis: hunter.axis,
    amplitude: hunter.amplitude,
    speed: hunter.speed,
    phase: hunter.phase,
    movement: (hunter as StageHunter).movement,
    driftAmplitudeX: (hunter as StageHunter).driftAmplitudeX,
    driftAmplitudeY: (hunter as StageHunter).driftAmplitudeY,
    driftSpeedX: (hunter as StageHunter).driftSpeedX,
    driftSpeedY: (hunter as StageHunter).driftSpeedY,
    driftPhaseX: (hunter as StageHunter).driftPhaseX,
    driftPhaseY: (hunter as StageHunter).driftPhaseY,
    pulseInterval: hunter.mode === 'magnet' ? 2900 : undefined,
    pulseRadius: hunter.mode === 'magnet' ? 2.5 : undefined,
    pulseForce: hunter.mode === 'magnet' ? 4.2 : undefined,
  }));

  return { boosts, hunters, kickers };
}

function createEmptyInteractives(): StageInteractives {
  return {
    boosts: [],
    hunters: [],
    kickers: [],
  };
}

function intensifyHunters(hunters: StageHunter[], amplitudeScale = 1.85, speedScale = 1.55): StageHunter[] {
  return hunters.map((hunter) => ({
    ...hunter,
    radius: hunter.mode === 'retire' ? hunter.radius * 1.08 : hunter.radius,
    magnetRange: hunter.mode === 'retire' ? hunter.magnetRange * 1.08 : hunter.magnetRange,
    amplitude: hunter.amplitude * amplitudeScale,
    speed: hunter.speed * speedScale,
    driftAmplitudeX: hunter.driftAmplitudeX ? hunter.driftAmplitudeX * amplitudeScale : hunter.driftAmplitudeX,
    driftAmplitudeY: hunter.driftAmplitudeY ? hunter.driftAmplitudeY * amplitudeScale : hunter.driftAmplitudeY,
    driftSpeedX: hunter.driftSpeedX ? hunter.driftSpeedX * speedScale : hunter.driftSpeedX,
    driftSpeedY: hunter.driftSpeedY ? hunter.driftSpeedY * speedScale : hunter.driftSpeedY,
  }));
}

function createQuickDropInteractives(): StageInteractives {
  const hunters: StageHunter[] = [
      {
        id: 'quick-red-mid-1',
        label: '현업',
        x: 11.7,
        y: 24.4,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1,
        phase: Math.PI * 0.18,
        movement: 'chaos',
        driftAmplitudeX: 0.82,
        driftAmplitudeY: 0.52,
        driftSpeedX: 3.05,
        driftSpeedY: 3.8,
        driftPhaseX: Math.PI * 0.15,
        driftPhaseY: Math.PI * 0.62,
      },
      {
        id: 'quick-red-lower-start-1',
        label: '현업',
        x: 9.7,
        y: 18.4,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1,
        phase: Math.PI * 0.26,
        movement: 'chaos',
        driftAmplitudeX: 1.0,
        driftAmplitudeY: 0.48,
        driftSpeedX: 3.2,
        driftSpeedY: 3.62,
        driftPhaseX: Math.PI * 0.28,
        driftPhaseY: Math.PI * 0.72,
      },
      {
        id: 'quick-red-lower-start-3',
        label: '현업',
        x: 16.3,
        y: 18.8,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1,
        phase: Math.PI * 0.92,
        movement: 'chaos',
        driftAmplitudeX: 1.0,
        driftAmplitudeY: 0.5,
        driftSpeedX: 3.1,
        driftSpeedY: 3.7,
        driftPhaseX: Math.PI * 0.96,
        driftPhaseY: Math.PI * 1.38,
      },
      {
        id: 'quick-red-roam-3',
        label: '현업',
        x: 10.9,
        y: 31.4,
        radius: 0.37,
        magnetRange: 0.37,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1.04,
        phase: Math.PI * 0.66,
        movement: 'chaos',
        driftAmplitudeX: 0.8,
        driftAmplitudeY: 0.54,
        driftSpeedX: 3.3,
        driftSpeedY: 4.18,
        driftPhaseX: Math.PI * 0.7,
        driftPhaseY: Math.PI * 1.1,
      },
      {
        id: 'quick-red-bottom-1',
        label: '현업',
        x: 14.2,
        y: 54.8,
        radius: 0.39,
        magnetRange: 0.39,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.2,
        speed: 1.28,
        phase: Math.PI * 1.34,
        movement: 'chaos',
        driftAmplitudeX: 2.05,
        driftAmplitudeY: 0.88,
        driftSpeedX: 4.55,
        driftSpeedY: 4.7,
        driftPhaseX: Math.PI * 1.38,
        driftPhaseY: Math.PI * 1.82,
      },
    ];

  return {
    boosts: [],
    hunters: intensifyHunters(hunters),
    kickers: [],
  };
}

function createPinballPanicInteractives(): StageInteractives {
  const hunters: StageHunter[] = [
      {
        id: 'pinball-red-roam-2',
        label: '현업',
        x: 11.0,
        y: 21.2,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1.08,
        phase: Math.PI * 0.38,
        movement: 'chaos',
        driftAmplitudeX: 0.88,
        driftAmplitudeY: 0.58,
        driftSpeedX: 3.48,
        driftSpeedY: 4.24,
        driftPhaseX: Math.PI * 0.5,
        driftPhaseY: Math.PI * 0.88,
      },
      {
        id: 'pinball-red-roam-5',
        label: '현업',
        x: 15.9,
        y: 17.4,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.14,
        speed: 1.22,
        phase: Math.PI * 0.72,
        movement: 'chaos',
        driftAmplitudeX: 1.08,
        driftAmplitudeY: 0.72,
        driftSpeedX: 4.15,
        driftSpeedY: 4.62,
        driftPhaseX: Math.PI * 0.78,
        driftPhaseY: Math.PI * 1.24,
      },
      {
        id: 'pinball-red-roam-6',
        label: '현업',
        x: 17.1,
        y: 29.8,
        radius: 0.39,
        magnetRange: 0.39,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.14,
        speed: 1.24,
        phase: Math.PI * 1.08,
        movement: 'chaos',
        driftAmplitudeX: 1.14,
        driftAmplitudeY: 0.74,
        driftSpeedX: 4.28,
        driftSpeedY: 4.78,
        driftPhaseX: Math.PI * 1.18,
        driftPhaseY: Math.PI * 1.58,
      },
      {
        id: 'pinball-red-roam-4',
        label: '현업',
        x: 14.4,
        y: 39.0,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.1,
        speed: 1.08,
        phase: Math.PI * 0.94,
        movement: 'chaos',
        driftAmplitudeX: 0.92,
        driftAmplitudeY: 0.54,
        driftSpeedX: 3.66,
        driftSpeedY: 4.28,
        driftPhaseX: Math.PI * 1.02,
        driftPhaseY: Math.PI * 1.46,
      },
      {
        id: 'pinball-red-roam-7',
        label: '현업',
        x: 10.2,
        y: 35.2,
        radius: 0.38,
        magnetRange: 0.38,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.14,
        speed: 1.2,
        phase: Math.PI * 1.42,
        movement: 'chaos',
        driftAmplitudeX: 1.12,
        driftAmplitudeY: 0.7,
        driftSpeedX: 4.34,
        driftSpeedY: 4.68,
        driftPhaseX: Math.PI * 1.48,
        driftPhaseY: Math.PI * 1.84,
      },
      {
        id: 'pinball-red-bottom-1',
        label: '현업',
        x: 15.0,
        y: 43.2,
        radius: 0.39,
        magnetRange: 0.39,
        color: '#ff4d4d',
        mode: 'retire',
        axis: 'x',
        amplitude: 0.2,
        speed: 1.28,
        phase: Math.PI * 1.28,
        movement: 'chaos',
        driftAmplitudeX: 1.95,
        driftAmplitudeY: 0.72,
        driftSpeedX: 4.55,
        driftSpeedY: 4.85,
        driftPhaseX: Math.PI * 1.22,
        driftPhaseY: Math.PI * 1.72,
      },
    ];

  return {
    boosts: [],
    hunters: intensifyHunters(hunters, 2.05, 1.7),
    kickers: [],
  };
}

function createManualWorkCourse(): StageDef {
  const topY = -42;
  const goalY = 236;
  return {
    title: 'Map 1 - Original',
    description: 'The original long course with the full hazard set.',
    topY,
    goalY,
    zoomY: 228,
    width: COURSE_WIDTH,
    windZones: createWallWindZones(28, 10, 20),
    magnet: {
      x: COURSE_WIDTH / 2,
      y: goalY - 16,
      radius: 1.35,
      triggerRadius: 4.2,
      pullStrength: 0.95,
      swirlStrength: 0.52,
      duration: 2000,
      pulseInterval: 4000,
      pulseRadius: 5.4,
      pulseForce: 5.2,
    },
    createInteractives: () => createInteractives(topY, goalY, 0),
    entities: [
      ...createFrame(topY, goalY, '#74dfff'),
      ...createSideRails(topY + 16, goalY - 8),
      ...createScatterSlantedBars([
        [8.5, 34, 1.8, 0.62, '#7af0ff'],
        [13.2, 40, 1.7, -0.44, '#ffcf93'],
        [17.1, 46, 1.55, -0.74, '#ffb26e'],
        [6.9, 52, 1.9, 0.86, '#7af0ff'],
        [11.2, 58, 1.7, -0.58, '#ffd59a'],
        [19.1, 64, 1.65, 0.72, '#ffb26e'],
        [15.9, 72, 1.85, 0.86, '#7af0ff'],
        [9.5, 79, 1.7, 0.48, '#ffcf93'],
        [7.6, 88, 1.6, -0.72, '#ffb26e'],
        [17.1, 126, 1.8, -0.82, '#7af0ff'],
        [14.8, 136, 1.7, -0.92, '#7af0ff'],
        [8.2, 145, 1.95, 0.68, '#ffd59a'],
        [18.8, 161, 1.7, -0.58, '#7af0ff'],
        [17.8, 171, 1.8, -0.64, '#7af0ff'],
        [12.8, 179, 1.85, 0.47, '#ffcf93'],
        [11.6, 189, 2.0, 0.58, '#ffd59a'],
      ]),
      ...createFunnelBars(13, 108, 5.1, '#ffbe7a', '#76efff'),
      ...createFunnelBars(13, 140, 4.6, '#ffd28f', '#74efff'),
      ...createUpFunnelBars(13, 118, 4.8, '#76efff', '#ffbe7a'),
      ...createUpFunnelBars(13, 154, 4.4, '#76efff', '#ffbe7a'),
      ...rotor(9.2, 95, 1.15, 2.05, '#ffcf93', '#76efff'),
      ...rotor(16.8, 95, 1.15, -2.05, '#76efff', '#ffcf93'),
      ...rotor(10.1, 122, 1.05, -1.9, '#ffb26e', '#7af0ff'),
      ...rotor(15.9, 122, 1.05, 1.9, '#7af0ff', '#ffb26e'),
      ...rotor(8.7, 147, 1.0, 1.85, '#ffcf93', '#76efff'),
      ...rotor(17.3, 147, 1.0, -1.85, '#76efff', '#ffcf93'),
      ...createFunnelBars(13, 172, 5.1, '#ffbe7a', '#76efff'),
      ...createWideWallFunnelBars(13, 208, 7.6, '#ffcf93', '#76efff'),
      ...createWallSpinners(36, 8, 24),
      ...createPegField(24, 63, 10 / 3, '#a7f6ff', 0, [[96, 126], [160, 186], [196, 224]]),
      ...createPegField(25.7, 54, 10 / 3, '#dffcff', 1, [[96, 126], [160, 186], [196, 224]]),
      ...createChaosField([
        [9.2, 52, 1.5, 0.14, 1.05, '#ffb26e'],
        [16.8, 66, 1.2, 0.14, -0.88, '#74efff'],
        [11.7, 84, 0.9, 0.14, -0.42, '#ffcf93'],
        [17.1, 131, 1.4, 0.14, 0.56, '#74efff'],
        [10.5, 158, 1.3, 0.14, 0.84, '#ffb26e'],
      ]),
      ...createBumperGate(62, '#ffb26e', false),
      ...createBumperGate(156, '#ffb26e', false),
      ...createBumperGate(204, '#78e7ff', true, 2.4),
      spinner(13, 90, 3.3, 0, 1.6, '#ff8e4d'),
      spinner(13, 140, 3.6, 0, -1.45, '#76ecff'),
      spinner(13, 188, 3.2, 0, 1.85, '#ff8e4d'),
      ...rotor(7.2, 216.5, 2.1, 2.35, '#ffce92', '#72f2ff'),
      ...rotor(18.8, 216.5, 2.1, -2.35, '#72f2ff', '#ffce92'),
      spinner(11.2, 225.9, 2.0, 0.24, -3.1, '#ffe9be'),
      spinner(14.8, 225.9, 2.0, -0.24, 3.1, '#74efff'),
    ],
  };
}

function createQuickDropCourse(options: Partial<Pick<StageDef, 'title' | 'description' | 'background' | 'bossImage'>> = {}): StageDef {
  const topY = -10;
  const goalY = 68;
  const entities: MapEntity[] = [
    ...createPinchedFrame(topY, goalY),
    ...createChaosField([
      [16.4, 13.5, 1.1, 0.14, 0.48, '#78efff'],
      [10.0, 35.8, 1.1, 0.14, -0.42, '#78efff'],
      [15.2, 55.8, 1.1, 0.14, 0.36, '#78efff'],
    ]),
  ];

  entities.push(
    ...createRotatingSlantedBars([
      [10.6, 3.6, 1.7, 0.48, '#dbfdff', 1.85],
      [14.1, 5.5, 2.2, 0.58, '#79efff', -2.05],
      [17.6, 8.2, 2.0, 0.46, '#d9fdff', 2.15],
      [15.8, 12.0, 2.5, -0.34, '#79efff', -2.05],
      [18.8, 15.8, 1.8, -0.5, '#dbfdff', 2.2],
      [16.6, 19.3, 2.2, -0.62, '#79efff', -2.2],
      [13.6, 23.0, 2.4, -0.52, '#d9fdff', 2.05],
      [11.0, 27.0, 2.4, -0.58, '#79efff', -2.15],
      [8.8, 31.0, 2.0, -0.46, '#dbfdff', 2.2],
      [10.7, 35.0, 2.4, 0.42, '#d9fdff', -2.0],
      [8.5, 39.4, 2.1, 0.58, '#79efff', 2.15],
      [10.9, 43.6, 2.1, 0.52, '#dbfdff', -2.18],
      [13.4, 47.2, 2.4, 0.48, '#d9fdff', 2.1],
      [15.8, 51.0, 2.3, 0.56, '#79efff', -2.22],
      [13.2, 54.7, 2.0, -0.34, '#dbfdff', 2.12],
      [16.4, 58.7, 2.2, -0.48, '#79efff', -2.2],
      [14.3, 62.4, 2.2, 0.24, '#d9fdff', 2.05],
      [17.2, 65.2, 1.8, -0.38, '#79efff', -2.15],
    ])
  );
  entities.push(...rotor(17.4, 17.4, 1.2, 2.35, '#dbfdff', '#79efff'));
  entities.push(...rotor(9.2, 38.2, 1.2, -2.35, '#dbfdff', '#79efff'));
  entities.push(...rotor(15.8, 58.8, 1.18, 2.25, '#dbfdff', '#79efff'));
  entities.push(spinner(15.9, 28.2, 2.4, -0.22, -1.75, '#8cefff'));
  entities.push(spinner(10.0, 48.6, 2.2, 0.18, 1.75, '#8cefff'));
  entities.push(spinner(15.8, 64.5, 2.0, -0.14, -1.65, '#8cefff'));

  return {
    title: options.title ?? 'Map 2 - Quick Drop',
    description: options.description ?? 'A short no-AI switchback course that bends right, left, then right.',
    topY,
    goalY,
    zoomY: 62,
    width: COURSE_WIDTH,
    background: options.background,
    bossImage: options.bossImage ?? aiRobotBossImage,
    showCourseGuides: false,
    windZones: [],
    magnet: {
      x: COURSE_WIDTH / 2,
      y: goalY - 16,
      radius: 1.05,
      triggerRadius: 3.8,
      pullStrength: 1.04,
      swirlStrength: 0.48,
      duration: 1200,
      pulseInterval: 3600,
      pulseRadius: 4.3,
      pulseForce: 4.4,
    },
    createInteractives: createQuickDropInteractives,
    entities,
  };
}

function createSpaceDropCourse(): StageDef {
  const topY = -10;
  return createQuickDropCourse({
    title: 'Map 4 - Space Drop',
    description: 'Map 2 layout with the cosmic neon background.',
    background: {
      image: map4SpaceBackground,
      x: 0,
      y: topY,
      width: COURSE_WIDTH,
      height: 78,
    },
  });
}

function createRaceDropCourse(): StageDef {
  const topY = -10;
  return createQuickDropCourse({
    title: 'Map 5 - Race Drop',
    description: 'Map 2 layout with the toy racing course background.',
    background: {
      image: map5RaceBackground,
      x: 0,
      y: topY,
      width: COURSE_WIDTH,
      height: 78,
    },
  });
}

function createForestDropCourse(): StageDef {
  const topY = -10;
  return createQuickDropCourse({
    title: 'Map 6 - Forest Drop',
    description: 'Map 2 layout with the bright forest cliff background.',
    background: {
      image: map6ForestBackground,
      x: 0,
      y: topY,
      width: COURSE_WIDTH,
      height: 78,
    },
  });
}

function createPinballPanicCourse(): StageDef {
  const topY = -8;
  const goalY = 50;
  const entities: MapEntity[] = [
    ...createDiagonalSwitchbackFrame(topY, goalY),
    ...createRotatingSlantedBars([
      [12.8, 8.8, 3.0, 0.52, '#ffb26e'],
      [16.0, 12.1, 3.2, 0.52, '#79efff'],
      [19.0, 15.5, 2.8, 0.46, '#ffd49f'],
      [9.8, 33.3, 2.6, 0.46, '#ffd49f'],
      [13.6, 36.7, 3.0, 0.42, '#79efff'],
      [14.2, 44.0, 2.5, 0.12, '#ffb26e'],
    ]),
    ...createRotatingSlantedBars([
      [20.4, 18.7, 1.1, 0.52, '#79efff'],
    ]),
    ...rotor(19.0, 19.3, 1.15, 2.15, '#ffce92', '#79efff'),
  ];

  return {
    title: 'Map 3 - Pinball Panic',
    description: 'A shallow 30-degree switchback: down, right, left, then down.',
    topY,
    goalY,
    zoomY: 45,
    width: COURSE_WIDTH,
    bossImage: aiRobotBossImage,
    showCourseGuides: false,
    windZones: [],
    magnet: {
      x: COURSE_WIDTH / 2,
      y: goalY - 16,
      radius: 1.08,
      triggerRadius: 3.8,
      pullStrength: 1.1,
      swirlStrength: 0.45,
      duration: 1200,
      pulseInterval: 3400,
      pulseRadius: 4.2,
      pulseForce: 4.6,
    },
    createInteractives: createPinballPanicInteractives,
    entities,
  };
}

export const stages: StageDef[] = [
  createManualWorkCourse(),
  createQuickDropCourse(),
  createPinballPanicCourse(),
  createSpaceDropCourse(),
  createRaceDropCourse(),
  createForestDropCourse(),
];
