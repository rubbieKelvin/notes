<template>
  <div class="h-full bg-themed-bg flex md:items-center justify-center">
    <div
      class="p-4 md:border-themed-stroke md:border rounded-lg flex gap-4 md:w-[50%] md:max-w-[40em] w-full"
    >
      <div
        class="flex-grow text-themed-text p-4 flex flex-col gap-8 md:gap-4 item"
      >
        <div class="flex items-center gap-2">
          <div class="flex flex-col flex-grow">
            <p class="text-themed-text-subtle text-xs">OPENNOTES</p>
            <h2 class="text-3xl">
              {{ pagetype == "signin" ? "Sign In" : "Sign Up" }}
            </h2>
          </div>
          <div class="flex gap-2 justify-end">
            <a
              :href="REPO_LINK"
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

        <div class="flex flex-col gap-3">
          <text-input
            label="Username"
            class=""
            icon="UserIcon"
            placeholder="Username"
            v-model="formUsername"
          />

          <text-input
            :inputType="formPasswordType"
            label="Password"
            class=""
            icon="KeyIcon"
            placeholder="Password"
            v-model="formPassword"
            :button="{
              action: passwordShowAction,
              icon: formPasswordFieldIcon,
            }"
          />
        </div>

        <div>
          <p v-if="pagetype == 'signin'">
            Don't have an account?
            <router-link
              :to="{ name: 'SignUp' }"
              class="text-blue-400 hover:text-blue-600"
            >
              Sign Up.
            </router-link>
          </p>
          <p v-else>
            Already have an account?
            <router-link
              :to="{ name: 'SignIn' }"
              class="text-blue-400 hover:text-blue-600"
            >
              Sign In.
            </router-link>
          </p>
        </div>

        <div
          class="bg-red-500 bg-opacity-5 border border-red-500 text-red-500 p-4 rounded-md flex gap-3 transition-opacity duration-200"
          :class="{ 'opacity-0': !alert }"
        >
          <Icon name="InformationCircleIcon" class="w-5 h-5" />
          <p>{{ alert }}</p>
        </div>

        <span class="flex-grow" />
        <button
          class="btn-primary p-4 rounded-lg flex gap-3 items-center justify-center hover:gap-2 transition-all delay-100"
          @click="authenticate"
        >
          <Loading v-if="button_action_loading" />
          <template v-else>
            <span> Continue </span>
            <Icon name="ArrowRightIcon" class="w-5 h-5" />
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import TextInput from "@/components/TextInput.vue";
import { defineComponent, Ref, ref, watch } from "vue";
import Icon from "@/components/Icon";
import { IconName } from "@/components/Icon/types";
import { useRoute, useRouter } from "vue-router";
import Loading from "@/components/Loading.vue";
import { useAuthStore } from "@/stores/auth";
import { validatePassword, validateUsername } from "@/utils/validators";
import { promiseTimeout } from "@vueuse/core";

export default defineComponent({
  props: {
    pagetype: { type: String as () => "signup" | "signin", default: "signin" },
  },
  components: { TextInput, Icon, Loading },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const authstore = useAuthStore();

    const REPO_LINK = import.meta.env.VITE_GH_REPO_LINK;
    const button_action_loading = ref(false);

    const alert: Ref<string | null> = ref(null);
    const formUsername = ref("");
    const formPassword = ref("");
    const formPasswordType: Ref<"password" | "text"> = ref("password");
    const formPasswordFieldIcon: Ref<IconName> = ref("EyeSlashIcon");

    const resetForm = () => {
      formUsername.value = "";
      formPassword.value = "";
      formPasswordType.value = "password";
      formPasswordFieldIcon.value = "EyeSlashIcon";
    };

    const passwordShowAction = () => {
      if (formPasswordType.value === "password") {
        formPasswordType.value = "text";
        formPasswordFieldIcon.value = "EyeIcon";
      } else {
        formPasswordType.value = "password";
        formPasswordFieldIcon.value = "EyeSlashIcon";
      }
    };

    const authenticate = async () => {
      button_action_loading.value = true;
      try {
        let res;
        const username = formUsername.value.trim().toLowerCase();
        const password = formPassword.value;

        if (props.pagetype === "signup") {
          const usernameValidation = validateUsername(username);
          if (!usernameValidation.valid) {
            alert.value = usernameValidation.reason ?? "Username error";
            button_action_loading.value = false;
            return;
          }

          const passwordValidation = validatePassword(password);
          if (!passwordValidation.valid) {
            alert.value =
              passwordValidation.reason ?? "Password not strong enough";
            button_action_loading.value = false;
            return;
          }
          res = await authstore.signup(username, password);
        } else {
          if (!username) {
            alert.value = "Enter value in username";
            button_action_loading.value = false;
            return;
          }

          if (!password) {
            alert.value = "Enter value in password";
            button_action_loading.value = false;
            return;
          }
          res = await authstore.login(username, password);
        }

        if (res.error) {
          if (res.error.errorCode === "IntegrityError") {
            alert.value = "A user with that username already exists";
          } else if (
            ["ValueError", "PermissionError", "DoesNotExist"].includes(
              res.error.errorCode as string
            )
          ) {
            alert.value = res.error.message;
          } else {
            alert.value = "Could complete operation";
          }
        } else if (res.data) {
          window.open("/", "_self");
        }

        button_action_loading.value = false;
      } catch {
        alert.value = "Opps!, an unknown error occured";
        button_action_loading.value = false;
      }
    };

    watch(
      () => route.fullPath,
      () => resetForm()
    );

    watch(alert, async (newValue, oldValue) => {
      if (newValue && !oldValue) {
        await promiseTimeout(4500);
        alert.value = null;
      }
    });

    return {
      formUsername,
      formPassword,
      formPasswordType,
      formPasswordFieldIcon,
      alert,
      authenticate,
      passwordShowAction,
      REPO_LINK,
      button_action_loading,
    };
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
