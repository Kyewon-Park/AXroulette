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
};

export type StageHunterState = StageHunter & {
  currentX: number;
  currentY: number;
};

export type StageInteractives = {
  boosts: StageBoost[];
  hunters: StageHunter[];
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

export type StageDef = {
  title: string;
  goalY: number;
  zoomY: number;
  topY: number;
  width: number;
  entities: MapEntity[];
  windZones: StageWindZone[];
  magnet: StageMagnet;
  createInteractives: () => StageInteractives;
};

const COURSE_LEFT = 2.2;
const COURSE_RIGHT = 23.8;
const COURSE_WIDTH = 26;
const DEFAULT_BAR_SPIN = 1.65;

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

function createPegField(startY: number, rows: number, gapY: number, color: string): MapEntity[] {
  const pegs: MapEntity[] = [];
  for (let row = 0; row < rows; row++) {
    const y = startY + row * gapY;
    const offset = row % 2 === 0 ? 0 : 1.3;
    for (let x = 6 + offset; x <= 20; x += 2.6) {
      pegs.push(peg(x, y, 0.22, color));
    }
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
  const hunterRows = [64, 94, 124, 156, 188, 218];
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
      x: (Math.random() - 0.5) * 1.8,
      y: 5.8 + Math.random() * 1.1,
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
  }> = [
    { label: '현업1', x: 11.0, y: hunterRows[0] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.2, speed: 1.15, phase: 0 },
    { label: '현업2', x: 14.8, y: hunterRows[1] + hunterOffset, color: '#ff4d4d', mode: 'retire', axis: 'y', amplitude: 3.5, speed: 1.35, phase: Math.PI * 0.2 },
    { label: '현업3', x: 12.0, y: hunterRows[2] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 5.4, speed: 1.5, phase: Math.PI * 0.45 },
    { label: '현업4', x: 15.2, y: hunterRows[3] + hunterOffset, color: '#ff4d4d', mode: 'retire', axis: 'y', amplitude: 3.3, speed: 1.28, phase: Math.PI * 0.7 },
    { label: '현업5', x: 10.8, y: hunterRows[4] + hunterOffset, color: '#ffd54a', mode: 'magnet', axis: 'x', amplitude: 6.0, speed: 1.6, phase: Math.PI * 0.95 },
    { label: '현업6', x: 14.6, y: hunterRows[5] + hunterOffset, color: '#ff4d4d', mode: 'retire', axis: 'y', amplitude: 3.8, speed: 1.82, phase: Math.PI * 1.18 },
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
    pulseInterval: hunter.mode === 'magnet' ? 2900 : undefined,
    pulseRadius: hunter.mode === 'magnet' ? 2.5 : undefined,
    pulseForce: hunter.mode === 'magnet' ? 4.2 : undefined,
  }));

  return { boosts, hunters };
}

function createManualWorkCourse(): StageDef {
  const topY = -42;
  const goalY = 236;
  return {
    title: 'Manual Work',
    topY,
    goalY,
    zoomY: 222,
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
      pulseInterval: 2000,
      pulseRadius: 5.4,
      pulseForce: 5.2,
    },
    createInteractives: () => createInteractives(topY, goalY, 0),
    entities: [
      ...createFrame(topY, goalY, '#74dfff'),
      ...createSideRails(topY + 16, goalY - 8),
      ...createChevronGrid(18, 12, 16, '#7af0ff', '#ffb26e'),
      ...createWallSpinners(36, 8, 24),
      ...createPegField(26, 13, 14, '#a7f6ff'),
      ...createChaosField([
        [9.2, 52, 1.5, 0.14, 1.05, '#ffb26e'],
        [16.8, 66, 1.2, 0.14, -0.88, '#74efff'],
        [11.7, 84, 0.9, 0.14, -0.42, '#ffcf93'],
        [14.1, 95, 1.6, 0.14, 0.98, '#74efff'],
        [8.9, 118, 1.1, 0.14, -1.12, '#ffb26e'],
        [17.1, 131, 1.4, 0.14, 0.56, '#74efff'],
        [10.5, 158, 1.3, 0.14, 0.84, '#ffb26e'],
        [15.6, 173, 1.0, 0.14, -0.76, '#74efff'],
        [12.4, 194, 1.8, 0.14, 0.24, '#ffcf93'],
      ]),
      ...createBumperGate(62, '#ffb26e', false),
      ...createBumperGate(156, '#ffb26e', false),
      ...createBumperGate(204, '#78e7ff', true, 2.4),
      spinner(13, 90, 3.3, 0, 1.6, '#ff8e4d'),
      spinner(13, 140, 3.6, 0, -1.45, '#76ecff'),
      spinner(13, 188, 3.2, 0, 1.85, '#ff8e4d'),
      ...rotor(7.2, 219, 2.1, 2.35, '#ffce92', '#72f2ff'),
      ...rotor(18.8, 219, 2.1, -2.35, '#72f2ff', '#ffce92'),
      ...rotor(13, 231, 1.6, 2.8, '#ffe9be', '#74efff'),
    ],
  };
}

function createEfficiencyBoostCourse(): StageDef {
  const topY = -56;
  const goalY = 250;
  const accent = '#8cedff';
  const entities: MapEntity[] = [
    ...createFrame(topY, goalY, accent),
    ...createSideRails(topY + 18, goalY - 10),
    ...createWallSpinners(34, 9, 23),
    ...createPegField(18, 15, 15, '#8cecff'),
    ...createChaosField([
      [8.6, 58, 1.2, 0.14, -1.06, '#ffb26e'],
      [17.3, 72, 1.1, 0.14, 0.88, '#79efff'],
      [11.2, 92, 1.4, 0.14, 0.48, '#ffb26e'],
      [15.2, 108, 1.0, 0.14, -1.18, '#79efff'],
      [9.7, 142, 1.3, 0.14, 1.04, '#ffcf93'],
      [16.5, 162, 1.6, 0.14, -0.44, '#79efff'],
      [12.6, 186, 1.0, 0.14, 0.92, '#ffb26e'],
      [14.7, 214, 1.5, 0.14, -0.72, '#79efff'],
    ]),
  ];

  for (let y = 34, row = 0; y <= 214; y += 18, row++) {
    const openLeft = row % 2 === 0;
    entities.push(box(openLeft ? 18.2 : 7.8, y, 3.4, 0.15, openLeft ? -0.38 : 0.38, '#ffb26e'));
    entities.push(box(openLeft ? 8.2 : 17.8, y + 6.5, 2.1, 0.12, openLeft ? 0.55 : -0.55, '#79efff'));
  }

  entities.push(spinner(9.2, 112, 2.8, 0.2, 2.2, '#ff8e4d'));
  entities.push(spinner(16.8, 150, 2.8, -0.2, -2.1, '#79efff'));
  entities.push(...rotor(13, 242, 1.75, 2.65, '#fff2c0', '#79efff'));

  return {
    title: 'Efficiency Boost',
    topY,
    goalY,
    zoomY: 236,
    width: COURSE_WIDTH,
    windZones: createWallWindZones(24, 11, 20),
    magnet: {
      x: COURSE_WIDTH / 2,
      y: goalY - 16,
      radius: 1.35,
      triggerRadius: 4.2,
      pullStrength: 1.0,
      swirlStrength: 0.55,
      duration: 2000,
      pulseInterval: 2000,
      pulseRadius: 5.4,
      pulseForce: 5.6,
    },
    createInteractives: () => createInteractives(topY, goalY, 10),
    entities,
  };
}

export const stages: StageDef[] = [createManualWorkCourse(), createEfficiencyBoostCourse()];
