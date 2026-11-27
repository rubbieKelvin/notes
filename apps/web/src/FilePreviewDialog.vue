<script setup lang="ts">
import { Download, FileIcon } from '@lucide/vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import FilePreview from './FilePreview.vue'
import { fileKind, formatSize } from './files'

/** A file at full size, or a download prompt when the browser can't show it. */
const props = defineProps<{ file: { url: string; name: string; mime: string; size: number } | null }>()
const emit = defineEmits<{ close: [] }>()
const shows = computed(() => props.file && fileKind(props.file.mime, props.file.name) !== 'file')
</script>

<template>
  <Dialog :open="!!file" @update:open="(v) => !v && emit('close')">
    <DialogContent v-if="file" class="sm:max-w-5xl">
      <DialogHeader class="pr-8">
        <DialogTitle class="truncate">{{ file.name }}</DialogTitle>
        <DialogDescription class="flex items-center gap-3">
          {{ formatSize(file.size) }}
          <Button as="a" :href="file.url" :download="file.name" variant="outline" size="sm"><Download />Download</Button>
        </DialogDescription>
      </DialogHeader>
      <div class="overflow-hidden rounded-md border">
        <FilePreview v-if="shows" v-bind="file" large />
        <div v-else class="grid place-items-center gap-2 py-16 text-sm text-muted-foreground">
          <FileIcon class="size-10" :stroke-width="1.5" />No preview for this type of file.
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
