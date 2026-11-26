<script setup lang="ts">
import { FileText, LogOut, Menu, Plus, Settings, Trash2 } from '@lucide/vue'
import { ref } from 'vue'
import { api, errorText, type DocInfo, type Me } from './api'
import SettingsDialog from './SettingsDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { confirmDialog, toast } from './ui/feedback'

const props = defineProps<{ me: Me; doc: DocInfo; docs: DocInfo[] }>()
const settings = ref<InstanceType<typeof SettingsDialog>>()

// shortcut: switching pages reloads the app; fine while boot is fast, revisit if it isn't.
const go = (id: string) => location.assign(`/d/${id}`)

async function newPage() {
  const { id } = await api<{ id: string }>('/v1/docs', { body: {} })
  go(id)
}

async function deletePage() {
  if (!(await confirmDialog({ title: `Delete “${props.doc.title || 'Untitled'}”?`, body: "The page, its canvases and margin notes are deleted for good. This can't be undone.", confirmLabel: 'Delete page', danger: true }))) return
  try {
    await api(`/v1/docs/${props.doc.id}`, { method: 'DELETE' })
    location.assign('/')
  } catch (e) {
    toast(errorText(e), 'error')
  }
}

async function signOut() {
  await api('/v1/auth/logout', { method: 'POST' })
  location.assign('/')
}
</script>

<template>
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Menu"><Menu /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-72">
      <DropdownMenuItem @select="newPage"><Plus />New page</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel class="text-xs font-medium text-muted-foreground">Pages</DropdownMenuLabel>
      <div class="max-h-72 overflow-y-auto">
        <DropdownMenuItem v-for="d in docs" :key="d.id" :class="d.id === doc.id && 'bg-accent font-medium'" :aria-current="d.id === doc.id ? 'page' : undefined" @select="go(d.id)">
          <FileText />
          <span class="flex-1 truncate">{{ d.id === doc.id ? 'This page' : d.title || 'Untitled' }}</span>
          <Badge v-if="d.mcp_exposed_slug" variant="secondary" class="text-emerald-700">MCP</Badge>
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="settings?.show()"><Settings />Settings</DropdownMenuItem>
      <DropdownMenuItem variant="destructive" @select="deletePage"><Trash2 />Delete this page</DropdownMenuItem>
      <DropdownMenuSeparator />
      <div class="flex items-center gap-2 px-2 py-1.5">
        <span class="grid size-6 shrink-0 place-items-center rounded-full bg-ai-100 text-[11px] font-semibold uppercase text-ai-700">{{ me.email[0] }}</span>
        <span class="flex-1 truncate text-xs text-muted-foreground">{{ me.email }}</span>
        <Button variant="ghost" size="xs" @click="signOut"><LogOut />Sign out</Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
  <SettingsDialog ref="settings" :me="me" />
</template>
