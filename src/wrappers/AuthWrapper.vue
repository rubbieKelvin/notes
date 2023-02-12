<template>
  <div authwrapper class="h-full">
    <div
      :disabled="modalOpen"
      class="h-full"
      :class="{ 'pointer-events-none': modalOpen }"
    >
      <slot />
    </div>
    <UiDialog dim glasseffect v-model="modalOpen">
      <div class="p-2 border-stroke border bg-white rounded-md min-w-[400px]">
        <template v-if="authenticating">
          <div
            v-if="authenticationStatus.maxRetriesReached"
            class="flex items-center"
          >
            <h1 class="text-lg font-medium flex-grow h-min">
              Error reaching server
            </h1>
            <button
              @click="doAuth"
              class="bg-accent hover:bg-accentHint active:bg-accentHintLighter px-4 py-2 rounded-md text-white"
            >
              Retry
            </button>
          </div>
          <div v-else class="flex flex-col gap-4">
            <div class="flex gap-3 items-center p-1">
              <Loading class="text-blue-600" />
              <span class="text-lg font-medium"> Authenticating user </span>
            </div>
            <Banner
              icon="WifiIcon"
              v-model="authenticationStatus.error"
              :class="authenticationStatus.cls"
              :use-timer="false"
            />
          </div>
        </template>
        <template v-else>
          <!-- LOGIN -->
          <div v-if="tab == 'login'" class="px-4 py-2">
            <h1 class="font-medium text-xl">Login</h1>
            <div class="mt-4 flex flex-col gap-3">
              <!-- username -->
              <TextInput
                label="Username"
                icon="UserIcon"
                placeholder="john_doe"
                autocomplete="username"
                v-model="form.login.username"
                :disabled="form.login.processing"
                :error-message="form.login.error.username"
                @update:model-value="form.login.error.username = ''"
              />

              <TextInput
                label="Password"
                icon="KeyIcon"
                inputType="password"
                placeholder="secret-***"
                autocomplete="current-password"
                v-model="form.login.password"
                :disabled="form.login.processing"
                :error-message="form.login.error.password"
                @update:model-value="form.login.error.password = ''"
              />

              <Banner
                icon="BellIcon"
                v-model="form.login.error.global"
                class="bg-red-500 text-red-500"
              />

              <button
                @click="submitLogin"
                :disabled="form.login.processing"
                class="submit-btn"
                :class="{ disabled: form.login.processing }"
              >
                <Loading v-if="form.login.processing" />
                <span v-else>Submit</span>
              </button>
              <div>
                <p>
                  Dont have an account?
                  <span
                    @click="
                      () => {
                        if (!form.login.processing) tab = 'signup';
                      }
                    "
                    class="text-blue-500 hover:text-blue-600 select-none"
                    >Signup instead</span
                  >
                </p>
              </div>
            </div>
          </div>

          <!-- SIGNUP -->
          <div v-else-if="tab == 'signup'" class="px-4 py-2">
            <h1 class="font-medium text-xl">Signup</h1>
            <div class="mt-4 flex flex-col gap-3">
              <!-- username -->
              <TextInput
                label="Username"
                icon="UserIcon"
                placeholder="john_doe"
                autocomplete="username"
                v-model="form.signup.username"
                :disabled="form.signup.processing"
                :error-message="form.signup.error.username"
                @update:model-value="form.signup.error.username = ''"
              />
              <TextInput
                label="Password"
                icon="KeyIcon"
                placeholder="secret-***"
                autocomplete="new-password"
                inputType="password"
                v-model="form.signup.password"
                :disabled="form.signup.processing"
                :error-message="form.signup.error.password"
                @update:model-value="form.signup.error.password = ''"
              />

              <Banner
                icon="BellIcon"
                v-model="form.signup.error.global"
                class="bg-red-500 text-red-500"
              />

              <button
                @click="submitSignup"
                :disabled="form.signup.processing"
                class="submit-btn"
                :class="{ disabled: form.signup.processing }"
              >
                <Loading v-if="form.signup.processing" />
                <span v-else>Submit</span>
              </button>
              <div>
                <p>
                  Already have an account?
                  <span
                    @click="
                      () => {
                        if (!form.signup.processing) tab = 'login';
                      }
                    "
                    class="text-blue-500 hover:text-blue-600 select-none"
                    >Login instead</span
                  >
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </UiDialog>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, ref, watch } from "vue";
import UiDialog from "@/components/Dialog/index.vue";
import { useAuthStore } from "@/stores/auth";
import TextInput from "@/components/TextInput.vue";
import Loading from "@/components/Loading.vue";
import Banner from "@/components/Banner.vue";
import { useNotesStore } from "@/stores/notes";
import { MaxRetriesReached } from "@/composables/uql";
import { validatePassword, validateUsername } from "@/utils/validators";
import { useRoute } from "vue-router";
import useUtils from "@/composables/useUtils";

export default defineComponent({
  components: {
    UiDialog,
    TextInput,
    Loading,
    Banner,
  },
  setup() {
    const { isPublicNotePage } = useUtils();
    const route = useRoute();
    const authstore = useAuthStore();
    const notestore = useNotesStore();

    const authenticating = ref(true);
    const authenticationStatus = ref({
      error: "",
      cls: "",
      maxRetriesReached: false,
    });

    const tab: Ref<"login" | "signup"> = ref("login");
    const form = ref({
      login: {
        error: {
          global: "",
          username: "",
          password: "",
        },
        processing: false,
        username: "",
        password: "",
      },
      signup: {
        error: {
          global: "",
          username: "",
          password: "",
        },
        processing: false,
        username: "",
        password: "",
      },
    });

    const doAuth = async () => {
      authenticating.value = true;
      authenticationStatus.value.cls = "";
      authenticationStatus.value.error = "";
      authenticationStatus.value.maxRetriesReached = false;

      try {
        await authstore.authenticate(
          (retiesIn) => {
            authenticationStatus.value.error =
              retiesIn === null
                ? "Couldnt reach sever"
                : `Error reaching server, retrying in ${
                    retiesIn / 1000
                  } seconds`;
            authenticationStatus.value.cls = "bg-red-500 text-red-500";
          },
          () => {
            authenticationStatus.value.error = "Retrying";
            authenticationStatus.value.cls = "bg-amber-500 text-amber-500";
          }
        );
        authenticating.value = false;
        await setUpUser();
      } catch (e) {
        const error = e as MaxRetriesReached;
        if (error.name === "MaxRetriesReached")
          authenticationStatus.value.maxRetriesReached = true;
        else throw e;
      }
    };

    const setUpUser = async () => {
      if (authstore.isAuthenticated) {
        console.log(`Logged in as ${authstore.user?.username}`);
        await notestore.fetchNotes();
      }
    };

    const submitLogin = async () => {
      if (!form.value.login.username.trim()) {
        form.value.login.error.username = "enter valid username";
        return;
      }

      if (!form.value.login.password) {
        form.value.login.error.password = "enter password";
        return;
      }

      form.value.login.processing = true;

      try {
        const res = await authstore.login(
          form.value.login.username,
          form.value.login.password
        );

        form.value.login.processing = false;

        if (res?.error) {
          form.value.login.error.global = res.error.message;
          return;
        }

        form.value.login.username = "";
        form.value.login.password = "";

        await setUpUser();
      } catch {
        form.value.login.processing = false;
      }
    };
    const submitSignup = async () => {
      form.value.signup.processing = true;

      // validate username
      const usernameValid = validateUsername(form.value.signup.username);
      const passwordValid = validatePassword(form.value.signup.password);

      if (!usernameValid.valid) {
        form.value.signup.error.username =
          usernameValid.reason ?? "Username has errors";
        return;
      }
      if (!passwordValid.valid) {
        form.value.signup.error.password =
          passwordValid.reason ?? "Password has errors";
        return;
      }

      form.value.signup.processing = true;

      try {
        const res = await authstore.signup(
          form.value.signup.username,
          form.value.signup.password
        );

        form.value.signup.processing = false;

        if (res?.error) {
          form.value.signup.error.global = res.error.message;
          return;
        }

        form.value.signup.username = "";
        form.value.signup.password = "";

        await setUpUser();
      } catch {
        form.value.signup.processing = true;
      }
    };

    watch(
      () => route.fullPath,
      async () => {
        if (!isPublicNotePage.value && !authstore.isAuthenticated)
          await doAuth();
      }
    );

    onMounted(async () => {
      if (!isPublicNotePage.value) {
        await doAuth();
      }
    });

    return {
      modalOpen: computed(
        () => !authstore.isAuthenticated && !isPublicNotePage.value
      ),
      authenticating,
      form,
      tab,
      submitLogin,
      submitSignup,
      authenticationStatus,
      doAuth,
      authstore,
    };
  },
});
</script>

<style lang="scss" scoped>
.submit-btn {
  @apply flex items-center justify-center outline-none p-3 bg-themed-accent-bg text-white rounded-md;

  &:hover:not(.disabled) {
    @apply bg-themed-accent-hover-bg;
  }

  &:active:not(.disabled) {
    @apply bg-themed-accent-active-bg;
  }
}
</style>
