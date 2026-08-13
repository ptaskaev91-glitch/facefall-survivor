export type FaceSlot = 'makar' | 'mama' | 'papa';

export class FaceStore {
  constructor(private readonly slot: FaceSlot = 'makar') {}

  private get key(): string { return `super-makar.face.${this.slot}.v1`; }

  load(): string | null {
    try {
      return localStorage.getItem(this.key) ?? (this.slot === 'makar' ? localStorage.getItem('facefall.face.v1') : null);
    } catch {
      return null;
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
    try { localStorage.removeItem(this.key); } catch { /* local storage is optional */ }
  }
}
