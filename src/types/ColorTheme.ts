interface ShapeColor {
  outline: string;
  fill: string;
  bloom: string;
  bloomRadius: number;
}

export interface ColorTheme {
  background: string;
  glowBackground: string;
  accent: string;
  accentAlt: string;
  grid: string;
  glow: string;
  danger: string;
  marbleLightness: number;
  marbleWinningBorder: string;
  skillColor: string;
  coolTimeIndicator: string;
  entity: {
    box: ShapeColor;
    circle: ShapeColor;
    polyline: ShapeColor;
  };
  rankStroke: string;
  minimapBackground: string;
  minimapViewport: string;
  winnerText: string;
  winnerOutline: string;
  winnerBackground: string;
}
