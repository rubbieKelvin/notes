<template>
    <div class="index">
        <sidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Sidebar from '@/layouts/Sidebar.vue'

export default defineComponent({
    components: { Sidebar }
})
</script>

<style lang="scss" scoped>
.index{
    @apply flex;
}
</style>