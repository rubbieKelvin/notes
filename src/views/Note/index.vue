<template>
    <div class=" px-7">
        <TextEditor/>
    </div>
</template>

<script>
import TextEditor from '../../components/TextEditor/index.vue'

export default {
    components: { TextEditor },
    props: {
        note_id: {
            type: String,
            default: null
        }
    }
}
</script>
