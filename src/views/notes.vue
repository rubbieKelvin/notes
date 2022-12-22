<template>
  <div class="h-full flex flex-col">
    <!-- top -->
    <div class="flex items-center gap-3 p-2">
      <h1>Notes</h1>
      <button
        v-if="isAuthenticated"
        class="bg-gray-200 p-2"
        @click="functions.auth.logout()"
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
        <button class="bg-gray-200 p-1 mr-2" @click="doLogin">Submit</button>
      </div>

      <!-- close button -->
      <button class="bg-red-200 p-1" @click="modal = null">Close</button>
    </div>

    <!-- body -->
    <div class="flex gap-3 p-3 flex-grow">
      <template v-if="isAuthenticated">
        <!-- notes list -->
        <div class="border-r border-gray-300 p-3">
          <button class="bg-gray-200 p-2 hover:bg-gray-300 active:bg-gray-400">
            Add Note
          </button>
          <div class="min-w-[200px]">
            <p v-for="note in notes" :key="note.id">{{ note.title }}</p>
          </div>
        </div>

        <!-- opened note -->
        <div></div>
      </template>
    </div>

    <!-- stats -->
    <div v-if="errorText" class="bg-red-600 p-2 text-white">
      <p>⚠ {{ errorText }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, ref, watch } from "vue";
import useUqlClient from "@/composables/useUqlClient";

export default defineComponent({
  setup() {
    let errTimout: number | null = null;
    const { isAuthenticated, functions, user, notes } = useUqlClient();

    const modal: Ref<string | null> = ref(null);
    const errorText = ref("");
    const fields = ref({
      login: {
        username: "",
        password: "",
      },
    });

    const doLogin = () => {
      functions.auth
        .login(fields.value.login.username, fields.value.login.password)
        .then(() => {
          modal.value = null;
          fields.value.login.username = "";
          fields.value.login.password = "";
        })
        .catch(() => {
          errorText.value = "Error signing up";
        });
    };

    watch(errorText, () => {
      if (errorText.value) {
        if (errTimout) clearTimeout(errTimout);

        errTimout = setTimeout(() => {
          errorText.value = "";
          errTimout = null;
        }, 2000);
      }
    });

    onMounted(() => {
      functions.auth.getAuthenticatedUser();
    });

    return {
      doLogin,
      isAuthenticated,
      user,
      notes,
      functions,
      errorText,
      modal,
      fields,
    };
  },
});
</script>
