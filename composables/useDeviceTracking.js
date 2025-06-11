import * as THREE from "three";

export const useDeviceTracking = class DeviceTracking {
  constructor(camera, lights, config, statueGroup, rotationOffset) {
    this.camera = camera;
    this.cursorLightFar = lights.cursorLightFar;
    this.cursorLightFar2 = lights.cursorLightFar2;
    this.config = config;
    this.statueGroup = statueGroup;
    this.rotationOffset = rotationOffset;

    // Reusable vector objects
    this.forward = new THREE.Vector3(0, 0, -1);
    this.euler = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    // Track previous orientation values for delta calculation (like mouse delta)
    this.previousOrientation = {
      alpha: null,
      beta: null,
      gamma: null,
      initialized: false,
    };

    // Enhanced sensitivity settings - mimicking desktop mouse behavior
    this.sensitivity = {
      // Light position sensitivity
      lightDepthMultiplier: 2.8,
      lightRangeMultiplier: 2.5,

      // Device rotation sensitivity (similar to mouseMoveFactor in desktop)
      rotationSensitivity: 0.8, // Similar to desktop mouseMoveFactor of 0.05 but scaled for device
      maxRotationSpeed: 0.3, // Limit how fast rotation can change

      // Smoothing factor for orientation changes
      orientationSmoothing: 0.15,

      // Dead zone to prevent jitter
      deadZone: 0.5, // degrees
    };

    // Smoothed orientation values
    this.smoothedOrientation = {
      beta: 0,
      gamma: 0,
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
    console.log("Enhanced device tracking enabled - desktop-like behavior");
  }

  handleOrientation(event) {
    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null || gamma === null) return;

    // Initialize previous values on first run
    if (!this.previousOrientation.initialized) {
      this.previousOrientation.alpha = alpha;
      this.previousOrientation.beta = beta;
      this.previousOrientation.gamma = gamma;
      this.previousOrientation.initialized = true;
      this.smoothedOrientation.beta = beta;
      this.smoothedOrientation.gamma = gamma;
      return;
    }

    // Smooth the orientation values to reduce jitter
    this.smoothedOrientation.beta = THREE.MathUtils.lerp(
      this.smoothedOrientation.beta,
      beta,
      this.sensitivity.orientationSmoothing
    );
    this.smoothedOrientation.gamma = THREE.MathUtils.lerp(
      this.smoothedOrientation.gamma,
      gamma,
      this.sensitivity.orientationSmoothing
    );

    // Calculate deltas (similar to mouse delta calculation in desktop)
    const deltaBeta =
      this.smoothedOrientation.beta - this.previousOrientation.beta;
    const deltaGamma =
      this.smoothedOrientation.gamma - this.previousOrientation.gamma;

    // Apply dead zone to prevent micro-movements
    const filteredDeltaBeta =
      Math.abs(deltaBeta) > this.sensitivity.deadZone ? deltaBeta : 0;
    const filteredDeltaGamma =
      Math.abs(deltaGamma) > this.sensitivity.deadZone ? deltaGamma : 0;

    // Update statue rotation using delta-based approach (like desktop mouse)
    if (
      this.rotationOffset &&
      this.statueGroup &&
      (filteredDeltaBeta !== 0 || filteredDeltaGamma !== 0)
    ) {
      // Convert orientation deltas to rotation deltas (similar to desktop mouse delta logic)
      const rotationDeltaX =
        filteredDeltaBeta * this.sensitivity.rotationSensitivity * 0.01;
      const rotationDeltaY =
        -filteredDeltaGamma * this.sensitivity.rotationSensitivity * 0.01; // Negative for natural movement

      // Clamp rotation speed to prevent too fast movements
      const clampedDeltaX = THREE.MathUtils.clamp(
        rotationDeltaX,
        -this.sensitivity.maxRotationSpeed,
        this.sensitivity.maxRotationSpeed
      );
      const clampedDeltaY = THREE.MathUtils.clamp(
        rotationDeltaY,
        -this.sensitivity.maxRotationSpeed,
        this.sensitivity.maxRotationSpeed
      );

      // Apply deltas to rotation offset (exactly like desktop mouse logic)
      this.rotationOffset.x = THREE.MathUtils.clamp(
        this.rotationOffset.x + clampedDeltaX,
        -0.5, // Same limits as desktop
        0.5
      );
      this.rotationOffset.y = THREE.MathUtils.clamp(
        this.rotationOffset.y + clampedDeltaY,
        -0.5, // Same limits as desktop
        0.5
      );
    }

    // Update lights with enhanced positioning
    this.updateLightPositions(alpha, beta, gamma);

    // Store current values as previous for next frame
    this.previousOrientation.alpha = alpha;
    this.previousOrientation.beta = this.smoothedOrientation.beta;
    this.previousOrientation.gamma = this.smoothedOrientation.gamma;
  }

  updateLightPositions(alpha, beta, gamma) {
    // Convert to radians for light positioning
    const alphaRad = THREE.MathUtils.degToRad(alpha);
    const betaRad = THREE.MathUtils.degToRad(beta);
    const gammaRad = THREE.MathUtils.degToRad(gamma);

    // Create direction vector from orientation
    this.euler.set(betaRad, gammaRad, alphaRad, "YXZ");
    this.quaternion.setFromEuler(this.euler);

    const direction = this.forward.clone().applyQuaternion(this.quaternion);
    direction.z = 0; // Keep lights at consistent depth
    direction.normalize();

    // Enhanced light positioning
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

    const enhancedXOffset = xOffset * 2.0;

    // Update light positions
    this.cursorLightFar.position.lerp(
      target.clone().add(new THREE.Vector3(enhancedXOffset, 0, 0)),
      smoothing * 1.5
    );
    this.cursorLightFar2.position.lerp(
      target.clone().add(new THREE.Vector3(-enhancedXOffset, 0, 0)),
      smoothing * 1.5
    );
  }

  handleMotion(event) {
    // Optional: Add subtle vibration effects for strong motion
    const { acceleration } = event;

    if (acceleration && this.rotationOffset) {
      const motionIntensity = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
          Math.pow(acceleration.y || 0, 2) +
          Math.pow(acceleration.z || 0, 2)
      );

      // Add very subtle shake effect for strong motion (reduced impact)
      if (motionIntensity > 5) {
        // Increased threshold
        const shakeAmount = Math.min(motionIntensity * 0.001, 0.02); // Reduced shake
        this.rotationOffset.x += (Math.random() - 0.5) * shakeAmount;
        this.rotationOffset.y += (Math.random() - 0.5) * shakeAmount;
      }
    }
  }

  // Method to reset rotation to center (useful for calibration)
  resetRotation() {
    if (this.rotationOffset) {
      this.rotationOffset.x = 0;
      this.rotationOffset.y = 0;
    }
  }

  // Method to disable device tracking and return to mouse control
  disable() {
    window.removeEventListener("devicemotion", this.handleMotion);
    window.removeEventListener("deviceorientation", this.handleOrientation);
    console.log("Device tracking disabled");
  }
};
