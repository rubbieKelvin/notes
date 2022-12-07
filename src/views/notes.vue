<template>
  <div>
    <!-- top -->
    <div class="flex items-center gap-3 p-2">
      <h1>Notes</h1>
      <button
        v-if="isAuthenticated"
        class="bg-gray-200 p-2"
        @click="auth.logout()"
      >
        Logout
      </button>
      <button v-else class="bg-gray-200 p-2" @click="modal = 'login'">
        Login
      </button>
      <span class="flex-grow"></span>
      <p v-if="isAuthenticated">
        signed in as <b>{{ user?.username }}</b>
      </p>
    </div>

    <!-- popups -->
    <div class="p-2 border-b border-gray-200 flex" v-if="modal !== null">
      <!-- login -->
      <div v-if="modal == 'login'" class="flex-grow">
        <input
          class="outline-0"
          type="text"
          placeholder="username"
          v-model="fields.login.username"
        />
        <input
          class="outline-0"
          type="password"
          placeholder="password"
          v-model="fields.login.password"
        />
        <button
          class="bg-gray-200 p-1 mr-2"
          @click="
            auth
              .login(fields.login.username, fields.login.password)
              .then(() => {
                modal = null;
                fields.login.username = '';
                fields.login.password = '';
              })
          "
        >
          Submit
        </button>
      </div>

      <!-- close button -->
      <button class="bg-red-200 p-1" @click="modal = null">Close</button>
    </div>

    <!-- body -->
    <div v-if="isAuthenticated" class="flex gap-3 p-3">
      <!-- notes list -->
      <div class="border-r border-gray-300 p-3">
        <button class="bg-gray-200 p-2 hover:bg-gray-300 active:bg-gray-400">
          Add Note
        </button>
      </div>

      <!-- opened note -->
      <div></div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref } from "vue";
import useUqlClient from "@/composables/useUqlClient";

export default defineComponent({
  setup() {
    const { isAuthenticated, auth, user } = useUqlClient();

    const tr = computed(() => true);
    const modal: Ref<string | null> = ref(null);
    const fields = ref({
      login: {
        username: "",
        password: "",
      },
    });

    return { tr, isAuthenticated, user, auth, modal, fields };
  },
});
</script>
