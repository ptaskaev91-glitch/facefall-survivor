export type LevelMarkerKind =
  | 'player-spawn'
  | 'enemy-spawn'
  | 'loot'
  | 'light'
  | 'audio-zone'
  | 'wind-zone'
  | 'choke-point'
  | 'interactable'
  | 'event-anchor'
  | 'nav-modifier';

export interface LevelVector3 {
  x: number;
  y: number;
  z: number;
}

export interface LevelMarker {
  id: string;
  kind: LevelMarkerKind;
  position: LevelVector3;
  rotationY?: number;
  radius?: number;
  tags?: string[];
  data?: Record<string, string | number | boolean>;
}

export interface LevelManifest {
  id: string;
  name: string;
  version: number;
  markers: LevelMarker[];
}

const MARKER_KINDS = new Set<LevelMarkerKind>([
  'player-spawn',
  'enemy-spawn',
  'loot',
  'light',
  'audio-zone',
  'wind-zone',
  'choke-point',
  'interactable',
  'event-anchor',
  'nav-modifier'
]);

export function parseLevelManifest(value: unknown): LevelManifest {
  if (!isRecord(value)) throw new Error('Level manifest must be an object');
  if (typeof value.id !== 'string' || !value.id) throw new Error('Level manifest id is required');
  if (typeof value.name !== 'string' || !value.name) throw new Error('Level manifest name is required');
  if (typeof value.version !== 'number' || !Number.isFinite(value.version)) {
    throw new Error('Level manifest version must be a number');
  }
  if (!Array.isArray(value.markers)) throw new Error('Level manifest markers must be an array');

  return {
    id: value.id,
    name: value.name,
    version: value.version,
    markers: value.markers.map(parseMarker)
  };
}

function parseMarker(value: unknown, index: number): LevelMarker {
  if (!isRecord(value)) throw new Error(`Level marker ${index} must be an object`);
  if (typeof value.id !== 'string' || !value.id) throw new Error(`Level marker ${index} id is required`);
  if (typeof value.kind !== 'string' || !MARKER_KINDS.has(value.kind as LevelMarkerKind)) {
    throw new Error(`Level marker ${value.id} has unsupported kind`);
  }
  if (!isVector3(value.position)) throw new Error(`Level marker ${value.id} position is invalid`);

  return {
    id: value.id,
    kind: value.kind as LevelMarkerKind,
    position: value.position,
    rotationY: finiteNumber(value.rotationY),
    radius: finiteNumber(value.radius),
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    data: isRecord(value.data) ? sanitizeData(value.data) : undefined
  };
}

function sanitizeData(value: Record<string, unknown>): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) {
      output[key] = item;
    }
  }
  return output;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isVector3(value: unknown): value is LevelVector3 {
  return isRecord(value)
    && typeof value.x === 'number' && Number.isFinite(value.x)
    && typeof value.y === 'number' && Number.isFinite(value.y)
    && typeof value.z === 'number' && Number.isFinite(value.z);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
