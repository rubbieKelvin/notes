<template>
  <Dialog
    v-model="visible"
    dim
    :escape="!creating"
    :closeOnClickOutside="!creating"
  >
    <div
      class="bg-themed-bg border border-stroke py-2 rounded-md min-w-[400px] flex gap-3 flex-col"
    >
      <div class="pb-2 px-3 border-b border-stroke flex">
        <p class="flex-grow font-medium">New note</p>
        <button
          :disabled="creating"
          class="btn p-1"
          :class="{ 'text-gray-300': creating }"
          @click="visible = false"
        >
          <Icon name="XMarkIcon" class="w-5 h-5" />
        </button>
      </div>
      <div class="px-3 flex flex-col gap-2">
        <div class="form-input-wrapper">
          <label class="text-input-label">title</label>
          <input
            v-model="data.title"
            class="text-input bg-transparent"
            type="text"
            placeholder="Title"
            ref="noteTitleRef"
            autofocus
            @keypress.enter="create"
          />
        </div>
        <div class="flex justify-end">
          <button :disabled="creating" class="btn px-4 py-2" @click="create">
            <loading v-if="creating" class="w-5 h-5" />
            <span v-else>Create</span>
          </button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref, watch } from "vue";
import Dialog from "@/components/Dialog/index.vue";
import Icon from "@/components/Icon";
import { useFocus } from "@vueuse/core";
import { useNotesStore } from "@/stores/notes";
import { noteRoute } from "@/composables/useNavigation";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import Loading from "@/components/Loading.vue";

export default defineComponent({
  components: { Dialog, Icon, Loading },
  props: {
    modelValue: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const data = ref({ title: "" });
    const authstore = useAuthStore();
    const notestore = useNotesStore();
    const router = useRouter();
    const noteTitleRef: Ref<HTMLInputElement | null> = ref(null);
    const creating = ref(false);

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", val);
      },
    });

    const { focused: noteTitleFocus } = useFocus(noteTitleRef, {
      initialValue: true,
    });

    watch(visible, () => {
      data.value.title = "";
      if (visible.value) {
        noteTitleFocus.value = true;
      }
    });
    const create = async () => {
      if (creating.value) return;

      creating.value = true;
      if (
        authstore.isAuthenticated &&
        authstore.user &&
        data.value.title.trim()
      ) {
        try {
          const note = await notestore.createNote({
            title: data.value.title,
            author: authstore.user.id,
          });
          if (note) {
            visible.value = false;
            router.push(noteRoute(note));
          }
        } catch {}
      }

      creating.value = false;
    };
    return { visible, noteTitleRef, data, create, creating };
  },
});
</script>
