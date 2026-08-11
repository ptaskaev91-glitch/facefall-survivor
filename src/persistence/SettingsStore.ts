export interface GameSettings {
  aimSensitivity: number;
  aimDeadzone: number;
  aimAssist: number;
  audioVolume: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  aimSensitivity: 1.05,
  aimDeadzone: 0.12,
  aimAssist: 0.18,
  audioVolume: 0.55
};

const STORAGE_KEY = 'facefall:settings:v1';

export class SettingsStore {
  load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const value = JSON.parse(raw) as Partial<GameSettings>;
      return {
        aimSensitivity: clampNumber(value.aimSensitivity, 0.55, 1.8, DEFAULT_SETTINGS.aimSensitivity),
        aimDeadzone: clampNumber(value.aimDeadzone, 0.04, 0.28, DEFAULT_SETTINGS.aimDeadzone),
        aimAssist: clampNumber(value.aimAssist, 0, 0.45, DEFAULT_SETTINGS.aimAssist),
        audioVolume: clampNumber(value.audioVolume, 0, 1, DEFAULT_SETTINGS.audioVolume)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  save(settings: GameSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Settings persistence is optional; gameplay must continue if storage is blocked.
    }
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
