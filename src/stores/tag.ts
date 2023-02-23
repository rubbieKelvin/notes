import { defineStore } from "pinia";
import { Tag } from "@/types/models";
import { useAuthStore } from "./auth";
import useSharedUQL from "@/composables/uql";

interface State {
  tags: Tag[];
}

export const useTagStore = defineStore("tag", {
  state: (): State => ({
    tags: [],
  }),
  getters: {
    tagmodel() {
      const { model } = useSharedUQL();
      const authstore = useAuthStore();

      return model<Tag, Tag, Tag>("api.tag", {
        headers: authstore.authHeader,
      });
    },
  },
  actions: {
    async loadTags() {
      const authstore = useAuthStore();

      if (authstore.isAuthenticated) {
        const tags = await this.tagmodel.findMany({
          where: { is_deleted: { _eq: false } },
          fields: {
            id: true,
            title: true,
            description: true,
            author: {
              id: true,
              username: true,
            },
            color: true,
          },
        });

        if (tags) this.tags = tags;
      }
    },
  },
});
