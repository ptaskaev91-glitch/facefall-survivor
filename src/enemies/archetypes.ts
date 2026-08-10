export type EnemyId = 'walker' | 'runner' | 'brute';

export interface EnemyArchetype {
  id: EnemyId;
  label: string;
  health: number;
  speed: number;
  acceleration: number;
  mass: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  staggerResistance: number;
  hearingRange: number;
  sightRange: number;
  modelKey: string;
  animationSet: string;
}

export const ENEMY_ARCHETYPES: Record<EnemyId, EnemyArchetype> = {
  walker: {
    id: 'walker',
    label: 'Walker',
    health: 105,
    speed: 2.3,
    acceleration: 8,
    mass: 70,
    attackRange: 1.25,
    attackDamage: 12,
    attackCooldown: 1.05,
    staggerResistance: 0.2,
    hearingRange: 24,
    sightRange: 30,
    modelKey: 'infected.walker',
    animationSet: 'infected.walker'
  },
  runner: {
    id: 'runner',
    label: 'Runner',
    health: 72,
    speed: 4.8,
    acceleration: 15,
    mass: 55,
    attackRange: 1.1,
    attackDamage: 9,
    attackCooldown: 0.72,
    staggerResistance: 0.08,
    hearingRange: 34,
    sightRange: 38,
    modelKey: 'infected.runner',
    animationSet: 'infected.runner'
  },
  brute: {
    id: 'brute',
    label: 'Brute',
    health: 340,
    speed: 1.75,
    acceleration: 5,
    mass: 145,
    attackRange: 1.65,
    attackDamage: 27,
    attackCooldown: 1.55,
    staggerResistance: 0.78,
    hearingRange: 22,
    sightRange: 27,
    modelKey: 'infected.brute',
    animationSet: 'infected.brute'
  }
};
