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
const config = useRuntimeConfig();

useSeoMeta({
  title: "Amanita - Fitness Club",
  ogTitle: "Amanita",
  description: "Not a gym. Your evolution.",
  ogDescription: "Not a gym. Your evolution.",
  ogImage: config.public.siteUrl + "images/share.png",
  twitterCard: "summary_large_image",
});

onMounted(() => {
  homeStore.changeWebsiteLoaded(true);
});
</script>

<style lang="scss" scoped></style>
