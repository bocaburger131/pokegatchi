// js/game/EventBus.js — Simple pub/sub event bus with log
export class EventBus {
  constructor() {
    this._subs = {};
    this._log = [];
  }

  subscribe(event, handler) {
    if (!this._subs[event]) this._subs[event] = [];
    this._subs[event].push(handler);
    return () => this.unsubscribe(event, handler);
  }

  unsubscribe(event, handler) {
    if (!this._subs[event]) return;
    this._subs[event] = this._subs[event].filter(h => h !== handler);
  }

  emit(event, payload = {}) {
    const entry = { event, payload, ts: Date.now() };
    this._log.unshift(entry);
    if (this._log.length > 500) this._log.length = 500;
    const handlers = this._subs[event] || [];
    handlers.forEach(h => {
      try { h(entry); } catch (e) { console.error(`EventBus handler error [${event}]:`, e); }
    });
  }

  getLog() {
    return this._log;
  }
}
