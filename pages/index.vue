<template>
  <div class="home-page">
    <canvas id="canvas"></canvas>
    <div class="split uppercase">
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate
      perferendis, quia at nihil praesentium doloremque. Soluta fuga magnam
      itaque sequi odio animi ab labore sint, porro facere corrupti molestiae
      nostrum!
    </div>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import gsap from "gsap";

// Global variables
let scene, renderer, camera, controls, statuemesh, envMap, material;
let composer, bloomPass, bokehPass;
let dustParticles;
let clock = new THREE.Clock();
let cursorLightFar, cursorLightFar2;
let cursorLightFarHelper, cursorLightFarHelper2;

// State tracking
let isSceneReady = false;
let isModelLoaded = false;
let isEnvironmentLoaded = false;

// Mouse rotation variables
let mouse = new THREE.Vector2();
let lastMouse = new THREE.Vector2();
let rotationOffset = new THREE.Vector2();
let mouseMoveFactor = { value: 0.05 };
let returnFactor = { value: 0.01 };
let isMouseMoving = false;
let mouseTimeout;
let statueGroup;

const config = {
  // Bloom settings
  bloom: {
    strength: 0.3,
    radius: 2.0,
    threshold: 0.05,
  },

  // Cursor lights
  cursorLightFar: {
    enabled: true,
    color: 0xf1f1ff, // White color
    intensity: 0.5,
    distance: 20,
    decay: 0.5,
    depth: 6, // Closer depth
    smoothing: 0.1,
    xOffset: 1.2, // X offset for the two lights
  },

  // Other settings
  lineWidth: 6,
  opacity: 1,
  bezierCurveAmount: 0.5,
  orbitControls: { enabled: false, enableDamping: true, dampingFactor: 0.1 },
  dustParticles: {
    count: 2000,
    size: { min: 0.008, max: 0.06 },
    area: { width: 5, height: 5, depth: 15 },
    opacity: 0.3,
    speed: { min: 0.0001, max: 0.0004 },
    color: {
      hue: { min: 200, max: 300 },
      saturation: { min: 70, max: 90 },
      lightness: { min: 70, max: 100 },
    },
  },
  dof: { focus: 2.5, aperture: 0.001, maxblur: 0.5, enabled: false },
  insideLineWidth: 0.7,
  insideLineOpacity: 1,
};

// Create scene
scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const loadingManager = new THREE.LoadingManager();

onMounted(() => {
  setTimeout(() => {
    gsap.registerPlugin(SplitText);

    let split = SplitText.create(".split", {
      type: "lines, words",
      mask: "lines",
      linesClass: "lines",
    });

    gsap.set(split.lines, {
      yPercent: 100,
    });

    setTimeout(() => {
      gsap.set(".split", {
        opacity: 1,
        ease: "power2.out",
      });
      gsap.to(split.lines, {
        yPercent: 0,
        ease: "power2.out",
        duration: 1.5,
        stagger: 0.2,
      });
    }, 500);
  }, 500);
  loadingManager.onLoad = () => {
    setTimeout(() => {
      checkIfReadyToStart();
    }, 500);
  };

  loadingManager.onError = (error) => {
    console.error("Loading error:", error);
  };

  // Load HDRI environment
  const hdriLoader = new RGBELoader(loadingManager);
  hdriLoader.load(
    "images/03.hdr",
    function (texture) {
      envMap = texture;
      envMap.mapping = THREE.EquirectangularReflectionMapping;

      material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.5,
        transparent: true,
        opacity: 1,
      });

      isEnvironmentLoaded = true;
      console.log("Environment loaded");
      checkIfReadyToStart();
    },
    undefined,
    (error) => {
      console.error("HDRI loading error:", error);
    }
  );

  // Load model
  const loader = new GLTFLoader(loadingManager);
  loader.load(
    "mesh/man3.glb",
    (gltf) => {
      try {
        // Safely set up camera
        if (gltf.cameras && gltf.cameras[0]) {
          camera = gltf.cameras[0];
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
        } else {
          // Fallback camera if none in model
          camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
          );
          camera.position.set(0, 0, 5);
        }

        // Safely traverse scene
        gltf.scene.traverse((child) => {
          if (!child || !child.name) return;

          try {
            if (child.name.includes("statue_")) {
              statuemesh = child;
              if (material) {
                statuemesh.material = material;
              }
            }
            if (
              child.name.includes("line_") ||
              child.name.includes("inside_")
            ) {
              child.visible = false;
            }
          } catch (error) {
            console.warn("Error processing child:", child.name, error);
          }
        });

        scene.add(gltf.scene);
        isModelLoaded = true;
        console.log("Model loaded");
        checkIfReadyToStart();
      } catch (error) {
        console.error("Error processing GLTF:", error);
      }
    },
    undefined,
    (error) => {
      console.error("Model loading error:", error);
    }
  );

  // Initialize basic renderer early
  initRenderer();
});

function checkIfReadyToStart() {
  if (isModelLoaded && isEnvironmentLoaded && !isSceneReady) {
    console.log("Starting scene initialization");
    isSceneReady = true;
    init();
    initStatueGroup();
    animate();
  }
}

function initRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: document.querySelector("#canvas"),
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
}

function onMouseMove(event) {
  if (!isSceneReady) return;

  lastMouse.x = mouse.x;
  lastMouse.y = mouse.y;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  let deltaX = mouse.x - lastMouse.x;
  let deltaY = mouse.y - lastMouse.y;

  if (Math.abs(deltaX) > 0.004 || Math.abs(deltaY) > 0.004) {
    rotationOffset.x = Math.max(
      -0.5,
      Math.min(0.5, rotationOffset.x - deltaY * mouseMoveFactor.value)
    );
    rotationOffset.y = Math.max(
      -0.5,
      Math.min(0.5, rotationOffset.y - deltaX * mouseMoveFactor.value)
    );
    clearTimeout(mouseTimeout);
    isMouseMoving = true;
    mouseTimeout = setTimeout(() => {
      isMouseMoving = false;
    }, 100);
  }

  updateCursorLightPosition(event);
}

function updateCursorLightPosition(event) {
  if (!camera || !isSceneReady) return;

  try {
    const mouse3D = new THREE.Vector3(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );

    mouse3D.unproject(camera);
    const direction = mouse3D.sub(camera.position).normalize();

    if (cursorLightFar && config.cursorLightFar.enabled) {
      const targetPositionFar = camera.position
        .clone()
        .add(direction.clone().multiplyScalar(config.cursorLightFar.depth));
      targetPositionFar.x += config.cursorLightFar.xOffset;
      cursorLightFar.position.lerp(
        targetPositionFar,
        config.cursorLightFar.smoothing
      );
    }

    if (cursorLightFar2 && config.cursorLightFar.enabled) {
      const targetPositionFar2 = camera.position
        .clone()
        .add(direction.clone().multiplyScalar(config.cursorLightFar.depth));
      targetPositionFar2.x -= config.cursorLightFar.xOffset;
      cursorLightFar2.position.lerp(
        targetPositionFar2,
        config.cursorLightFar.smoothing
      );
    }
  } catch (error) {
    console.warn("Error updating cursor light position:", error);
  }
}

function createCursorLights() {
  if (!camera) return;

  try {
    // First far cursor light
    cursorLightFar = new THREE.PointLight(
      config.cursorLightFar.color,
      config.cursorLightFar.intensity,
      config.cursorLightFar.distance,
      config.cursorLightFar.decay
    );

    // Get camera's forward direction
    const cameraForward = new THREE.Vector3(0, 0, -1);
    cameraForward.transformDirection(camera.matrixWorld);

    // Position behind the camera with X offset
    const initialPosition = camera.position
      .clone()
      .add(cameraForward.clone().multiplyScalar(-config.cursorLightFar.depth));
    initialPosition.x += config.cursorLightFar.xOffset;
    cursorLightFar.position.copy(initialPosition);

    scene.add(cursorLightFar);

    // Second far cursor light
    cursorLightFar2 = new THREE.PointLight(
      config.cursorLightFar.color,
      config.cursorLightFar.intensity,
      config.cursorLightFar.distance,
      config.cursorLightFar.decay
    );

    const initialPosition2 = camera.position
      .clone()
      .add(cameraForward.clone().multiplyScalar(-config.cursorLightFar.depth));
    initialPosition2.x -= config.cursorLightFar.xOffset;
    cursorLightFar2.position.copy(initialPosition2);

    scene.add(cursorLightFar2);

    // Create helpers (commented out)
    // cursorLightFarHelper = new THREE.PointLightHelper(cursorLightFar, 0.5);
    // cursorLightFarHelper2 = new THREE.PointLightHelper(cursorLightFar2, 0.5);
  } catch (error) {
    console.error("Error creating cursor lights:", error);
  }
}

function initStatueGroup() {
  if (!isSceneReady) return;

  try {
    statueGroup = new THREE.Group();
    const objectsToGroup = [];

    scene.traverse((child) => {
      if (
        child &&
        child.name &&
        (child.name.includes("statue_") || child.name.includes("_part"))
      ) {
        objectsToGroup.push(child);
      }
    });

    objectsToGroup.forEach((child) => {
      try {
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        child.getWorldPosition(worldPosition);
        child.getWorldQuaternion(worldQuaternion);
        child.getWorldScale(worldScale);

        if (child.parent) child.parent.remove(child);
        else scene.remove(child);

        statueGroup.add(child);

        child.position.copy(worldPosition);
        child.quaternion.copy(worldQuaternion);
        child.scale.copy(worldScale);
      } catch (error) {
        console.warn("Error processing statue group child:", error);
      }
    });

    scene.add(statueGroup);

    statueGroup.userData.originalPosition = statueGroup.position.clone();
    statueGroup.userData.originalRotation = new THREE.Vector3(
      statueGroup.rotation.x,
      statueGroup.rotation.y,
      statueGroup.rotation.z
    );

    mouse.set(0, 0);
    lastMouse.set(0, 0);
    rotationOffset.set(0, 0);

    window.addEventListener("mousemove", onMouseMove);
  } catch (error) {
    console.error("Error initializing statue group:", error);
  }
}

function init() {
  if (!camera) return;

  try {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);

    bokehPass = new BokehPass(scene, camera, {
      focus: config.dof.focus,
      aperture: config.dof.aperture,
      maxblur: config.dof.maxblur,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    bokehPass.enabled = config.dof.enabled;

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      config.bloom.strength,
      config.bloom.radius,
      config.bloom.threshold
    );

    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);

    const brightnessCompensationPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, brightness: { value: 1.5 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(color.rgb * brightness, color.a);
        }
      `,
    });

    composer.addPass(renderPass);
    composer.addPass(bokehPass);
    composer.addPass(bloomPass);
    composer.addPass(brightnessCompensationPass);
    composer.addPass(gammaCorrectionPass);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = config.orbitControls.enableDamping;
    controls.dampingFactor = config.orbitControls.dampingFactor;
    controls.enabled = config.orbitControls.enabled;

    window.addEventListener("resize", onWindowResize);

    if (camera) camera.userData.defaultPosition = camera.position.clone();

    createCursorLights();
    // initGUI();
    dustParticles = new useDustParticles(scene, config.dustParticles);
  } catch (error) {
    console.error("Error in init:", error);
  }
}

function onWindowResize() {
  if (!camera || !renderer || !composer) return;

  try {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    if (
      bokehPass &&
      bokehPass.renderTargetDepth &&
      typeof bokehPass.renderTargetDepth.setSize === "function"
    ) {
      bokehPass.renderTargetDepth.setSize(
        window.innerWidth,
        window.innerHeight
      );
    }

    if (dustParticles) {
      const aspectRatio = window.innerWidth / window.innerHeight;
      dustParticles.updateSettings({
        area: { width: 15 * aspectRatio, height: 15, depth: 15 * aspectRatio },
      });
    }
  } catch (error) {
    console.warn("Error in window resize:", error);
  }
}

function animate() {
  if (!isSceneReady) {
    requestAnimationFrame(animate);
    return;
  }

  try {
    const delta = clock.getDelta();
    requestAnimationFrame(animate);

    if (!isMouseMoving) {
      rotationOffset.x += (0 - rotationOffset.x) * returnFactor.value;
      rotationOffset.y += (0 - rotationOffset.y) * returnFactor.value;
    }

    if (statueGroup && statueGroup.userData.originalRotation) {
      statueGroup.rotation.x =
        statueGroup.userData.originalRotation.x + rotationOffset.x;
      statueGroup.rotation.y =
        statueGroup.userData.originalRotation.y + rotationOffset.y;
    }

    if (controls && controls.enabled) controls.update();
    if (dustParticles) dustParticles.animate(delta);

    // Update light helpers if they exist
    if (cursorLightFarHelper && cursorLightFar) {
      cursorLightFarHelper.update();
    }
    if (cursorLightFarHelper2 && cursorLightFar2) {
      cursorLightFarHelper2.update();
    }

    if (composer) {
      composer.render();
    }
  } catch (error) {
    console.warn("Error in animate:", error);
    requestAnimationFrame(animate);
  }
}

function initGUI() {
  try {
    const { $dat } = useNuxtApp();
    const gui = new $dat.GUI({ width: 200 });

    const farLightColorControl = {
      color: config.cursorLightFar.color,
    };

    gui
      .addColor(farLightColorControl, "color")
      .name("Far Light Color")
      .onChange((value) => {
        if (cursorLightFar) {
          cursorLightFar.color.setHex(value);
          config.cursorLightFar.color = value;
        }
        if (cursorLightFar2) {
          cursorLightFar2.color.setHex(value);
        }
      });
  } catch (error) {
    console.warn("Error initializing GUI:", error);
  }
}

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("resize", onWindowResize);

  if (renderer) {
    renderer.dispose();
  }
  if (composer) {
    composer.dispose();
  }
});
</script>

<style lang="scss" scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  #canvas {
    @include size(100%);
  }
  :deep(.split) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate3d(-50%, -50%, 0);
    color: var(--color-white);
    font-size: 26px;
    opacity: var(--split-opacity, 0);
    text-align: center;
    line-height: 1.5;
    .lines-mask {
      overflow: hidden;
    }
  }
}
</style>
