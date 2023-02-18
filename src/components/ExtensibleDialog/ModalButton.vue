<template>
  <button
    class="ed-button w-full"
    :class="{ primary: button.isPrimary }"
    @click="handleClick"
  >
    <Loading v-if="loading" />
    <template v-else>
      <Icon
        v-if="error"
        name="ExclamationTriangleIcon"
        class="w-6 h-6 animate-bounce"
        :class="[button.isPrimary ? 'text-themed-accent-text' : 'text-red-500']"
      />
      <Icon v-else-if="button.icon" :name="button.icon" class="w-6 h-6" />
      <span>
        {{ button.text }}
      </span>
    </template>
  </button>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import Icon from "@/components/Icon";
import { ButtonData } from "@/stores/modals";
import Loading from "../Loading.vue";

export default defineComponent({
  components: { Icon, Loading },
  props: {
    button: { type: Object as () => ButtonData, required: true },
    formValues: { type: Object, required: true },
  },
  setup(props) {
    const fn = props.button.action;
    const isAsync = fn.constructor.name === "AsyncFunction";

    const loading = ref(false);
    const error = ref(false);

    const handleClick = async () => {
      try {
        if (isAsync) {
          loading.value = true;
          await fn({ ...props.formValues });
        } else fn({ ...props.formValues });
        error.value = false;
      } catch {
        error.value = true;
      }

      loading.value = false;
      if (props.button.finally && !error.value)
        props.button.finally({ ...props.formValues });
    };

    return {
      isAsync,
      loading,
      error,
      handleClick,
    };
  },
});
</script>
