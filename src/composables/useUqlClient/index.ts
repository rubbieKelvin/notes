import axios from "axios";
import { createSharedComposable, useLocalStorage } from "@vueuse/core";
import { computed, Ref, ref } from "vue";
import { AuthenticatedUserResponse, LoginResponse } from "./types/response";
import { Note, User } from "./types/models";

interface UQLRequestBody {
  args: Record<string, any>;
  fields?: Record<string, any> | boolean;
}

const uqlIntentBody = (
  intent: string,
  { args, fields = true }: UQLRequestBody
) => ({
  intent,
  fields,
  args,
});

export default createSharedComposable(function () {
  // constants
  const url = import.meta.env.VITE_UQL_BASE;

  // refs
  const user: Ref<User | null> = ref(null);
  const token: Ref<string | null> = useLocalStorage("x-t", null);
  const notes: Ref<Note[]> = ref([]);
  const isAuthenticated = computed(() => user.value !== null);
  const authHeader = () => ({ Authorization: `Token ${token.value}` });

  // // return
  // return {
  //   user,
  //   notes,
  //   isAuthenticated,
  //   functions: {
  //     auth: {
  //       // login:

  //     // getNotes
  //   },
  // };

  return {
    user,
    notes,
    isAuthenticated,
    loginUser: async (
      username: string,
      password: string
    ): Promise<null | User> => {
      // logs in the user
      const response = await axios.request({
        url,
        method: "post",
        data: uqlIntentBody("functions.login", {
          args: { username, password },
          fields: true,
        }),
      });

      if (response.status === 200) {
        const data = response.data as LoginResponse;
        token.value = data.data.token;
        user.value = data.data.user;
        notes.value = data.data.user.notes;
        return data.data.user;
      }

      return null;
    },
    createAccount: async (
      username: string,
      password: string
    ): Promise<null | User> => {
      const response = await axios.request({
        url,
        method: "post",
        data: uqlIntentBody("functions.signup", {
          args: { username, password },
          fields: true,
        }),
      });

      if (response.status === 200) {
        const data = response.data as LoginResponse;
        token.value = data.data.token;
        user.value = data.data.user;
        notes.value = [];
        return data.data.user;
      }

      return null;
    },
    logoutUser: async () => {
      await axios.request({
        url,
        method: "post",
        data: uqlIntentBody("functions.logout", { args: {} }),
        headers: authHeader(),
        validateStatus: () => true,
      });

      user.value = null;
      token.value = null;
      notes.value = [];
    },
    getAuthenticatedUser: async (): Promise<User | null> => {
      // fetchs the user if not exists
      if (token.value === null) return null;
      if (user.value === null) {
        // fetch user
        const response = await axios.request({
          url,
          method: "post",
          data: uqlIntentBody("functions.me", { args: {} }),
          headers: authHeader(),
        });

        const data = response.data as AuthenticatedUserResponse;
        user.value = data.data;
        notes.value = data.data.notes;
        return data.data;
      }

      return user.value;
    },
  };
});
