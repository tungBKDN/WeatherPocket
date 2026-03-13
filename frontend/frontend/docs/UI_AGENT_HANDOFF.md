# UI Agent Handoff Playbook

This document helps a new agent continue frontend work quickly and safely.

## 1) Current UI Architecture

- Root app switch: `src/App.jsx`
  - `checking` -> blank loading shell
  - `authenticated` -> `HomeScreen`
  - `unauthenticated` -> `LoginScreen`
- Main workspace layout: `src/features/home/HomeScreen.jsx`
  - Left: `Sidebar`
  - Middle: `ChatArea`
  - Right: `DocumentsPanel` (collapsible)

## 2) Data and Control Flow

### Conversation and message lifecycle

- Load conversations on mount.
- Load messages when `activeConversation.id` changes.
- Sending message:
  - optimistic human message added immediately
  - AI placeholder added
  - streaming chunks append to last AI message

### File lifecycle

- Files loaded per conversation.
- File metadata map (`filesMap`) is built in `HomeScreen` from `onFilesChange`.
- Context selection is just `activeFileIds`.
- Inline upload/delete in `ChatArea` updates parent via callbacks.

## 3) Component Responsibilities

### `ChatArea`

- Renders timeline + input dock.
- Owns inline file popover open/close state.
- Manages inline upload progress visuals.
- Delegates data persistence to parent callbacks.

### `DocumentsPanel`

- Lists files from backend for active conversation.
- Handles upload progress and deletes.
- Supports collapse/expand.

### `MessageBubble`

- Human and AI bubble styles.
- Markdown rendering for AI messages.
- Streaming text support.

## 4) Style and Animation Zones

Global CSS file: `src/index.css`

- Typography + font-face setup
- utility classes (`chat-scrollbar`, `no-scrollbar`)
- input dock keyframes (`chat-input-dock-*`)
- popover keyframes (`file-popover-*`)
- dark-mode overrides

When adding motion:

- Prefer `cubic-bezier(0.22, 1, 0.36, 1)` for smooth UI easing.
- Keep durations around 180-360ms for interaction elements.

## 5) Backend Contract Notes (UI-facing)

From `src/services/chat.js`:

- `streamMessage` expects stream chunks and `[DONE]` sentinel.
- `uploadFileWithProgress` reads NDJSON-like lines from `files/stream` endpoint.
- Files API currently expects PDF uploads.

Do not change event parsing lightly; both inline and panel upload flows depend on it.

## 6) Common Pitfalls

1. Updating file list in one place but not syncing `activeFileIds`.
2. Breaking outside-click close behavior for popover.
3. Changing dark-mode accent colors without checking contrast.
4. Replacing streaming flow with non-streaming response behavior.

## 7) Recommended Workflow For Future Agents

1. Read `HomeScreen`, `ChatArea`, `DocumentsPanel` first.
2. Implement minimal surface change.
3. Validate changed files for lint/compile errors.
4. Test manual chat + file actions in browser.
5. Update docs if behavior contracts changed.

## 8) Manual Test Script

1. Login.
2. Create/select a conversation.
3. Send a message and verify streaming response.
4. Open inline file popover in chat input.
5. Upload one PDF and verify progress.
6. Toggle file in/out of context.
7. Delete a file from popover.
8. Confirm right `DocumentsPanel` reflects same state.
9. Repeat in dark mode.
