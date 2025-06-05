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
onMounted(() => {
  document.documentElement.classList.add("is-loaded");
});
</script>

<style lang="scss" scoped></style>
