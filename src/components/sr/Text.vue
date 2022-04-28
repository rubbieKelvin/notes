<template>
    <div>
        <p>{{ value }}</p>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            required: true
        },
        editing: {
            type: Boolean,
            default: false
        }
    }
}
</script>