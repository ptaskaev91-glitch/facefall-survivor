// Temporary compatibility shim while engine-next migrates callers to CameraDirector.
// New code should import CameraDirector directly.
export { CameraDirector as DualCameraRig, type CameraMode } from './CameraDirector';
