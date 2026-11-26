<script setup lang="ts">
import { Check, Copy, Plug } from '@lucide/vue'
import { computed, ref } from 'vue'
import { api, errorText, type DocInfo } from './api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { toast } from './ui/feedback'

const props = defineProps<{ doc: DocInfo }>()
const slug = ref(props.doc.mcp_exposed_slug)
const error = ref('')
const endpoint = `${location.origin}/mcp`
const addCmd = computed(() => `claude mcp add --transport http opennotes ${endpoint} --header "Authorization: Bearer <token with mcp scope>"`)

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(addCmd.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

async function toggle() {
  error.value = ''
  try {
    slug.value = (await api<{ mcp_exposed_slug: string | null }>(`/v1/docs/${props.doc.id}/mcp`, { method: 'PUT', body: { enabled: !slug.value } })).mcp_exposed_slug
  } catch (e) {
    error.value = errorText(e)
    toast(error.value, 'error')
  }
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="rounded-full bg-background/85 backdrop-blur" :class="slug ? 'text-emerald-700 hover:text-emerald-800' : 'text-muted-foreground'">
        <span v-if="slug" class="size-2 rounded-full bg-emerald-500" /><Plug v-else />MCP{{ slug ? ': Live' : '' }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="grid w-[26rem] gap-3">
      <div class="flex items-center justify-between gap-3">
        <Label for="mcp-switch" class="grid gap-0.5">
          <span>Let my agents read this page</span>
          <span class="text-xs font-normal text-muted-foreground">Read-only, over your MCP endpoint.</span>
        </Label>
        <Switch id="mcp-switch" :model-value="!!slug" class="data-[state=checked]:bg-emerald-600" @update:model-value="toggle" />
      </div>
      <p v-if="error" role="alert" class="text-xs text-destructive">{{ error }}</p>
      <template v-if="slug">
        <p class="text-xs text-muted-foreground">Agents connected to your MCP endpoint can list and read it as <code class="rounded-sm bg-muted px-1 text-foreground">{{ slug }}</code>, including margin notes and canvas text. They can't edit it.</p>
        <div class="text-xs">
          <div class="mb-1.5 text-muted-foreground">Connect Claude Code (create an <em>mcp</em> token in Settings):</div>
          <div class="relative rounded-md bg-primary p-3 pr-10 font-mono text-[11px] leading-relaxed text-primary-foreground">
            <code class="block break-all">{{ addCmd }}</code>
            <Button variant="ghost" size="icon-xs" class="absolute top-2 right-2 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground" :aria-label="copied ? 'Copied' : 'Copy command'" @click="copy">
              <Check v-if="copied" /><Copy v-else />
            </Button>
          </div>
        </div>
      </template>
    </PopoverContent>
  </Popover>
</template>
