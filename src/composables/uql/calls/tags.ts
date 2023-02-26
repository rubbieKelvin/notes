import { TagInsert, TagUpdate, UUID } from "@/types/models";
import { UqlIntents } from ".";
import { UQLFunctionCallInput } from "../types";

const TAG_FIELDS = {
  id: true,
  title: true,
  description: true,
  date_created: true,
  author: {
    id: true,
    username: true,
  },
  color: true,
  note_attachments: {
    note: {
      id: true,
      title: true,
      readable_id: true,
      author: {
        id: true,
        username: true,
      },
      date_created: true,
      last_updated: true,
      is_starred: true,
      is_archived: true,
      is_trashed: true,
      is_public: true,
    },
  },
};

export const FIND_MANY_TAGS: () => UQLFunctionCallInput<UqlIntents> = () => ({
  functionName: "models.api.tag.findmany",
  fields: TAG_FIELDS,
  args: {
    where: {},
  },
});

export const CREATE_TAG: (
  object: TagInsert
) => UQLFunctionCallInput<UqlIntents> = (object) => ({
  functionName: "models.api.tag.insert",
  fields: TAG_FIELDS,
  args: {
    object,
  },
});

export const GET_TAG: (pk: UUID) => UQLFunctionCallInput<UqlIntents> = (
  pk
) => ({
  functionName: "models.api.tag.find",
  fields: TAG_FIELDS,
  args: { pk },
});

export const UPDATE_TAG: (
  pk: UUID,
  updates: Partial<TagUpdate>
) => UQLFunctionCallInput<UqlIntents> = (pk, updates) => ({
  functionName: "models.api.tag.update",
  fields: TAG_FIELDS,
  args: {
    partial: {
      pk,
      fields: updates,
    },
  },
});
