import type { Marble } from './marble';
import type { RenderParameters } from './rouletteRenderer';
import type { Rect } from './types/rect.type';
import type { MouseEventArgs, UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';

export class RankRenderer implements UIObject {
  private _currentY = 0;
  private _targetY = 0;
  private fontHeight = 15;
  private _userMoved = 0;
  private _currentWinner = -1;
  private maxY = 0;
  private winners: Marble[] = [];
  private marbles: Marble[] = [];
  private retired: Marble[] = [];
  private winnerRank = -1;
  private messageHandler?: (msg: string) => void;

  @bound
  onWheel(e: WheelEvent) {
    this._targetY += e.deltaY;
    if (this._targetY > this.maxY) {
      this._targetY = this.maxY;
    }
    this._userMoved = 2000;
  }

  @bound
  onDblClick(e?: MouseEventArgs) {
    if (!e || !navigator.clipboard) return;

    const rows = [
      ...this.winners.map((marble, index) => [index + 1, marble.name, 'FINISH'].join('\t')),
      ...this.marbles.map((marble, index) => [index + this.winners.length + 1, marble.name, 'LIVE'].join('\t')),
      ...this.retired.map((marble) => ['-', marble.name, 'RETIRE'].join('\t')),
    ];
    rows.unshift(['Rank', 'Name', 'State'].join('\t'));

    navigator.clipboard.writeText(rows.join('\n')).then(() => {
      this.messageHandler?.('Race board copied');
    });
  }

  onMessage(func: (msg: string) => void) {
    this.messageHandler = func;
  }

  render(
    ctx: CanvasRenderingContext2D,
    { winners, marbles, retired, winnerRank, theme }: RenderParameters,
    width: number,
    height: number
  ) {
    const panelWidth = 150;
    const panelX = width - panelWidth - 14;
    const panelY = 14;
    const panelHeight = Math.min(260, height * 0.45);
    const startY = Math.max(-this.fontHeight, this._currentY - panelHeight / 2);
    this.maxY = Math.max(0, (marbles.length + winners.length + retired.length) * this.fontHeight + this.fontHeight);
    this._currentWinner = winners.length;

    this.winners = winners;
    this.marbles = marbles;
    this.retired = retired;
    this.winnerRank = winnerRank;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 14, 26, 0.78)';
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#dffcff';
    ctx.font = '700 12px "Trebuchet MS", sans-serif';
    ctx.fillText(`${winners.length}/${winners.length + marbles.length + retired.length}`, panelX + 10, panelY + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.font = '600 10px "Trebuchet MS", sans-serif';
    ctx.fillText(`Retire ${retired.length}`, panelX + 10, panelY + 34);

    ctx.beginPath();
    ctx.rect(panelX + 8, panelY + 42, panelWidth - 16, panelHeight - 50);
    ctx.clip();

    ctx.translate(0, -startY);
    ctx.font = '600 10px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.rankStroke;

    winners.forEach((marble, index) => {
      const y = index * this.fontHeight;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      ctx.strokeText(`${index + 1}. ${marble.name}`, panelX + 10, panelY + 56 + y);
      ctx.fillText(`${index + 1}. ${marble.name}`, panelX + 10, panelY + 56 + y);
    });

    marbles.forEach((marble, index) => {
      const y = (index + winners.length) * this.fontHeight;
      const text = `${index + winners.length + 1 === winnerRank + 1 ? '>' : ''}${marble.name}`;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      ctx.strokeText(text, panelX + 10, panelY + 56 + y);
      ctx.fillText(text, panelX + 10, panelY + 56 + y);
    });

    retired.forEach((marble, index) => {
      const y = (index + winners.length + marbles.length) * this.fontHeight;
      ctx.fillStyle = theme.danger;
      ctx.strokeText(`RET ${marble.name}`, panelX + 10, panelY + 56 + y);
      ctx.fillText(`RET ${marble.name}`, panelX + 10, panelY + 56 + y);
    });
    ctx.restore();
  }

  update(deltaTime: number) {
    if (this._currentWinner === -1) {
      return;
    }
    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
    } else {
      this._targetY = this._currentWinner * this.fontHeight + this.fontHeight;
    }
    if (this._currentY !== this._targetY) {
      this._currentY += (this._targetY - this._currentY) * (deltaTime / 250);
    }
    if (Math.abs(this._currentY - this._targetY) < 1) {
      this._currentY = this._targetY;
    }
  }

  getBoundingBox(): Rect | null {
    return null;
  }
}
