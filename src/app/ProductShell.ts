import { aimController } from '../aim/AimController';
import type { CameraMode } from '../camera/CameraDirector';
import { FaceStore } from '../persistence/FaceStore';
import { SettingsStore, type FacefallSettings } from '../persistence/SettingsStore';
import type { AudioSystem } from '../presentation/audio/AudioSystem';
import type { GameApp } from './GameApp';

interface ProductShellDom {
  overlay: HTMLElement;
  start: HTMLButtonElement;
  faceInput: HTMLInputElement;
  facePreview: HTMLImageElement;
  faceEmpty: HTMLElement;
  removeFace: HTMLButtonElement;
  mamaInput: HTMLInputElement;
  mamaPreview: HTMLImageElement;
  mamaEmpty: HTMLElement;
  papaInput: HTMLInputElement;
  papaPreview: HTMLImageElement;
  papaEmpty: HTMLElement;
  cameraTop: HTMLButtonElement;
  cameraThird: HTMLButtonElement;
  sensitivity: HTMLInputElement;
  sensitivityValue: HTMLElement;
  deadzone: HTMLInputElement;
  deadzoneValue: HTMLElement;
  aimAssist: HTMLInputElement;
  aimAssistValue: HTMLElement;
  volume: HTMLInputElement;
  volumeValue: HTMLElement;
  loading: HTMLElement;
  error: HTMLElement;
}

const MAMA_KEY = 'super-makar-face-mama';
const PAPA_KEY = 'super-makar-face-papa';

export class ProductShell {
  private readonly faceStore = new FaceStore();
  private readonly settingsStore = new SettingsStore();
  private faceDataUrl: string | null = null;
  private mamaDataUrl: string | null = null;
  private papaDataUrl: string | null = null;
  private cameraMode: CameraMode = 'top';
  private settings: FacefallSettings = this.settingsStore.defaults();
  private busy = false;

  constructor(private readonly app: GameApp, private readonly dom: ProductShellDom, private readonly audio: AudioSystem) {}

  attach(): void {
    this.faceDataUrl = this.faceStore.load();
    this.mamaDataUrl = localStorage.getItem(MAMA_KEY);
    this.papaDataUrl = localStorage.getItem(PAPA_KEY);
    this.settings = this.settingsStore.load();
    this.applySettings();
    this.refreshFaces();
    this.refreshCamera();
    this.refreshSettings();
    this.dom.faceInput.addEventListener('change', this.onFaceChange);
    this.dom.mamaInput.addEventListener('change', this.onMamaChange);
    this.dom.papaInput.addEventListener('change', this.onPapaChange);
    this.dom.removeFace.addEventListener('click', this.onRemoveFace);
    this.dom.cameraTop.addEventListener('click', this.onTop);
    this.dom.cameraThird.addEventListener('click', this.onThird);
    this.dom.sensitivity.addEventListener('input', this.onSettingsInput);
    this.dom.deadzone.addEventListener('input', this.onSettingsInput);
    this.dom.aimAssist.addEventListener('input', this.onSettingsInput);
    this.dom.volume.addEventListener('input', this.onSettingsInput);
    this.dom.start.addEventListener('click', this.onStart);
    this.show();
  }

  detach(): void {
    this.dom.faceInput.removeEventListener('change', this.onFaceChange);
    this.dom.mamaInput.removeEventListener('change', this.onMamaChange);
    this.dom.papaInput.removeEventListener('change', this.onPapaChange);
    this.dom.removeFace.removeEventListener('click', this.onRemoveFace);
    this.dom.cameraTop.removeEventListener('click', this.onTop);
    this.dom.cameraThird.removeEventListener('click', this.onThird);
    this.dom.sensitivity.removeEventListener('input', this.onSettingsInput);
    this.dom.deadzone.removeEventListener('input', this.onSettingsInput);
    this.dom.aimAssist.removeEventListener('input', this.onSettingsInput);
    this.dom.volume.removeEventListener('input', this.onSettingsInput);
    this.dom.start.removeEventListener('click', this.onStart);
  }

  show(): void {
    this.app.enterMenu();
    this.dom.overlay.dataset.visible = 'true';
    this.dom.loading.textContent = '';
    this.dom.error.textContent = '';
  }

  private onFaceChange = async (): Promise<void> => {
    const value = await this.readSelected(this.dom.faceInput);
    if (value === undefined) return;
    this.faceDataUrl = value;
    this.faceStore.save(value);
    this.refreshFaces();
  };

  private onMamaChange = async (): Promise<void> => {
    const value = await this.readSelected(this.dom.mamaInput);
    if (value === undefined) return;
    this.mamaDataUrl = value;
    localStorage.setItem(MAMA_KEY, value);
    this.refreshFaces();
  };

  private onPapaChange = async (): Promise<void> => {
    const value = await this.readSelected(this.dom.papaInput);
    if (value === undefined) return;
    this.papaDataUrl = value;
    localStorage.setItem(PAPA_KEY, value);
    this.refreshFaces();
  };

  private onRemoveFace = (): void => {
    this.faceDataUrl = null;
    this.faceStore.remove();
    this.refreshFaces();
  };

  private onTop = (): void => { this.cameraMode = 'top'; this.refreshCamera(); };
  private onThird = (): void => { this.cameraMode = 'third'; this.refreshCamera(); };

  private onSettingsInput = (): void => {
    this.settings = {
      aimSensitivity: Number(this.dom.sensitivity.value),
      aimDeadzone: Number(this.dom.deadzone.value),
      aimAssist: Number(this.dom.aimAssist.value),
      masterVolume: Number(this.dom.volume.value)
    };
    this.settingsStore.save(this.settings);
    this.applySettings();
    this.refreshSettings();
  };

  private onStart = async (): Promise<void> => {
    if (this.busy) return;
    this.busy = true;
    this.dom.start.disabled = true;
    this.dom.error.textContent = '';
    this.dom.loading.textContent = 'ЗАГРУЖАЕМ «СУПЕР МАКАР»…';

    try {
      await this.audio.resume();
      await this.app.start({
        cameraMode: this.cameraMode,
        faceDataUrl: this.faceDataUrl,
        allyFaces: { supermama: this.mamaDataUrl, superpapa: this.papaDataUrl }
      });
      this.dom.overlay.dataset.visible = 'false';
      this.dom.loading.textContent = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.dom.error.textContent = `Не удалось запустить игру: ${message}`;
      this.dom.loading.textContent = '';
      this.app.enterMenu();
    } finally {
      this.busy = false;
      this.dom.start.disabled = false;
    }
  };

  private applySettings(): void {
    aimController.configure({ sensitivity: this.settings.aimSensitivity, deadzone: this.settings.aimDeadzone });
    this.app.configureAimAssist(Math.max(0.01, this.settings.aimAssist));
    this.audio.setVolume(this.settings.masterVolume);
  }

  private refreshSettings(): void {
    this.dom.sensitivity.value = String(this.settings.aimSensitivity);
    this.dom.deadzone.value = String(this.settings.aimDeadzone);
    this.dom.aimAssist.value = String(this.settings.aimAssist);
    this.dom.volume.value = String(this.settings.masterVolume);
    this.dom.sensitivityValue.textContent = `${this.settings.aimSensitivity.toFixed(2)}×`;
    this.dom.deadzoneValue.textContent = `${Math.round(this.settings.aimDeadzone * 100)}%`;
    this.dom.aimAssistValue.textContent = `${Math.round(this.settings.aimAssist * 100)}%`;
    this.dom.volumeValue.textContent = `${Math.round(this.settings.masterVolume * 100)}%`;
  }

  private refreshFaces(): void {
    this.refreshPreview(this.dom.facePreview, this.dom.faceEmpty, this.faceDataUrl);
    this.refreshPreview(this.dom.mamaPreview, this.dom.mamaEmpty, this.mamaDataUrl);
    this.refreshPreview(this.dom.papaPreview, this.dom.papaEmpty, this.papaDataUrl);
    this.dom.removeFace.hidden = !this.faceDataUrl;
  }

  private refreshPreview(image: HTMLImageElement, empty: HTMLElement, dataUrl: string | null): void {
    if (dataUrl) {
      image.src = dataUrl;
      image.hidden = false;
      empty.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      empty.hidden = false;
    }
  }

  private refreshCamera(): void {
    this.dom.cameraTop.dataset.active = String(this.cameraMode === 'top');
    this.dom.cameraThird.dataset.active = String(this.cameraMode === 'third');
  }

  private async readSelected(input: HTMLInputElement): Promise<string | undefined> {
    const file = input.files?.[0];
    if (!file) return undefined;
    input.value = '';
    if (!file.type.startsWith('image/')) { this.dom.error.textContent = 'Нужен файл изображения.'; return undefined; }
    if (file.size > 12 * 1024 * 1024) { this.dom.error.textContent = 'Фото слишком большое. Максимум 12 МБ.'; return undefined; }
    try {
      const value = await this.readFile(file);
      this.dom.error.textContent = '';
      return value;
    } catch {
      this.dom.error.textContent = 'Не удалось прочитать фотографию.';
      return undefined;
    }
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image data'));
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(file);
    });
  }
}

export function resolveProductShellDom(): ProductShellDom {
  const required = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id) as T | null;
    if (!element) throw new Error(`Missing product shell element: #${id}`);
    return element;
  };

  return {
    overlay: required<HTMLElement>('productMenu'), start: required<HTMLButtonElement>('startGame'),
    faceInput: required<HTMLInputElement>('faceInput'), facePreview: required<HTMLImageElement>('facePreview'), faceEmpty: required<HTMLElement>('faceEmpty'), removeFace: required<HTMLButtonElement>('removeFace'),
    mamaInput: required<HTMLInputElement>('mamaInput'), mamaPreview: required<HTMLImageElement>('mamaPreview'), mamaEmpty: required<HTMLElement>('mamaEmpty'),
    papaInput: required<HTMLInputElement>('papaInput'), papaPreview: required<HTMLImageElement>('papaPreview'), papaEmpty: required<HTMLElement>('papaEmpty'),
    cameraTop: required<HTMLButtonElement>('menuCamTop'), cameraThird: required<HTMLButtonElement>('menuCamThird'),
    sensitivity: required<HTMLInputElement>('aimSensitivity'), sensitivityValue: required<HTMLElement>('aimSensitivityValue'),
    deadzone: required<HTMLInputElement>('aimDeadzone'), deadzoneValue: required<HTMLElement>('aimDeadzoneValue'),
    aimAssist: required<HTMLInputElement>('aimAssist'), aimAssistValue: required<HTMLElement>('aimAssistValue'),
    volume: required<HTMLInputElement>('masterVolume'), volumeValue: required<HTMLElement>('masterVolumeValue'),
    loading: required<HTMLElement>('menuLoading'), error: required<HTMLElement>('menuError')
  };
}
