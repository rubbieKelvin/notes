import { defineStore } from "pinia";
import { Tag, TagInsert, TagUpdate, UUID } from "@/types/models";
import { call } from "@/composables/uql/calls";
import {
  CREATE_TAG,
  FIND_MANY_TAGS,
  GET_TAG,
  UPDATE_TAG,
} from "@/composables/uql/calls/tags";

interface State {
  tags: Tag[] | null;
}

export const useTagStore = defineStore("tag", {
  state: (): State => ({
    tags: null,
  }),
  actions: {
    async loadTags() {
      const tags = (await call(FIND_MANY_TAGS(), true)) as Tag[];
      if (tags) this.tags = tags;
      return tags;
    },

    async createTag(object: TagInsert) {
      const tag = await call(CREATE_TAG(object), true);

      if (tag) {
        if (this.tags) this.tags.push(tag);
        else this.tags = [tag];
      }

      return tag;
    },

    async getTag(id: UUID) {
      const tag = this.tags && this.tags.find((tag) => tag.id === id);

      const fetchTag = async () => await call<Tag>(GET_TAG(id), true);

      if (tag) {
        // update in the background
        fetchTag();
        return tag;
      }
      return await fetchTag();
    },

    async updateTag(id: UUID, updates: Partial<TagUpdate>) {
      const tag = await call<Tag>(UPDATE_TAG(id, updates), true);
      if (tag) {
        this.tags = this.tags ? this.tags?.filter((t) => t.id !== id) : [];

        if (!updates.is_deleted) {
          this.tags.push(tag);
        }
      }
    },
  },
});
