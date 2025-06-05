<template>
  <Html
    :class="[
      {
        'is-loaded': homeStore.websiteLoaded,
      },
    ]"
  >
    <Body>
      <div class="default-layout">
        <slot />
      </div>
    </Body>
  </Html>
</template>

<script setup>
import { useHomeStore } from "@/store/home";
const homeStore = useHomeStore();

useSeoMeta({
  title: "Amanita",
  ogTitle: "Amanita",
  description: "description",
  ogDescription: "description",
  // ogImage: "",
  // twitterCard: "summary_large_image",
});

onMounted(() => {
  homeStore.changeWebsiteLoaded(true);
});
</script>

<style lang="scss" scoped></style>
