import * as THREE from "three";

export const useDeviceTracking = class DeviceTracking {
  constructor(camera, lights, config) {
    this.camera = camera;
    this.cursorLightFar = lights.cursorLightFar;
    this.cursorLightFar2 = lights.cursorLightFar2;
    this.config = config;

    // Reusable vector objects
    this.forward = new THREE.Vector3(0, 0, -1);
    this.euler = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    this.handleOrientation = this.handleOrientation.bind(this); // important!
    this.handleMotion = this.handleMotion.bind(this);
  }

  async addEventListeners() {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      const state = await DeviceMotionEvent.requestPermission();
      if (state !== "granted") return;
    }

    window.addEventListener("devicemotion", this.handleMotion);
    window.addEventListener("deviceorientation", this.handleOrientation);
    console.log("Device tracking enabled");
  }

  handleOrientation(event) {
    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null || gamma === null) return;

    // Convert to radians
    const alphaRad = THREE.MathUtils.degToRad(alpha);
    const betaRad = THREE.MathUtils.degToRad(beta);
    const gammaRad = THREE.MathUtils.degToRad(gamma);

    // Compute orientation quaternion
    this.euler.set(betaRad, gammaRad, alphaRad, "YXZ");
    this.quaternion.setFromEuler(this.euler);

    // Get forward vector in world space
    const direction = this.forward.clone().applyQuaternion(this.quaternion);

    const { depth, xOffset, smoothing } = this.config.cursorLightFar;

    const target = this.camera.position
      .clone()
      .add(direction.multiplyScalar(depth));

    this.cursorLightFar.position.lerp(
      target.clone().add(new THREE.Vector3(xOffset, 0, 0)),
      smoothing
    );
    this.cursorLightFar2.position.lerp(
      target.clone().add(new THREE.Vector3(-xOffset, 0, 0)),
      smoothing
    );
  }

  handleMotion(event) {
    // Optional: log or use motion data
    console.log(
      event.accelerationIncludingGravity,
      event.acceleration,
      event.rotationRate
    );
  }
};
