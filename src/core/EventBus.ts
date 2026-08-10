export type EventMap = Record<string, unknown>;

type Listener<T> = (payload: T) => void;

export class EventBus<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Listener<Events[keyof Events]>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = (this.listeners.get(event) ?? new Set()) as Set<Listener<Events[K]>>;
    set.add(listener);
    this.listeners.set(event, set as Set<Listener<Events[keyof Events]>>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const set = this.listeners.get(event) as Set<Listener<Events[K]>> | undefined;
    set?.delete(listener);
    if (set?.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event) as Set<Listener<Events[K]>> | undefined;
    if (!set) return;
    for (const listener of [...set]) listener(payload);
  }

  clear(): void {
    this.listeners.clear();
  }
}
