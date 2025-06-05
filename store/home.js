export const useHomeStore = defineStore("homeStore", {
  state: () => ({
    websiteLoaded: false,
  }),
  actions: {
    changeWebsiteLoaded(status) {
      this.websiteLoaded = status;
    },
  },
});
