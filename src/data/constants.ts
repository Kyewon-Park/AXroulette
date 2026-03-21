import type { ColorTheme } from '../types/ColorTheme';

export const initialZoom = 30;
export const canvasWidth = 1600;
export const canvasHeight = 900;
export const zoomThreshold = 5;
export const STUCK_DELAY = 5000;

export enum Skills {
  None,
  Impact,
}

export const DefaultEntityColor = {
  box: 'cyan',
  circle: 'yellow',
  polyline: 'white',
} as const;

export const DefaultBloomColor = {
  box: 'cyan',
  circle: 'yellow',
  polyline: 'cyan',
};

export const Themes: Record<string, ColorTheme> = {
  light: {
    background: '#11192c',
    glowBackground: '#17253e',
    accent: '#6beeff',
    accentAlt: '#ffb26e',
    grid: 'rgba(107, 238, 255, 0.08)',
    glow: '#6beeff',
    danger: '#ff8e4d',
    marbleLightness: 58,
    marbleWinningBorder: '#fff4dc',
    skillColor: '#6beeff',
    coolTimeIndicator: '#ffb26e',
    entity: {
      box: {
        fill: '#4bcfff',
        outline: '#d7f6ff',
        bloom: '#61efff',
        bloomRadius: 10,
      },
      circle: {
        fill: '#ffcf73',
        outline: '#fff4db',
        bloom: '#ffb26e',
        bloomRadius: 9,
      },
      polyline: {
        fill: '#9ff6ff',
        outline: '#e9ffff',
        bloom: '#6beeff',
        bloomRadius: 8,
      },
    },
    rankStroke: '#0c1524',
    minimapBackground: 'rgba(7, 14, 26, 0.74)',
    minimapViewport: '#6beeff',
    winnerBackground: 'rgba(12, 20, 36, 0.72)',
    winnerOutline: '#08111d',
    winnerText: '#f7fbff',
  },
  dark: {
    background: '#050b16',
    glowBackground: '#0f1d35',
    accent: '#74efff',
    accentAlt: '#ff9a4d',
    grid: 'rgba(116, 239, 255, 0.1)',
    glow: '#74efff',
    danger: '#ff7a43',
    marbleLightness: 74,
    marbleWinningBorder: '#fff2ca',
    skillColor: '#74efff',
    coolTimeIndicator: '#ff9a4d',
    entity: {
      box: {
        fill: '#49d5ff',
        outline: '#e2fbff',
        bloom: '#67f0ff',
        bloomRadius: 16,
      },
      circle: {
        fill: '#ffbc69',
        outline: '#fff3d6',
        bloom: '#ffb26e',
        bloomRadius: 16,
      },
      polyline: {
        fill: '#86f3ff',
        outline: '#f4feff',
        bloom: '#74efff',
        bloomRadius: 18,
      },
    },
    rankStroke: '#06111d',
    minimapBackground: 'rgba(4, 9, 18, 0.82)',
    minimapViewport: '#74efff',
    winnerBackground: 'rgba(8, 14, 26, 0.78)',
    winnerOutline: '#050b14',
    winnerText: '#ffffff',
  },
};
