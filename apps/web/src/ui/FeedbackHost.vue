<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { Textarea } from '@/components/ui/textarea'
import { feedback } from './feedback'
import 'vue-sonner/style.css'

const value = ref('')
const req = computed(() => feedback.dialog)
const prompt = computed(() => req.value?.input)
const error = computed(() => (prompt.value?.validate && value.value ? prompt.value.validate(value.value) : null))
watch(req, (r) => (value.value = r?.input?.value ?? ''))

function finish(v: string | boolean | null) {
  const r = feedback.dialog
  feedback.dialog = null
  r?.resolve(v)
}
function submit() {
  if (!value.value.trim() || error.value) return
  finish(value.value)
}
// Closing by Esc/overlay cancels; deferred so an action button's own finish(true) wins.
const onOpen = (open: boolean) => !open && setTimeout(() => finish(null))
// ⌘/Ctrl+Enter submits multi-line fields; plain Enter adds a line.
const onKey = (e: KeyboardEvent) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()
</script>

<template>
  <AlertDialog :open="!!req && !prompt" @update:open="onOpen">
    <AlertDialogContent v-if="req">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ req.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="req.body">{{ req.body }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="finish(null)">Cancel</AlertDialogCancel>
        <AlertDialogAction :class="req.danger && buttonVariants({ variant: 'destructive' })" @click="finish(true)">{{ req.confirmLabel ?? 'OK' }}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Dialog :open="!!prompt" @update:open="onOpen">
    <DialogContent v-if="req && prompt">
      <form class="grid gap-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ req.title }}</DialogTitle>
          <DialogDescription v-if="req.body">{{ req.body }}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-2">
          <Label for="fb-input">{{ prompt.label }}</Label>
          <Textarea v-if="prompt.multiline" id="fb-input" v-model="value" rows="3" :placeholder="prompt.placeholder" class="font-mono" autofocus @keydown="onKey" />
          <Input v-else id="fb-input" v-model="value" :placeholder="prompt.placeholder" autofocus />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -- preview HTML is produced by a sanitizing renderer (KaTeX) -->
        <div v-if="prompt.preview && value.trim()" class="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2" v-html="prompt.preview(value)" />
        <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
        <DialogFooter class="items-center">
          <span v-if="prompt.multiline" class="mr-auto text-xs text-muted-foreground">⌘↵ to save</span>
          <Button type="button" variant="outline" @click="finish(null)">Cancel</Button>
          <Button type="submit" :disabled="!value.trim() || !!error">{{ req.confirmLabel ?? 'OK' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <Toaster position="bottom-center" />
</template>
