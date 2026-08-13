import { aimController } from '../aim/AimController';
import type { CameraMode } from '../camera/CameraDirector';
import { FaceStore, type FaceSlot } from '../persistence/FaceStore';
import { SettingsStore, type FacefallSettings } from '../persistence/SettingsStore';
import type { AudioSystem } from '../presentation/audio/AudioSystem';
import type { GameApp } from './GameApp';

interface FaceDom { input: HTMLInputElement; preview: HTMLImageElement; empty: HTMLElement; remove: HTMLButtonElement; }
interface ProductShellDom {
  overlay: HTMLElement; start: HTMLButtonElement; makar: FaceDom; mama: FaceDom; papa: FaceDom;
  cameraTop: HTMLButtonElement; cameraThird: HTMLButtonElement;
  sensitivity: HTMLInputElement; sensitivityValue: HTMLElement; deadzone: HTMLInputElement; deadzoneValue: HTMLElement;
  aimAssist: HTMLInputElement; aimAssistValue: HTMLElement; volume: HTMLInputElement; volumeValue: HTMLElement;
  loading: HTMLElement; error: HTMLElement;
}

export class ProductShell {
  private readonly stores = { makar: new FaceStore('makar'), mama: new FaceStore('mama'), papa: new FaceStore('papa') };
  private readonly settingsStore = new SettingsStore();
  private faces: Record<FaceSlot, string | null> = { makar: null, mama: null, papa: null };
  private cameraMode: CameraMode = 'top';
  private settings: FacefallSettings = this.settingsStore.defaults();
  private busy = false;

  constructor(private readonly app: GameApp, private readonly dom: ProductShellDom, private readonly audio: AudioSystem) {}

  attach(): void {
    for (const role of ['makar', 'mama', 'papa'] as FaceSlot[]) { this.faces[role] = this.stores[role].load(); this.bindFace(role); }
    this.settings = this.settingsStore.load(); this.applySettings(); this.refreshFaces(); this.refreshCamera(); this.refreshSettings();
    this.dom.cameraTop.addEventListener('click', this.onTop); this.dom.cameraThird.addEventListener('click', this.onThird);
    for (const input of [this.dom.sensitivity, this.dom.deadzone, this.dom.aimAssist, this.dom.volume]) input.addEventListener('input', this.onSettingsInput);
    this.dom.start.addEventListener('click', this.onStart); this.show();
  }
  detach(): void {}
  show(): void { this.app.enterMenu(); this.dom.overlay.dataset.visible = 'true'; this.dom.loading.textContent = ''; this.dom.error.textContent = ''; }

  private bindFace(role: FaceSlot): void {
    const face = this.dom[role];
    face.input.addEventListener('change', () => void this.onFaceChange(role));
    face.remove.addEventListener('click', () => { this.faces[role] = null; this.stores[role].remove(); this.refreshFaces(); });
  }
  private async onFaceChange(role: FaceSlot): Promise<void> {
    const file = this.dom[role].input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) { this.dom.error.textContent = 'Нужно изображение до 12 МБ.'; return; }
    try { const data = await this.readFile(file); this.faces[role] = data; this.stores[role].save(data); this.dom.error.textContent = ''; this.refreshFaces(); }
    catch { this.dom.error.textContent = 'Не удалось прочитать фотографию.'; }
    finally { this.dom[role].input.value = ''; }
  }
  private onTop = (): void => { this.cameraMode = 'top'; this.refreshCamera(); };
  private onThird = (): void => { this.cameraMode = 'third'; this.refreshCamera(); };
  private onSettingsInput = (): void => { this.settings = { aimSensitivity: Number(this.dom.sensitivity.value), aimDeadzone: Number(this.dom.deadzone.value), aimAssist: Number(this.dom.aimAssist.value), masterVolume: Number(this.dom.volume.value) }; this.settingsStore.save(this.settings); this.applySettings(); this.refreshSettings(); };
  private onStart = async (): Promise<void> => {
    if (this.busy) return; this.busy = true; this.dom.start.disabled = true; this.dom.error.textContent = ''; this.dom.loading.textContent = 'ЗАГРУЖАЕМ СУПЕР МАКАРА…';
    try { await this.audio.resume(); await this.app.start({ cameraMode: this.cameraMode, faceDataUrl: this.faces.makar, mamaFaceDataUrl: this.faces.mama, papaFaceDataUrl: this.faces.papa }); this.dom.overlay.dataset.visible = 'false'; this.dom.loading.textContent = ''; }
    catch (error) { this.dom.error.textContent = `Не удалось запустить игру: ${error instanceof Error ? error.message : String(error)}`; this.app.enterMenu(); }
    finally { this.busy = false; this.dom.start.disabled = false; }
  };
  private applySettings(): void { aimController.configure({ sensitivity: this.settings.aimSensitivity, deadzone: this.settings.aimDeadzone }); this.app.configureAimAssist(Math.max(0.01, this.settings.aimAssist)); this.audio.setVolume(this.settings.masterVolume); }
  private refreshSettings(): void { this.dom.sensitivity.value = String(this.settings.aimSensitivity); this.dom.deadzone.value = String(this.settings.aimDeadzone); this.dom.aimAssist.value = String(this.settings.aimAssist); this.dom.volume.value = String(this.settings.masterVolume); this.dom.sensitivityValue.textContent = `${this.settings.aimSensitivity.toFixed(2)}×`; this.dom.deadzoneValue.textContent = `${Math.round(this.settings.aimDeadzone * 100)}%`; this.dom.aimAssistValue.textContent = `${Math.round(this.settings.aimAssist * 100)}%`; this.dom.volumeValue.textContent = `${Math.round(this.settings.masterVolume * 100)}%`; }
  private refreshFaces(): void { for (const role of ['makar', 'mama', 'papa'] as FaceSlot[]) { const face = this.dom[role]; const src = this.faces[role]; if (src) { face.preview.src = src; face.preview.hidden = false; face.empty.hidden = true; face.remove.hidden = false; } else { face.preview.removeAttribute('src'); face.preview.hidden = true; face.empty.hidden = false; face.remove.hidden = true; } } }
  private refreshCamera(): void { this.dom.cameraTop.dataset.active = String(this.cameraMode === 'top'); this.dom.cameraThird.dataset.active = String(this.cameraMode === 'third'); }
  private readFile(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image data')); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
}

export function resolveProductShellDom(): ProductShellDom {
  const required = <T extends HTMLElement>(id: string): T => { const element = document.getElementById(id) as T | null; if (!element) throw new Error(`Missing product shell element: #${id}`); return element; };
  const face = (prefix: string): FaceDom => ({ input: required<HTMLInputElement>(`${prefix}FaceInput`), preview: required<HTMLImageElement>(`${prefix}FacePreview`), empty: required<HTMLElement>(`${prefix}FaceEmpty`), remove: required<HTMLButtonElement>(`${prefix}RemoveFace`) });
  return { overlay: required('productMenu'), start: required<HTMLButtonElement>('startGame'), makar: face('makar'), mama: face('mama'), papa: face('papa'), cameraTop: required<HTMLButtonElement>('menuCamTop'), cameraThird: required<HTMLButtonElement>('menuCamThird'), sensitivity: required<HTMLInputElement>('aimSensitivity'), sensitivityValue: required('aimSensitivityValue'), deadzone: required<HTMLInputElement>('aimDeadzone'), deadzoneValue: required('aimDeadzoneValue'), aimAssist: required<HTMLInputElement>('aimAssist'), aimAssistValue: required('aimAssistValue'), volume: required<HTMLInputElement>('masterVolume'), volumeValue: required('masterVolumeValue'), loading: required('menuLoading'), error: required('menuError') };
}
