// js/game/EventBus.js
export class EventBus {
  constructor(limit = 800) {
    this.limit = limit;
    this.listeners = new Map();
    this.actionLog = [];
  }

  subscribe(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  emit(type, payload = {}) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type,
      ts: Date.now(),
      payload,
    };

    this.actionLog.unshift(event);
    if (this.actionLog.length > this.limit) this.actionLog.length = this.limit;

    const specific = this.listeners.get(type) || new Set();
    const wildcard = this.listeners.get('*') || new Set();
    [...specific, ...wildcard].forEach((fn) => {
      try { fn(event); } catch (err) { console.error('EventBus handler failed:', err); }
    });

    return event;
  }

  getLog() {
    return this.actionLog;
  }
}
