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

const route = useRoute();
const config = useRuntimeConfig();

const siteUrl = config.public.siteUrl;

useSeoMeta({
  title: "Amanita - Fitness Clubnita",
  ogTitle: "Amanita",
  description: "Not a gym. Your evolution.",
  ogDescription: "Not a gym. Your evolution.",
  ogImage: "/images/share.png",
  twitterCard: "summary_large_image",
});

// useHead({
//   titleTemplate: "Amanita - Fitness Club",
//   meta: [
//     { name: "og:title", content: "AMANITA" },
//     {
//       name: "og:description",
//       content: "Fitness Club",
//     },
//     {
//       name: "og:url",
//       content: () => siteUrl + route.fullPath,
//     },
//     {
//       name: "og:image",
//       content: siteUrl + "images/share.png",
//     },
//     { name: "og:image:alt", content: "Not a gym. A journey." }, // Optionally, add an alt tag for accessibility
//     { name: "twitter:card", content: "summary_large_image" },
//     { name: "twitter:title", content: "Amanita" },
//     {
//       name: "twitter:description",
//       content: "Not a gym. A journey.",
//     },
//     {
//       name: "twitter:image",
//       content: "/images/share.png",
//     },
//     {
//       name: "description",
//       content: "Not a gym. A journey.",
//     },
//   ],
// });

onMounted(() => {
  homeStore.changeWebsiteLoaded(true);
});
</script>

<style lang="scss" scoped></style>
