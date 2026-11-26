<script setup lang="ts">
import { ref } from 'vue'
import { api, errorText } from './api'

const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await api(`/v1/auth/${mode.value}`, { body: { email: email.value, password: password.value } })
    location.reload()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-6">
    <form class="w-full max-w-xs space-y-3" @submit.prevent="submit">
      <h1 class="mb-6 text-lg text-stone-500">opennotes</h1>
      <label class="block text-sm text-stone-600">Email
        <input v-model="email" type="email" required autocomplete="email" class="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 outline-none focus:border-stone-400" />
      </label>
      <label class="block text-sm text-stone-600">Password
        <input v-model="password" type="password" required minlength="8" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" class="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 outline-none focus:border-stone-400" />
      </label>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <button :disabled="busy" class="w-full rounded-md bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-50">
        {{ mode === 'login' ? 'Sign in' : 'Create account' }}
      </button>
      <button type="button" class="w-full text-sm text-stone-500 hover:text-stone-900" @click="mode = mode === 'login' ? 'signup' : 'login'; error = ''">
        {{ mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in' }}
      </button>
    </form>
  </main>
</template>
