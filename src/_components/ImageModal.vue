<template>
    <div class="bg-white flex flex-col rounded-md shadow-md w-[90vw] max-w-[950px]">
        <div class="py-3 px-3 border-b border-gray-200 flex items-center">
            <p class="flex-grow capitalize text-lg">{{ alt || 'Image' }}</p>
            <button class="px-3 py-2 bg-primary-basic rounded text-white hover:bg-primary-vibrant">
                Download
            </button>
        </div>
        <img :src="src" class="flex-grow">
    </div>
</template>

<script>
import IconButton from "./IconButton.vue";
export default {
    props: {
        alt: {
            type: String,
            default: null
        },
        src: {
            type: String,
            required: true
        }
    },
    emits: ['close'],
    components: { IconButton }
}
</script>