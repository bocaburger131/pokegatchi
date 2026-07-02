// js/core/GameLoop.js
export class GameLoop {
  constructor() {
    this._systems = [];
    this._animId = null;
    this._lastTime = 0;
    this._locked = true; // Locked by WakeUp ledger until dismissed
  }

  start() {
    this._lastTime = performance.now();
    this._tick(this._lastTime);
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId);
    this._animId = null;
  }

  lock() { this._locked = true; }
  unlock() { this._locked = false; }

  register(system) {
    this._systems.push(system);
  }

  _tick(now) {
    this._animId = requestAnimationFrame(t => this._tick(t));
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this._locked) return;

    for (const system of this._systems) {
      if (typeof system === 'function') {
        system(dt);
      } else if (system.update) {
        system.update(dt);
      }
    }
  }
}
