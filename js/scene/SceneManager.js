// js/scene/SceneManager.js — V2 with Bone Animation
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

    // === BONE ANIMATION SYSTEM ===
    this.bones = {};          // { name: { bone, restQ, restP } }
    this.hasBones = false;    // true if skeleton found
    this.useV2 = false;       // true if using local rigged GLB

    // Bone animation targets (set by playAnimation)
    this._boneTargets = {};   // { name: { q: Quat|null, p: Vec3|null, weight: 0.05 } }
    this._boneAnimWeight = 0; // 0-1, ramps up/down during animations

    // Idle state machine
    this._idleState = 'FLOAT';
    this._idleTimer = 0;
    this._idleNextSwitch = this._randomIdleInterval();
    this._idleAnimProgress = 0;
    this._idleFromRotY = 0;
    this._idleTargetRotY = 0;
    this._idleFromPosY = 0;
    this._idleTargetPosY = 0;
    this._idlePaused = false;

    // Tail wag phase
    this._tailPhase = 0;
    // Ear flick timer
    this._earFlickTimer = 0;
    this._earFlickInterval = 0;
    // Frame-based ear flick return (replaces setTimeout race condition)
    this._earFlickReturn = {};
    // Bounce hop animation data
    this._bounceAnimData = null;
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

  setFallbackCallback(cb) { this._fallbackCallback = cb; }
  setSuccessCallback(cb) { this._successCallback = cb; }

  /**
   * Load a V2 rigged GLB from local assets/models_v2/
   * @param {string} filename - e.g. 'pikachu_v2.glb'
   */
  async loadV2Model(filename) {
    this._clearModel();
    this.useV2 = false;
    this.hasBones = false;
    this.bones = {};

    // Reset idle state
    this._idleState = 'FLOAT';
    this._idleTimer = 0;
    this._idleNextSwitch = this._randomIdleInterval();
    this._idleAnimProgress = 0;
    this._idlePaused = false;

    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
    }

    // Build absolute URL for GitHub Pages
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const url = `${base}/assets/models_v2/${filename}`;

    const loader = new THREE.GLTFLoader();
    let timedOut = false;
    this._loadingTimeout = setTimeout(() => {
      timedOut = true;
      console.warn('V2 model load timed out for', filename);
      this._clearModel();
      if (this._fallbackCallback) this._fallbackCallback(filename);
    }, 15000);

    try {
      const gltf = await loader.loadAsync(url);
      if (timedOut) return;
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;

      this.model = gltf.scene;
      this.model.scale.set(1.2, 1.2, 1.2);

      // Center model
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y = -0.2;

      // Clone materials (textures are already embedded in the GLB)
      this.model.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.envMapIntensity = 0.3;
          c.material.needsUpdate = true;
        }
      });

      this.scene.add(this.model);

      // === DEBUG: expose for inspection ===
      window.__debugScene = this.scene;
      window.__debugModel = this.model;
      window.__debugCamera = this.camera;
      window.__debugRenderer = this.renderer;

      // Initial visibility check
      let meshCount = 0; let vertCount = 0;
      this.model.traverse(c => {
        if (c.isMesh) { meshCount++;
          if (c.geometry) vertCount += c.geometry.attributes.position?.count || 0;
        }
      });
      console.log(`DEBUG model: ${meshCount} meshes, ${vertCount} vertices`);

      // Built-in animations — apply first frame for default pose
      // PokeMiners GLBs store bones at origin (bind pose); animations position them
      if (gltf.animations && gltf.animations.length > 0) {
        const tempMixer = new THREE.AnimationMixer(this.model);
        const action = tempMixer.clipAction(gltf.animations[0]);
        action.play();
        // Step to first frame to apply default pose
        tempMixer.update(0.001);
        // Stop and remove — our _updateBoneIdle takes over from here
        action.stop();
        tempMixer.uncacheClip(gltf.animations[0]);
      }

      // === SCAN FOR BONES (AFTER pose applied) ===
      this._scanBones();
      this.useV2 = true;

      if (this._successCallback) this._successCallback(filename);
      console.log(`V2 model loaded: ${filename}, bones: ${Object.keys(this.bones).length}`);

    } catch (err) {
      if (timedOut) return;
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
      console.warn('V2 model load failed:', err);
      if (this._fallbackCallback) this._fallbackCallback(filename);
    }
  }

  /**
   * Scan the loaded model for bones and cache them
   */
  _scanBones() {
    this.bones = {};
    this.hasBones = false;

    if (!this.model) return;

    this.model.traverse(c => {
      if (c.isBone) {
        this.bones[c.name] = {
          bone: c,
          restQ: c.quaternion.clone(),
          restP: c.position.clone(),
        };
      }
    });

    this.hasBones = Object.keys(this.bones).length > 0;
    if (this.hasBones) {
      console.log('Bones found:', Object.keys(this.bones).join(', '));
    }
  }

  /**
   * Legacy model loader — loads from Pokemon3D API CDN (static, no bones)
   */
  async loadModel(pokedexId, category) {
    // If we have a V2 model loaded, we don't need legacy models
    if (this.model && this.useV2) return;

    this._clearModel();
    this.useV2 = false;
    this.hasBones = false;
    this.bones = {};

    this._idleState = 'FLOAT';
    this._idleTimer = 0;
    this._idleNextSwitch = this._randomIdleInterval();
    this._idleAnimProgress = 0;
    this._idlePaused = false;
    this._armature = null;

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
      if (timedOut) return;
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
      if (this._successCallback) this._successCallback(pokedexId);

      this.model = gltf.scene;
      this.model.scale.set(1.2, 1.2, 1.2);
      
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y = -0.2;

      this.model.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.envMapIntensity = 0.3;
        }
      });

      this.scene.add(this.model);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }

      // Legacy armature check
      this._armature = null;
      this.model.traverse(c => {
        if (c.isBone || c instanceof THREE.Bone || c.type === 'Bone') {
          this._armature = c;
        }
      });
      if (!this._armature) {
        this.model.traverse(c => {
          if (c.type === 'Skeleton' || c.type === 'Armature' || c.isArmature) {
            this._armature = c;
          }
        });
      }
      console.log('Legacy model loaded, skeleton found:', !!this._armature);

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
    this.bones = {};
    this.hasBones = false;
    this.useV2 = false;
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

  // ══════════════════════════════════════════════════════════
  //  BONE ANIMATION API
  // ══════════════════════════════════════════════════════════

  /**
   * Helper: get bone by name (cached)
   */
  _bone(name) {
    return this.bones[name];
  }

  /** Try multiple bone names, return first match */
  _boneAny(...names) {
    for (const n of names) {
      if (this.bones[n]) return this.bones[n];
    }
    return undefined;
  }

  /**
   * Set a target quaternion for a bone (will slerp toward it)
   */
  _setBoneTarget(name, q, weight) {
    this._boneTargets[name] = { q, p: null, weight: weight || 0.25 };
  }

  /**
   * Clear all bone targets (return to rest pose)
   */
  _clearBoneTargets() {
    this._boneTargets = {};
  }

  /**
   * Apply bone targets via slerp — called every frame
   */
  _applyBoneTargets(blendWeight) {
    const w = blendWeight || 1;
    for (const [name, target] of Object.entries(this._boneTargets)) {
      const boneData = this.bones[name];
      if (!boneData) continue;
      const bone = boneData.bone;
      if (target.q) {
        // Slerp from CURRENT bone rotation toward target (avoids restQ snap)
        const totalWeight = w * (target.weight || 0.4) * 0.3;
        bone.quaternion.slerp(target.q, totalWeight);
      }
      if (target.p) {
        // Lerp from CURRENT bone position toward target
        bone.position.lerp(target.p, w * (target.weight || 0.4) * 0.3);
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  //  BONE-BASED ANIMATIONS (replaces tween system)
  // ══════════════════════════════════════════════════════════

  /**
   * Play a buddy-style animation using bone targets (V2 models)
   * Falls back to tween animation for legacy models.
   */
  playAnimation(type) {
    if (!this.model || this.model.userData.ring) return; // No animations on egg

    if (this.hasBones && this.useV2) {
      this._playBoneAnimation(type);
    } else {
      this._playLegacyTween(type);
    }
  }

  /**
   * Bone-based animation — set targets, let update() slerp toward them
   */
  _playBoneAnimation(type) {
    if (this._activeAnim) return; // Let current finish

    const duration = this._getAnimDuration(type);
    this._clearBoneTargets();

    switch (type) {
      case 'feed': {
        // Head tilts down, ears relax, tail wags
        const headDown = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0));
        this._boneTargets['Head'] = { q: headDown, p: null, weight: 0.4 };

        // Arms come up toward face
        const armLift = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3));
        const lArm = this._boneAny('LArm', 'LForeArm');
        const rArm = this._boneAny('RArm', 'RForeArm');
        if (lArm) this._boneTargets[lArm.bone.name] = { q: armLift, p: null, weight: 0.4 };
        if (rArm) this._boneTargets[rArm.bone.name] = { q: armLift, p: null, weight: 0.4 };

        // Happy tail
        if (this._bone('Tail1')) this._boneTargets['Tail1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.2)), p: null, weight: 0.5 };
        if (this._bone('Tail2')) this._boneTargets['Tail2'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3)), p: null, weight: 0.5 };
        if (this._bone('Tail3')) this._boneTargets['Tail3'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.4)), p: null, weight: 0.5 };
        break;
      }
      case 'pet': {
        // Head leans toward camera (Z tilt)
        const headLean = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.1, 0.15));
        this._boneTargets['Head'] = { q: headLean, p: null, weight: 0.3 };

        // Ears go slightly back (content)
        if (this._bone('LEar1')) this._boneTargets['LEar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.08, 0)), p: null, weight: 0.3 };
        if (this._bone('REar1')) this._boneTargets['REar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.08, 0)), p: null, weight: 0.3 };
        break;
      }
      case 'heal': {
        // Victory pose: head back, arms spread, ears perked, jaw open, tail high, chest puff
        const headBack = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0.05));
        this._boneTargets['Head'] = { q: headBack, p: null, weight: 0.4 };

        // Arms spread wide (victory)
        const armSpread = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0.3));
        const lArmH = this._boneAny('LArm', 'LForeArm');
        const rArmH = this._boneAny('RArm', 'RForeArm');
        if (lArmH) this._boneTargets[lArmH.bone.name] = { q: armSpread, p: null, weight: 0.4 };
        if (rArmH) this._boneTargets[rArmH.bone.name] = { q: armSpread, p: null, weight: 0.4 };

        // Ears perk up
        if (this._bone('LEar1')) this._boneTargets['LEar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.15)), p: null, weight: 0.4 };
        if (this._bone('REar1')) this._boneTargets['REar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15)), p: null, weight: 0.4 };

        // Jaw open if exists
        if (this._bone('Jaw1')) this._boneTargets['Jaw1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.2)), p: null, weight: 0.4 };

        // Tail high and wags
        if (this._bone('Tail1')) this._boneTargets['Tail1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.4)), p: null, weight: 0.5 };
        if (this._bone('Tail2')) this._boneTargets['Tail2'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.5)), p: null, weight: 0.5 };
        if (this._bone('Tail3')) this._boneTargets['Tail3'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.6)), p: null, weight: 0.5 };

        // Chest puff (Spine)
        if (this._bone('Spine')) {
          this._boneTargets['Spine'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0)), p: null, weight: 0.4 };
        }
        break;
      }
      case 'hatch': {
        // Wobble + scale burst
        const wobble = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, 0.06));
        this._boneTargets['Head'] = { q: wobble, p: null, weight: 0.75 };
        // Subtle tail curl
        if (this._bone('Tail1')) this._boneTargets['Tail1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.15)), p: null, weight: 0.6 };
        if (this._bone('Tail2')) this._boneTargets['Tail2'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.2)), p: null, weight: 0.5 };
        // Whole model: separate spin is done in update() for heals
        // Scale burst is handled by the tween fallback
        break;
      }
      case 'celebrate': {
        // Head up, ears perked, arms up, tail high
        const headUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0));
        this._boneTargets['Head'] = { q: headUp, p: null, weight: 0.4 };

        // Ears perk up
        if (this._bone('LEar1')) this._boneTargets['LEar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.1)), p: null, weight: 0.4 };
        if (this._bone('REar1')) this._boneTargets['REar1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.1)), p: null, weight: 0.4 };

        // Arms up
        const armUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0.2));
        const lArmC = this._boneAny('LArm', 'LForeArm');
        const rArmC = this._boneAny('RArm', 'RForeArm');
        if (lArmC) this._boneTargets[lArmC.bone.name] = { q: armUp, p: null, weight: 0.4 };
        if (rArmC) this._boneTargets[rArmC.bone.name] = { q: armUp, p: null, weight: 0.4 };

        // Tail high
        if (this._bone('Tail1')) this._boneTargets['Tail1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3)), p: null, weight: 0.5 };
        if (this._bone('Tail2')) this._boneTargets['Tail2'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.4)), p: null, weight: 0.5 };
        if (this._bone('Tail3')) this._boneTargets['Tail3'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.5)), p: null, weight: 0.5 };
        break;
      }
      case 'bounce': {
        // Head bobs down
        const headBob = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0));
        this._boneTargets['Head'] = { q: headBob, p: null, weight: 0.4 };

        // Arms lift slightly
        const armLiftB = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0.15));
        const lArmB = this._boneAny('LArm', 'LForeArm');
        const rArmB = this._boneAny('RArm', 'RForeArm');
        if (lArmB) this._boneTargets[lArmB.bone.name] = { q: armLiftB, p: null, weight: 0.4 };
        if (rArmB) this._boneTargets[rArmB.bone.name] = { q: armLiftB, p: null, weight: 0.4 };

        // Tail wags fast
        if (this._bone('Tail1')) this._boneTargets['Tail1'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.25)), p: null, weight: 0.5 };
        if (this._bone('Tail2')) this._boneTargets['Tail2'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.35)), p: null, weight: 0.5 };
        if (this._bone('Tail3')) this._boneTargets['Tail3'] = { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.45)), p: null, weight: 0.5 };

        // Full-body hop stored for update() via model.position.y
        this._bounceAnimData = { startY: this.model.position.y };
        break;
      }
    }

    this._activeAnim = {
      type, startTime: Date.now(), duration,
      useBones: true,
    };
    this._idlePaused = true;
  }

  _getAnimDuration(type) {
    switch (type) {
      case 'feed': return 0.7;
      case 'pet': return 0.7;
      case 'heal': return 1.0;
      case 'hatch': return 0.8;
      case 'celebrate': return 0.8;
      case 'bounce': return 0.5;
      default: return 0.6;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  LEGACY TWEEN SYSTEM (for non-V2 models)
  // ══════════════════════════════════════════════════════════

  _playLegacyTween(type) {
    if (this._activeAnim) return;
    if (!this.model || this.model.userData.ring) return;

    const duration = this._getAnimDuration(type);
    const s = this.model.scale;
    const r = this.model.rotation;
    const p = this.model.position;

    const fromS = { x: s.x, y: s.y, z: s.z };
    const fromR = { x: r.x, y: r.y, z: r.z };
    const fromP = { x: p.x, y: p.y, z: p.z };

    let peakS, peakR, peakP;

    switch (type) {
      case 'feed':
        peakS = { x: fromS.x * 1.15, y: fromS.y * 1.15, z: fromS.z * 1.15 };
        peakR = { x: fromR.x, y: fromR.y + 0.26, z: fromR.z };
        peakP = { x: fromP.x, y: fromP.y + 0.05, z: fromP.z };
        break;
      case 'pet':
        peakS = { ...fromS };
        peakR = { x: fromR.x, y: fromR.y - 0.17, z: fromR.z + (Math.random() > 0.5 ? 0.087 : -0.087) };
        peakP = { ...fromP };
        break;
      case 'heal':
        peakS = { x: fromS.x * 1.2, y: fromS.y * 1.2, z: fromS.z * 1.2 };
        peakR = { x: fromR.x, y: fromR.y + Math.PI * 2, z: fromR.z };
        peakP = { ...fromP };
        this._animFlashBrightness = true;
        break;
      case 'hatch':
        peakS = { x: fromS.x * 1.3, y: fromS.y * 1.3, z: fromS.z * 1.3 };
        peakR = { x: fromR.x, y: fromR.y, z: fromR.z + 0.175 };
        peakP = { x: fromP.x, y: fromP.y + 0.05, z: fromP.z };
        break;
      case 'celebrate':
        peakS = { x: fromS.x * 1.25, y: fromS.y * 1.25, z: fromS.z * 1.25 };
        peakR = { x: fromR.x, y: fromR.y + Math.PI * 2, z: fromR.z };
        peakP = { x: fromP.x, y: fromP.y + 0.3, z: fromP.z };
        break;
      case 'bounce':
        peakS = { ...fromS };
        peakR = { ...fromR };
        peakP = { x: fromP.x, y: fromP.y + 0.1, z: fromP.z };
        break;
      default:
        return;
    }

    this._activeAnim = {
      type, startTime: Date.now(), duration,
      fromS, fromR, fromP, peakS, peakR, peakP,
      useBones: false,
    };
    this._idlePaused = true;
  }

  _lerp(a, b, t) { return a + (b - a) * t; }

  update(dt) {
    if (!this.initialized || !this.scene || !this.renderer) return;
    
    // No built-in mixer — we handle all animation via _updateBoneIdle / _playBoneAnimation

    if (this._activeAnim) {
      const a = this._activeAnim;
      const elapsed = (Date.now() - a.startTime) / 1000;
      const t = Math.min(elapsed / a.duration, 1);

      if (a.useBones && this.hasBones) {
        // Bone animation: triangle wave 0→1→0 with 20% peak hold at 1
        const f = t < 0.4 ? t / 0.4 : t < 0.6 ? 1 : (1 - t) / 0.4;
        this._applyBoneTargets(f);

        // Heal/celebrate spin on whole model (can't spin individual bones)
        if (a.type === 'heal' || a.type === 'celebrate') {
          if (this.model) {
            const rT = t;
            this.model.rotation.y = rT * Math.PI * 2;
          }
        }

        // Bounce full-body hop via model.position.y
        if (a.type === 'bounce' && this.model && this._bounceAnimData) {
          const hopT = t < 0.5 ? t * 2 : 2 - t * 2;
          this.model.position.y = this._bounceAnimData.startY + hopT * 0.15;
        }

        // Brightness flash for heal
        if (a.type === 'heal' && this._animFlashBrightness) {
          const flashIntensity = Math.sin(t * Math.PI);
          this.model.traverse(c => {
            if (c.isMesh && c.material) {
              c.material.emissiveIntensity = flashIntensity * 0.5;
            }
          });
        }
      } else {
        // Legacy tween animation
        let f;
        if (a.type === 'heal' || a.type === 'celebrate') {
          const half = a.duration / 2;
          f = elapsed < half ? elapsed / half : 2 - elapsed / half;
          const rT = Math.min(elapsed / a.duration, 1);
          if (this.model) {
            this.model.rotation.set(
              this._lerp(a.fromR.x, a.peakR.x, rT),
              this._lerp(a.fromR.y, a.peakR.y, rT),
              this._lerp(a.fromR.z, a.peakR.z, rT)
            );
          }
        } else {
          f = t < 0.5 ? t * 2 : 2 - t * 2;
          if (this.model) {
            this.model.rotation.set(
              this._lerp(a.fromR.x, a.peakR.x, f),
              this._lerp(a.fromR.y, a.peakR.y, f),
              this._lerp(a.fromR.z, a.peakR.z, f)
            );
          }
        }

        if (this.model) {
          this.model.scale.set(
            this._lerp(a.fromS.x, a.peakS.x, f),
            this._lerp(a.fromS.y, a.peakS.y, f),
            this._lerp(a.fromS.z, a.peakS.z, f)
          );
          this.model.position.set(
            this._lerp(a.fromP.x, a.peakP.x, f),
            this._lerp(a.fromP.y, a.peakP.y, f),
            this._lerp(a.fromP.z, a.peakP.z, f)
          );
        }

        if (a.type === 'heal' && this._animFlashBrightness) {
          const flashIntensity = Math.sin(t * Math.PI);
          if (this.model && this.model.traverse) {
            this.model.traverse(c => {
              if (c.isMesh && c.material) {
                c.material.emissiveIntensity = flashIntensity * 0.5;
              }
            });
          }
        }
      }

      // Animation complete
      if (t >= 1) {
        if (a.useBones && this.hasBones) {
          this._clearBoneTargets();
          this._bounceAnimData = null;
          if (this.model) {
            this.model.rotation.y = 0; // Reset spin
            this.model.position.y = 0; // Reset Y after bounce
            this.model.scale.set(1.2, 1.2, 1.2); // Reset scale
          }
          // Reset emissive flash
          if (this._animFlashBrightness) {
            this._animFlashBrightness = false;
            if (this.model && this.model.traverse) {
              this.model.traverse(c => {
                if (c.isMesh && c.material) {
                  c.material.emissiveIntensity = 0;
                }
              });
            }
          }
        } else {
          if (this.model) {
            this.model.scale.set(a.fromS.x, a.fromS.y, a.fromS.z);
            this.model.position.set(a.fromP.x, a.fromP.y, a.fromP.z);
            if (a.type !== 'heal' && a.type !== 'celebrate') {
              this.model.rotation.set(a.fromR.x, a.fromR.y, a.fromR.z);
            }
          }
          if (this._animFlashBrightness) {
            this._animFlashBrightness = false;
            if (this.model && this.model.traverse) {
              this.model.traverse(c => {
                if (c.isMesh && c.material) c.material.emissiveIntensity = 0;
              });
            }
          }
        }
        this._activeAnim = null;
        this._idlePaused = false;
      }
    } else if (this.model) {
      // === IDLE STATE MACHINE ===
      if (this.model.userData && this.model.userData.ring) {
        this.model.rotation.z = Math.sin(Date.now() * 0.003) * 0.08;
        if (this.model.userData.ring) {
          this.model.userData.ring.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);
        }
      } else if (this.hasBones) {
        // === V2 BONE-BASED IDLE ===
        this._updateBoneIdle(dt);
      } else {
        this._updateIdle(dt);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * V2 bone-based idle animations
   * Animates bones directly: tail wag, ear flick, breathing, head look
   */
  _updateBoneIdle(dt) {
    if (this._idlePaused) return;

    const now = Date.now();

    // === TAIL WAG (independent sine wave) ===
    if (this._bone('Tail1')) {
      this._tailPhase += dt * 0.8; // slow speed
      const wag = Math.sin(now * 0.003) * 0.15;
      this._bone('Tail1').bone.rotation.z = wag;
      if (this._bone('Tail2')) this._bone('Tail2').bone.rotation.z = Math.sin(now * 0.0035 + 0.5) * 0.2;
      if (this._bone('Tail3')) this._bone('Tail3').bone.rotation.z = Math.sin(now * 0.004 + 1.0) * 0.25;
    }

    // === EAR FLICK (random intervals, frame-based return) ===
    this._earFlickTimer += dt;
    if (this._earFlickTimer >= (this._earFlickInterval || 4)) {
      this._earFlickTimer = 0;
      this._earFlickInterval = 3 + Math.random() * 5;
      
      // Quick ear flick (both ears) — schedule return via frame counter
      if (this._bone('LEar1')) {
        const flick = (Math.random() > 0.5 ? 1 : -1) * 0.2;
        this._bone('LEar1').bone.rotation.z += flick;
        this._earFlickReturn['LEar1'] = 4; // Return to 0 after 4 frames
      }
      if (this._bone('REar1')) {
        const flickR = (Math.random() > 0.5 ? 1 : -1) * 0.15;
        this._bone('REar1').bone.rotation.z += flickR;
        this._earFlickReturn['REar1'] = 4; // Return to 0 after 4 frames
      }
    }

    // Process frame-based ear flick returns (decrements each frame)
    for (const earName of Object.keys(this._earFlickReturn)) {
      this._earFlickReturn[earName]--;
      if (this._earFlickReturn[earName] <= 0) {
        if (this._bone(earName)) {
          this._bone(earName).bone.rotation.z = 0;
        }
        delete this._earFlickReturn[earName];
      }
    }

    // === HEAD SINE (gentle look-around) ===
    if (this._bone('Head')) {
      const headTurn = Math.sin(now * 0.0005) * 0.05; // very slow, subtle
      this._bone('Head').bone.rotation.y = headTurn;
    }

    // === BREATHING (subtle body scale pulse, preserving initial scale) ===
    const baseScale = 1.2;
    const breathOffset = Math.sin(now * 0.002) * 0.003;
    this.model.scale.x = baseScale + breathOffset;
    this.model.scale.z = baseScale + breathOffset;

    // === FLOAT BOB ===
    const targetBob = Math.sin(now * 0.003) * 0.03;
    const deltaBob = targetBob - this._idleBobOffset;
    this.model.position.y += deltaBob;
    this._idleBobOffset = targetBob;
  }

  _updateIdle(dt) {
    if (this._idlePaused) return;

    this._idleTimer += dt;
    const now = Date.now();

    if (this._idleState === 'FLOAT') {
      const targetBob = Math.sin(now * 0.003) * 0.03;
      const deltaBob = targetBob - this._idleBobOffset;
      this.model.position.y += deltaBob;
      this._idleBobOffset = targetBob;
      this.model.rotation.y += (0 - this.model.rotation.y) * 0.02;
    }

    if (this._idleTimer >= this._idleNextSwitch) {
      this._idleTimer = 0;
      this._idleNextSwitch = this._randomIdleInterval();
      const states = ['LOOK_LEFT', 'LOOK_RIGHT', 'BOUNCE', 'FLOAT', 'FLOAT'];
      const newState = states[Math.floor(Math.random() * states.length)];
      
      this._idleFromRotY = this.model.rotation.y;
      this._idleFromPosY = this.model.position.y;
      this._idleAnimProgress = 0;
      this._idleState = newState;

      switch (newState) {
        case 'LOOK_LEFT': this._idleTargetRotY = -0.35; break;
        case 'LOOK_RIGHT': this._idleTargetRotY = 0.35; break;
        case 'BOUNCE': this._idleTargetPosY = this._idleFromPosY + 0.1; break;
      }
    }

    const turnSpeed = 0.02;
    switch (this._idleState) {
      case 'LOOK_LEFT':
      case 'LOOK_RIGHT': {
        this._idleAnimProgress += dt;
        const lookDuration = 2.5;
        const progress = Math.min(this._idleAnimProgress / lookDuration, 1);
        if (progress < 0.4) {
          const p = progress / 0.4;
          this.model.rotation.y = this._idleFromRotY + (this._idleTargetRotY - this._idleFromRotY) * this._smoothstep(p);
        } else if (progress < 0.6) {
          this.model.rotation.y = this._idleTargetRotY;
        } else {
          const p = (progress - 0.6) / 0.4;
          this.model.rotation.y = this._idleTargetRotY + (0 - this._idleTargetRotY) * this._smoothstep(p);
        }
        if (progress >= 1) { this._idleState = 'FLOAT'; this._idleTimer = 0; }
        break;
      }
      case 'BOUNCE': {
        this._idleAnimProgress += dt;
        const bounceDuration = 0.4;
        const progress = Math.min(this._idleAnimProgress / bounceDuration, 1);
        if (progress < 0.5) {
          const p = progress / 0.5;
          this.model.position.y = this._idleFromPosY + 0.1 * this._smoothstep(p);
        } else {
          const p = (progress - 0.5) / 0.5;
          this.model.position.y = this._idleFromPosY + 0.1 * (1 - this._smoothstep(p));
        }
        if (progress >= 1) { this.model.position.y = this._idleFromPosY; this._idleState = 'FLOAT'; this._idleTimer = 0; }
        break;
      }
      case 'FLOAT':
      default:
        this.model.rotation.y += (0 - this.model.rotation.y) * turnSpeed;
        break;
    }
  }

  _smoothstep(t) { return t * t * (3 - 2 * t); }

  get canvas() { return this.renderer?.domElement; }
}
