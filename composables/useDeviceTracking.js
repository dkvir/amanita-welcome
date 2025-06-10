export const useDeviceTracking = class DeviceTracking {
  constructor() {}
  addEventListeners() {
    DeviceMotionEvent.requestPermission();
    window.addEventListener("devicemotion", this.handleMotion);
    window.addEventListener("deviceorientation", this.handleOrientation);
    console.log("tracking");
  }

  handleOrientation(event) {
    console.log(event.alpha, event.beta, event.gamma);
  }

  handleMotion(event) {
    console.log(
      event.accelerationIncludingGravity,
      event.acceleration,
      event.rotationRate
    );
  }
};
