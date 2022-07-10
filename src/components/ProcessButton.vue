<template>
  <button :disabled="loading" @click="onclick" class=" transition-all duration-200">
    <Icon v-if="error && !loading" name="ExclamationIcon" class="w-6 h-6"/>
    <slot v-if="!loading" :error="error" :loading="loading"> Button </slot>
    <svg
    v-if="loading"
      class="animate-spin w-6 h-6"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </button>
</template>

<script lang="ts">
import Icon from "@/packages/heroicons";
import { ref} from '@vue/runtime-core'

export default {
  components: { Icon },
  props: {
    action: {
        type: Function,
        required: true
    }
  },
  setup(props: any){
    const loading = ref(false)
    const error = ref(false)

    const onclick = async (e: any) => {
        loading.value = true
        let res = false
        if (props.action.constructor.name==="AsyncFunction")
            res = await props.action(e)
        else
            res = props.action(e)
        loading.value = false
        error.value = !res
    }

    return {loading, error, onclick}
  }
};
</script>
