# Product Requirements Document (PRD)

**Product Name:** **opennotes** ("The Last Notebook You'll Ever Need")  
**Category:** Document-First Thinking Surface & Visual Context Engine for Human–AI Reasoning  
**Architecture:** Web App (**Vue 3 + TipTap + tldraw**) + Cloud Backend (**Rust `Axum` + `yrs` + `pgvector` + MCP**)  
**Status:** Draft v4.0 (Document-First & Vue/TipTap/tldraw Edition)

---

## 1. Executive Summary & Product Vision

### 1.1 The Problem
In the generative AI era, producing text is effortless, yet human understanding still depends on the cognitive friction of active writing and sketching. Traditional note-taking apps (Notion, Obsidian, Apple Notes) were built for an era where humans typed every word—and when connected to modern AI workflows, they degrade into **digital landfills** bloated with unverified LLM summaries, multi-pane UI clutter, and inline AI text floods that drown out the user's own voice.

### 1.2 The Vision
**opennotes** is a radical return to simplicity: **open the app, see a blank sheet, and start writing.** 

Instead of overwhelming users with multi-pane sidebars or forcing them onto a whiteboard by default, **opennotes** treats the clean writing page as your primary home—while making a **`tldraw`-fluid canvas** a first-class, embeddable block inside any document via `/canvas`. When you need room to map systems, solve equations, or explain diagrams on a livestream, one click expands that inline canvas to full screen; when you're done, it collapses right back into your prose.

* **Core Promise:** *Do more while looking like less. Your blank page stays yours; AI works quietly in the margins and background APIs.*
* **Category Framing:** A cloud-native, document-first web workbench where clean human writing, inline/expandable `tldraw` canvases, surgical AI margin notes, and bidirectional Model Context Protocol (MCP) endpoints live together without clutter.

### 1.3 Key Differentiators
1. **Blank-Sheet First (96% Pure Writing Surface):** Launching **opennotes** drops your cursor straight onto a clean, distraction-free sheet. Only a whisper-quiet floating top bar (`opennotes / Page Title`, `[● N AI]`, `[MCP]`) exists until you summon more.
2. **Inline & Expandable `/canvas` Blocks (`tldraw` SDK):** Typing `/canvas` anywhere in your document embeds a live, interactive `tldraw` board directly between paragraphs. Click **`⤢ Expand`** to take the canvas full-screen with camera bookmarks and a fading streaming laser pointer, then collapse it back inline.
3. **Zero-Flood Surgical AI Margin Notes:** Highlighting a single word or phrase (e.g., highlighting *"height"* in a sentence about boxes) attaches a compact, 2-line **AI Margin Whisper** tethered beside that line—enriching your thought without mutating or bloating your prose.
4. **Bidirectional Agentic Context (`rmcp`):** External AI scripts and webhooks push notes quietly into a top-corner `[● N AI]` pill rather than your page, while any document or expanded canvas frame can be exposed as a live, token-efficient **MCP endpoint** for Claude Code, Cursor, or OpenCode.

---

## 2. Target Personas & Unified Workflow

Every user—whether writing a video script, streaming a math derivation, or debugging a production outage—follows the same effortless loop: **Write on a Blank Sheet** $\rightarrow$ **Enrich Words in the Margin or Drop `/canvas` Inline** $\rightarrow$ **Publish or Expose via MCP.**

| Persona | Immediate Blank-Sheet Action | Inline `/canvas` & Expand Usage | AI Agent Role (Margin & API) | Final Output |
| :--- | :--- | :--- | :--- | :--- |
| **Live Streamers & Educators** | Opens blank page; types talking points or drops `/canvas` immediately | Expands `tldraw` canvas full-screen; sketches freehand, drops LaTeX math (`$$`), points with fading laser (`L`) | Attaches compact margin definitions on highlighted terms without cluttering the screen | Live educational streams, annotated boards, clean post-stream notes |
| **Solo Researchers & Filmmakers** | Writes narrative beats directly on the page; drops `/clip` timestamp nodes | Inserts `/canvas` to storyboard $\text{Hook} \rightarrow \text{Acts} \rightarrow \text{Payoff}$; expands to connect evidence | Transcribes video clips into `[● AI]` pill; attaches margin counterarguments | Tight video scripts, essays, and literature reviews in the creator's voice |
| **Engineers & Field Technicians** | Types incident hypothesis on clean sheet; runs `/runbook` snippets | Drops `/canvas` inline to sketch architecture or fault trees; expands for deep system mapping | Parses stack traces/logs into `[● AI]` pill; verifies formulas in margin notes | Architectural Decision Records (ADRs), runbooks, MCP context endpoints |

---

## 3. Minimalist Document-First UX & Ergonomics

### 3.1 The Blank-Sheet Viewport
**opennotes** eliminates permanent sidebars, file trees, and docked panels. The entire viewport is a calm, responsive sheet with progressive disclosure:

```text
+------------------------------------------------------------------------------+
|  [≡]  opennotes / Box-Geometry                 [● 2 AI]  [MCP: Live]  [⌘K]   | <-- Floating top pill
|                                                                              |
|                                                                              |
|        I like boxes. They are usually the same size in [height],             | <-- Highlighted word spawns
|        width, and breadth.                              └─▶ [AI: Cube vol.]  |     a 2-line margin whisper
|                                                                              |
|        +--------------------------------------------------------+ [⤢ Expand] |
|        |  [Inline tldraw Canvas Block]                          |            | <-- Inserted via /canvas;
|        |     ┌───────┐      supports      ┌───────────────┐     |            |     1 click expands to
|        |     │  V=s³ │ ─────────────────▶ │ Surface = 6s² │     |            |     full-screen board
|        |     └───────┘                    └───────────────┘     |            |
|        +--------------------------------------------------------+            |
|                                                                              |
|        Type '/' for commands, or highlight any word for an AI note...        |
+------------------------------------------------------------------------------+
```

### 3.2 Core Fluid Interactions
1. **Zero-Setup Blank Sheet:** Opening **opennotes** places your cursor immediately on an active document—no workspace wizards or folder trees.
2. **TipTap Rich Writing + Markdown Shortcuts:** Instant transformation for `# ` headings, `- ` lists, `[] ` tasks, `> ` quotes, and ```` ``` ```` syntax-highlighted code blocks, paired with a floating bubble menu on text selection.
3. **Slash Commands (`/`):**
   * `/canvas` — Embeds a live, interactive `tldraw` canvas block right inside your document flow.
   * `/math` (`$$`) — Inserts crisp inline or block LaTeX equations (rendered via KaTeX).
   * `/hypothesis` & `/evidence` — Inserts structured epistemic callout blocks (`Hypothesis`, `Verified Fact`, `Contradicts`).
   * `/clip` — Embeds a timestamped video/audio reference chip (`▶ 14:22 – 15:08`) with synced transcript quote.
   * `/runbook` — Inserts a command/SQL/HTTP snippet with status badge for engineering notes.
4. **Inline-to-Fullscreen Canvas Morph (`⤢ Expand`):** Clicking `⤢ Expand` (or pressing `Cmd+Shift+E` while focused on a canvas block) animates that `tldraw` block into a 100% full-screen spatial board with `tldraw`’s bottom tool dock, fading laser pointer, and camera region bookmarks (`1`–`9`). Pressing `Esc` or `Collapse` returns you seamlessly to your exact scroll position in the document.

---

## 4. Functional Requirements

### 4.1 Surgical Word-Anchored AI Collaboration (Zero Text Flooding)
* **FR-1.1 Span-Anchored AI Margin Whispers:** Highlighting any word or phrase (e.g., *"height"*) and pressing `Cmd+K` (or clicking the floating `+ AI` bubble button) attaches a **Margin Whisper** aligned to that exact line via a subtle hairline tether.
* **FR-1.2 Non-Destructive Human Text:** Your original prose remains 100% untouched. The AI whisper sits quietly in the right margin (2 lines max by default, expandable on click) with a muted `[AI]` badge so your voice always leads.
* **FR-1.3 Margin Whisper Actions:**
  * *Keep Tethered:* Remains tucked neatly beside your paragraph.
  * *Insert Below as Quote:* Explicitly promotes the note into your document flow as an attributed `[AI-Source]` block.
  * *Dismiss (`Esc`):* Deletes the whisper instantly with zero trace left behind.
* **FR-1.4 Canvas Region Annotation:** Inside an inline or expanded `tldraw` block, lassoing a hand-drawn diagram or equation and clicking `AI Annotate` places a small sticky/margin note *beside* your drawing without modifying any of your strokes.

### 4.2 Embedded & Full-Screen `tldraw` Canvas Features
* **FR-2.1 Fluid Ink, Shapes & Arrows:** Powered by `tldraw` SDK (`perfect-freehand` ink physics, pressure sensitivity, smart rectangles/arrows, and click-anywhere text).
* **FR-2.2 Math Equations on Canvas:** Custom `tldraw` shape utilizing KaTeX so users can place rendered LaTeX equations ($\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$) directly alongside freehand sketches.
* **FR-2.3 Livestreaming Ergonomics:** Includes `tldraw`’s fading **Laser Pointer** (`L`), one-key **Pure Canvas Mode** (`Cmd+\` to hide all chrome), and **Camera Bookmarks** (`1`–`9`) to glide smoothly between diagrams during live streams.
* **FR-2.4 Atomic Snapshot Persistence:** Each `/canvas` block stores its `tldraw` store snapshot (`TLStoreSnapshot`) directly inside the synced document state, keeping diagrams, equations, and prose unified in one portable document.

### 4.3 Quarantined AI Inbox (`[● N AI]` Pill) & Bidirectional MCP
* **FR-3.1 Top-Corner AI Inbox Popover:** External scripts, webhooks (`POST /v1/notes/ingest`), or CLI pushes (`opennotes push < error.log`) increment the subtle **`[● N AI]`** pill in the top bar instead of dumping text into your open sheet. Clicking the pill opens a lightweight popover to skim, `Rewrite-to-Own`, drag into your page, or dismiss.
* **FR-3.2 Bidirectional MCP Server (`rmcp`):** Any document or specific `/canvas` block can be toggled to expose an authenticated Streamable HTTP **MCP endpoint** (`mcp://opennotes/docs/{slug}`), enabling coding agents (Claude Code, Cursor) to query curated human notes, margin annotations, and structured canvas text without context bloat.
* **FR-3.3 14-Day Knowledge Half-Life:** Unreviewed items in the `[● N AI]` inbox older than 14 days automatically archive so your workspace stays clutter-free.

---

## 5. Technical Architecture & Data Model

### 5.1 Hybrid Web + Rust Stack
* **Frontend Web App (`Vue 3` + `TypeScript` + `Vite`):**
  * **Editor Engine:** **TipTap (`@tiptap/vue-3`)** with ProseMirror document schema, custom `AiMarginMark` extension (tracking exact character/Yjs relative positions for word-anchored whispers), `/` slash command menu, and subtle left-gutter authorship badges (`human` vs. `ai_agent` vs. `human_edited`).
  * **Embedded Canvas NodeView:** Custom TipTap Node (`canvasBlock`) rendered via `VueNodeViewRenderer`, mounting an isolated React root (`createRoot`) running the **`tldraw` SDK** with custom KaTeX math shapes and a full-screen portal transition for `⤢ Expand`.
  * **Real-Time CRDT Sync:** **Yjs (`y-prosemirror`)** over WebSockets—ensuring instant local responsiveness, multi-tab sync, and conflict-free background updates when an AI agent pushes a margin whisper or inbox card.
* **Cloud Backend (`Rust`):**
  * **API & Realtime Gateway:** **`Axum`** (HTTP/2 + WebSockets) paired with **`yrs`** (the wire-compatible Rust port of Yjs) to sync TipTap documents and `tldraw` block snapshots cleanly.
  * **MCP Server:** **`rmcp`** exposing curated documents and canvas blocks over Streamable HTTP with scoped OAuth/API tokens.
  * **Database & Semantic Recall:** **PostgreSQL 17+ with `pgvector`** via **`SQLx`**, powering instant semantic recall and full-text search across notes and margin annotations.

### 5.2 Core Relational Schema

```sql
-- Primary documents (each opens as a clean TipTap sheet containing prose + embedded /canvas blocks)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    parent_doc_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Optional hierarchical breadcrumb nesting
    title TEXT NOT NULL DEFAULT 'Untitled',
    yjs_state BYTEA,                       -- Canonical yrs/Yjs CRDT binary state (TipTap JSON + tldraw snapshots)
    plain_text_cache TEXT,                 -- Extracted text for fast search & MCP serialization
    mcp_exposed_slug VARCHAR(128) UNIQUE,  -- Non-null when published as a live MCP context endpoint
    embedding VECTOR(1536),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Word/span-anchored AI margin whispers (keeps human prose clean & unflooded)
CREATE TABLE margin_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    yjs_relative_anchor BYTEA NOT NULL,    -- Survives edits above/below the highlighted word (e.g., "height")
    highlighted_text TEXT NOT NULL,
    content_md TEXT NOT NULL,              -- Concise 1-2 line AI margin note
    agent_id VARCHAR(128) NOT NULL,
    status VARCHAR(24) DEFAULT 'tethered', -- tethered, promoted, dismissed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quarantined AI agent pushes (surfaces in the top-corner [● N AI] pill)
CREATE TABLE agent_inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    agent_id VARCHAR(128) NOT NULL,
    title TEXT,
    content_md TEXT NOT NULL,
    source_uri TEXT,
    media_metadata JSONB,                  -- Optional YouTube timestamps, stack trace metadata, etc.
    status VARCHAR(24) DEFAULT 'pending',  -- pending, absorbed, archived
    embedding VECTOR(1536),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Phased Rollout Roadmap (5-Week Rapid Web + Rust Build)

### Phase 1: Blank-Sheet TipTap Editor & Embedded `tldraw` Block (Weeks 1–2)
* Scaffold **Vue 3 + TypeScript + Tailwind** shell with the minimal floating top bar (`opennotes / Title`, `[⌘K]`).
* Configure **TipTap** with Markdown shortcuts, floating bubble menu, `/` slash commands, and KaTeX math support.
* Build the custom TipTap `canvasBlock` NodeView embedding **`tldraw`**, complete with **`⤢ Expand`** full-screen morphing, camera bookmarks, and laser pointer.

### Phase 2: Word-Anchored AI Margin Whispers & `[● N AI]` Inbox (Week 3)
* Implement the `AiMarginMark` extension in TipTap so highlighting any word spawns a hairline-tethered 2-line AI margin note (`Keep`, `Insert`, `Dismiss`).
* Build the top-right `[● N AI]` inbox popover with `Rewrite-to-Own` provenance tagging and drag-into-document support.

### Phase 3: Rust `Axum` Backend, `yrs` Sync & MCP Context Server (Weeks 4–5)
* Stand up the **Rust `Axum` + `SQLx` (`pgvector`) + `yrs`** WebSocket sync server and scoped API key management.
* Implement `POST /v1/notes/ingest` webhook + lightweight CLI (`opennotes push`) and the **`rmcp`** Streamable HTTP server for external coding/research agents.
* Deploy the 14-day Knowledge Half-Life background cleanup job.

---

## 7. Success Metrics (North Star KPIs)
1. **Time-to-First-Word (< 1.5 Seconds):** Users land on a ready-to-type blank sheet with zero modal friction.
2. **Zero-Flood Signal Ratio:** $>80\%$ of primary document prose remains human-authored while AI insights stay cleanly tethered in margin whispers or verified blocks.
3. **Inline Canvas Adoption:** Percentage of active documents utilizing `/canvas` blocks and `⤢ Expand` sessions for visual reasoning and livestreaming.