<template>
  <div class="home-page">
    <canvas id="canvas"></canvas>
    <div class="container flex-column justify-between align-center">
      <nuxt-icon name="logo" class="logo" filled></nuxt-icon>
      <div class="split flex-column align-start" ref="stalker">
        <div class="soon uppercase">comming soon</div>
        <div class="lines">
          <div class="line-mask uppercase">NOT A GYM.</div>
          <div class="line-mask uppercase">A JOuRNEY.</div>
        </div>
      </div>
      <div class="countdown flex-center flex-column">
        <div class="title">Countdown</div>
        <ul class="boxes flex">
          <li v-for="(item, index) in countdown" class="box flex-center">
            <div class="label">{{ item.label }}</div>
            <div class="value">{{ item.value }}</div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as THREE from "three";
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
let scene, renderer, camera, statuemesh, envMap, material;
let composer, bloomPass, bokehPass;
let dustParticles;
let clock = new THREE.Clock();
let cursorLightFar, cursorLightFar2;

const countdown = useCountdown();

// State tracking
let isSceneReady = false;
let isModelLoaded = false;

// Mouse rotation variables
let mouse = new THREE.Vector2();
let lastMouse = new THREE.Vector2();
let rotationOffset = new THREE.Vector2();
let mouseMoveFactor = { value: 0.05 };
let returnFactor = { value: 0.01 };
let isMouseMoving = false;
let mouseTimeout;
let statueGroup;

let stalker = ref(null);
let textMouse = {
  mouseX: 0,
  mouseY: 0,
  currentX: 0,
  currentY: 0,
  ease: 0.1,
  easeMove: -0.006,
};

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
};

// Create scene
scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const loadingManager = new THREE.LoadingManager();

onMounted(() => {
  setTimeout(() => {
    gsap.registerPlugin(SplitText);

    let split = SplitText.create(".container .lines", {
      type: "words",
    });

    gsap.set(split.words, {
      yPercent: 125,
      rotate: 10,
    });

    setTimeout(() => {
      gsap.set(".container .lines", {
        opacity: 1,
      });

      gsap.to(".container .soon", {
        opacity: 1,
        duration: 1,
        ease: "power2.inOut",
      });

      gsap.to(split.words, {
        yPercent: 0,
        rotate: 0,
        ease: "power2.out",
        duration: 0.9,
        stagger: 0.05,
        onStart: () => {
          // window.requestAnimationFrame(tick);
          gsap.to(".countdown", {
            transform: "translateY(0)",
            duration: 0.5,
            delay: 0.5,
            ease: "power2.inOut",
          });
        },
      });
    }, 500);
  }, 500);
  loadingManager.onLoad = () => {
    isSceneReady = true;
    init();
    initStatueGroup();
    animate();
  };

  // Load model
  const loader = new GLTFLoader(loadingManager);
  loader.load(
    "mesh/man3.glb",
    (gltf) => {
      // Safely set up camera
      if (gltf.cameras && gltf.cameras[0]) {
        camera = gltf.cameras[0];
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        camera.position.set(-0.05, 0.5, 2.1);
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
              // statuemesh.material = material;
            }
          }
          if (child.name.includes("line_") || child.name.includes("inside_")) {
            child.visible = false;
          }
        } catch (error) {
          console.warn("Error processing child:", child.name, error);
        }
      });

      scene.add(gltf.scene);
      isModelLoaded = true;
    },
    undefined,
    (error) => {
      console.error("Model loading error:", error);
    }
  );

  // Initialize basic renderer early
  initRenderer();
});

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

  textMouse.mouseX = event.clientX - window.innerWidth / 2;
  textMouse.mouseY = event.clientY - window.innerHeight / 2;

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

function tick() {
  if (stalker.value) {
    textMouse.currentX +=
      (textMouse.mouseX - textMouse.currentX) * textMouse.ease;
    textMouse.currentY +=
      (textMouse.mouseY - textMouse.currentY) * textMouse.ease;
    gsap.set(stalker.value, {
      x: textMouse.currentX * textMouse.easeMove,
      y: textMouse.currentY * textMouse.easeMove,
    });
    window.requestAnimationFrame(tick);
  }
}

function updateCursorLightPosition(event) {
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
}

function createCursorLights() {
  cursorLightFar = new THREE.PointLight(
    config.cursorLightFar.color,
    config.cursorLightFar.intensity,
    config.cursorLightFar.distance,
    config.cursorLightFar.decay
  );

  // Get camera's forward direction
  const cameraForward = new THREE.Vector3(0, 0, 1);
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
}

function initStatueGroup() {
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
}

function init() {
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

  window.addEventListener("resize", onWindowResize);

  if (camera) camera.userData.defaultPosition = camera.position.clone();

  createCursorLights();
  dustParticles = new useDustParticles(scene, config.dustParticles);
}

function onWindowResize() {
  if (!camera || !renderer || !composer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  if (
    bokehPass &&
    bokehPass.renderTargetDepth &&
    typeof bokehPass.renderTargetDepth.setSize === "function"
  ) {
    bokehPass.renderTargetDepth.setSize(window.innerWidth, window.innerHeight);
  }

  if (dustParticles) {
    const aspectRatio = window.innerWidth / window.innerHeight;
    dustParticles.updateSettings({
      area: { width: 15 * aspectRatio, height: 15, depth: 15 * aspectRatio },
    });
  }
}

function animate() {
  if (!isSceneReady) {
    requestAnimationFrame(animate);
    return;
  }

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

  if (dustParticles) dustParticles.animate(delta);

  if (composer) {
    composer.render();
  }
}
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
  .container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: var(--page-offset-padding);
    padding-bottom: calc(var(--page-offset-padding) / 1.3);
    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 10%;
      background: linear-gradient(
        to bottom,
        transparent 50%,
        var(--color-black) 100%
      );
    }

    @include mq(max-width 768px) {
      font-size: css-clamp-vw(18px, 32px, 768);
    }
    :deep(.logo) {
      height: 40px;
      svg {
        height: 100%;
        width: auto;
      }
    }
    .split {
      .soon {
        font-size: 18px;
        font-family: var(--font-parmigiano-thin);
        opacity: 0;
      }
      .lines {
        opacity: var(--split-opacity, 0);
        font-size: css-clamp(44px, 104px);
        color: var(--color-white);
        text-align: center;
      }
      .line-mask {
        white-space: nowrap;
        overflow: hidden;
        line-height: 1;
        &:first-child {
          font-family: var(--font-parmigiano-thin);
        }
        &:last-child {
          font-family: var(--font-parmigiano-regular);
        }
      }
    }
    .countdown {
      font-family: var(--font-pingroundgelvariable-regular);
      padding-bottom: 25px;
      transform: translateY(150%);

      .title {
        color: var(--color-gray);
        font-size: 14px;
      }
      .boxes {
        margin-top: 10px;
        border: 2px solid var(--color-gray);
        border-radius: 40px;
        padding: 10px;
        .box {
          position: relative;
          @include size(50px);
          @include list-distance(left, 10px);
          border: 2px solid var(--color-gray);
          border-radius: 50%;

          .value {
            font-size: 18px;
          }
          .label {
            position: absolute;
            top: 150%;
            left: 50%;
            transform: translate(-50%, 0);
            font-size: 12px;
            text-transform: capitalize;
            color: var(--color-gray);
          }
        }
      }
    }
  }
}
</style>
