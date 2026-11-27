import { Node, mergeAttributes } from '@tiptap/vue-3'

// AI text promoted into the page, always attributed. provenance: ai_agent | human_edited
export const AiSource = Node.create({
  name: 'aiSource',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({
    agent: { default: 'ai', parseHTML: (el) => el.getAttribute('data-agent'), renderHTML: (a) => ({ 'data-agent': a.agent }) },
    provenance: { default: 'ai_agent', parseHTML: (el) => el.getAttribute('data-provenance'), renderHTML: (a) => ({ 'data-provenance': a.provenance }) },
  }),
  parseHTML: () => [{ tag: 'div[data-type="ai-source"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-source' }), 0],
})
