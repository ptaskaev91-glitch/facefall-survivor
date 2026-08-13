export const ASSET_BUDGET = {
  /** Optional weapon payloads are loaded only on first selection. */
  weaponGlbBytes: 256 * 1024,
  /** One shared zombie source services Walker, Runner and Brute. */
  sharedInfectedGlbBytes: 256 * 1024,
  /** Far infected drop decorative wounds and dynamic shadow casting. */
  infectedNearLodDistance: 18
} as const;
