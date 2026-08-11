import type { CameraMode } from '../camera/CameraDirector';
import { FaceStore } from '../persistence/FaceStore';
import type { GameApp } from './GameApp';

interface ProductShellDom {
  overlay: HTMLElement;
  start: HTMLButtonElement;
  faceInput: HTMLInputElement;
  facePreview: HTMLImageElement;
  faceEmpty: HTMLElement;
  removeFace: HTMLButtonElement;
  cameraTop: HTMLButtonElement;
  cameraThird: HTMLButtonElement;
  loading: HTMLElement;
  error: HTMLElement;
}

export class ProductShell {
  private readonly store = new FaceStore();
  private faceDataUrl: string | null = null;
  private cameraMode: CameraMode = 'top';
  private busy = false;

  constructor(private readonly app: GameApp, private readonly dom: ProductShellDom) {}

  attach(): void {
    this.faceDataUrl = this.store.load();
    this.refreshFace();
    this.refreshCamera();
    this.dom.faceInput.addEventListener('change', this.onFaceChange);
    this.dom.removeFace.addEventListener('click', this.onRemoveFace);
    this.dom.cameraTop.addEventListener('click', this.onTop);
    this.dom.cameraThird.addEventListener('click', this.onThird);
    this.dom.start.addEventListener('click', this.onStart);
    this.show();
  }

  detach(): void {
    this.dom.faceInput.removeEventListener('change', this.onFaceChange);
    this.dom.removeFace.removeEventListener('click', this.onRemoveFace);
    this.dom.cameraTop.removeEventListener('click', this.onTop);
    this.dom.cameraThird.removeEventListener('click', this.onThird);
    this.dom.start.removeEventListener('click', this.onStart);
  }

  show(): void {
    this.app.enterMenu();
    this.dom.overlay.dataset.visible = 'true';
    this.dom.loading.textContent = '';
    this.dom.error.textContent = '';
  }

  private onFaceChange = async (): Promise<void> => {
    const file = this.dom.faceInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.dom.error.textContent = 'Нужен файл изображения.';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      this.dom.error.textContent = 'Фото слишком большое. Максимум 12 МБ.';
      return;
    }

    try {
      this.faceDataUrl = await this.readFile(file);
      this.store.save(this.faceDataUrl);
      this.dom.error.textContent = '';
      this.refreshFace();
    } catch {
      this.dom.error.textContent = 'Не удалось прочитать фотографию.';
    } finally {
      this.dom.faceInput.value = '';
    }
  };

  private onRemoveFace = (): void => {
    this.faceDataUrl = null;
    this.store.remove();
    this.refreshFace();
  };

  private onTop = (): void => {
    this.cameraMode = 'top';
    this.refreshCamera();
  };

  private onThird = (): void => {
    this.cameraMode = 'third';
    this.refreshCamera();
  };

  private onStart = async (): Promise<void> => {
    if (this.busy) return;
    this.busy = true;
    this.dom.start.disabled = true;
    this.dom.error.textContent = '';
    this.dom.loading.textContent = 'ЗАГРУЖАЕМ УРОВЕНЬ…';

    try {
      await this.app.start({ cameraMode: this.cameraMode, faceDataUrl: this.faceDataUrl });
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

  private refreshFace(): void {
    if (this.faceDataUrl) {
      this.dom.facePreview.src = this.faceDataUrl;
      this.dom.facePreview.hidden = false;
      this.dom.faceEmpty.hidden = true;
      this.dom.removeFace.hidden = false;
    } else {
      this.dom.facePreview.removeAttribute('src');
      this.dom.facePreview.hidden = true;
      this.dom.faceEmpty.hidden = false;
      this.dom.removeFace.hidden = true;
    }
  }

  private refreshCamera(): void {
    this.dom.cameraTop.dataset.active = String(this.cameraMode === 'top');
    this.dom.cameraThird.dataset.active = String(this.cameraMode === 'third');
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
    overlay: required<HTMLElement>('productMenu'),
    start: required<HTMLButtonElement>('startGame'),
    faceInput: required<HTMLInputElement>('faceInput'),
    facePreview: required<HTMLImageElement>('facePreview'),
    faceEmpty: required<HTMLElement>('faceEmpty'),
    removeFace: required<HTMLButtonElement>('removeFace'),
    cameraTop: required<HTMLButtonElement>('menuCamTop'),
    cameraThird: required<HTMLButtonElement>('menuCamThird'),
    loading: required<HTMLElement>('menuLoading'),
    error: required<HTMLElement>('menuError')
  };
}
