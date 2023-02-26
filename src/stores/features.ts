import { call } from "@/composables/uql/calls";
import { HAS_FEATURE } from "@/composables/uql/calls/features";
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";

export const FEATURES = {
  TAGS: "ui.tags",
};

export const useFeatures = defineStore("feature", {
  state: (): { features: Record<string, boolean> } => ({
    features: {},
  }),
  actions: {
    async hasFeature(key: string): Promise<boolean> {
      if (this.features[key] !== undefined) return this.features[key];
      const authstore = useAuthStore();
      const res = await call<{ is_active: boolean }>(
        HAS_FEATURE(key),
        authstore.isAuthenticated
      );
      if (res) {
        this.features[key] = res.is_active;
        return res.is_active;
      }
      return false;
    },
  },
});
