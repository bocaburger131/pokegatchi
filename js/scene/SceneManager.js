// js/scene/SceneManager.js — V2 with Bone Animation
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
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
    this.scene.background = new THREE.Color(0x1a1a2e); // Solid background so we can see the model
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
    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
    }

    const url = `assets/models_v2/${filename}`;

    const loader = new GLTFLoader();
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
      // BAKED MODE — no scaling needed, bake produces correct-sized geometry
      this._v2Scale = 1;
      this.model.scale.set(1, 1, 1);
      this.model.position.y = 0.8; // Move up so Pikachu is visible (body at y~-1.8, shift up)
      // Save rest values for animation reset
      this._modelRestPos = this.model.position.clone();
      this._modelRestRot = this.model.rotation.clone();
      this._modelRestScale = this.model.scale.clone();

      // Clone materials (textures are already embedded in the GLB)
      this.model.traverse(c => {
        if (c.isMesh) {
          c.frustumCulled = false; // Prevent incorrect culling on skinned meshes
          c.material = c.material.clone();
          c.material.envMapIntensity = 0.3;
          c.material.needsUpdate = true;
        }
      });

      this.scene.add(this.model);

      // Force matrix update so bones have their world transforms
      this.model.updateMatrixWorld(true);

      // Scan and cache bones (strips _NN suffixes for compatibility)
      this._scanBones();

      if (this.hasBones) {
        this.useV2 = true;
        console.log('V2 bone animation system activated');
      }

      // Center the model using bounding box
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y = -0.2;

      // Recompute matrix world after position change
      this.model.updateMatrixWorld(true);

      // Point camera at model
      this.camera.lookAt(0, 0, 0);

      // Update saved rest position after centering
      this._modelRestPos.copy(this.model.position);
      this._modelRestRot.copy(this.model.rotation);
      this._modelRestScale.copy(this.model.scale);

      this.mixer = new THREE.AnimationMixer(this.model);
      if (gltf.animations && gltf.animations.length > 0) {
        const clip = gltf.animations[0];
        const action = this.mixer.clipAction(clip);
        action.play();
        console.log(`Playing default animation clip: "${clip.name}"`);
      }

      // Re-enable the idle system
      if (this._successCallback) this._successCallback(filename);

    } catch (err) {
      if (timedOut) return;
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
      console.error(`V2 model load failed for URL: ${url}`, err);
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
        // Strip _NN suffix from Pokemon3D API bones (e.g. Tail1_30 → Tail1)
        const cleanName = c.name.replace(/_\d+$/, '');
        this.bones[cleanName] = {
          bone: c,
          restQ: c.quaternion.clone(),
          restP: c.position.clone(),
          originalName: c.name,
        };
      }
    });

    this.hasBones = Object.keys(this.bones).length > 0;
    if (this.hasBones) {
      console.log('Bones found (' + Object.keys(this.bones).length + '):', Object.keys(this.bones).join(', '));
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
    const loader = new GLTFLoader();
    
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

      // Save the model's initial position/rotation for animation reset
      this._modelRestPos = this.model.position.clone();
      this._modelRestRot = this.model.rotation.clone();
      this._modelRestScale = this.model.scale.clone();

      this.model.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.envMapIntensity = 0.3;
        }
      });

      // The model has built-in animations (e.g. Impactrueno)
      // We won't play them via mixer — the V2 bone animation system handles idle
      // Instead, note the animation count for potential use later
      console.log('Model has', gltf.animations.length, 'built-in animations');

      // Add the model to the scene BEFORE scanning bones
      this.scene.add(this.model);

      // Force matrix update so bones have their world transforms
      this.model.updateMatrixWorld(true);

      // Scan and cache bones (strips _NN suffixes for compatibility)
      this._scanBones();

      if (this.hasBones) {
        this.useV2 = true;
        console.log('V2 bone animation system activated');
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
    
    if (this.mixer) {
      this.mixer.update(dt);
    }

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
            this.model.rotation.y = this._modelRestRot?.y || 0; // Reset spin
            this.model.position.y = this._modelRestPos?.y || 0; // Reset Y after bounce
            this.model.scale.copy(this._modelRestScale || new THREE.Vector3(1, 1, 1)); // Reset scale
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
      }
    } else if (this.model) {
      // === IDLE STATE MACHINE ===
      if (this.model.userData && this.model.userData.ring) {
        this.model.rotation.z = Math.sin(Date.now() * 0.003) * 0.08;
        if (this.model.userData.ring) {
          this.model.userData.ring.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);
        }
      }
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  get canvas() { return this.renderer?.domElement; }
}
