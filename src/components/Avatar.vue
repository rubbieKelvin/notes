<template>
  <MenuList :list="menu" alignRight :yOffset="-65">
    <template v-slot:trigger="{ open }">
      <div
        class="flex items-center justify-center select-none rounded-md min-w-[40px] min-h-[40px] max-h-[40px] max-w-[40px] border border-themed-stroke text-themed-text"
        @click="open"
      >
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

export default defineComponent({
  components: { MenuList },
  setup() {
    const authstore = useAuthStore();
    const menu = computed(
      (): Array<MenuItem> => [
        { id: Symbol(), type: "HEADER", title: authstore.user?.username },
        { id: Symbol(), title: "Logout", action: () => authstore.logout() },
      ]
    );
    return { authstore, menu };
  },
});
</script>
