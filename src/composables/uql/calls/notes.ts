import { UqlIntents } from ".";
import { UQLFunctionCallInput } from "../types";

export const NOTE_FIELDS = {
  id: true,
  title: true,
  content: true,
  readable_id: true,
  author: {
    id: true,
    username: true,
    first_name: true,
    last_name: true,
  },
  date_created: true,
  last_updated: true,
  is_starred: true,
  is_archived: true,
  is_trashed: true,
  is_public: true,
  tag_attachments: {
    id: true,
    tag: {
      id: true,
      title: true,
      description: true,
      author: {
        id: true,
        username: true,
      },
      color: true,
      date_created: true,
    },
  },
};

export const FETCH_USER_NOTES: (
  author: string
) => UQLFunctionCallInput<UqlIntents> = (author) => ({
  functionName: "models.api.note.findmany",
  args: {
    where: { author: { id: { _eq: author } } },
    fields: NOTE_FIELDS,
  },
});
