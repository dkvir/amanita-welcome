<template>
  <div class="default-layout">
    <slot />
  </div>
</template>

<script setup>
useSeoMeta({
  title: "Amanita",
  ogTitle: "Amanita",
  description: "description",
  ogDescription: "description",
  // ogImage: "",
  // twitterCard: "summary_large_image",
});
</script>

<style lang="scss" scoped></style>
