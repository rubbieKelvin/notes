import { User } from "@/types/models";
import { defineStore } from "pinia";
import useSharedUQL from "@/plugins/uql";

interface State {
  user: User | null;
  token: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): State => ({
    user: null,
    token: null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    authHeader: (state) =>
      state.token ? { Authorization: `Token ${state.token}` } : null,
  },
  actions: {
    async authenticate(
      onError: (retriesIn: number | null) => void,
      onRetry: () => void
    ) {
      if (!this.token) this.token = localStorage.getItem("auth-token");
      const headers = this.authHeader;

      if (!headers) return null;

      const { call } = useSharedUQL();
      const resp = await call({
        functionName: "me",
        fields: true,
        meta: {
          headers,
          retry: {
            max: 4,
            retriesIn: 4000,
            onError,
            onRetry,
          },
        },
      });

      if (resp.error || resp.statusCode >= 300 || resp.statusCode < 200) {
        console.error(resp.error);
        return null;
      }

      const data: User = resp.data;
      this.user = data;
    },
    async login(username: string, password: string) {
      const { call } = useSharedUQL();
      const resp = await call({
        functionName: "login",
        fields: { token: true, user: true },
        args: { username, password },
      });

      if (resp.error) {
        console.error(resp.error);
        return resp;
      }

      const data: { user: User; token: string } = resp.data;

      this.token = data.token;
      this.user = data.user;

      // save token
      localStorage.setItem("auth-token", this.token);
      return resp;
    },
    async signup(username: string, password: string) {
      const { call } = useSharedUQL();
      const resp = await call({
        functionName: "signup",
        fields: { token: true, user: true },
        args: { username, password },
      });

      if (resp.error) {
        console.error(resp.error);
        return resp;
      }

      const data: { user: User; token: string } = resp.data;

      this.token = data.token;
      this.user = data.user;

      // save token
      localStorage.setItem("auth-item", this.token);
      return resp;
    },
    async logout() {
      if (!this.isAuthenticated) return;
      const { call } = useSharedUQL();
      const headers = this.authHeader;
      const resp = await call({ functionName: "logout", meta: { headers } });

      if (resp.error) {
        console.error(resp.error);
        return;
      }

      this.token = null;
      this.user = null;
      localStorage.removeItem("auth-token");
    },
  },
});
