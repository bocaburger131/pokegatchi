// js/scene/ExpressionOverlay.js
/**
 * Enhanced ExpressionOverlay — brings Pokémon faces to life.
 *
 * Features:
 *  - 10 moods (0–9): happy, content, hungry, sad, excited, sleepy,
 *    surprised, mischievous, embarrassed, playful
 *  - Natural blink with random interval/duration and 15% double-blink chance
 *  - Smooth mood transitions (lerp between eye shapes over ~500ms)
 *  - Particle system: hearts 💕, sparkles ✨, music notes 🎵
 *  - Blush effect (smooth fade-in/out, intensity per mood)
 *  - Tears for sad mood
 *  - Eye glint / highlight (small white dot)
 *  - Eyebrow system (arched, raised, lowered, wavy per mood)
 *  - Eyelash detail on content/excited moods
 *  - Internal smoothing via _smoothValue()
 *  - Debug overlay preserved intact
 */
export class ExpressionOverlay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d');
    this.running = false;
    this.animFrame = null;
    this.speciesName = '';
    this.mood = 0;
    this._tempMood = null;
    this._tempMoodTimer = null;
    this.debug = false;

    // --- Blink ---
    this.blinkTimer = 0;
    this.isBlinking = false;
    this._blinkDuration = 0;
    this._blinkProgress = 0;
    this._nextBlinkAt = 0;
    this._postDoubleBlinkCooldown = false;
    this._scheduleNextBlink();

    // --- Float ---
    this.floatY = 0;

    // --- Smooth mood transition ---
    this._prevMood = 0;
    this._moodProgress = 1;  // 0→1 during transition
    this._moodTransitionTimer = 0;
    this._moodTransitionDuration = 0.5; // seconds

    // --- Particles ---
    this.particles = [];

    // --- Blush ---
    this._blushIntensity = 0;
    this._blushTarget = 0;

    // --- Tears ---
    this._tears = [];

    // --- Internal smooth values ---
    this._smoothFloatY = 0;
    this._smoothPupilDilation = 1;
    this._smoothBlush = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  start(speciesName, mood) {
    this.speciesName = speciesName;
    this.mood = mood;
    if (this.running || !this.ctx) return;
    this.running = true;
    this._prevMood = mood;
    this._moodProgress = 1;
    this._scheduleNextBlink();
    this._tick();
  }

  stop() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  toggleDebug() {
    this.debug = !this.debug;
    return this.debug;
  }

  setSpecies(name) { this.speciesName = name; }

  setMood(mood) {
    if (mood !== this.mood && this._moodProgress >= 1) {
      this._prevMood = this.mood;
      this._moodProgress = 0;
      this._moodTransitionTimer = 0;
    }
    this.mood = mood;
  }

  /**
   * Temporarily override expression mood for a duration (seconds).
   * After duration expires, reverts to permanent mood.
   */
  showTempMood(mood, duration) {
    this._tempMood = mood;
    if (this._tempMoodTimer) clearTimeout(this._tempMoodTimer);
    this._tempMoodTimer = setTimeout(() => {
      this._tempMood = null;
      this._tempMoodTimer = null;
    }, duration * 1000);

    // Spawn particles based on temp mood type
    if (mood === 0 || mood === 4) {
      this._spawnParticles('heart', 3 + Math.floor(Math.random() * 6));
    }
    if (mood === 4) {
      this._spawnParticles('sparkle', 3 + Math.floor(Math.random() * 4));
    }
    if (mood === 9) {
      this._spawnParticles('note', 2 + Math.floor(Math.random() * 4));
    }
  }

  // ── Blink scheduling ─────────────────────────────────────────────────────

  _scheduleNextBlink() {
    const base = this._postDoubleBlinkCooldown ? 200 : 0;
    this._nextBlinkAt = this.blinkTimer + base + 120 + Math.floor(Math.random() * 180);
    this._postDoubleBlinkCooldown = false;
    this._blinkDuration = 0;
    this._blinkProgress = 0;
  }

  _updateBlink() {
    if (this._blinkDuration > 0) {
      // Currently blinking
      this._blinkProgress++;
      if (this._blinkProgress >= this._blinkDuration) {
        // Blink finished
        this.isBlinking = false;
        this._blinkDuration = 0;
        this._blinkProgress = 0;

        // During the final frame of a double blink, schedule the second blink
        if (this._doubleBlinkPending) {
          this._doubleBlinkPending = false;
          // Schedule immediate second blink in ~8 frames
          this._nextBlinkAt = this.blinkTimer + 8;
          this._postDoubleBlinkCooldown = false; // cooldown applied after second blink
        } else {
          // Check if this was a double blink that just finished
          if (this._wasDoubleBlink) {
            this._postDoubleBlinkCooldown = true;
            this._wasDoubleBlink = false;
          }
          this._scheduleNextBlink();
        }
      }
      return;
    }

    // Check if it's time to blink
    if (this.blinkTimer >= this._nextBlinkAt) {
      this.isBlinking = true;
      this._blinkDuration = 3 + Math.floor(Math.random() * 4); // 3-6 frames
      this._blinkProgress = 0;

      // 15% chance of double blink
      if (Math.random() < 0.15) {
        this._doubleBlinkPending = true;
        this._wasDoubleBlink = true;
      } else {
        this._doubleBlinkPending = false;
        this._wasDoubleBlink = false;
      }
    }
  }

  /**
   * Smoothstep for natural blink easing: eyes close quickly, hold briefly,
   * then open with a slight ease.
   */
  _blinkSmoothstep(t) {
    if (t < 0) return 0;
    if (t > 1) return 1;
    // Close: quick ease-in (first 40%), hold (middle 20%), open: slow ease-out (last 40%)
    if (t < 0.4) {
      // Close phase
      const p = t / 0.4;
      return p * p; // ease-in
    } else if (t < 0.6) {
      // Hold phase — fully closed
      return 1;
    } else {
      // Open phase
      const p = (t - 0.6) / 0.4;
      return 1 - (1 - p) * (1 - p); // ease-out inverse (smooth close)
    }
  }

  _getBlinkCloseAmount() {
    if (!this.isBlinking || this._blinkDuration <= 0) return 0;
    const t = this._blinkProgress / this._blinkDuration;
    return this._blinkSmoothstep(t);
  }

  // ── Smoothing helper ────────────────────────────────────────────────────

  _smoothValue(current, target, speed, dt) {
    const diff = target - current;
    if (Math.abs(diff) < 0.001) return target;
    return current + diff * Math.min(1, speed * dt);
  }

  // ── Mood helpers ─────────────────────────────────────────────────────────

  _getEffectiveMood() {
    return this._tempMood !== null ? this._tempMood : this.mood;
  }

  _updateMoodTransition(dt) {
    if (this._moodProgress < 1) {
      this._moodTransitionTimer += dt;
      this._moodProgress = Math.min(1, this._moodTransitionTimer / this._moodTransitionDuration);
    }
  }

  _lerpMoodValue(prevVal, currVal, t) {
    return prevVal + (currVal - prevVal) * t;
  }

  // ── Particle system ──────────────────────────────────────────────────────

  _spawnParticles(type, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 0.3 + Math.random() * 0.6;
      this.particles.push({
        x: 0.5, // will be set relative to canvas when drawn
        y: 0.35,
        type: type,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        speedX: Math.cos(angle) * speed,
        speedY: -Math.random() * 0.8 - 0.3,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        wobblePhase: Math.random() * Math.PI * 2
      });
    }
  }

  _updateParticles(dt, w, h) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      // Position
      const bsX = p.x * w;
      const bsY = p.y * h;
      p.x += (p.speedX + Math.sin(p.wobblePhase + p.life * 3) * 0.2) * dt * 60 / w;
      p.y += p.speedY * dt * 60 / h;
      // Rotation
      p.rotation += p.rotSpeed * dt * 60;
      // Size fades toward end
      p.size = (4 + 6 * (1 - progress)) * Math.min(1, progress * 3);
    }
  }

  _drawParticles(ctx, w, h) {
    for (const p of this.particles) {
      const px = p.x * w;
      const py = p.y * h;
      const alpha = 1 - (p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(p.rotation);

      const s = p.size;
      switch (p.type) {
        case 'heart':
          ctx.fillStyle = '#ff4488';
          this._drawHeart(ctx, s);
          break;
        case 'sparkle':
          ctx.fillStyle = '#ffdd44';
          this._drawSparkle(ctx, s);
          break;
        case 'note':
          ctx.fillStyle = '#44ddff';
          this._drawMusicNote(ctx, s);
          break;
      }

      ctx.restore();
    }
  }

  _drawHeart(ctx, size) {
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
    ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }

  _drawSparkle(ctx, size) {
    const s = size * 0.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      const px = Math.cos(a) * s;
      const py = Math.sin(a) * s;
      ctx.beginPath();
      ctx.arc(px, py, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMusicNote(ctx, size) {
    const s = size * 0.4;
    // Note head (oval)
    ctx.fillStyle = ctx.fillStyle; // inherit
    ctx.beginPath();
    ctx.ellipse(0, s * 0.3, s * 0.5, s * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(s * 0.2, 0);
    ctx.lineTo(s * 0.2, -s * 1.2);
    ctx.stroke();
    // Flag
    ctx.beginPath();
    ctx.arc(s * 0.2, -s * 1.0, s * 0.4, 0, Math.PI * 1.2);
    ctx.stroke();
  }

  // ── Blush ────────────────────────────────────────────────────────────────

  _updateBlushTarget(effectiveMood) {
    switch (effectiveMood) {
      case 0: this._blushTarget = 0.3; break;  // Happy
      case 4: this._blushTarget = 0.3; break;  // Excited
      case 8: this._blushTarget = 0.8; break;  // Embarrassed
      default: this._blushTarget = 0; break;
    }
  }

  _drawBlush(ctx, cx, cy, cw, ch, intensity) {
    if (intensity < 0.01) return;
    const spacing = cw * 0.30;
    const lx = cx - spacing;
    const rx = cx + spacing;
    const ey = cy + ch * 0.22;

    ctx.save();
    ctx.globalAlpha = intensity * 0.4;
    ctx.fillStyle = '#ff6b8a';

    // Left blush
    ctx.beginPath();
    ctx.ellipse(lx, ey, cw * 0.14, ch * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right blush
    ctx.beginPath();
    ctx.ellipse(rx, ey, cw * 0.14, ch * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Tears ────────────────────────────────────────────────────────────────

  _initTears() {
    if (this._tears.length === 0) {
      this._tears.push({ y: 0, active: true, timer: 0 });
    }
  }

  _updateAndDrawTears(ctx, cx, cy, cw, ch, dt, effectiveMood) {
    if (effectiveMood !== 3) {
      this._tears = [];
      return;
    }

    this._initTears();
    const spacing = cw * 0.30;
    const lx = cx - spacing;
    const rx = cx + spacing;
    const eyeR = Math.min(cw, ch) * 0.22;

    ctx.save();
    for (const tear of this._tears) {
      if (!tear.active) continue;
      tear.timer += dt;
      // Tear descends slowly, resets when it goes too far
      tear.y += dt * 50;

      if (tear.y > ch * 0.4) {
        tear.y = 0;
        tear.timer = 0;
      }

      const alpha = tear.y < 10 ? tear.y / 10 : 1 - Math.min(1, tear.y / (ch * 0.35));

      // Left tear
      ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(lx - eyeR * 0.1, cy + eyeR * 0.5 + tear.y, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Right tear
      ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(rx + eyeR * 0.1, cy + eyeR * 0.5 + tear.y, 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Eye glint ────────────────────────────────────────────────────────────

  _drawEyeGlint(ctx, x, y, eyeRadius) {
    const glintSize = eyeRadius * 0.18;
    const glintX = x - eyeRadius * 0.25;
    const glintY = y - eyeRadius * 0.25;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = glintSize * 0.8;
    ctx.beginPath();
    ctx.arc(glintX, glintY, glintSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Eyebrows ─────────────────────────────────────────────────────────────

  _drawEyebrows(ctx, cx, cy, cw, ch, mood) {
    const spacing = cw * 0.30;
    const lx = cx - spacing;
    const rx = cx + spacing;
    const browY = cy - ch * 0.30;
    const browW = cw * 0.18;
    const browH = ch * 0.06;

    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, ch * 0.04);
    ctx.lineCap = 'round';

    const drawBrow = (x, y, angle, length) => {
      const halfLen = length * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - halfLen, y + Math.tan(angle) * halfLen);
      ctx.lineTo(x + halfLen, y - Math.tan(angle) * halfLen);
      ctx.stroke();
    };

    const drawWavyBrow = (x, y, length) => {
      ctx.beginPath();
      ctx.moveTo(x - length * 0.5, y);
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const px = x - length * 0.5 + t * length;
        const py = y + Math.sin(t * Math.PI * 3) * browH * 0.3;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };

    switch (mood) {
      case 0: // Happy — raised arched brows
        drawBrow(lx, browY - browH * 0.5, 0.15, browW * 1.2);
        drawBrow(rx, browY - browH * 0.5, -0.15, browW * 1.2);
        break;
      case 1: // Content — gentle neutral
        drawBrow(lx, browY, 0.05, browW);
        drawBrow(rx, browY, -0.05, browW);
        break;
      case 2: // Hungry — slightly lowered
        drawBrow(lx, browY + browH * 0.3, 0.05, browW);
        drawBrow(rx, browY + browH * 0.3, -0.05, browW);
        break;
      case 3: // Sad — angled up inner corners (😢 brows)
        drawBrow(lx, browY + browH * 0.4, 0.25, browW);
        drawBrow(rx, browY + browH * 0.4, -0.25, browW);
        break;
      case 4: // Excited — high arched
        drawBrow(lx, browY - browH * 0.7, 0.1, browW * 1.1);
        drawBrow(rx, browY - browH * 0.7, -0.1, browW * 1.1);
        break;
      case 5: // Sleepy — lowered brows
        drawBrow(lx, browY + browH * 0.5, 0.05, browW * 0.9);
        drawBrow(rx, browY + browH * 0.5, -0.05, browW * 0.9);
        break;
      case 6: // Surprised — very high arched brows
        drawBrow(lx, browY - browH * 1.0, 0.1, browW * 1.3);
        drawBrow(rx, browY - browH * 1.0, -0.1, browW * 1.3);
        break;
      case 7: // Mischievous — one raised, one lowered
        drawBrow(lx, browY - browH * 0.5, 0.1, browW * 1.1);  // raised
        drawBrow(rx, browY + browH * 0.3, -0.1, browW * 0.9);  // lowered
        break;
      case 8: // Embarrassed — wavy squiggly brows
        drawWavyBrow(lx, browY, browW * 1.2);
        drawWavyBrow(rx, browY, browW * 1.2);
        break;
      case 9: // Playful — one raised, one normal
        drawBrow(lx, browY - browH * 0.4, 0.1, browW * 1.1);  // raised
        drawBrow(rx, browY, -0.05, browW);  // normal
        break;
    }

    ctx.restore();
  }

  // ── Eyelashes ────────────────────────────────────────────────────────────

  _drawEyelashes(ctx, lx, rx, ey, eyeRadius, mood) {
    const hasLashes = (mood === 1 || mood === 4);
    if (!hasLashes) return;

    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const lashesPerEye = mood === 4 ? 3 : 2;
    const lashLen = 3 + eyeRadius * 0.2;

    // Draw on upper lid of each eye
    const eyeOffsets = [lx, rx];
    for (const ex of eyeOffsets) {
      for (let i = 0; i < lashesPerEye; i++) {
        const angleOffset = -Math.PI * 0.35 + (i / (lashesPerEye - 1 || 1)) * Math.PI * 0.7;
        const lx2 = ex + Math.cos(angleOffset) * eyeRadius * 0.75;
        const ly2 = ey + Math.sin(angleOffset) * eyeRadius * 0.75;
        const outAngle = angleOffset - Math.PI * 0.15 - (i - (lashesPerEye - 1) / 2) * 0.15;
        ctx.beginPath();
        ctx.moveTo(lx2, ly2);
        ctx.lineTo(
          lx2 + Math.cos(outAngle) * lashLen,
          ly2 + Math.sin(outAngle) * lashLen
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── Main tick ────────────────────────────────────────────────────────────

  _tick() {
    if (!this.running) return;
    this.animFrame = requestAnimationFrame(() => this._tick());

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Timing
    const dt = 1 / 60; // ~16.67ms per frame
    const now = Date.now();

    // Update blink
    this.blinkTimer++;
    this._updateBlink();

    // Update smooth values
    this._smoothFloatY = this._smoothValue(this._smoothFloatY, Math.sin(now * 0.002) * 3, 8, dt);
    this.floatY = this._smoothFloatY;

    // Mood transition
    this._updateMoodTransition(dt);
    const effMood = this._getEffectiveMood();

    // Blush target and smooth
    this._updateBlushTarget(effMood);
    this._smoothBlush = this._smoothValue(this._smoothBlush, this._blushTarget, 4, dt);

    // Particles
    this._updateParticles(dt, w, h);

    ctx.clearRect(0, 0, w, h);

    // Get face data
    const face = this._getFaceData();
    if (!face) return;

    const cx = face.ex * w;
    const cy = face.ey * h + this.floatY;
    const cw = face.ew * w;
    const ch = face.eh * h;

    // ── Draw blush (behind eyes) ──
    this._drawBlush(ctx, cx, cy, cw, ch, this._smoothBlush);

    // ── Draw eyebrows ──
    this._drawEyebrows(ctx, cx, cy, cw, ch, effMood);

    // ── Draw eyes ──
    this._drawEyes(ctx, cx, cy, cw, ch, effMood, this.isBlinking, this._blinkDuration > 0 ? this._blinkProgress / this._blinkDuration : 0);

    // ── Tears ──
    this._updateAndDrawTears(ctx, cx, cy, cw, ch, dt, effMood);

    // ── Draw mouth ──
    this._drawMouth(ctx, face.mx * w, face.my * h + this.floatY, face.mw * w, face.mh * h, effMood);

    // ── Particles (top layer) ──
    this._drawParticles(ctx, w, h);

    // ── DEBUG OVERLAY ──
    if (this.debug) {
      this._drawDebug(ctx, face, w, h, cx, cy, cw, ch,
        face.mx * w, face.my * h + this.floatY);
    }
  }

  // ── Face data fallback ───────────────────────────────────────────────────

  _getFaceData() {
    return { ex: 0.49, ey: 0.30, ew: 0.28, eh: 0.20, mx: 0.49, my: 0.50, mw: 0.18, mh: 0.10 };
  }

  // ── Debug overlay ────────────────────────────────────────────────────────

  _drawDebug(ctx, face, w, h, cx, cy, cw, ch, mx, my) {
    const spacing = cw * 0.30;
    const lx = cx - spacing, rx = cx + spacing;
    const ey = cy;
    const r = Math.min(cw, ch) * 0.22;

    ctx.save();
    ctx.globalAlpha = 0.85;

    // Eye zones (pink circles)
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(lx, ey, r * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ey, r * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Eye crosshairs (red)
    const chSize = 8;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1.5;
    [lx, rx].forEach(x => {
      ctx.beginPath(); ctx.moveTo(x - chSize, ey); ctx.lineTo(x + chSize, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, ey - chSize); ctx.lineTo(x, ey + chSize); ctx.stroke();
    });

    // Mouth crosshair (green)
    ctx.strokeStyle = '#00ff44';
    ctx.beginPath(); ctx.moveTo(mx - chSize, my); ctx.lineTo(mx + chSize, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, my - chSize); ctx.lineTo(mx, my + chSize); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fillStyle = '#00ff44'; ctx.fill();

    // Face bounding box (blue)
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;

    const labelY = cy - ch / 2 - 12;
    ctx.fillText(
      `ex:${(face.ex * 100).toFixed(0)}% ey:${(face.ey * 100).toFixed(0)}% ` +
      `ew:${(face.ew * 100).toFixed(0)}% eh:${(face.eh * 100).toFixed(0)}%`,
      8, labelY
    );
    ctx.fillText(
      `mx:${(face.mx * 100).toFixed(0)}% my:${(face.my * 100).toFixed(0)}% ` +
      `mw:${(face.mw * 100).toFixed(0)}% mh:${(face.mh * 100).toFixed(0)}%`,
      8, labelY + 16
    );
    ctx.fillText(
      `species: ${this.speciesName || '(none)'}  mood: ${this._getEffectiveMood()}`,
      8, labelY + 32
    );
    ctx.fillText('[DEBUG ON] tap D to toggle', 8, h - 10);

    ctx.restore();
  }

  // ── Eye drawing ──────────────────────────────────────────────────────────

  _drawEyes(ctx, cx, cy, w, h, mood, blink, blinkProgress) {
    const r = Math.min(w, h) * 0.22;
    const spacing = w * 0.30;
    const lx = cx - spacing, rx = cx + spacing;
    const ey = cy;

    // Eyelashes (draw behind eye content)
    this._drawEyelashes(ctx, lx, rx, ey, r, mood);

    // Blink handling with smoothstep
    const blinkAmount = blink && blinkProgress > 0 ? this._blinkSmoothstep(blinkProgress) : 0;

    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2, r * 0.5);
    ctx.lineCap = 'round';

    if (blinkAmount > 0.5) {
      // Fully closed or mostly closed — draw curved closed eyes
      const closeAmount = (blinkAmount - 0.5) / 0.5; // 0→1 for closing
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(2.5, r * 0.45);
      ctx.lineCap = 'round';
      const bw = r * 0.7;
      const arcHeight = r * 0.25 * closeAmount;
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

    // Determine eye shape based on current mood + transition
    const effectiveMood = this._getEffectiveMood();

    if (blinkAmount > 0) {
      // Partially closed — draw normal eye but clip/compress vertically
      ctx.save();
      // Scale down the eye vertically based on blink amount (0 = open, 0.5 = half)
      const scaleY = 1 - blinkAmount * 1.8; // 0.5 blink → ~10% open
      ctx.translate(cx, cy);
      ctx.scale(1, Math.max(0.05, scaleY));
      ctx.translate(-cx, -cy);
      this._drawEyeShapes(ctx, lx, rx, ey, r, effectiveMood);
      ctx.restore();
      return;
    }

    this._drawEyeShapes(ctx, lx, rx, ey, r, effectiveMood);
  }

  _drawEyeShapes(ctx, lx, rx, ey, r, mood) {
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2, r * 0.5);
    ctx.lineCap = 'round';

    switch (mood) {
      case 0: // Happy ^_^
        ctx.beginPath(); ctx.arc(lx, ey + r * 0.1, r * 0.9, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey + r * 0.1, r * 0.9, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
        break;
      case 1: // Content — round pupils
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(lx, ey, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ey, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lx - r * 0.1, ey - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx - r * 0.1, ey - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
        // Eye glint
        this._drawEyeGlint(ctx, lx, ey, r);
        this._drawEyeGlint(ctx, rx, ey, r);
        break;
      case 2: // Hungry — ellipses
        ctx.beginPath(); ctx.ellipse(lx, ey, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(rx, ey, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case 3: // Sad
        ctx.beginPath(); ctx.arc(lx, ey - r * 0.1, r * 0.8, Math.PI * 1.75, Math.PI * 2.25); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey - r * 0.1, r * 0.8, Math.PI * 1.75, Math.PI * 2.25); ctx.stroke();
        break;
      case 4: // Excited — star eyes
        this._drawStarEye(ctx, lx, ey, r * 0.6);
        this._drawStarEye(ctx, rx, ey, r * 0.6);
        break;
      case 5: // Sleepy — half closed arcs
        ctx.beginPath(); ctx.arc(lx, ey, r * 0.6, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey, r * 0.6, Math.PI, 0); ctx.stroke();
        break;
      case 6: // Surprised — big round eyes (full circles)
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(lx, ey, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ey, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lx - r * 0.15, ey - r * 0.15, r * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx - r * 0.15, ey - r * 0.15, r * 0.25, 0, Math.PI * 2); ctx.fill();
        this._drawEyeGlint(ctx, lx, ey, r);
        this._drawEyeGlint(ctx, rx, ey, r);
        break;
      case 7: // Mischievous — half-lidded sly eyes
        // Draw lower lids
        ctx.beginPath(); ctx.arc(lx, ey + r * 0.1, r * 0.8, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ey + r * 0.1, r * 0.8, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
        // Pupils — small, shifted up (sly look)
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(lx, ey - r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ey - r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lx - r * 0.05, ey - r * 0.18, r * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx - r * 0.05, ey - r * 0.18, r * 0.12, 0, Math.PI * 2); ctx.fill();
        this._drawEyeGlint(ctx, lx, ey - r * 0.1, r);
        this._drawEyeGlint(ctx, rx, ey - r * 0.1, r);
        break;
      case 8: // Embarrassed — swirly (spiral) eyes
        this._drawSpiralEye(ctx, lx, ey, r * 0.55);
        this._drawSpiralEye(ctx, rx, ey, r * 0.55);
        break;
      case 9: // Playful — one winking, one normal + tongue handled in mouth
        // Right eye: wink (closed curved line)
        ctx.strokeStyle = '#222';
        ctx.lineWidth = Math.max(2.5, r * 0.45);
        ctx.lineCap = 'round';
        const bw = r * 0.7;
        ctx.beginPath();
        ctx.moveTo(rx - bw, ey);
        ctx.quadraticCurveTo(rx, ey - r * 0.2, rx + bw, ey);
        ctx.stroke();
        // Left eye: normal round with pupil (same as content)
        ctx.strokeStyle = '#222';
        ctx.lineWidth = Math.max(2, r * 0.5);
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(lx, ey, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(lx - r * 0.1, ey - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
        this._drawEyeGlint(ctx, lx, ey, r);
        break;
    }

    ctx.restore();
  }

  // ── Star eye ─────────────────────────────────────────────────────────────

  _drawStarEye(ctx, x, y, size) {
    ctx.fillStyle = '#333';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.2, -size * 0.25);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 0.2, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 0.25, -size * 0.2);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 0.25, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ── Spiral eye (embarrassed) ─────────────────────────────────────────────

  _drawSpiralEye(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.85); // slight horizontal squash

    ctx.fillStyle = '#333';
    ctx.beginPath();
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 4;
      const radius = size * (1 - t * 0.7);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Small white highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.15, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Mouth drawing ────────────────────────────────────────────────────────

  _drawMouth(ctx, mx, my, mw, mh, mood) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2.5, mh * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#333';

    switch (mood) {
      case 0: // Happy — wide open smile
        ctx.beginPath(); ctx.arc(mx, my - mh * 0.05, mw * 0.35, 0.1, Math.PI - 0.1); ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(mx, my - mh * 0.1, mw * 0.33, 0.1, Math.PI - 0.1); ctx.stroke();
        break;
      case 1: // Content — gentle closed smile
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, mh * 0.14);
        ctx.beginPath(); ctx.arc(mx, my - mh * 0.1, mw * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      case 2: // Hungry — open "om" shape
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.ellipse(mx, my, mw * 0.28, mh * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.1, mw * 0.15, mh * 0.12, 0, 0, Math.PI); ctx.fill();
        break;
      case 3: // Sad — pronounced frown
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2.5, mh * 0.15);
        ctx.beginPath();
        ctx.moveTo(mx - mw * 0.25, my);
        ctx.quadraticCurveTo(mx, my + mh * 0.25, mx + mw * 0.25, my);
        ctx.stroke();
        break;
      case 4: // Excited — big open happy mouth
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(mx, my - mh * 0.05, mw * 0.38, 0.1, Math.PI - 0.1); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.08, mw * 0.2, mh * 0.12, 0, 0, Math.PI); ctx.fill();
        break;
      case 5: // Sleepy — tiny "o" like snoring
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(mx, my + mh * 0.05, mw * 0.12, 0, Math.PI * 2); ctx.fill();
        break;
      case 6: // Surprised — small 'o' mouth
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(mx, my, mw * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(mx, my, mw * 0.10, 0, Math.PI * 2); ctx.fill();
        break;
      case 7: // Mischievous — curved smirk
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2.5, mh * 0.15);
        ctx.beginPath();
        ctx.moveTo(mx - mw * 0.25, my + mh * 0.05);
        ctx.quadraticCurveTo(mx, my - mh * 0.15, mx + mw * 0.30, my - mh * 0.10);
        ctx.stroke();
        break;
      case 8: // Embarrassed — wavy nervous mouth
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(2, mh * 0.12);
        ctx.beginPath();
        ctx.moveTo(mx - mw * 0.20, my + mh * 0.05);
        // Wavy line
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const px = mx - mw * 0.20 + t * mw * 0.40;
          const py = my + Math.sin(t * Math.PI * 3) * mh * 0.08;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      case 9: // Playful — tongue out
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(mx, my - mh * 0.0, mw * 0.25, 0.1, Math.PI - 0.1); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.12, mw * 0.15, mh * 0.15, 0, 0, Math.PI * 2); ctx.fill();
        break;
    }
  }
}
