export class Health {
  private currentHealth: number;

  constructor(readonly maxHealth: number) {
    if (maxHealth <= 0) throw new Error('maxHealth must be positive');
    this.currentHealth = maxHealth;
  }

  get value(): number {
    return this.currentHealth;
  }

  get normalized(): number {
    return this.currentHealth / this.maxHealth;
  }

  get alive(): boolean {
    return this.currentHealth > 0;
  }

  damage(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const applied = Math.min(amount, this.currentHealth);
    this.currentHealth -= applied;
    return applied;
  }

  heal(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const applied = Math.min(amount, this.maxHealth - this.currentHealth);
    this.currentHealth += applied;
    return applied;
  }

  reset(): void {
    this.currentHealth = this.maxHealth;
  }
}
