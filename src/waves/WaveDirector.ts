import * as THREE from 'three';
import type { EnemyId } from '../enemies/archetypes';
import type { LevelMarker } from '../world/LevelManifest';

export interface SpawnRequest {
  type: EnemyId;
  position: THREE.Vector3;
}

export class WaveDirector {
  wave = 0;
  intermission = 0;

  private spawnMarkers: LevelMarker[] = [];
  private queue: EnemyId[] = [];
  private spawnCooldown = 0;
  private markerCursor = 0;
  private running = false;

  configure(markers: LevelMarker[]): void {
    this.spawnMarkers = markers.filter((marker) => marker.kind === 'enemy-spawn');
  }

  reset(): void {
    this.wave = 0;
    this.intermission = 0.8;
    this.queue.length = 0;
    this.spawnCooldown = 0;
    this.markerCursor = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.queue.length = 0;
  }

  update(dt: number, activeEnemies: number, maxActive: number): SpawnRequest[] {
    if (!this.running || this.spawnMarkers.length === 0) return [];

    if (this.queue.length === 0 && activeEnemies === 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.beginNextWave();
      return [];
    }

    if (this.queue.length === 0 || activeEnemies >= maxActive) return [];

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return [];
    this.spawnCooldown = Math.max(0.18, 0.62 - this.wave * 0.025);

    const type = this.queue.shift();
    if (!type) return [];
    const marker = this.spawnMarkers[this.markerCursor++ % this.spawnMarkers.length];
    const radius = marker.radius ?? 3;
    const angle = (this.markerCursor * 2.399963229728653) % (Math.PI * 2);
    const distance = radius * (0.25 + ((this.markerCursor * 0.37) % 0.65));

    return [{
      type,
      position: new THREE.Vector3(
        marker.position.x + Math.cos(angle) * distance,
        marker.position.y,
        marker.position.z + Math.sin(angle) * distance
      )
    }];
  }

  private beginNextWave(): void {
    this.wave += 1;
    this.queue = this.buildComposition(this.wave);
    this.spawnCooldown = 0;
    this.intermission = Math.max(1.5, 4.0 - this.wave * 0.08);
  }

  private buildComposition(wave: number): EnemyId[] {
    const result: EnemyId[] = [];
    const walkers = 3 + Math.ceil(wave * 1.45);
    const runners = Math.max(0, Math.floor((wave - 1) * 0.7));
    const brutes = wave >= 3 ? Math.floor(wave / 3) : 0;

    for (let i = 0; i < walkers; i++) result.push('walker');
    for (let i = 0; i < runners; i++) result.push('runner');
    for (let i = 0; i < brutes; i++) result.push('brute');

    for (let i = result.length - 1; i > 0; i--) {
      const j = (i * 17 + wave * 11) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
