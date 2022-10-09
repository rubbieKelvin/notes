<template>
  <div>
    <PageHeader title="Notes" :menu="menu" />
    <div>Hello wrapper</div>
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, Ref } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem, ToastData } from "@/types";

export default defineComponent({
  components: { PageHeader },
  setup() {
    const toasts = inject("toasts") as Ref<ToastData[]>;
    const menu: ComputedRef<Array<MenuItem>> = computed(() => [
      {
        id: 0,
        title: "Backup local notes",
        action: () =>
          toasts.value.push({
            id: Symbol(),
            title: "Hello",
            desciption: "this is a subtitle",
            icon: "ServerStackIcon",
          }),
      },
      { id: 1, title: "Delete", disabled: true },
    ]);
    return { menu, toasts };
  },
});
</script>
