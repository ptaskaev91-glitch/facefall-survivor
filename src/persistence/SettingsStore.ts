export interface FacefallSettings {
  aimSensitivity: number;
  aimDeadzone: number;
  masterVolume: number;
}

const KEY = 'facefall.settings.v1';

const DEFAULTS: FacefallSettings = {
  aimSensitivity: 1.05,
  aimDeadzone: 0.12,
  masterVolume: 0.72
};

export class SettingsStore {
  load(): FacefallSettings {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<FacefallSettings>;
      return {
        aimSensitivity: this.clamp(parsed.aimSensitivity, 0.45, 2.2, DEFAULTS.aimSensitivity),
        aimDeadzone: this.clamp(parsed.aimDeadzone, 0.04, 0.28, DEFAULTS.aimDeadzone),
        masterVolume: this.clamp(parsed.masterVolume, 0, 1, DEFAULTS.masterVolume)
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  save(settings: FacefallSettings): void {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  defaults(): FacefallSettings {
    return { ...DEFAULTS };
  }

  private clamp(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : fallback;
  }
}
