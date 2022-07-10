<template>
  <div class="notepad">
    <!-- heading -->
    <div class="heading">
      <div class="info">
        <span class="title">Note Title</span>
        <span class="descr">Edited 2 minutes ago, by rubbie.</span>
      </div>

      <div class="more-menu">
        <button class="hover:bg-gray-100 p-2 rounded-md">
          <menu-icon class="w-6 h-6" />
        </button>
      </div>
    </div>
    <!-- tools -->
    <div class="tools">
      <!-- <Combobox
        :list="FONTS"
        :resolver="resolveSelectedFont"
        v-model="selectedFont"
      >
        <template v-slot:display="{ text }">
          <div
            class="min-w-[50px] flex items-center gap-4 cursor-default hover:bg-gray-100 px-2 rounded-md"
          >
            <p>{{ text }}</p>
            <ChevronDownIcon class="w-5 h-5" />
          </div>
        </template>
        <template v-slot:options="{}">
          <div floater></div>
        </template>
      </Combobox>

      <div class="divider" /> -->

      <!-- ... -->
      <button :title="tool.name" v-for="tool in padtools" :key="tool.name">
        <icon :name="tool.icon" class="w-5 h-5" />
      </button>

      <!-- ... -->
      <!-- <div class="divider" /> -->

      <!-- ... -->
      <button :title="tool.name" v-for="tool in notetools" :key="tool.name">
        <icon :name="tool.icon" class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notepad {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  .heading {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    @apply px-6 py-[14px] border-b border-b-wall;

    .info {
      @apply flex flex-col flex-grow;
      .title {
        @apply font-medium text-xl;
      }
      .descr {
        @apply text-sm text-slate-400;
      }
    }
  }

  .tools {
    @apply px-6 border-b border-b-wall py-[0.65rem] flex gap-3;
    > .divider {
      @apply border-r border-r-wall;
    }
    > button {
      @apply p-2 hover:bg-gray-100 rounded-md text-slate-700;
    }
  }
}
</style>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { MenuIcon, ChevronDownIcon } from "@heroicons/vue/outline";
import Icon from "@/icons/index.vue";
import {
  PAD_TOOLS,
  FONTS,
  FontType,
  ToolType,
  NOTE_TOOLS,
} from "@/constants/index";
import Combobox from "@/components/controls/Combobox.vue";
import { EditorContent, useEditor, JSONContent } from "@tiptap/vue-3";
// import StarterKit from "@tiptap/starter-kit"

export default defineComponent({
  components: { MenuIcon, Icon, Combobox, ChevronDownIcon, EditorContent },
  setup() {
    const selectedFont = ref(0);
    const content = ref<JSONContent>({ type: "doc", content: [] });
    const editor = useEditor({
      extensions: [],
      content: content.value,
      onUpdate: () => {
        // i stoped here trying to get the typing right
        content.value = editor.value?.getJSON() 
      }
    });

    const resolveSelectedFont = (item: FontType): string => item.name;

    const padtools = ref<ToolType[]>([]);
    padtools.value = PAD_TOOLS();

    const notetools = ref<ToolType[]>([]);
    notetools.value = NOTE_TOOLS();

    return { padtools, selectedFont, FONTS, resolveSelectedFont, notetools };
  },
});
</script>
