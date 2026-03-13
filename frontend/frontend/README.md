# WeatherPocket Frontend UI Guide

This frontend powers the authenticated WeatherPocket chat workspace.
It is a React + Vite app with Tailwind v4-style utilities and custom CSS in `src/index.css`.

## Quick Start

1. Install deps:
	 npm install
2. Run dev server:
	 npm run dev
3. Build:
	 npm run build
4. Lint:
	 npm run lint

The app expects backend APIs to be reachable through Vite proxy/config (see `vite.config.js`).

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS 4
- react-markdown + remark-gfm

## App Structure

- `src/App.jsx`
	Auth bootstrap and page switch between login and home workspace.
- `src/features/auth/LoginScreen.jsx`
	Sign in/sign up interface.
- `src/features/home/HomeScreen.jsx`
	Main orchestration layer for chat + documents states.
- `src/components/Sidebar.jsx`
	Conversation list and conversation actions.
- `src/components/ChatArea.jsx`
	Message timeline, input dock, inline file popover/upload.
- `src/components/DocumentsPanel.jsx`
	Right panel documents browser, upload progress, file context toggles.
- `src/components/MessageBubble.jsx`
	Message rendering (human/AI), markdown display.
- `src/services/auth.js`
	Auth API calls and token helpers.
- `src/services/chat.js`
	Conversations/messages/files API calls, SSE stream parser, upload progress (XHR).
- `src/index.css`
	Global typography, utility classes, animation keyframes, dark-mode overrides.

## State Ownership (Important)

Single source of truth for conversation/chat/doc state is in `src/features/home/HomeScreen.jsx`.

- `activeConversation`: selected chat room.
- `messages`: current room message list (plus optimistic local updates).
- `activeFileIds`: files included in RAG context for next send.
- `filesMap`: metadata cache keyed by `file_id`.
- `filesRefreshToken`: forces right document panel refresh after inline upload/delete.

Child components receive callbacks and should remain mostly presentational.

## Chat + File UX Flows

### Send Message

1. `ChatArea` calls `onSend(content, activeFileIds)`.
2. `HomeScreen.handleSend` appends optimistic human + AI streaming placeholder.
3. `streamMessage(...)` yields chunks from SSE.
4. Last AI message is incrementally updated and finalized.

### Inline File Popover (in chat input)

1. Popover lists conversation files from `filesMap`.
2. Toggle file -> update `activeFileIds`.
3. Upload files -> `uploadFileWithProgress`.
4. On success, `HomeScreen.handleInlineFileUploaded` updates map/context and bumps `filesRefreshToken`.
5. Delete file from popover -> API delete + `handleInlineFileDeleted` syncs map/context and refresh token.

### Documents Panel

- Still active in parallel with inline popover (for compare/testing).
- Supports upload, search, context toggle, delete.
- Can be collapsed.

## API Assumptions

- Messages stream endpoint uses SSE-like `data: ...` chunks and `[DONE]` sentinel.
- File upload progress endpoint streams NDJSON progress events.
- File handling is currently PDF-only in backend; frontend picker is constrained to PDF MIME/extensions.

## Styling and Theming Rules

- Main visual tokens are currently zinc + yellow/amber accents.
- Dark mode uses deeper amber variants for better contrast.
- Motion should use smooth cubic-bezier curves and avoid abrupt transforms.
- Keep transitions compact and intentional; avoid large animation durations for core chat interactions.

## Safe Change Checklist

When modifying UI behaviors in chat/documents:

1. Verify `activeFileIds` remains correct after upload/delete/toggle.
2. Verify popover closes on outside click and Escape.
3. Verify both light and dark mode contrast.
4. Verify upload progress still updates and completes.
5. Verify no regressions in streaming message updates.

## Related Docs

- `AGENTS.md` for system/agent handoff conventions in this frontend.
- `docs/UI_AGENT_HANDOFF.md` for implementation map and editing playbook.
