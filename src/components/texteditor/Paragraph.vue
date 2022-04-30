<template>
  <template v-if="true">
    <div
      v-html="content"
      ref="paragraphTag"
      tabindex="0"
      class="bg-red-50 cursor-text font-sans whitespace-pre-wrap break-words"
      @click="handleClickEvent"
      @keydown="handleKeyDown"
    />
  </template>
</template>

<script>
import { ref } from "@vue/reactivity";
import { computed } from "@vue/runtime-core";
import { listToSpanChars } from "@/utils/input";
export default {
  props: {
    text: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const paragraphTag = ref(null);
    const virtualCursorPosition = ref(props.text.length);
    const contentArray = ref(props.text.split(""));
    const content = computed(() =>
      listToSpanChars(contentArray.value, virtualCursorPosition.value)
    );

    const nonLetterAcceptableCodes = ["Space"];

    const hasSuper = (e) => e.ctrlKey || e.metaKey || e.altKey;

    const handleClickEvent = (e) => {
      console.log(e);
      const target = e.target;
      if (paragraphTag.value == target) {
        console.log("putting vcursor at the end");
        virtualCursorPosition.value = contentArray.value.length;
      } else {
        const charposition = target.attributes.charposition;
        if (charposition) {
          const char_i = charposition.value;

          console.log(`putting vcursor at ${char_i}`);
          virtualCursorPosition.value = Number(char_i);
        }
      }
    };

    const handleKeyDown = (e) => {
      console.log(e);
      if (
        (e.code.startsWith("Key") ||
          nonLetterAcceptableCodes.includes(e.code)) &&
        !hasSuper(e)
      ) {
        const char = e.shiftKey ? e.key.toUpperCase() : e.key;
        contentArray.value.push(char);
      } else if (e.code == "Backspace") {
        contentArray.value.pop();
      }
    };

    return {
      content,
      contentArray,
      handleClickEvent,
      handleKeyDown,
      virtualCursorPosition,
      paragraphTag,
    };
  },
};
</script>

<style scoped>
@keyframes cursor-blink {
  0% {
    opacity: 0;
  }
}

:deep(span[virtual-cursor]) {
  padding-left: 1.5px;
  background-color: black;
  animation: cursor-blink 1.5s steps(2) infinite;
}
</style>