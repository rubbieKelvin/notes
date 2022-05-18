<template>
  <div class="bg-white rounded-md w-[400px] p-5 flex flex-col gap-6">
    <div>
      <p class="text-xl font-medium">Create a new note</p>
    </div>

    <div class="flex flex-col gap-4">
      <p class="text-gray-500">Give a title to your new note to get started.</p>

      <!-- title -->
      <div class="flex flex-col gap-2">
        <label class="label">
          <span class="text">Note title</span>
          <p class="error">{{ error }}</p>
        </label>

        <input ref="input" v-model="text" class="input-text" type="text" placeholder="Title" @keypress.enter="fire" />
      </div>

      <!-- type -->
      <div>
        <label class="label">
          <span class="text">Folder</span>
        </label>

        <ComboBox ref="combobox" class="border-2 p-2" v-slot="{ open, selectedText }" :list="noteFolders"
          :getItemText="(item) => item.name" @selected="setFolder">
          <div class="flex items-center px-2 py-1" @click="open">
            <span class="flex-grow font-medium">{{ selectedText }}</span>
            <ChevronDownIcon class="w-3 h-3" />
          </div>
        </ComboBox>
      </div>
      <div class="flex gap-2 items-center">
        <input ref="check" type="checkbox" v-model="checked" class="checked"/>
        <span class=" cursor-default select-none" @click="$refs.check.click()">Open immediately</span>
      </div>

      <!-- button -->
      <div class="flex items-center justify-end">
        <button @click="fire"
          class="bg-primary-basic px-5 py-3 rounded-md text-white hover:bg-primary-vibrant flex gap-2 items-center">
          <PlusIcon class="text-white w-4 h-4" />
          <span>Create</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { PlusIcon, ChevronDownIcon } from "@heroicons/vue/outline";
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";
import ComboBox from "../controls/ComboBox.vue";
import useNotes from "@/composables/useNotes";

export default {
  components: { PlusIcon, ComboBox, ChevronDownIcon },
  props: {
    callback: {
      type: Function,
      required: true,
    },
  },
  methods: {
    focus() {
      this.input.focus();
      this.error = "";
    },
    reset() {
      this.text = '';
      this.combobox.setSelected(this.combobox.getDefault(this.noteFolders))
    },
    setComboValue(folder) {
      this.combobox.setSelected(folder)
    }
  },
  setup(props) {
    const error = ref("");
    const text = ref("");
    const input = ref(null);
    const combobox = ref(null);
    const checked = ref(true);

    const { noteFolders } = useNotes();

    const folder = ref(noteFolders.value[0]);

    const fire = () => {
      const title = text.value.trim();

      if (title) {
        text.value = "";
        props?.callback(title, folder.value.noteTypeKey, checked.value);
      } else {
        error.value = "Title cannot be empty";
      }
    };

    const setFolder = (f) => (folder.value = f);

    watch(text, (value) => {
      if (value) error.value = "";
    });


    return { error, text, fire, input, noteFolders, setFolder, folder, combobox,checked };
  },
};
</script>
<style lang="scss" scoped>
.checked{
  @apply h-4 w-4;
}
</style>