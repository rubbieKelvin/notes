<script setup lang="ts">
import { ArrowLeft, MailCheck } from '@lucide/vue'
import { ref } from 'vue'
import { api, errorText } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

defineProps<{ linkError?: string }>()
const email = ref('')
const sentTo = ref('')
const error = ref('')
const busy = ref(false)

async function send() {
  error.value = ''
  busy.value = true
  try {
    await api('/v1/auth/link', { body: { email: email.value } })
    sentTo.value = email.value.trim()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-stone-50 px-6">
    <div class="w-full max-w-sm rounded-xl border bg-card p-8">
      <div class="mb-8 flex items-center gap-2">
        <span class="grid size-7 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">o</span>
        <span class="font-semibold">opennotes</span>
      </div>

      <template v-if="!sentTo">
        <h1 class="text-xl font-semibold tracking-tight">Sign in</h1>
        <p class="mt-1 text-sm text-muted-foreground">We'll email you a link. No password needed. New here? The same link creates your account.</p>
        <p v-if="linkError" role="alert" class="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{{ linkError }}</p>
        <form class="mt-6 grid gap-3" @submit.prevent="send">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="email" type="email" required autofocus autocomplete="email" placeholder="you@example.com" />
          </div>
          <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" :disabled="busy" class="w-full">{{ busy ? 'Sending…' : 'Email me a sign-in link' }}</Button>
        </form>
      </template>

      <div v-else role="status">
        <div class="mb-4 grid size-11 place-items-center rounded-full bg-ai-50 text-ai-500"><MailCheck class="size-5" /></div>
        <h1 class="text-xl font-semibold tracking-tight">Check your email</h1>
        <p class="mt-1 text-sm text-muted-foreground">We sent a sign-in link to <strong class="font-medium text-foreground">{{ sentTo }}</strong>. It works once and expires in 15 minutes.</p>
        <div class="mt-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" class="-ml-2.5" @click="sentTo = ''"><ArrowLeft />Use another email</Button>
          <Button variant="ghost" size="sm" :disabled="busy" @click="send">Resend</Button>
        </div>
      </div>
    </div>
  </main>
</template>
