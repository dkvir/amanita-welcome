<template>
  <div class="allow-permisions flex-center flex-column">
    <div class="label">Permissions for mobile sensor access</div>
    <div class="buttons flex">
      <button @click="clickToDeny" class="button">deny</button>
      <button @click="clickToAllow" class="button">allow</button>
    </div>
  </div>
</template>

<script setup>
import gsap from "gsap";

const props = defineProps({
  permisionsVisibility: {
    type: Boolean,
    required: true,
  },
  cursorLightFar: {
    type: Object,
  },
  cursorLightFar2: {
    type: Object,
  },
  config: {
    type: Object,
  },
});

const emit = defineEmits(["hasPermision", "changePermisionsVisibility"]);

let infiniteLightsAnimation = null;

function clickToAllow() {
  emit("changePermisionsVisibility", false);

  if (
    DeviceMotionEvent &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    DeviceMotionEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          stopInfiniteLightsAnimation();
          emit("hasPermision", true);
        } else {
          createInfiniteLightsAnimation();
        }
      })
      .catch((error) => {
        console.error("Error requesting device motion permission:", error);
        emit("changePermisionsVisibility", true);
      });
  } else {
    emit("hasPermision", true);
    console.log("emit permisions for android");
  }
}

function clickToDeny() {
  emit("changePermisionsVisibility", false);
  createInfiniteLightsAnimation();
}

function createInfiniteLightsAnimation() {
  if (!props.cursorLightFar || !props.cursorLightFar2) return;

  if (infiniteLightsAnimation) {
    if (Array.isArray(infiniteLightsAnimation)) {
      infiniteLightsAnimation.forEach((timeline) => timeline.kill());
    } else {
      infiniteLightsAnimation.kill();
    }
  }

  const initialLight1 = props.cursorLightFar.position.clone();
  const initialLight2 = props.cursorLightFar2.position.clone();

  const animationConfig = {
    rangeX: 1.5,
    rangeY: 1.2,
    duration: 8,
    lightOffset: props.config.cursorLightFar.xOffset,
  };

  const positions = [
    { x: 0, y: 0 },
    { x: animationConfig.rangeX * 0.8, y: animationConfig.rangeY * 0.6 },
    { x: animationConfig.rangeX * 0.3, y: animationConfig.rangeY * 1.0 },
    { x: -animationConfig.rangeX * 0.6, y: animationConfig.rangeY * 0.4 },
    { x: -animationConfig.rangeX * 0.9, y: -animationConfig.rangeY * 0.7 },
    { x: animationConfig.rangeX * 0.5, y: -animationConfig.rangeY * 0.8 },
    { x: 0, y: 0 },
  ];

  const positionDuration = animationConfig.duration / (positions.length - 1);

  const light1Timeline = gsap.timeline({ repeat: -1 });
  positions.forEach((pos, index) => {
    light1Timeline.to(props.cursorLightFar.position, {
      duration: positionDuration,
      x: initialLight1.x + pos.x,
      y: initialLight1.y + pos.y,
      ease: "none",
    });
  });

  const light2Timeline = gsap.timeline({ repeat: -1 });
  positions.forEach((pos, index) => {
    const reverseIndex = positions.length - 1 - index;
    const reversePos = positions[reverseIndex];

    light2Timeline.to(props.cursorLightFar2.position, {
      duration: positionDuration,
      x: initialLight2.x + reversePos.x * 0.7,
      y: initialLight2.y + reversePos.y * 0.8,
      ease: "none",
    });
  });
  const intensityTimeline1 = gsap.timeline({ repeat: -1 });
  intensityTimeline1.to(props.cursorLightFar, {
    duration: animationConfig.duration / 2,
    intensity: props.config.cursorLightFar.intensity * 1.2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });

  const intensityTimeline2 = gsap.timeline({ repeat: -1 });
  intensityTimeline2.to(props.cursorLightFar2, {
    duration: animationConfig.duration / 3,
    intensity: props.config.cursorLightFar.intensity * 1.1,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  infiniteLightsAnimation = [
    light1Timeline,
    light2Timeline,
    intensityTimeline1,
    intensityTimeline2,
  ];
}

function stopInfiniteLightsAnimation() {
  if (infiniteLightsAnimation) {
    if (Array.isArray(infiniteLightsAnimation)) {
      infiniteLightsAnimation.forEach((timeline) => timeline.kill());
    } else {
      infiniteLightsAnimation.kill();
    }
    infiniteLightsAnimation = null;

    if (props.cursorLightFar) {
      props.cursorLightFar.intensity = props.config.cursorLightFar.intensity;
    }
    if (props.cursorLightFar2) {
      props.cursorLightFar2.intensity = props.config.cursorLightFar.intensity;
    }

    gsap.killTweensOf([
      props.cursorLightFar,
      props.cursorLightFar2,
      props.cursorLightFar.position,
      props.cursorLightFar2.position,
    ]);
  }
}
</script>

<style lang="scss" scoped>
.allow-permisions {
  position: fixed;
  bottom: var(--page-offset-padding);
  left: 50%;
  z-index: 1;
  padding: 20px 10px;
  transform: translate(-50%, 0);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  border: 1px solid var(--color-gray);
  width: 80%;
  font-size: 14px;
  opacity: var(--permisions-opacity, 0);
  transition: opacity 0.4s ease-in-out;
  transition-delay: 0.5s;
  pointer-events: none;
  &.is-visible {
    --permisions-opacity: 1;
    pointer-events: all;
  }
  .label {
    font-size: 15px;
    font-family: var(--font-pingroundgelvariable-regular);
    text-align: center;
  }
  .buttons {
    margin-top: 5px;
    gap: 10px;
  }
  .button {
    position: relative;
    padding: 5px 10px;
    border-radius: 4px;
    margin-top: 10px;
    color: var(--color-white);
    text-transform: capitalize;
    font-family: var(--font-pingl-bold);
    overflow: hidden;
    opacity: 0.8;
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      @include size(100%);
      background-color: var(--button-color);
      z-index: -1;
      opacity: 0.5;
    }
    &:first-child {
      --button-color: #f44336;
    }
    &:last-child {
      --button-color: #4caf50;
    }
  }
}
</style>
