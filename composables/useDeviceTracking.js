import * as THREE from "three";

export const useDeviceTracking = class DeviceTracking {
  constructor(camera, lights, config, statueGroup, rotationOffset) {
    this.camera = camera;
    this.cursorLightFar = lights.cursorLightFar;
    this.cursorLightFar2 = lights.cursorLightFar2;
    this.config = config;
    this.statueGroup = statueGroup;
    this.rotationOffset = rotationOffset; // Pass the existing rotation offset from your Vue component

    // Reusable vector objects
    this.forward = new THREE.Vector3(0, 0, -1);
    this.euler = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    // Enhanced sensitivity settings
    this.sensitivity = {
      // Light position sensitivity
      lightDepthMultiplier: 2.5, // Multiply the original depth
      lightRangeMultiplier: 2.0, // Additional range multiplier

      // Device rotation sensitivity (using your existing rotationOffset system)
      rotationMultiplier: 3.0, // Increased sensitivity for device rotation
      maxDeviceRotation: 0.8, // Maximum rotation from device

      // Device tilt ranges
      maxTiltX: 25,
      maxTiltY: 30,
    };

    this.handleOrientation = this.handleOrientation.bind(this);
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
    console.log("Safe device tracking enabled");
  }

  handleOrientation(event) {
    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null || gamma === null) return;

    // Convert to radians
    const alphaRad = THREE.MathUtils.degToRad(alpha);
    const betaRad = THREE.MathUtils.degToRad(beta);
    const gammaRad = THREE.MathUtils.degToRad(gamma);

    // Orientation to quaternion
    this.euler.set(betaRad, gammaRad, alphaRad, "YXZ");
    this.quaternion.setFromEuler(this.euler);

    // Enhanced light positioning
    const direction = this.forward.clone().applyQuaternion(this.quaternion);
    direction.z = 0;
    direction.normalize();

    // Use enhanced multipliers for more dramatic light movement
    const enhancedDepth =
      this.config.cursorLightFar.depth * this.sensitivity.lightDepthMultiplier;
    const { xOffset, smoothing } = this.config.cursorLightFar;

    const basePosition = this.camera.position.clone();
    const target = basePosition.add(
      direction.multiplyScalar(
        enhancedDepth * this.sensitivity.lightRangeMultiplier
      )
    );
    target.z = this.cursorLightFar.position.z;

    // Enhanced light positioning with increased offset
    const enhancedXOffset = xOffset * 2.5;

    this.cursorLightFar.position.lerp(
      target.clone().add(new THREE.Vector3(enhancedXOffset, 0, 0)),
      smoothing * 2
    );
    this.cursorLightFar2.position.lerp(
      target.clone().add(new THREE.Vector3(-enhancedXOffset, 0, 0)),
      smoothing * 2
    );

    // Enhanced statue rotation using your existing rotationOffset system
    if (this.rotationOffset && this.statueGroup) {
      const { maxTiltX, maxTiltY, rotationMultiplier, maxDeviceRotation } =
        this.sensitivity;

      // More sensitive normalization
      const normX = THREE.MathUtils.clamp(gamma / maxTiltX, -1, 1);
      const normY = THREE.MathUtils.clamp(beta / maxTiltY, -1, 1);

      // Apply to your existing rotationOffset system (like mouse movement)
      const deviceRotationX = THREE.MathUtils.clamp(
        normY * rotationMultiplier,
        -maxDeviceRotation,
        maxDeviceRotation
      );
      const deviceRotationY = THREE.MathUtils.clamp(
        normX * rotationMultiplier,
        -maxDeviceRotation,
        maxDeviceRotation
      );

      // Smoothly blend device rotation with existing rotation offset
      this.rotationOffset.x = THREE.MathUtils.lerp(
        this.rotationOffset.x,
        deviceRotationX,
        0.1
      );
      this.rotationOffset.y = THREE.MathUtils.lerp(
        this.rotationOffset.y,
        deviceRotationY,
        0.1
      );

      // The statue rotation will be handled by your existing animate() function
      // which already uses rotationOffset.x and rotationOffset.y
    }
  }

  handleMotion(event) {
    // Optional: Add subtle vibration effects
    const { acceleration } = event;

    if (acceleration && this.rotationOffset) {
      const motionIntensity = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
          Math.pow(acceleration.y || 0, 2) +
          Math.pow(acceleration.z || 0, 2)
      );

      // Add subtle shake effect for strong motion
      if (motionIntensity > 3) {
        const shakeAmount = Math.min(motionIntensity * 0.002, 0.05);
        this.rotationOffset.x += (Math.random() - 0.5) * shakeAmount;
        this.rotationOffset.y += (Math.random() - 0.5) * shakeAmount;
      }
    }
  }

  // Method to disable device tracking and return to mouse control
  disable() {
    window.removeEventListener("devicemotion", this.handleMotion);
    window.removeEventListener("deviceorientation", this.handleOrientation);
    console.log("Device tracking disabled");
  }
};
