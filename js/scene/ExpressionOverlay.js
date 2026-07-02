// js/scene/ExpressionOverlay.js
export class ExpressionOverlay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d');
    this.running = false;
    this.animFrame = null;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.particles = [];
    this.speciesName = '';
    this.mood = 0;
    this.floatY = 0;
    this._tempMood = null;
    this._tempMoodTimer = null;
  }

  start(speciesName, mood) {
    this.speciesName = speciesName;
    this.mood = mood;
    if (this.running || !this.ctx) return;
    this.running = true;
    this._tick();
  }

  stop() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  _tick() {
    if (!this.running) return;
    this.animFrame = requestAnimationFrame(() => this._tick());

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Blink timer
    this.blinkTimer++;
    this.isBlinking = this.blinkTimer % 180 < 4;

    // Float
    this.floatY = Math.sin(Date.now() * 0.002) * 3;

    ctx.clearRect(0, 0, w, h);

    // Get face data
    const face = this._getFaceData();
    if (!face) return;

    const cx = face.ex * w;
    const cy = face.ey * h + this.floatY;
    const cw = face.ew * w;
    const ch = face.eh * h;

    // Use temp mood if set (animation overrides permanent mood)
    const effectiveMood = this._tempMood !== null ? this._tempMood : this.mood;

    // Draw eyes
    this._drawEyes(ctx, cx, cy, cw, ch, effectiveMood, this.isBlinking);
    // Draw mouth
    this._drawMouth(ctx, face.mx * w, face.my * h + this.floatY, face.mw * w, face.mh * h, effectiveMood);
  }

  _getFaceData() {
    // Default fallback
    return { ex:0.49, ey:0.30, ew:0.28, eh:0.20, mx:0.49, my:0.50, mw:0.18, mh:0.10 };
  }

  setSpecies(name) { this.speciesName = name; }
  setMood(mood) { this.mood = mood; }

  /**
   * Temporarily override the expression mood for a duration (in seconds).
   * After the duration expires, reverts to the permanent mood.
   * @param {number} mood - Mood index (0=happy, 4=excited/star-eyes, etc.)
   * @param {number} duration - Seconds to show the temp expression
   */
  showTempMood(mood, duration) {
    this._tempMood = mood;
    if (this._tempMoodTimer) clearTimeout(this._tempMoodTimer);
    this._tempMoodTimer = setTimeout(() => {
      this._tempMood = null;
      this._tempMoodTimer = null;
    }, duration * 1000);
  }

  _drawEyes(ctx, cx, cy, w, h, mood, blink) {
    const r = Math.min(w, h) * 0.22;
    const spacing = w * 0.30;
    const lx = cx - spacing, rx = cx + spacing;
    const ey = cy;

    if (blink) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(2, r * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx - r*0.7, ey); ctx.lineTo(lx + r*0.7, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx - r*0.7, ey); ctx.lineTo(rx + r*0.7, ey); ctx.stroke();
      return;
    }

    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2, r * 0.5);
    ctx.lineCap = 'round';

    switch(mood) {
      case 0: // Happy ^_^
        ctx.beginPath(); ctx.arc(lx, ey + r*0.1, r*0.9, Math.PI*1.25, Math.PI*1.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey + r*0.1, r*0.9, Math.PI*1.25, Math.PI*1.75); ctx.stroke();
        ctx.fillStyle = 'rgba(255,150,150,0.3)';
        ctx.beginPath(); ctx.ellipse(cx, cy + r*0.6, w*0.25, h*0.08, 0, 0, Math.PI*2); ctx.fill();
        break;
      case 1: // Content
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(lx, ey, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ey, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lx - r*0.1, ey - r*0.1, r*0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx - r*0.1, ey - r*0.1, r*0.2, 0, Math.PI*2); ctx.fill();
        break;
      case 2: // Hungry
        ctx.beginPath(); ctx.ellipse(lx, ey, r*0.7, r*0.4, 0, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(rx, ey, r*0.7, r*0.4, 0, 0, Math.PI*2); ctx.stroke();
        break;
      case 3: // Sad
        ctx.beginPath(); ctx.arc(lx, ey - r*0.1, r*0.8, Math.PI*1.75, Math.PI*2.25); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey - r*0.1, r*0.8, Math.PI*1.75, Math.PI*2.25); ctx.stroke();
        break;
      case 4: // Excited
        this._drawStarEye(ctx, lx, ey, r*0.6);
        this._drawStarEye(ctx, rx, ey, r*0.6);
        ctx.fillStyle = 'rgba(255,150,150,0.3)';
        ctx.beginPath(); ctx.ellipse(cx, cy + r*0.6, w*0.25, h*0.08, 0, 0, Math.PI*2); ctx.fill();
        break;
      case 5: // Sleepy
        ctx.beginPath(); ctx.arc(lx, ey, r*0.6, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey, r*0.6, Math.PI, 0); ctx.stroke();
        break;
    }
  }

  _drawStarEye(ctx, x, y, size) {
    ctx.fillStyle = '#333';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const ex = x + Math.cos(angle) * size;
      const ey = y + Math.sin(angle) * size;
      ctx.beginPath();
      ctx.ellipse(ex, ey, size*0.3, size*0.3, angle, 0, Math.PI*2);
      ctx.fill();
    }
  }

  _drawMouth(ctx, mx, my, mw, mh, mood) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2, mh * 0.12);
    ctx.fillStyle = '#333';
    switch(mood) {
      case 0: ctx.beginPath(); ctx.arc(mx, my, mw*0.3, 0, Math.PI); ctx.fill(); break;
      case 1: ctx.beginPath(); ctx.arc(mx, my, mw*0.2, 0, Math.PI); ctx.fill(); break;
      case 2: ctx.beginPath(); ctx.ellipse(mx, my, mw*0.25, mh*0.3, 0, 0, Math.PI*2); ctx.fill(); break;
      case 3: ctx.beginPath(); ctx.arc(mx, my + mh*0.1, mw*0.3, Math.PI, Math.PI*2); ctx.stroke(); break;
      case 4: ctx.beginPath(); ctx.arc(mx, my, mw*0.35, 0, Math.PI); ctx.fillStyle = '#E74C3C'; ctx.fill(); break;
      case 5: ctx.beginPath(); ctx.arc(mx, my + mh*0.05, mw*0.15, 0, Math.PI); ctx.fill(); break;
    }
  }
}
