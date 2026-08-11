const FACE_KEY = 'facefall.face.v1';

export class FaceStore {
  load(): string | null {
    try {
      return localStorage.getItem(FACE_KEY);
    } catch {
      return null;
    }
  }

  save(dataUrl: string): void {
    try {
      localStorage.setItem(FACE_KEY, dataUrl);
    } catch (error) {
      console.warn('[Facefall] could not persist face locally', error);
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(FACE_KEY);
    } catch {
      // Storage is optional; removing a face must never block the game.
    }
  }
}
