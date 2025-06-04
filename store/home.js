export const useHomeStore = defineStore("homeStore", {
  state: () => ({
    counter: 0,
  }),
  actions: {
    changeCounter(value) {
      this.counter += value;
    },
  },
});
