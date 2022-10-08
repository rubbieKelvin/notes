<template>
  <div>
    <PageHeader :menu="menu" />
    <div>Hello wrapper</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem } from "@/types";

const menu: Array<MenuItem> = [
  { id: 0, title: "Delete" },
  { id: 1, title: "Dup", type: "HEADER" },
  { id: 2, title: "Me", icon: "FaceSmileIcon" },
  { id: 3, title: "Might" },
  { id: 4, title: "Mion" },
  { id: 5, type: "SEPARATOR" },
  {
    id: 6,
    title: "Hello",
    children: [
      { id: 7, title: "Delete" },
      { id: 8, title: "Dup", type: "HEADER" },
      { id: 9, title: "Me" },
      { id: 10, type: "SEPARATOR" },
      {
        id: 11,
        title: "Edit",
        children: [
          { id: 71, title: "Delete" },
          { id: 81, title: "Dup", type: "HEADER" },
          { id: 91, title: "Me" },
          { id: 110, type: "SEPARATOR" },
          { id: 111, title: "Hello" },
          {
            id: 121,
            title: "Something",
            fetchMessage: 'getting btc stock prices from btc api',
            children: async () => {
              const res = await fetch(
                "https://api.blockchain.com/v3/exchange/symbols",
                { method: "get" }
              );
              const data: Record<
                string,
                {
                  status: string;
                  id: number;
                }
              > = await res.json();

              const result: Array<MenuItem> = [];

              Object.entries(data).forEach(([key, ent]) =>
                result.push({
                  id: ent.id,
                  title: key,
                  subtitle: ent.status,
                })
              );
              return result;
            },
          },
        ],
      },
      { id: 12, title: "Something" },
    ],
  },
  { id: 13, title: "Something" },
];

export default defineComponent({
  components: { PageHeader },
  setup() {
    return { menu };
  },
});
</script>
