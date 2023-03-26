<template>
  <div class="h-full bg-themed-bg flex md:items-center justify-center">
    <div
      class="lg:p-4 md:p-2 border-themed-stroke md:border rounded-lg flex gap-4 md:w-[50%] max-w-[40em]"
    >
      <!-- <div
        class="p-4 bg-themed-accent-bg w-[35%] rounded-lg text-themed-accent-text gap-10 flex flex-col"
      >
        <p class="text-sm font-medium uppercase">opennotes</p>

        <h1 class="text-3xl min-h-[10em] flex-grow pt-10">
          Simple notes taking app that focuses on simplicity to reduce
          distractions.
        </h1>
        
      </div> -->

      <div class="flex-grow text-themed-text p-4 flex flex-col gap-4 item">
        <div class="flex items-center gap-2">
          <div class="flex flex-col flex-grow my-5">
            <h2 class="text-3xl">Sign In</h2>
            <p class="text-themed-text-subtle">
              Enter credentials to login to opennotes
            </p>
          </div>
          <div class="flex gap-2 justify-end">
            <a
              href="https://github.com/rubbieKelvin/notes"
              title="Open notes on GitHub"
              class="flex btn-links gap-2 p-2 rounded-md border border-themed-accent-text justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-brand-github w-6 h-6"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path
                  d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
                ></path>
              </svg>
            </a>
            <router-link
              :to="{ name: 'PublicHome' }"
              title="See public notes"
              class="flex btn-links gap-2 p-2 rounded-md border border-themed-accent-text justify-center"
            >
              <Icon name="GlobeEuropeAfricaIcon" class="w-6 h-6" />
            </router-link>
          </div>
        </div>

        <div class="flex flex-col md:gap-3 gap-9">
          <text-input
            label="Username"
            class=""
            placeholder="Username"
            v-model="form.username"
            :errorMessage="form.error_message.username"
            @update:model-value="form.error_message.username = ''"
          />

          <text-input
            :inputType="form.password_type"
            label="Password"
            class=""
            placeholder="Password"
            v-model="form.password"
            :button="{
              action: passwordShowAction,
              icon: form.password_field_icon,
            }"
            :errorMessage="form.error_message.password"
          />
        </div>

        <div>
          <p>
            Don't have an account?
            <router-link
              :to="{ name: 'SignUp' }"
              class="text-blue-400 hover:text-blue-600"
            >
              Sign Up.
            </router-link>
          </p>
        </div>
        <span class="flex-grow" />
        <button class="btn-primary px-4 py-3 rounded-lg" @click="signUp">
          Login
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import TextInput from "@/components/TextInput.vue";
import { defineComponent, ref } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "@/components/Icon/types";
import { validateUsername, validatePassword } from "@/utils/validators";
import { useAuthStore } from "@/stores/auth";

export default defineComponent({
  components: { TextInput, Icon },
  setup() {
    const authstore = useAuthStore()
    const form = ref({
      username: "",
      password: "",
      password_type: <"text" | "password" | undefined>"password",
      password_field_icon: <IconName>"EyeSlashIcon",
      processing: false,
      error_message: {
        username: "",
        password: "",
        global: ""
      }
    });

    const passwordShowAction = () => {
      if (form.value.password_type === "password") {
        form.value.password_type = "text";
        form.value.password_field_icon = "EyeIcon";
      } else {
        form.value.password_type = "password";
        form.value.password_field_icon = "EyeSlashIcon";
      }
    };

    const setUpUser = async () => {
      if (authstore.isAuthenticated) {
        console.log(`Logged in as ${authstore.user?.username}`);
        // await notestore.fetchNotes();
        // await tagstore.loadTags()
      }
    };

    const signUp = async () => {
      const validUser = validateUsername(form.value.username)
      const validPass = validatePassword(form.value.password)
      if(!validUser.valid){
        form.value.error_message.username = "This username has errors"
        return
      }
      if(!validPass.valid){
        form.value.error_message.password = validPass.reason ? validPass.reason : "This password has errors"
        return
      }
      try {
        const res = await authstore.signup(
          form.value.username,
          form.value.password
        );

        form.value.processing = false;

        if (res?.error) {
          form.value.error_message.global = res.error.message;
          return;
        }

        form.value.username = "";
        form.value.password = "";

        await setUpUser();
      } catch {
        form.value.processing = true;
      }
    };

    return { form, signUp, passwordShowAction,  };
  },
});
</script>

<style lang="scss" scoped>
:deep(.textinput-label) {
  @apply uppercase text-sm font-medium text-themed-text-subtle mb-1;
}

.btn-links {
  @apply border border-themed-stroke rounded-md p-2 h-max;

  &:hover {
    @apply bg-themed-bg-elevated;
  }
}
</style>
