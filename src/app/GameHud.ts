export interface GameHudDom {
  status: HTMLDivElement;
  hp?: HTMLElement;
  wave?: HTMLElement;
  kills?: HTMLElement;
  score?: HTMLElement;
  gameOver?: HTMLElement;
  gameOverStats?: HTMLElement;
}

export interface HudSnapshot {
  state: string;
  levelId: string;
  hp: number;
  wave: number;
  kills: number;
  score: number;
  qualityId: string;
  cameraMode: string;
  navigationMode: string;
  weaponLabel: string;
  magazine: number;
  reserve: number;
  activeEnemies: number;
  maxActiveEnemies: number;
  pickups: number;
  projectiles: number;
  spatialCells: number;
  aimAssistStrength: number;
  effectRecipeCount: number;
}

/** DOM-only presentation. No gameplay state is mutated here. */
export class GameHud {
  constructor(private readonly dom: GameHudDom) {}

  setLastEvent(message: string): void {
    this.dom.status.dataset.lastEvent = message;
  }

  clearLastEvent(): void {
    this.dom.status.dataset.lastEvent = '';
  }

  refresh(snapshot: HudSnapshot): void {
    if (this.dom.hp) this.dom.hp.textContent = String(Math.ceil(snapshot.hp));
    if (this.dom.wave) this.dom.wave.textContent = String(Math.max(1, snapshot.wave));
    if (this.dom.kills) this.dom.kills.textContent = String(snapshot.kills);
    if (this.dom.score) this.dom.score.textContent = String(snapshot.score).padStart(6, '0');

    const lastEvent = this.dom.status.dataset.lastEvent ? ` · ${this.dom.status.dataset.lastEvent}` : '';
    this.dom.status.textContent = [
      `state=${snapshot.state}`,
      `level=${snapshot.levelId}`,
      `HP=${Math.ceil(snapshot.hp)}`,
      `wave=${Math.max(1, snapshot.wave)}`,
      `score=${snapshot.score}`,
      `quality=${snapshot.qualityId}`,
      `camera=${snapshot.cameraMode}`,
      `nav=${snapshot.navigationMode}`,
      `${snapshot.weaponLabel} ${snapshot.magazine}/${snapshot.reserve}`,
      `enemies=${snapshot.activeEnemies}/${snapshot.maxActiveEnemies}`,
      `pickups=${snapshot.pickups}`,
      `arrows=${snapshot.projectiles}`,
      `spatialCells=${snapshot.spatialCells}`,
      `aimAssist=${Math.round(snapshot.aimAssistStrength * 100)}%`,
      `fx=${snapshot.effectRecipeCount}`,
      'Three.js=bundled'
    ].join(' · ') + lastEvent;
  }

  hideGameOver(): void {
    this.dom.gameOver?.setAttribute('data-visible', 'false');
  }

  showGameOver(wave: number, kills: number, score: number): void {
    if (this.dom.gameOverStats) {
      this.dom.gameOverStats.textContent = `WAVE ${Math.max(1, wave)} · KILLS ${kills} · SCORE ${score}`;
    }
    this.dom.gameOver?.setAttribute('data-visible', 'true');
  }
}
