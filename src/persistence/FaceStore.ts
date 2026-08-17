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
      // Only release the legacy copy after the normalized v2 write succeeded.
      // If quota/security blocks the new write, the user's previous photo remains intact.
      localStorage.setItem(this.key, dataUrl);
      this.removeLegacy();
    } catch (error) {
      console.warn('[Super Makar] could not persist face locally', error);
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(this.key);
      this.removeLegacy();
    } catch { /* local storage is optional */ }
  }

  private loadLegacy(): string | null {
    return localStorage.getItem(this.legacyKey) ?? (this.slot === 'makar' ? localStorage.getItem('facefall.face.v1') : null);
  }

  private removeLegacy(): void {
    localStorage.removeItem(this.legacyKey);
    if (this.slot === 'makar') localStorage.removeItem('facefall.face.v1');
  }
}
