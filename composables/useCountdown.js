// composables/useCountdown.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useCountdown(startDate, endDate) {
  const days = ref(0);
  const hours = ref(0);
  const minutes = ref(0);
  const seconds = ref(0);

  let interval;

  const updateCountdown = () => {
    const now = new Date();
    const start = new Date("2025-06-10T00:00:00");
    const end = new Date("2025-08-26T00:00:00");

    if (now < start) {
      // Countdown hasn't started yet
      days.value = hours.value = minutes.value = seconds.value = 0;
      return;
    }

    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      // Countdown ended
      days.value = hours.value = minutes.value = seconds.value = 0;
      clearInterval(interval);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);

    days.value = Math.floor(totalSeconds / (3600 * 24));
    hours.value = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    minutes.value = Math.floor((totalSeconds % 3600) / 60);
    seconds.value = totalSeconds % 60;
  };

  onMounted(() => {
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
  });

  onUnmounted(() => {
    clearInterval(interval);
  });

  return [
    { label: "days", value: days },
    { label: "hours", value: hours },
    { label: "minutes", value: minutes },
    { label: "seconds", value: seconds },
  ];
}
