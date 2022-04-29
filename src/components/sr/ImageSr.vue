<template>
  <div>
    <div class="relative bg-gray-200 h-max rounded-md">
      <img
        @click="opened = true"
        loading="lazy"
        @error="$refs[`${data.ld}_img_error`].style.display = 'inline'"
        @load="$refs[`${data.ld}_img_load`].style.display = 'none'"
        class="w-full object-cover object-center rounded-md min-h-[100px] max-h-[500px]"
        :src="src"
      />
      <!-- load -->
      <div
        :ref="`${data.ld}_img_load`"
        class="transition delay-200 absolute top-0 left-0 right-0 bottom-0"
      >
        <div class="w-full h-full flex items-center justify-center">
          <div
            class="bg-white shadow-lg flex gap-4 p-3 rounded-md items-center justify-center"
          >
            <svg
              class="animate-spin h-6 w-6 text-accent"
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
            <p class="select-none text-sm">{{ data.alt || "Loading..." }}</p>
          </div>
        </div>
      </div>
      <!-- error -->
      <div
        :ref="`${data.ld}_img_error`"
        class="transition delay-200 hidden absolute top-0 left-0 right-0 bottom-0"
      >
        <div class="w-full h-full flex items-center justify-center">
          <div
            class="bg-white shadow-lg flex gap-4 p-3 rounded-md items-center justify-center"
          >
            <svg
              class="text-danger h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.266 20.998H2.73301C2.37575 20.998 2.04563 20.8074 1.867 20.498C1.68837 20.1886 1.68838 19.8074 1.86701 19.498L11.133 3.49799C11.3118 3.1891 11.6416 2.9989 11.9985 2.9989C12.3554 2.9989 12.6852 3.1891 12.864 3.49799L22.13 19.498C22.3085 19.8072 22.3086 20.1882 22.1303 20.4975C21.9519 20.8069 21.6221 20.9976 21.265 20.998H21.266ZM12 5.99799L4.46901 18.998H19.533L12 5.99799ZM12.995 14.999H10.995V9.99799H12.995V14.999Z"
                fill="currentColor"
              />
              <path d="M11 16H13V18H11V16Z" fill="currentColor" />
            </svg>
            <p class="select-none text-sm">Error fetching image!</p>
            <button
              class="hover:bg-gray-200 rounded-md flex items-center justify-center"
              @click="pingImg()"
            >
              <svg
                class="text-text hover:text-accent h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.995 4.00001C7.8362 3.99432 4.36664 7.17599 4.01299 11.3197C3.65933 15.4634 6.53955 19.187 10.6391 19.8862C14.7387 20.5853 18.6903 18.0267 19.73 14H17.649C16.6318 16.8771 13.617 18.5324 10.6434 17.8465C7.66989 17.1605 5.68488 14.3519 6.03079 11.3199C6.3767 8.28792 8.94332 5.99856 11.995 6.00001C13.5845 6.00234 15.1064 6.64379 16.218 7.78002L13 11H20V4.00001L17.649 6.35002C16.1527 4.84464 14.1175 3.99873 11.995 4.00001Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- modal -->
    <Modal v-model="opened" dim closeOnEsc closeOnClickOutside dark>
      <ImageModal :src="src" :alt="data.alt || 'Loading...'" />
    </Modal>
  </div>
</template>

<script>
import { ref } from "@vue/reactivity";
import Modal from "@/components/Modal.vue";
import ImageModal from "@/components/ImageModal.vue";

export default {
  props: {
    data: {
      type: String,
      required: true,
    },
  },
  setup(prop) {
    const opened = ref(false);
    const src = ref(prop.data?.value);

    const pingImg = () => {
      const dt = new Date();
      const _link = prop.data?.value;
      src.value = `${_link}?t=${dt.getTime()}`;
    };
    return { pingImg, src, opened };
  },
  components: { Modal, ImageModal },
};
</script>
