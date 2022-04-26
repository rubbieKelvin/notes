<template>
  <div class="layout">
    <SideBarVue/>
    <div class="flex-grow">
        <ToolBarVue />
      <slot />
    </div>
  </div>
</template>

<script>
import ToolBarVue from "../../components/ToolBar.vue";
import SideBarVue from "../../components/SideBar.vue";

export default {
  name: "SideBarLayout",
  components: { SideBarVue, ToolBarVue },
};
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: row;
}
</style>
