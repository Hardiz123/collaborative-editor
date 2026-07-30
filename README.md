# Real-Time Collaborative Rich-Text Editor

A high-performance, full-stack, real-time collaborative rich-text editing platform built with **React 19**, **TipTap**, **Yjs (CRDT)**, **Go (Golang)**, **Node.js**, and **Couchbase Capella**.

This application enables multiple users to create, co-author, share, and format rich-text documents simultaneously with **zero edit conflicts**, live collaborator cursors, user presence tracking, granular access controls, and automatic persistent storage.

---

## 🌟 Key Features

- **⚡ Real-Time Collaborative Co-Editing**: Powered by Conflict-free Replicated Data Types (CRDT via Yjs) guaranteeing eventual consistency and zero edit collisions even during simultaneous typing.
- **🎯 Live Presence & Custom Cursor Carets**: Displays live collaborator avatars in the room header and real-time color-coded named cursors inside the text editor showing where each user is typing.
- **🔐 Secure Authentication & Authorization**: JWT-based authentication with bcrypt password hashing and token blacklisting for safe logout.
- **🛡️ Granular Access Controls**: Document access governance with distinct roles:
  - **Owner**: Full control over document settings, permissions, and deletion.
  - **Editor (`edit`)**: Full editing and formatting capabilities.
  - **Viewer (`read`)**: Read-only access with locked UI formatting controls.
- **🔗 Flexible Document Sharing**: Share documents via direct email invitation or generate shareable access links with custom permissions.
- **💾 Automatic Persistence**: Debounced background auto-save to Couchbase Capella with unmount hooks to ensure zero data loss.
- **📥 Multi-Format Export**: Export documents to Markdown, HTML, or Plain Text.
- **🎨 Modern Dark/Light Design**: Built with Tailwind CSS v4, Radix UI primitives, Lucide icons, and Framer Motion micro-animations.

---

## 🛠️ Technology Stack

### **Frontend Client**
- **Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Rich-Text Engine**: [TipTap](https://tiptap.dev/) (built on [ProseMirror](https://prosemirror.net/)) with StarterKit, Link, Image, TextAlign, Underline, and Highlight extensions.
- **CRDT / Real-Time Data**: [Yjs](https://yjs.dev/), `y-websocket`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-caret`
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), Radix UI primitives, [Framer Motion](https://www.framer.com/motion/)
- **State Management & Network**: [TanStack React Query v5](https://tanstack.com/query/latest), Axios, React Router v7

### **Backend REST API & Presence Server**
- **Language**: [Go (Golang 1.22+)](https://go.dev/)
- **Architecture**: Clean Layered Architecture (Handlers $\rightarrow$ Services $\rightarrow$ Repositories)
- **WebSockets**: [Gorilla WebSocket](https://github.com/gorilla/websocket) for user room presence tracking
- **Authentication**: JWT (`golang-jwt/jwt`), bcrypt password hashing
- **Database**: [Couchbase Capella](https://www.couchbase.com/products/capella/) (NoSQL document store)

### **Real-Time Collaboration Sync Server**
- **Runtime**: [Node.js](https://nodejs.org/)
- **Networking**: `ws` WebSocket library
- **Protocols**: `y-protocols` (`sync`, `awareness`), `lib0`

---

## 🏗️ Architecture & Real-Time Sync Mechanism

The platform uses a **Dual WebSocket + REST API Architecture** to separate real-time document delta synchronization from user presence and persistent data operations.

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                               React Client                              │
 └───────────┬──────────────────────────┬───────────────────────┬──────────┘
             │ 1. REST API (Auth/CRUD)  │ 2. Yjs Sync WS        │ 3. Presence WS
             ▼                          ▼                       ▼
 ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
 │     Go REST Server    │  │  Node Yjs Sync Server │  │   Go WebSocket Hub    │
 │      (Port 8080)      │  │      (Port 8081)      │  │      (Port 8080)      │
 └───────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘
             │                          │                       │
             ▼                          │                       ▼
 ┌───────────────────────┐              │               ┌───────────────────────┐
 │   Couchbase Capella   │              └───────────────►  Live Cursors & Room  │
 │   (Persistent Storage)│                              │   Collaborator List   │
 └───────────────────────┘                              └───────────────────────┘
```

### **1. Dual WebSocket Channels**
When a user opens a document (`/documents/:id`):
1. **Presence Channel (`ws://localhost:8080/ws/documents/:id`)**: Handled by the Go `Hub`. Manages connection life cycles, broadcasting `JOIN`, `LEAVE`, and `PRESENCE` events containing active user information to display live avatars in the room header.
2. **Document Collaboration Channel (`ws://localhost:8081/:id`)**: Handled by the Node.js `yjs-server`. Synchronizes document text deltas and cursor awareness states.

### **2. Conflict-Free Replicated Data Types (CRDTs)**
- Rather than sending raw text strings, TipTap delegates document state to a Yjs `Y.Doc` structure.
- Any edit (character insertion, deletion, styling change) is recorded as a deterministic CRDT operation tagged with Lamport Timestamps and unique Client IDs.
- The `y-websocket` provider sends binary `messageSync` payloads to `yjs-server`, which broadcasts them to all peers in the room.
- Because CRDTs are mathematically commutative, all connected clients converge to the **exact same text document state**, guaranteeing zero merge conflicts or text overwrites.

### **3. Awareness Protocol (Live Cursors)**
- Cursor position, text selection, username, and assigned user color are tracked using `y-protocols/awareness`.
- When a user moves their selection, `messageAwareness` packets are sent across the Yjs WebSocket.
- The frontend `CollaborationCaret` extension renders custom color-coded cursor lines and floating user labels directly in the editor DOM.

### **4. Debounced Persistence (Auto-Saving)**
- As users co-edit, the editor emits content updates.
- `EditorPage` debounces these changes (300ms delay) and sends a background `PUT /api/documents/:id` HTTP request to the Go REST API.
- The Go backend writes the updated document structure to **Couchbase Capella**.
- An unmount hook ensures any unsaved draft state is automatically flushed to the database if a user closes the tab or navigates back to the dashboard.

---

## 📁 Repository Structure

```
collaborative-editor/
├── cmd/
│   └── server/                  # Go Application Entry Point
│       └── main.go              # Server initialization & dependency injection
├── internal/
│   ├── auth/                    # JWT initialization & token verification
│   ├── db/                      # Couchbase Capella connection management
│   ├── errors/                  # Custom error handling and AppError structures
│   ├── handlers/                # HTTP & WebSocket handlers (Presentation layer)
│   ├── middleware/              # Auth & JWT validation middleware
│   ├── repository/              # Data access layer (Couchbase repositories)
│   ├── routes/                  # REST API route setup
│   ├── services/                # Core business logic layer
│   └── websocket/               # Go WebSocket Hub & Client connection pumps
├── pkg/                         # Shared domain models & data structures
├── frontend/                    # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── components/          # Reusable UI & Editor components (TipTap, Toolbar)
│   │   ├── context/             # React Context (AuthContext, ToastContext)
│   │   ├── hooks/               # Custom hooks (useYjsProvider, useDocumentWebSocket)
│   │   ├── pages/               # Application Pages (Login, Dashboard, EditorPage)
│   │   └── services/            # Axios API client functions
├── yjs-server/                  # Dedicated Node.js Yjs Collaboration WebSocket Server
│   └── server.js                # Document room management & CRDT sync protocol
├── Dockerfile                   # Docker build configuration
├── ARCHITECTURE.md              # Detailed architecture design document
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Go**: 1.22 or higher
- **Node.js**: v18 or higher (v20+ recommended)
- **npm** or **yarn**
- **Couchbase Capella Account** (or local Couchbase Server cluster)

---

### **Environment Setup**

#### **1. Go Backend Configuration (`.env` in root)**
Create a `.env` file in the root directory:
```env
PORT=8080
JWT_SECRET=your_jwt_secret_key_here
COUCHBASE_CONNECTION_STRING=couchbases://cb.example.cloud.couchbase.com
COUCHBASE_USERNAME=your_db_username
COUCHBASE_PASSWORD=your_db_password
COUCHBASE_BUCKET=collaborative_editor
```

#### **2. Frontend Configuration (`frontend/.env`)**
Create a `.env` file inside the `frontend` directory:
```env
VITE_API_URL=http://localhost:8080
VITE_YJS_WS_URL=ws://localhost:8081
```

#### **3. Yjs Collaboration Server (`yjs-server/.env`)**
```env
PORT=8081
HOST=0.0.0.0
```

---

### **Running the Application Locally**

You will need **3 terminal windows** to run the complete stack locally:

#### **Terminal 1: Start Node.js Yjs Server**
```bash
cd yjs-server
npm install
node server.js
```
*Runs on `ws://localhost:8081`*

#### **Terminal 2: Start Go REST & Presence Server**
```bash
go run cmd/server/main.go
```
*Runs on `http://localhost:8080`*

#### **Terminal 3: Start React Frontend**
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5173`*

---

## 🔌 API Routes Summary

### **Authentication & User Endpoints**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/signup` | Register a new user account | No |
| `POST` | `/api/users/login` | Authenticate user & return JWT | No |
| `POST` | `/api/users/logout` | Logout user & blacklist JWT token | Yes |
| `GET` | `/api/users/me` | Fetch current authenticated user info | Yes |

### **Document Management Endpoints**
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/documents` | List user documents | Yes |
| `POST` | `/api/documents` | Create a new document | Yes |
| `GET` | `/api/documents/:id` | Fetch document by ID & check permissions | Yes |
| `PUT` | `/api/documents/:id` | Update document title or content | Yes |
| `DELETE` | `/api/documents/:id` | Delete document (Owner only) | Yes |
| `POST` | `/api/documents/:id/collaborators` | Invite a collaborator via email | Yes |
| `POST` | `/api/documents/:id/share-link` | Generate public share link | Yes |
| `GET` | `/api/shared-links/:token` | Access document via share link token | No |

### **WebSocket Endpoints**
| Endpoint | Handler | Description |
| :--- | :--- | :--- |
| `ws://localhost:8080/ws/documents/:id?token=JWT` | Go Backend (`hub.go`) | Tracks presence (`JOIN`, `LEAVE`, active user list). |
| `ws://localhost:8081/:id` | Node.js (`server.js`) | Yjs CRDT delta synchronization and live carets. |

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
