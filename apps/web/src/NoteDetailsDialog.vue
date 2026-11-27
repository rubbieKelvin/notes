<script setup lang="ts">
import { ref } from 'vue'
import type * as Y from 'yjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/** Title and description live in the Y.Doc's meta map, so every open tab updates as soon as this saves. */
const props = defineProps<{ meta: Y.Map<string> }>()
const open = ref(false)
const title = ref('')
const description = ref('')

function show() {
  title.value = props.meta.get('title') ?? ''
  description.value = props.meta.get('description') ?? ''
  open.value = true
}
function save() {
  props.meta.doc!.transact(() => {
    props.meta.set('title', title.value.trim())
    props.meta.set('description', description.value.trim())
  })
  open.value = false
}
defineExpose({ show })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Note details</DialogTitle>
        <DialogDescription>Shown in the note switcher and on the All notes page.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-1.5">
          <Label for="note-title">Title</Label>
          <Input id="note-title" v-model="title" placeholder="Untitled" maxlength="200" />
        </div>
        <div class="grid gap-1.5">
          <Label for="note-description">Description</Label>
          <Textarea id="note-description" v-model="description" placeholder="What this note is about" maxlength="500" rows="3" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="open = false">Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
