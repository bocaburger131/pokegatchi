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
      // WebGL not available — sprite-only mode immediately
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
    
    // Set a 15-second timeout — if model doesn't load by then, fire fallback
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
    // Destroy 3D scene, show just the sprite
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
    // When 3D model fails, switch to sprite-only mode
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
   * Each animation applies a triangle-wave curve (0→1→0) to scale/rotation/position.
   * @param {'feed'|'pet'|'heal'|'hatch'|'celebrate'} type
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
        duration = 0.5;
        peakS = { x: fromS.x * 1.15, y: fromS.y * 1.15, z: fromS.z * 1.15 };
        peakR = { x: fromR.x, y: fromR.y + 0.26, z: fromR.z }; // +15° Y
        peakP = { ...fromP };
        break;
      case 'pet':
        duration = 0.4;
        peakS = { ...fromS };
        peakR = { x: fromR.x, y: fromR.y, z: fromR.z + 0.087 }; // +5° Z lean
        peakP = { ...fromP };
        break;
      case 'heal':
        duration = 0.8;
        peakS = { x: fromS.x * 1.2, y: fromS.y * 1.2, z: fromS.z * 1.2 };
        peakR = { x: fromR.x, y: fromR.y + Math.PI * 2, z: fromR.z }; // Full spin
        peakP = { ...fromP };
        break;
      case 'hatch':
        duration = 1.0;
        peakS = { x: fromS.x * 1.3, y: fromS.y * 1.3, z: fromS.z * 1.3 };
        peakR = { x: fromR.x + 0.3, y: fromR.y, z: fromR.z + 0.3 }; // Wobble
        peakP = { ...fromP };
        break;
      case 'celebrate':
        duration = 0.6;
        peakS = { x: fromS.x * 1.25, y: fromS.y * 1.25, z: fromS.z * 1.25 };
        peakR = { ...fromR };
        peakP = { x: fromP.x, y: fromP.y + 0.3, z: fromP.z }; // Bounce up
        break;
      default:
        return;
    }

    this._activeAnim = {
      type, startTime: Date.now(), duration,
      fromS, fromR, fromP, peakS, peakR, peakP,
    };
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
      if (a.type === 'heal') {
        // Heal: scale goes out-and-back, rotation smoothly completes full 360°
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

      // Animation complete — restore base transforms
      if (t >= 1) {
        this.model.scale.set(a.fromS.x, a.fromS.y, a.fromS.z);
        this.model.position.set(a.fromP.x, a.fromP.y, a.fromP.z);
        if (a.type !== 'heal') {
          this.model.rotation.set(a.fromR.x, a.fromR.y, a.fromR.z);
        } // heal leaves rotation at full spin (net zero from Euler wrap)
        this._activeAnim = null;
      }
      // Skip auto-rotation and idle bob while animating
    } else if (this.model) {
      // Rotate & float (existing logic)
      if (!this.model.userData.ring) {
        this.model.rotation.y += dt * 0.4;

        // Gentle idle bob — continuous sine wave on Y position
        const targetBob = Math.sin(Date.now() * 0.003) * 0.005;
        const deltaBob = targetBob - this._idleBobOffset;
        this.model.position.y += deltaBob;
        this._idleBobOffset = targetBob;
      } else {
        // Egg wobble
        this.model.rotation.z = Math.sin(Date.now() * 0.003) * 0.08;
        if (this.model.userData.ring) {
          this.model.userData.ring.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  get canvas() {
    return this.renderer?.domElement;
  }
}
