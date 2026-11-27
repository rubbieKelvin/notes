<script setup lang="ts">
import { ArrowLeft, MailCheck } from '@lucide/vue'
import { ref } from 'vue'
import { api, errorText } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** next: where to land after signing in. invited: they followed a link to a note shared with them. */
const props = defineProps<{ linkError?: string; next?: string; invited?: boolean }>()
const emit = defineEmits<{ signedIn: [] }>()
const email = ref('')
const sentTo = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)

async function send() {
  error.value = ''
  busy.value = true
  try {
    await api('/v1/auth/link', { body: { email: email.value, next: props.next ?? '/' } })
    sentTo.value = email.value.trim()
    code.value = ''
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}

async function verify() {
  error.value = ''
  busy.value = true
  try {
    await api('/v1/auth/code', { body: { email: sentTo.value, code: code.value } })
    emit('signedIn') // same page, now signed in: no reload, so the shared note opens right here
  } catch (e) {
    error.value = errorText(e)
    busy.value = false
  }
}

// Paste or autofill of all six digits submits on its own.
function onCode() {
  code.value = code.value.replace(/\D/g, '').slice(0, 6)
  if (code.value.length === 6 && !busy.value) verify()
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-stone-50 px-6">
    <div class="w-full max-w-sm rounded-xl border bg-card p-8">
      <div class="mb-8 flex items-center gap-2">
        <span class="grid size-7 place-items-center rounded-md bg-primary text-sm font-medium text-primary-foreground">o</span>
        <span class="font-medium">opennotes</span>
      </div>

      <template v-if="!sentTo">
        <h1 class="text-xl tracking-tight">{{ invited ? 'Sign in to open this note' : 'Sign in' }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          <template v-if="invited">Someone shared a note with you. Enter the email they invited and we'll send you a code. New here? That creates your account.</template>
          <template v-else>We'll email you a code and a link. No password needed. New here? The same email creates your account.</template>
        </p>
        <p v-if="linkError" role="alert" class="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{{ linkError }}</p>
        <form class="mt-6 grid gap-3" @submit.prevent="send">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="email" type="email" required autofocus autocomplete="email" placeholder="you@example.com" />
          </div>
          <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" :disabled="busy" class="w-full">{{ busy ? 'Sending…' : 'Email me a sign-in code' }}</Button>
        </form>
      </template>

      <div v-else>
        <div class="mb-4 grid size-11 place-items-center rounded-full bg-ai-50 text-ai-500"><MailCheck class="size-5" /></div>
        <h1 class="text-xl tracking-tight" role="status">Check your email</h1>
        <p class="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <span class="text-foreground">{{ sentTo }}</span>. Enter it below, or click the link in the email. Both expire in 15 minutes.</p>
        <form class="mt-6 grid gap-3" @submit.prevent="verify">
          <div class="grid gap-2">
            <Label for="code">Sign-in code</Label>
            <Input
              id="code" v-model="code" inputmode="numeric" autocomplete="one-time-code" autofocus maxlength="6" placeholder="123456"
              class="text-center font-mono text-lg tracking-[0.5em]" @input="onCode"
            />
          </div>
          <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" :disabled="busy || code.length !== 6" class="w-full">{{ busy ? 'Signing in…' : 'Sign in' }}</Button>
        </form>
        <div class="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" class="-ml-2.5" @click="sentTo = ''; error = ''"><ArrowLeft />Use another email</Button>
          <Button variant="ghost" size="sm" :disabled="busy" @click="send">Resend</Button>
        </div>
      </div>
    </div>
  </main>
</template>
