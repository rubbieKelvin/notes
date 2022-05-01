<template>
  <div class="bg-white py-3 px-4 flex flex-col gap-3 rounded-md shadow-md">
    <div class="text-lg">
      <h1>{{ title }}</h1>
    </div>
    <p class="py-2">{{ message }}</p>
    <div class="flex gap-2 text-sm text-white">
      <button
        class="rounded flex-grow py-2"
        :class="noClass"
        @click="noAction()"
      >
        {{ noText }}
      </button>
      <button
        :class="yesClass"
        class="rounded flex-grow py-2"
        @click="yesAction()"
      >
        {{ yesText }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: "Confirm",
    },
    message: {
      type: String,
      default: "Are you sure you wanna?...",
    },
    yesText: {
      type: String,
      default: "Yes",
    },
    noText: {
      type: String,
      default: "No",
    },
    yesAction: {
      type: Function,
      default: () => () => null,
    },
    noAction: {
      type: Function,
      default: () => () => null,
    },
    yesClass: {
      type: Array,
      default: () => [],
    },
    noClass: {
      type: Array,
      default: () => [],
    },
  },
};
</script>