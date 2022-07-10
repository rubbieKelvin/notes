<template>
  <div class="userwidget">
    <div class="main" @click="open = !open">
      <div class="initials">{{ (ctx.user.name || ctx.user.email)[0] }}</div>
      <div class="info">
        <h1>{{ ctx.user.name || ctx.user.email }}</h1>
        <p>Scratchpad</p>
      </div>
    </div>

    <!-- modal -->
    <template v-if="open">
      <!-- <div
        v-if="open"
        class="modal flex flex-col gap-4"
        :class="{ 'border-t': open }"
      >
        <div class="flex flex-col gap-2">
          <label class="text-sm text-gray-500">name</label>
          <div class="">
            <input type="text" placeholder="No name" v-model="edits.name" class="w-full outline-none"/>
            <p class="text-sm text-gray-300">processing...</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-gray-500">email</label>
          <p>{{ ctx.user.email }}</p>
        </div>
      </div> -->

      <div v-if="open" class="modal" :class="{ 'border-t': open }">
        <ProcessButton
          :action="logout"
          class="bg-red-500 flex justify-center items-center gap-2 hover:bg-red-600 text-white w-full rounded-md py-2"
        >
          Logout
        </ProcessButton>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { inject, Ref, ref } from "@vue/runtime-core";
import { ApplicationDataContext } from "@/constants/types";
import ProcessButton from "./ProcessButton.vue";
import Icon from "@/packages/heroicons";
import { user_logout } from "@/packages/api";
import { useRouter } from "vue-router";

export default {
  setup() {
    const ctx = inject("ctx") as Ref<ApplicationDataContext>;
    const open = ref(false);
    const edits = ref({ name: "" });
    const router = useRouter();

    const logout = async () => {
      await user_logout();
      window.location.reload()
      return true;
    };

    return { ctx, open, edits, logout };
  },
  components: { ProcessButton, Icon },
};
</script>

<style lang="scss" scoped>
.userwidget {
  @apply bg-white rounded-md border-wall border;

  > .main {
    @apply hover:bg-gray-50 p-3;
    @apply flex items-center justify-center gap-2 select-none cursor-default;

    .initials {
      @apply bg-primary-basic rounded-xl h-9 w-9 text-white flex items-center justify-center uppercase;
    }

    .info {
      flex-grow: 1;

      h1 {
        @apply font-medium;
      }
      p {
        @apply text-sm text-gray-800;
      }
    }
  }

  > .modal {
    @apply p-3 w-full border-wall;
  }
}
</style>
