<template>
  <NodeViewWrapper class="relative">
    <select
      v-model="selectedLanguage"
      class="p-1 absolute top-[0.5rem] right-[0.5rem] rounded-md w-max text-gray-400 appearance-none text-end bg-transparent"
      data-test
      :class="{
        'events-none': !editor.isEditable,
      }"
      contenteditable="false"
    >
      <option :value="null">auto</option>
      <option disabled>—</option>
      <option
        v-for="(language, index) in languages"
        :key="index"
        :value="language"
      >
        {{ language }}
      </option>
    </select>
    <pre class="pt-12"><NodeViewContent spellcheck="false" as="code" /></pre>
  </NodeViewWrapper>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { NodeViewWrapper, nodeViewProps, NodeViewContent } from "@tiptap/vue-3";

export default defineComponent({
  name: "CustomCodeBlock",
  props: nodeViewProps,
  components: { NodeViewWrapper, NodeViewContent },
  setup(props) {
    const languages = ref(props.extension.options.lowlight.listLanguages());
    const selectedLanguage = computed({
      get() {
        return props.node.attrs.language;
      },
      set(language) {
        props.updateAttributes({ language });
      },
    });

    return { languages, selectedLanguage };
  },
});
</script>
