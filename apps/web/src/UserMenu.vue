<script setup lang="ts">
import { LayoutGrid, LogOut, Settings } from '@lucide/vue'
import { onBeforeUnmount, ref } from 'vue'
import { api, displayName, type Me } from './api'
import SettingsDialog from './SettingsDialog.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ me: Me }>()
const settings = ref<InstanceType<typeof SettingsDialog>>()

// Other parts of the app (the MCP dialog) open Settings without holding a reference to it.
const openSettings = (e?: Event) => settings.value?.show((e as CustomEvent<string> | undefined)?.detail)
window.addEventListener('opennotes:settings', openSettings)
onBeforeUnmount(() => window.removeEventListener('opennotes:settings', openSettings))

const allNotes = () => location.assign('/notes')

async function signOut() {
  await api('/v1/auth/logout', { method: 'POST' })
  location.assign('/')
}
</script>

<template>
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" class="rounded-full p-0" aria-label="Account" :title="me.email">
        <span class="grid size-7 place-items-center rounded-full bg-ai-100 text-xs font-medium uppercase text-ai-700">{{ displayName(me)[0] }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-64">
      <DropdownMenuLabel class="flex items-center gap-2 font-normal">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-ai-100 text-sm font-medium uppercase text-ai-700">{{ displayName(me)[0] }}</span>
        <span class="grid min-w-0">
          <span class="truncate text-sm font-medium">{{ displayName(me) }}</span>
          <span class="truncate text-xs text-muted-foreground">{{ me.email }}</span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="allNotes"><LayoutGrid />All notes</DropdownMenuItem>
      <DropdownMenuItem @select="openSettings()"><Settings />Settings</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="signOut"><LogOut />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <SettingsDialog ref="settings" :me="me" />
</template>
