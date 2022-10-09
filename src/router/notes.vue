<template>
  <div>
    <PageHeader title="Notes" :menu="menu" />
    <div>Hello wrapper</div>
    <NewNoteDialog v-model="modals.newnote" />
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, ref, Ref } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem, ToastData } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";

export default defineComponent({
  components: { PageHeader, NewNoteDialog },
  setup() {
    const toasts = inject("toasts") as Ref<ToastData[]>;
    const modals = ref({
      newnote: false,
    });
    const menu: ComputedRef<Array<MenuItem>> = computed(
      (): Array<MenuItem> => [
        {
          id: Symbol(),
          title: "Create note",
          icon: "PlusIcon",
          action: () => (modals.value.newnote = true),
        },
        {
          id: Symbol(),
          title: "Create folder",
          icon: "FolderPlusIcon",
          disabled: true,
          subtitle: "Signin to use feature",
        },
      ]
    );
    return { menu, toasts, modals };
  },
});
</script>
