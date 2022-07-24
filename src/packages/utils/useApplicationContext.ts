import { ApplicationDataContext } from "@/constants/types";
import { ref, Ref } from "@vue/runtime-core";
import { get_user } from "@/packages/api";
import { fetchQuery } from "@/packages/api/query";
import { QUERY } from "@/constants/links";
import { PaginatedFetch } from "../api/types";
import { Note } from "../api/types/models";

export default () => {
  const ctx: Ref<ApplicationDataContext> = ref({
    user: null,
    notes: [],
    current_note: null,
    updateUser: async () => {
      const user = await get_user();
      ctx.value.user = user;
    },
    updateNotes: async () => {
      const recursiveFetch = async (paginator: PaginatedFetch | null) => {
        if (!paginator) {
          const url = QUERY.NOTES
          url.searchParams.set('page_size', '100')
          url.searchParams.set('order_by', '-last_edited')

          paginator = await fetchQuery({
            url,
            query: {
              _and: {
                author: {
                  _eq: ctx.value.user?.id,
                },
                archived: {
                  _eq: false,
                },
              },
            },
            select: {
              id: true,
              author: {
                id: true,
                email: true,
                name: true,
              },
              name: true,
              private: true,
              created_at: true,
              last_edited: true,
              archived: true,
              slug: true,
            },
          });
          ctx.value.notes = paginator.data;
        } else {
          const new_notes = paginator.data as Array<Note>;
          ctx.value.notes = [...ctx.value.notes, ...new_notes];
        }

        if (paginator.next) recursiveFetch(await paginator.next());
      };
      await recursiveFetch(null);
    },
    fetchCurrentNote: async (slug) => {},
  });

  return ctx;
};
