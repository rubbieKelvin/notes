<template>
<NodeViewWrapper>
    <div class="notebox-file" contenteditable="false">
        <div class="flex gap-3 items-center">
            <PaperClipIcon class="w-5 h-5 text-black"/>
            <span>File</span>
        </div>
    </div>
</NodeViewWrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper } from "@tiptap/vue-3";
import { PaperClipIcon } from '@heroicons/vue/outline'
export default {
    props: nodeViewProps,
    components: {
        NodeViewWrapper,
        PaperClipIcon
    },
    setup(){
        return {}
    }
}
</script>

<style lang="scss" scoped>
.notebox-file{
    @apply border border-slate-400 rounded p-3;
}
</style>