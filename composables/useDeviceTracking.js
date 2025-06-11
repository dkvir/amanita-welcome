import * as THREE from "three";

export const useDeviceTracking = class DeviceTracking {
  constructor(camera, lights, config, statueGroup) {
    this.camera = camera;
    this.cursorLightFar = lights.cursorLightFar;
    this.cursorLightFar2 = lights.cursorLightFar2;
    this.config = config;
    this.statueGroup = statueGroup; // Add statueGroup reference

    // Reusable vector objects
    this.forward = new THREE.Vector3(0, 0, -1);
    this.euler = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    // Enhanced sensitivity settings
    this.sensitivity = {
      // Light position sensitivity (increased from default depth)
      lightDepth: 12, // Increased from 6 for more dramatic movement
      lightRange: 3, // Additional range multiplier for light movement

      // Statue rotation sensitivity
      rotationMultiplier: 0.3, // Increased from 0.3 for more dramatic rotation
      rotationSpeed: 0.25, // Increased from 0.1 for faster response
      maxRotation: 0.8, // Increased maximum rotation angle

      // Device tilt ranges (decreased for more sensitivity)
      maxTiltX: 20, // Decreased from 30 for more sensitive X-axis
      maxTiltY: 25, // Decreased from 30 for more sensitive Y-axis
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
    console.log("Enhanced device tracking enabled with increased sensitivity");
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

    // Enhanced light positioning with increased movement
    const direction = this.forward.clone().applyQuaternion(this.quaternion);
    direction.z = 0;
    direction.normalize();

    // Apply enhanced depth and range for more dramatic light movement
    const enhancedDepth = this.sensitivity.lightDepth;
    const { xOffset, smoothing } = this.config.cursorLightFar;

    const basePosition = this.camera.position.clone();
    const target = basePosition.add(
      direction.multiplyScalar(enhancedDepth * this.sensitivity.lightRange)
    );
    target.z = this.cursorLightFar.position.z;

    // Enhanced light positioning with increased offset
    const enhancedXOffset = xOffset * 2; // Double the X offset for more spread

    this.cursorLightFar.position.lerp(
      target.clone().add(new THREE.Vector3(enhancedXOffset, 0, 0)),
      smoothing * 1.5 // Slightly faster smoothing
    );
    this.cursorLightFar2.position.lerp(
      target.clone().add(new THREE.Vector3(-enhancedXOffset, 0, 0)),
      smoothing * 1.5
    );

    // Enhanced statue group rotation with increased sensitivity
    if (this.statueGroup) {
      const {
        maxTiltX,
        maxTiltY,
        rotationMultiplier,
        rotationSpeed,
        maxRotation,
      } = this.sensitivity;

      // More sensitive normalization (smaller tilt ranges = higher sensitivity)
      const normX = THREE.MathUtils.clamp(gamma / maxTiltX, -1, 1);
      const normY = THREE.MathUtils.clamp(beta / maxTiltY, -1, 1);

      // Enhanced rotation targets with increased multiplier
      const targetRotationX = THREE.MathUtils.clamp(
        normY * rotationMultiplier,
        -maxRotation,
        maxRotation
      );
      const targetRotationY = THREE.MathUtils.clamp(
        normX * rotationMultiplier,
        -maxRotation,
        maxRotation
      );

      // Apply rotations with enhanced speed
      this.statueGroup.rotation.x +=
        (targetRotationX - this.statueGroup.rotation.x) * rotationSpeed;
      this.statueGroup.rotation.y +=
        (targetRotationY - this.statueGroup.rotation.y) * rotationSpeed;
    }
  }

  handleMotion(event) {
    // Enhanced motion handling - you can use this for additional effects
    const { acceleration, accelerationIncludingGravity, rotationRate } = event;

    if (acceleration && this.statueGroup) {
      // Optional: Add subtle vibration/shake effects based on motion
      const motionIntensity = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
          Math.pow(acceleration.y || 0, 2) +
          Math.pow(acceleration.z || 0, 2)
      );

      // Apply subtle shake effect if motion is detected
      if (motionIntensity > 2) {
        // Threshold for motion detection
        const shakeAmount = Math.min(motionIntensity * 0.001, 0.02);
        this.statueGroup.rotation.x += (Math.random() - 0.5) * shakeAmount;
        this.statueGroup.rotation.y += (Math.random() - 0.5) * shakeAmount;
      }
    }

    // Log for debugging (remove in production)
    console.log("Motion intensity:", event.acceleration);
  }

  // Method to adjust sensitivity at runtime
  updateSensitivity(newSettings) {
    this.sensitivity = { ...this.sensitivity, ...newSettings };
    console.log("Device tracking sensitivity updated:", this.sensitivity);
  }

  // Method to reset statue to original position
  resetStatuePosition() {
    if (this.statueGroup && this.statueGroup.userData.originalRotation) {
      const original = this.statueGroup.userData.originalRotation;
      this.statueGroup.rotation.x = original.x;
      this.statueGroup.rotation.y = original.y;
      this.statueGroup.rotation.z = original.z;
    }
  }
};
