# Agent Guide: OpenProject to Invoice Ninja Sync

This document provides technical context for AI agents and developers working on this repository.

## 🎯 Project Overview
An automation tool to bridge **OpenProject** (time tracking) and **Invoice Ninja** (billing). It uses a 4-step wizard to filter projects, analyze tasks, configure invoice settings, and generate drafts.

## 📂 Key Architecture

### Backend (FastAPI)
- **`backend/main.py`**: The heart of the application. Handles project searching, time entry grouping (by Work Package), and the WebSocket-driven invoice generation flow.
- **`backend/clients/openproject.py`**: Recursively fetches projects and time entries. Handles pagination and data cleanup.
- **`backend/clients/invoiceninja.py`**: Manages client fetching and draft invoice creation.
- **`backend/auth.py`**: JWT token generation and verification.
- **`backend/websocket_manager.py`**: Simple manager for broadcasting progress to the frontend.

### Frontend (React + Vite)
- **`frontend/src/components/wizard/`**:
    - `Step1Filters.tsx`: Project tree and date/user selectors.
    - `Step2Analysis.tsx`: Task list with ID mapping (`#ID` in Item column).
    - `Step3Settings.tsx`: Invoice dates and footer (persisted in localStorage).
    - `Step4Execution.tsx`: WebSocket handshake and progress tracking.
- **`frontend/src/api/client.ts`**: Pre-configured Axios instance with JWT interceptor.

## ⚙️ Development Gotchas

### Environment Variables
- All vars should be in the **root** `.env`.
- Frontend vars must start with `VITE_`.
- `VITE_ALLOWED_HOSTS` handles the dev server's allowed host list (comma-separated).

### WebSocket Handshake
- The WebSocket endpoint `/api/v1/ws/{client_id}?token={jwt}` is protected.
- In React 18 development mode, `useEffect` triggers twice. We use a `mounted` ref and a 500ms debounce on the error handler in `Step4Execution.tsx` to handle this gracefully.

### Data Mapping
- **Item Column**: Mapped to `#WorkPackageID` via the `product_key` field in the Invoice Ninja payload.
- **Description Column**: Mapped to the Work Package Title via the `notes` field.

## 🛠 Common Tasks
- **To add a new filter**: Update `SearchRequest` in `main.py` and the UI in `Step1Filters.tsx`.
- **To change invoice layout**: Modify the payload in `InvoiceNinjaClient.create_invoice`.
- **To troubleshoot sync errors**: Watch the backend logs for "Fetching /time_entries" and check the groupings in the `/api/v1/op/search` response.
