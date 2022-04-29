<template>
  <router-view class="text-base"/>
</template>

<script>
import useNotes from '@/composables/useNotes'

export default {
  setup(){
    const { _buildWelcomeDocument } = useNotes()
    _buildWelcomeDocument()
    return {}
  }
}
</script>