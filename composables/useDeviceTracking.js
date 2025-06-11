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
      // Device rotation sensitivity (similar to mouseMoveFactor in desktop)
      rotationSensitivity: 0.8, // Similar to desktop mouseMoveFactor of 0.05 but scaled for device
      maxRotationSpeed: 0.3, // Limit how fast rotation can change

      // Smoothing factor for orientation changes
      orientationSmoothing: 0.15,

      // Dead zone to prevent jitter
      deadZone: 0.5, // degrees

      // Light positioning - NEW: Desktop-like behavior
      lightPositioning: {
        // Convert device orientation to virtual mouse coordinates
        mouseRangeX: 2.0, // Virtual mouse range (-1 to 1) * this multiplier
        mouseRangeY: 1.5, // Virtual mouse range (-1 to 1) * this multiplier
        smoothing: 0.12, // How smoothly lights follow orientation changes
        // Sensitivity for converting orientation to mouse-like coordinates
        orientationToMouseX: 0.015, // Beta to mouse X conversion
        orientationToMouseY: 0.02, // Gamma to mouse Y conversion
      },
    };

    // Smoothed orientation values
    this.smoothedOrientation = {
      beta: 0,
      gamma: 0,
    };

    // Virtual mouse position for desktop-like light behavior
    this.virtualMouse = new THREE.Vector2(0, 0);
    this.targetVirtualMouse = new THREE.Vector2(0, 0);

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
    console.log(
      "Enhanced device tracking enabled - desktop-like light behavior"
    );
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

    // NEW: Convert device orientation to virtual mouse coordinates (desktop-like)
    this.updateVirtualMousePosition(beta, gamma);

    // Update lights using desktop-like positioning
    this.updateLightPositionsDesktopStyle();

    // Store current values as previous for next frame
    this.previousOrientation.alpha = alpha;
    this.previousOrientation.beta = this.smoothedOrientation.beta;
    this.previousOrientation.gamma = this.smoothedOrientation.gamma;
  }

  // NEW: Convert device orientation to virtual mouse coordinates
  updateVirtualMousePosition(beta, gamma) {
    const { lightPositioning } = this.sensitivity;

    // Convert orientation angles to mouse-like coordinates
    // Beta (device tilt forward/back) -> mouse Y
    // Gamma (device tilt left/right) -> mouse X

    // Normalize orientation to mouse range (-1 to 1)
    const mouseX = THREE.MathUtils.clamp(
      gamma * lightPositioning.orientationToMouseX,
      -lightPositioning.mouseRangeX,
      lightPositioning.mouseRangeX
    );

    const mouseY = THREE.MathUtils.clamp(
      -beta * lightPositioning.orientationToMouseY, // Negative for natural movement
      -lightPositioning.mouseRangeY,
      lightPositioning.mouseRangeY
    );

    // Set target virtual mouse position
    this.targetVirtualMouse.set(mouseX, mouseY);

    // Smooth the virtual mouse movement
    this.virtualMouse.lerp(this.targetVirtualMouse, lightPositioning.smoothing);
  }

  // NEW: Desktop-style light positioning using virtual mouse
  updateLightPositionsDesktopStyle() {
    // Convert virtual mouse coordinates to 3D position (same as desktop updateCursorLightPosition)
    const mouse3D = new THREE.Vector3(
      this.virtualMouse.x,
      this.virtualMouse.y,
      0.5
    );

    // Unproject to world coordinates (same as desktop)
    mouse3D.unproject(this.camera);
    const direction = mouse3D.sub(this.camera.position).normalize();

    const { cursorLightFar: lightConfig } = this.config;

    // Update first light (same logic as desktop)
    if (this.cursorLightFar && lightConfig.enabled) {
      const targetPositionFar = this.camera.position
        .clone()
        .add(direction.clone().multiplyScalar(lightConfig.depth));
      targetPositionFar.x += lightConfig.xOffset;

      this.cursorLightFar.position.lerp(
        targetPositionFar,
        lightConfig.smoothing
      );
    }

    // Update second light (same logic as desktop)
    if (this.cursorLightFar2 && lightConfig.enabled) {
      const targetPositionFar2 = this.camera.position
        .clone()
        .add(direction.clone().multiplyScalar(lightConfig.depth));
      targetPositionFar2.x -= lightConfig.xOffset;

      this.cursorLightFar2.position.lerp(
        targetPositionFar2,
        lightConfig.smoothing
      );
    }
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
    // Also reset virtual mouse
    this.virtualMouse.set(0, 0);
    this.targetVirtualMouse.set(0, 0);
  }

  // Method to adjust light positioning sensitivity
  adjustLightSensitivity(orientationToMouseX, orientationToMouseY, smoothing) {
    if (orientationToMouseX !== undefined) {
      this.sensitivity.lightPositioning.orientationToMouseX =
        orientationToMouseX;
    }
    if (orientationToMouseY !== undefined) {
      this.sensitivity.lightPositioning.orientationToMouseY =
        orientationToMouseY;
    }
    if (smoothing !== undefined) {
      this.sensitivity.lightPositioning.smoothing = smoothing;
    }
  }

  // Method to disable device tracking and return to mouse control
  disable() {
    window.removeEventListener("devicemotion", this.handleMotion);
    window.removeEventListener("deviceorientation", this.handleOrientation);
    console.log("Device tracking disabled");
  }
};
