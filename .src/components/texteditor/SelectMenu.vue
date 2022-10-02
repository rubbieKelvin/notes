<template>
  <div class="bg-white shadow-lg rounded-md p-1">
    <div class="p-1 flex flex-col gap-2" v-if="inputWidget.opened">
      <p class="flex items-center gap-1">
        <button
          class="border bg-gray-100 hover:bg-gray-200 rounded"
          @click="inputWidget.opened = false"
        >
          <LeftChevronSvg />
        </button>
        <span class="flex-grow">{{ inputWidget.title }} </span>
        <span v-if="inputWidget.error" class="text-sm text-red-500">
          {{ inputWidget.error }}
        </span>
      </p>
      <div class="flex gap-2">
        <input
          type="text"
          :placeholder="inputWidget.placeholder"
          v-model="inputWidget.value"
          class="outline-none p-1 bg-slate-100 focus:bg-slate-200 rounded"
        />
        <button
          @click="inputWidget.action"
          class="px-2 bg-primary-basic py-1 rounded text-white hover:bg-primary-vibrant"
        >
          {{ inputWidget.button }}
        </button>
      </div>
    </div>
    <template v-else>
      <IconButton class="p-1" @click="addLink">
        <LinkSvg />
      </IconButton>
    </template>
  </div>
</template>

<script>
import { ref } from "@vue/reactivity";
import { Editor } from "@tiptap/vue-3";
import IconButton from "@/components/IconButton.vue";
import LinkSvg from "@/assets/svgs/linkSvg.vue";
import LeftChevronSvg from "@/assets/svgs/leftChevronSvg.vue";
import { watch } from "@vue/runtime-core";

export default {
  props: {
    editor: {
      type: Editor,
      default: null,
    },
  },
  components: { IconButton, LinkSvg, LeftChevronSvg },
  setup(props) {
    const inputWidget = ref({
      opened: false,
      title: "",
      placeholder: "",
      button: "",
      value: "",
      action: () => {},
    });

    const useInputWidget = ({
      title = "Enter text",
      placeholder = "Enter a value",
      action,
      button = "Ok",
      validate = (v) => true,
    }) => {
      inputWidget.value = {
        opened: true,
        title,
        value: "",
        placeholder,
        button,
        error: "",
        validate,
        action: () => {
          if (!validate(inputWidget.value.value)) {
            inputWidget.value.error = "Enter a valid url";
            return;
          }
          action();
          inputWidget.value = {
            opened: false,
            title: "",
            placeholder: "",
            button: "",
            action: () => {},
          };
        },
      };
    };

    watch(
      () => inputWidget.value.error,
      (value) => {
        if (value) {
          window.setTimeout(() => (inputWidget.value.error = ""), 2000);
        }
      }
    );

    const addLink = () => {
      useInputWidget({
        title: "Set link",
        placeholder: "Enter url...",
        validate: (text) => /^(ftp|http|https):\/\/[^ "]+$/.test(text),
        action: () => {
          props.editor
            .chain()
            .focus()
            .setLink({ href: inputWidget.value.value, target: "_blank" })
            .run();
        },
        button: "Set",
      });
    };

    return {
      inputWidget,
      useInputWidget,
      addLink,
    };
  },
};
</script>
