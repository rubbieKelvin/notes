<template>
  <div class="bg-white rounded-md w-[400px] p-5 flex flex-col gap-6">
    <div>
      <p class="text-xl font-medium">Create a new note</p>
    </div>

    <div class="flex flex-col gap-4">
      <p class="text-gray-500">Give a title to your new note to get started.</p>
      <div class="flex flex-col gap-2">
        <h6 class="text-sm text-primary-vibrant flex">
          <span class="flex-grow">NOTE TITLE</span>
          <p class="text-red-500 text-xs font-medium">{{ error }}</p>
        </h6>

        <input
          ref="input"
          v-model="text"
          class="input-text"
          type="text"
          placeholder="Title"
          @keypress.enter="fire"
        />
      </div>
      <div class="flex items-center justify-end">
        <button
          @click="fire"
          class="bg-primary-basic px-5 py-3 rounded-md text-white hover:bg-primary-vibrant flex gap-2 items-center"
        >
          <PlusIcon class="text-white w-4 h-4" />
          <span>Create</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { PlusIcon } from "@heroicons/vue/outline";
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";

export default {
  components: { PlusIcon },
  props: {
    callback: {
      type: Function,
      required: true,
    },
  },
  methods: {
    focus(){
      this.input.focus();
      this.error = "";
    },
  },
  setup(props) {
    const error = ref("");
    const text = ref("");
    const input = ref(null);

    const fire = () => {
      const title = text.value.trim();

      if (title) {
        text.value = "";
        props?.callback(title);
      } else {
        error.value = "Title cannot be empty";
      }
    };

    watch(text, (value) => {
      if (value) error.value = "";
    });

    return { error, text, fire, input };
  },
};
</script>
