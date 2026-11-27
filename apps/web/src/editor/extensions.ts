import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Collaboration } from '@tiptap/extension-collaboration'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Placeholder } from '@tiptap/extensions'
import { StarterKit } from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import { markRaw } from 'vue'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'
import { askLatex } from '../ui/feedback'
import { AiMargin } from './AiMargin'
import { AiSource } from './AiSource'
import { Callout, Clip, Runbook } from './Blocks'
import { CanvasBlock } from './CanvasBlock'
import { FileBlock } from './FileBlock'
import { SlashCommand } from './SlashCommand'

/** The note schema, shared by the editor and the read-only public page. */
export function noteExtensions(o: { ydoc: Y.Doc; provider: WebsocketProvider | null; docId: string; readOnly: boolean; editor: () => Editor | undefined }) {
  const editMath = (kind: 'inline' | 'block') => async (node: PMNode, pos: number) => {
    if (o.readOnly) return
    const latex = await askLatex(node.attrs.latex)
    const chain = o.editor()?.chain().setNodeSelection(pos)
    if (latex) (kind === 'inline' ? chain?.updateInlineMath({ latex }) : chain?.updateBlockMath({ latex }))?.focus().run()
  }
  return [
    StarterKit.configure({ codeBlock: false, undoRedo: false }), // Collaboration brings its own CRDT-aware undo
    Collaboration.configure({ document: o.ydoc }),
    CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: o.readOnly ? '' : "Type '/' for commands…" }),
    Mathematics.configure({ inlineOptions: { onClick: editMath('inline') }, blockOptions: { onClick: editMath('block') } }),
    // raw: Yjs compares types by identity, a Vue proxy breaks that
    CanvasBlock.configure({ ydoc: markRaw(o.ydoc), provider: o.provider && markRaw(o.provider), docId: o.docId, readOnly: o.readOnly }),
    FileBlock.configure({ docId: o.docId, readOnly: o.readOnly }),
    AiMargin,
    AiSource,
    Callout,
    Clip,
    Runbook,
    SlashCommand,
  ]
}
