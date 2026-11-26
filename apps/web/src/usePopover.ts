import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

/** Open/close state that closes on outside pointerdown or Escape. The caller's container needs ref="root". */
export function usePopover() {
  const open = ref(false)
  const root = useTemplateRef<HTMLElement>('root')
  const outside = (e: PointerEvent) => { if (!root.value?.contains(e.target as Node)) open.value = false }
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
  onMounted(() => { window.addEventListener('pointerdown', outside); window.addEventListener('keydown', esc) })
  onBeforeUnmount(() => { window.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', esc) })
  return { open }
}
