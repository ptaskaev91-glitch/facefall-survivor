export type FaceSlot = 'makar' | 'mama' | 'papa';

export class FaceStore {
  constructor(private readonly slot: FaceSlot = 'makar') {}

  private get key(): string { return `super-makar.face.${this.slot}.v2`; }
  private get legacyKey(): string { return `super-makar.face.${this.slot}.v1`; }

  load(): string | null {
    try {
      return localStorage.getItem(this.key) ?? this.loadLegacy();
    } catch {
      return null;
    }
  }

  needsNormalization(): boolean {
    try {
      return !localStorage.getItem(this.key) && this.loadLegacy() !== null;
    } catch {
      return false;
    }
  }

  save(dataUrl: string): void {
    try {
      localStorage.setItem(this.key, dataUrl);
    } catch (error) {
      console.warn('[Super Makar] could not persist face locally', error);
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.legacyKey);
      if (this.slot === 'makar') localStorage.removeItem('facefall.face.v1');
    } catch { /* local storage is optional */ }
  }

  private loadLegacy(): string | null {
    return localStorage.getItem(this.legacyKey) ?? (this.slot === 'makar' ? localStorage.getItem('facefall.face.v1') : null);
  }
}
