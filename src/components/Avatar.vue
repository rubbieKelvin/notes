<template>
  <MenuList :list="menu" alignRight :yOffset="-65">
    <template v-slot:trigger="{ open }">
      <div class="avatar-container" @click="open">
        <span v-if="authstore.user" class="uppercase">{{
          authstore.user.username[0]
        }}</span>
      </div>
    </template>
  </MenuList>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useAuthStore } from "@/stores/auth";
import MenuList from "./Popup/MenuList.vue";
import { MenuItem } from "@/types";
import { useModalStore } from "@/stores/modals";

export default defineComponent({
  components: { MenuList },
  setup() {
    const authstore = useAuthStore();
    const modalstore = useModalStore();
    const menu = computed(
      (): Array<MenuItem> => [
        { id: Symbol(), type: "HEADER", title: authstore.user?.username },
        {
          id: Symbol(),
          title: "Change Theme",
          action: () => (modalstore.modalstates.themeSelectionOpen = true),
          icon: "PaintBrushIcon",
        },
        {
          id: Symbol(),
          title: "Logout",
          action: () => authstore.logout(),
          icon: "ArrowLeftOnRectangleIcon",
        },
      ]
    );
    return { authstore, menu };
  },
});
</script>

<style lang="scss" scoped>
.avatar-container {
  @apply select-none rounded-md min-w-[40px];
  @apply min-h-[40px] max-h-[40px] max-w-[40px];
  @apply border border-themed-stroke text-themed-text;
  @apply flex items-center justify-center bg-themed-bg-elevated;
}
</style>
