# AGENTS: WeatherPocket Frontend

This file is for future coding agents that continue UI work in this frontend.

## Objective

Make safe, incremental UI changes without breaking chat streaming, file context state, or document upload flows.

## First Files To Read

1. `src/features/home/HomeScreen.jsx`
2. `src/components/ChatArea.jsx`
3. `src/components/DocumentsPanel.jsx`
4. `src/components/MessageBubble.jsx`
5. `src/services/chat.js`
6. `src/index.css`

## Critical State Contract

`HomeScreen` owns global page state and passes it down via props.

- `activeConversation`: selected conversation.
- `messages`: active conversation messages.
- `activeFileIds`: RAG file context selection.
- `filesMap`: file metadata map for inline tags/popover.
- `filesRefreshToken`: sync trigger for documents panel reload.

If you add new file actions in `ChatArea`, propagate updates to `HomeScreen` callbacks.

## File Flows To Preserve

### Streaming chat

- `streamMessage` yields chunk strings from backend stream.
- UI appends chunks to the last AI message.
- Do not convert this into a single await response unless intentionally redesigning.

### Upload progress

- `uploadFileWithProgress` uses XHR to receive progress + streamed status.
- Keep progress event handling intact in both:
  - `ChatArea` inline upload
  - `DocumentsPanel` upload

### File context

- Toggling context must always mutate `activeFileIds` only.
- Deleting file must remove it from both `filesMap` and `activeFileIds`.

## UI/UX Conventions

- Keep interactions compact and smooth; use cubic-bezier transitions.
- Maintain dark-mode parity for every visual change.
- Preserve the current yellow/amber accent strategy:
  - light mode: yellow accents
  - dark mode: deeper amber with strong text contrast

## Editing Rules For Agents

1. Avoid broad refactors unless required.
2. Keep existing API contracts in `src/services/chat.js`.
3. Prefer local component edits over cross-file rewrites.
4. Validate changed files with lint/errors after edits.
5. Add short comments only when logic is non-obvious.

## Quick Validation Before Finishing

1. Start app with `npm run dev`.
2. Login, open a conversation, send a message.
3. Verify streaming text appears incrementally.
4. Open inline file popover in chat input:
   - toggle file context
   - upload PDF and watch progress
   - delete a file
5. Verify right `DocumentsPanel` still works and stays in sync.
6. Check both light and dark mode.

## Known Constraints

- Backend accepts PDF uploads only.
- Some UI classes are utility-heavy; keep class changes targeted.
- Root layout is intentionally full-height and overflow-restricted.
