<template>
  <DefaultSideBar> <router-view /> </DefaultSideBar>
</template>

<style scoped></style>

<script>
import DefaultSideBar from '../router/layouts/default.vue'

export default {
  components: { DefaultSideBar },
};
</script>
