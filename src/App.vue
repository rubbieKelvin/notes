<template>
  <router-view class="text-base"/>
</template>

<script>
import useNotes, { _buildWelcomeDocument } from './composables/useNotes'

export default {
  setup(){
    const { $addNote } = useNotes()
    const welcomeNote = _buildWelcomeDocument()

    $addNote(welcomeNote)
    return {}
  }
}
</script>