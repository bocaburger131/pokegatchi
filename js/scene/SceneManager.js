// js/scene/SceneManager.js
export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.initialized = false;
    this.webglAvailable = this._detectWebGL();
    this._loadingTimeout = null;
    this._fallbackCallback = null;
    this._successCallback = null;
    this._activeAnim = null;
    this._idleBobOffset = 0;
    this._armature = null;

    // Idle state machine
    this._idleState = 'FLOAT';
    this._idleTimer = 0;
    this._idleNextSwitch = this._randomIdleInterval();
    this._idleAnimProgress = 0; // 0-1 progress for LOOK_LEFT/RIGHT/BOUNCE transitions
    this._idleFromRotY = 0;
    this._idleTargetRotY = 0;
    this._idleFromPosY = 0;
    this._idleTargetPosY = 0;
    this._idlePaused = false;
  }

  _randomIdleInterval() {
    return 3 + Math.random() * 5; // 3-8 seconds
  }

  _detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) { return false; }
  }

  init() {
    if (!this.container) return false;
    if (!this.webglAvailable) {
      this.container.classList.add('sprite-only');
      console.warn('WebGL not available — using 2D sprite fallback');
      return false;
    }
    if (this.initialized) return false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 4.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(320, 320);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 4, 3);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
    fill.position.set(-2, 1, -2);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, -1, -3);
    this.scene.add(rim);
    const back = new THREE.DirectionalLight(0xffcc88, 0.3);
    back.position.set(-1, 2, -4);
    this.scene.add(back);

    this.scene.fog = new THREE.Fog(0x0f0e1a, 6, 12);
    this.initialized = true;
    return true;
  }

  setFallbackCallback(cb) {
    this._fallbackCallback = cb;
  }

  setSuccessCallback(cb) {
    this._successCallback = cb;
  }

  async loadModel(pokedexId, category) {
    // Remove old model
    this._clearModel();

    // Reset idle state machine
    this._idleState = 'FLOAT';
    this._idleTimer = 0;
    this._idleNextSwitch = this._randomIdleInterval();
    this._idleAnimProgress = 0;
    this._idlePaused = false;
    this._armature = null;

    // Clear any pending timeout
    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
    }

    if (pokedexId === 0) {
      this._showEgg();
      return;
    }

    const url = `https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/${category}/${pokedexId}.glb`;
    const loader = new THREE.GLTFLoader();
    
    // Set a 15-second timeout
    let timedOut = false;
    this._loadingTimeout = setTimeout(() => {
      timedOut = true;
      console.warn('3D model load timed out for', pokedexId);
      this._clearModel();
      this._showFallback(pokedexId);
      if (this._fallbackCallback) this._fallbackCallback(pokedexId);
    }, 15000);

    try {
      const gltf = await loader.loadAsync(url);
      if (timedOut) return; // Already fell back
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
      if (this._successCallback) this._successCallback(pokedexId);

      this.model = gltf.scene;
      this.model.scale.set(1.2, 1.2, 1.2);
      
      // Center model
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y = -0.2;

      // Clone materials for independent tweaking
      this.model.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.envMapIntensity = 0.3;
        }
      });

      this.scene.add(this.model);

      // Animations
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }

      // === ARMATURE / SKELETON CHECK ===
      this._armature = null;
      this.model.traverse(c => {
        // THREE.Bone is the standard bone class; also check for isBone or Armature naming
        if (c.isBone || c instanceof THREE.Bone || c.type === 'Bone') {
          this._armature = c;
        }
      });
      // If no direct Bone found, check for Skeleton/Armature objects
      if (!this._armature) {
        this.model.traverse(c => {
          if (c.type === 'Skeleton' || c.type === 'Armature' || c.isArmature) {
            this._armature = c;
          }
        });
      }
      console.log('Skeleton found:', !!this._armature);

    } catch (err) {
      if (timedOut) return;
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
      console.warn('3D model load failed:', err);
      this._showFallback(pokedexId);
      if (this._fallbackCallback) this._fallbackCallback(pokedexId);
    }
  }

  setSpriteBackground(spriteUrl) {
    if (!this.container) return;
    if (spriteUrl) {
      this.container.style.backgroundImage = `url(${spriteUrl})`;
      this.container.style.backgroundSize = 'contain';
      this.container.style.backgroundPosition = 'center 60%';
      this.container.style.backgroundRepeat = 'no-repeat';
    } else {
      this.container.style.backgroundImage = '';
    }
  }

  showSpriteOnly(spriteUrl) {
    this._disposeScene();
    this.setSpriteBackground(spriteUrl);
  }

  _showEgg() {
    const geo = new THREE.SphereGeometry(0.5, 24, 24);
    geo.scale(1, 1.2, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe8e0f0, roughness: 0.3, metalness: 0.0,
      emissive: 0x6c63ff, emissiveIntensity: 0.05,
    });
    const egg = new THREE.Mesh(geo, mat);
    egg.position.set(0, 0.5, 0);
    this.scene.add(egg);
    this.model = egg;
    
    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.02, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6c63ff, emissive: 0x6c63ff, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.25, 0);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);
    this.model.userData.ring = ring;
  }

  _showFallback(id) {
    if (this.container) {
      this.container.classList.add('sprite-only');
    }
  }

  _clearModel() {
    if (!this.model) return;
    if (this.container) {
      this.container.classList.remove('sprite-only');
    }
    this.scene.remove(this.model);
    if (this.model.traverse) {
      this.model.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    }
    this.model = null;
    this.mixer = null;
    this._armature = null;
  }

  _disposeScene() {
    this._clearModel();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.initialized = false;
  }

  /**
   * Play a buddy-style interaction animation on the loaded 3D model.
   * Uses a simple tween system with lerp interpolation in the update() loop.
   * @param {'feed'|'pet'|'heal'|'hatch'|'celebrate'|'bounce'} type
   */
  playAnimation(type) {
    if (!this.model || this.model.userData.ring) return; // No animations on egg
    if (this._activeAnim) return; // Don't stack — let current finish

    const s = this.model.scale;
    const r = this.model.rotation;
    const p = this.model.position;

    const fromS = { x: s.x, y: s.y, z: s.z };
    const fromR = { x: r.x, y: r.y, z: r.z };
    const fromP = { x: p.x, y: p.y, z: p.z };

    let peakS, peakR, peakP, duration;

    switch (type) {
      case 'feed':
        duration = 0.7;
        peakS = { x: fromS.x * 1.15, y: fromS.y * 1.15, z: fromS.z * 1.15 };
        peakR = { x: fromR.x, y: fromR.y + 0.26, z: fromR.z }; // +15° Y
        peakP = { x: fromP.x, y: fromP.y + 0.05, z: fromP.z }; // subtle Y hop
        break;
      case 'pet':
        duration = 0.7;
        peakS = { ...fromS };
        // Lean Z ±5° (pick random sign) + brief rotation toward camera (~-10° Y)
        peakR = {
          x: fromR.x,
          y: fromR.y - 0.17, // ~-10° toward camera
          z: fromR.z + (Math.random() > 0.5 ? 0.087 : -0.087) // ±5° Z lean
        };
        peakP = { ...fromP };
        break;
      case 'heal':
        duration = 1.0;
        peakS = { x: fromS.x * 1.2, y: fromS.y * 1.2, z: fromS.z * 1.2 };
        peakR = { x: fromR.x, y: fromR.y + Math.PI * 2, z: fromR.z }; // Full 360° spin
        peakP = { ...fromP };
        this._animFlashBrightness = true; // trigger brightness flash
        break;
      case 'hatch':
        duration = 0.8;
        peakS = { x: fromS.x * 1.3, y: fromS.y * 1.3, z: fromS.z * 1.3 };
        peakR = { x: fromR.x, y: fromR.y, z: fromR.z + 0.175 }; // ±10° Z wobble
        peakP = { x: fromP.x, y: fromP.y + 0.05, z: fromP.z };
        break;
      case 'celebrate':
        duration = 0.8;
        peakS = { x: fromS.x * 1.25, y: fromS.y * 1.25, z: fromS.z * 1.25 };
        peakR = { x: fromR.x, y: fromR.y + Math.PI * 2, z: fromR.z }; // Full 360° spin
        peakP = { x: fromP.x, y: fromP.y + 0.3, z: fromP.z }; // Hop up 0.3 units
        break;
      case 'bounce':
        duration = 0.5;
        peakS = { ...fromS };
        peakR = { ...fromR };
        peakP = { x: fromP.x, y: fromP.y + 0.1, z: fromP.z }; // Hop up 0.1 units
        break;
      default:
        return;
    }

    this._activeAnim = {
      type, startTime: Date.now(), duration,
      fromS, fromR, fromP, peakS, peakR, peakP,
    };

    // Pause idle state machine while animation plays
    this._idlePaused = true;
  }

  /**
   * Helper: lerp a single numeric property
   */
  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  update(dt) {
    if (!this.initialized || !this.scene || !this.renderer) return;
    
    if (this.mixer) this.mixer.update(dt);

    // Process active animation via lerp tween
    if (this._activeAnim) {
      const a = this._activeAnim;
      const elapsed = (Date.now() - a.startTime) / 1000;
      const t = Math.min(elapsed / a.duration, 1);

      // Triangle wave: 0 → 1 → 0 (out and back)
      let f;
      if (a.type === 'heal' || a.type === 'celebrate') {
        // Full spin: rotation smoothly completes full 360°, scale/pos use triangle wave
        const half = a.duration / 2;
        f = elapsed < half ? elapsed / half : 2 - elapsed / half;
        const rT = Math.min(elapsed / a.duration, 1);
        this.model.rotation.set(
          this._lerp(a.fromR.x, a.peakR.x, rT),
          this._lerp(a.fromR.y, a.peakR.y, rT),
          this._lerp(a.fromR.z, a.peakR.z, rT)
        );
      } else {
        f = t < 0.5 ? t * 2 : 2 - t * 2; // 0→1→0
        this.model.rotation.set(
          this._lerp(a.fromR.x, a.peakR.x, f),
          this._lerp(a.fromR.y, a.peakR.y, f),
          this._lerp(a.fromR.z, a.peakR.z, f)
        );
      }

      // Scale — always triangle wave (out and back)
      this.model.scale.set(
        this._lerp(a.fromS.x, a.peakS.x, f),
        this._lerp(a.fromS.y, a.peakS.y, f),
        this._lerp(a.fromS.z, a.peakS.z, f)
      );

      // Position — always triangle wave (out and back)
      this.model.position.set(
        this._lerp(a.fromP.x, a.peakP.x, f),
        this._lerp(a.fromP.y, a.peakP.y, f),
        this._lerp(a.fromP.z, a.peakP.z, f)
      );

      // Brightness flash for heal
      if (a.type === 'heal' && this._animFlashBrightness) {
        // Flash at peak (t ~0.5)
        const flashIntensity = Math.sin(t * Math.PI);
        if (this.model.traverse) {
          this.model.traverse(c => {
            if (c.isMesh && c.material) {
              c.material.emissiveIntensity = flashIntensity * 0.5;
            }
          });
        }
      }

      // Animation complete — restore base transforms
      if (t >= 1) {
        this.model.scale.set(a.fromS.x, a.fromS.y, a.fromS.z);
        this.model.position.set(a.fromP.x, a.fromP.y, a.fromP.z);
        if (a.type !== 'heal' && a.type !== 'celebrate') {
          this.model.rotation.set(a.fromR.x, a.fromR.y, a.fromR.z);
        } // heal/celebrate leave rotation at full spin (net zero from Euler wrap)
        
        // Reset emissive flash
        if (this._animFlashBrightness) {
          this._animFlashBrightness = false;
          if (this.model.traverse) {
            this.model.traverse(c => {
              if (c.isMesh && c.material) {
                c.material.emissiveIntensity = 0;
              }
            });
          }
        }

        this._activeAnim = null;
        // Resume idle state machine
        this._idlePaused = false;
      }
      // Skip idle while animating
    } else if (this.model) {
      // === IDLE STATE MACHINE ===
      if (this.model.userData.ring) {
        // Egg wobble — NO auto Y rotation, just wobble Z + ring pulse
        this.model.rotation.z = Math.sin(Date.now() * 0.003) * 0.08;
        if (this.model.userData.ring) {
          this.model.userData.ring.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);
        }
      } else {
        this._updateIdle(dt);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _updateIdle(dt) {
    if (this._idlePaused) return;

    this._idleTimer += dt;

    const now = Date.now();

    if (this._idleState === 'FLOAT') {
      // More pronounced Y-position sine bob
      const targetBob = Math.sin(now * 0.003) * 0.03;
      const deltaBob = targetBob - this._idleBobOffset;
      this.model.position.y += deltaBob;
      this._idleBobOffset = targetBob;

      // Gradually return rotation to neutral
      this.model.rotation.y += (0 - this.model.rotation.y) * 0.02;
    }

    // Check if it's time to switch to a new idle state
    if (this._idleTimer >= this._idleNextSwitch) {
      this._idleTimer = 0;
      this._idleNextSwitch = this._randomIdleInterval();

      // Pick a new random state (not FLOAT if we were already in FLOAT at least once)
      const states = ['LOOK_LEFT', 'LOOK_RIGHT', 'BOUNCE', 'FLOAT', 'FLOAT'];
      const newState = states[Math.floor(Math.random() * states.length)];
      
      // Save current values as starting point for transition
      this._idleFromRotY = this.model.rotation.y;
      this._idleFromPosY = this.model.position.y;
      this._idleAnimProgress = 0;

      this._idleState = newState;

      switch (newState) {
        case 'LOOK_LEFT':
          this._idleTargetRotY = -0.35; // ~-20°
          break;
        case 'LOOK_RIGHT':
          this._idleTargetRotY = 0.35; // ~20°
          break;
        case 'BOUNCE':
          this._idleTargetPosY = this._idleFromPosY + 0.1; // hop up 0.1
          break;
        case 'FLOAT':
        default:
          // FLOAT just continues naturally
          break;
      }
    }

    // Process active idle transitions
    const speed = 0.016; // ~60fps step for smooth transitions
    const turnSpeed = 0.02;

    switch (this._idleState) {
      case 'LOOK_LEFT':
      case 'LOOK_RIGHT': {
        // Smooth rotate to target over ~1s, hold ~1s, return
        this._idleAnimProgress += dt;
        const lookDuration = 2.5; // 1s to turn, 0.5s hold, 1s to return
        const progress = Math.min(this._idleAnimProgress / lookDuration, 1);

        if (progress < 0.4) {
          // Turning toward target
          const p = progress / 0.4;
          this.model.rotation.y = this._idleFromRotY + (this._idleTargetRotY - this._idleFromRotY) * this._smoothstep(p);
        } else if (progress < 0.6) {
          // Hold at target
          this.model.rotation.y = this._idleTargetRotY;
        } else {
          // Return to neutral
          const p = (progress - 0.6) / 0.4;
          this.model.rotation.y = this._idleTargetRotY + (0 - this._idleTargetRotY) * this._smoothstep(p);
        }

        if (progress >= 1) {
          this._idleState = 'FLOAT';
          this._idleTimer = 0;
        }
        break;
      }
      case 'BOUNCE': {
        // Quick Y hop up 0.1 units then back
        this._idleAnimProgress += dt;
        const bounceDuration = 0.4;
        const progress = Math.min(this._idleAnimProgress / bounceDuration, 1);

        if (progress < 0.5) {
          // Going up
          const p = progress / 0.5;
          this.model.position.y = this._idleFromPosY + 0.1 * this._smoothstep(p);
        } else {
          // Coming down
          const p = (progress - 0.5) / 0.5;
          this.model.position.y = this._idleFromPosY + 0.1 * (1 - this._smoothstep(p));
        }

        if (progress >= 1) {
          this.model.position.y = this._idleFromPosY;
          this._idleState = 'FLOAT';
          this._idleTimer = 0;
        }
        break;
      }
      case 'FLOAT':
      default:
        // Already handled above (continuous bob), but also gently
        // drift Y rotation back to 0 (facing forward)
        this.model.rotation.y += (0 - this.model.rotation.y) * turnSpeed;
        break;
    }
  }

  _smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  get canvas() {
    return this.renderer?.domElement;
  }
}
