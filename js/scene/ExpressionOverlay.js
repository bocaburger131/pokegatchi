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
    // Preserve blink continuity — start timer at a random offset so
    // the first blink isn't immediate (avoids flash on species change)
    this.blinkTimer = Math.floor(Math.random() * 120) + 30;
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
      ctx.lineWidth = Math.max(2.5, r * 0.45);
      ctx.lineCap = 'round';
      // Cute closed eyes — upward curves (rounded ^ ^)
      const bw = r * 0.7;
      const arcHeight = r * 0.25;
      ctx.beginPath();
      ctx.moveTo(lx - bw, ey);
      ctx.quadraticCurveTo(lx, ey - arcHeight, lx + bw, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx - bw, ey);
      ctx.quadraticCurveTo(rx, ey - arcHeight, rx + bw, ey);
      ctx.stroke();
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
    // Draw a proper 4-pointed sparkle star
    // Two thin diamonds rotated 45° from each other
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4); // 45° angle

    // Vertical diamond
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.2, -size * 0.25);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 0.2, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Horizontal diamond
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 0.25, -size * 0.2);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 0.25, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _drawMouth(ctx, mx, my, mw, mh, mood) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2.5, mh * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#333';
    switch(mood) {
      case 0: // Happy — wide open smile
        ctx.beginPath(); ctx.arc(mx, my - mh*0.05, mw*0.35, 0.1, Math.PI - 0.1); ctx.fill();
        // Lip line
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(mx, my - mh*0.1, mw*0.33, 0.1, Math.PI - 0.1); ctx.stroke();
        break;
      case 1: // Content — gentle closed smile
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, mh * 0.14);
        ctx.beginPath(); ctx.arc(mx, my - mh*0.1, mw*0.2, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      case 2: // Hungry — open "om" shape
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.ellipse(mx, my, mw*0.28, mh*0.35, 0, 0, Math.PI*2); ctx.fill();
        // Tongue hint
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(mx, my + mh*0.1, mw*0.15, mh*0.12, 0, 0, Math.PI); ctx.fill();
        break;
      case 3: // Sad — pronounced frown
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2.5, mh * 0.15);
        ctx.beginPath();
        ctx.moveTo(mx - mw*0.25, my);
        ctx.quadraticCurveTo(mx, my + mh*0.25, mx + mw*0.25, my);
        ctx.stroke();
        break;
      case 4: // Excited — big open happy mouth
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(mx, my - mh*0.05, mw*0.38, 0.1, Math.PI - 0.1); ctx.fill();
        // Tongue
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(mx, my + mh*0.08, mw*0.2, mh*0.12, 0, 0, Math.PI); ctx.fill();
        break;
      case 5: // Sleepy — tiny "o" like snoring
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(mx, my + mh*0.05, mw*0.12, 0, Math.PI*2); ctx.fill();
        break;
    }
  }
}
