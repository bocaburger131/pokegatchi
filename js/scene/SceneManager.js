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

  update(dt) {
    if (!this.initialized || !this.scene || !this.renderer) return;
    
    if (this.mixer) this.mixer.update(dt);

    // Rotate & float
    if (this.model) {
      if (!this.model.userData.ring) {
        this.model.rotation.y += dt * 0.4;
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
