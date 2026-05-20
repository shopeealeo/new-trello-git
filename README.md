# New Trello

A production-ready Kanban board app deployed on Cloudflare Workers + D1.

**Live:** https://new-trello-git.cicakberumur.workers.dev

## Features

- ✅ User registration & login (email/password)
- ✅ Workspaces with member management
- ✅ Boards with visibility controls (private/workspace/public)
- ✅ Lists (columns) with drag-and-drop reorder
- ✅ Cards with drag-and-drop between lists
- ✅ Card details: description, priority, due date
- ✅ Labels with color picker
- ✅ Comments on cards
- ✅ Activity log per board
- ✅ Role-based permissions (owner/admin/member/viewer)
- ✅ Responsive UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Preact + TypeScript + Vite |
| Backend | Hono.js on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Workers Static Assets |

## Quick Start (Local Development)

```bash
pnpm install
pnpm run db:init:local
pnpm run dev
```

Open http://localhost:5173

## Deploy to Cloudflare

### Prerequisites
- Node.js 20+
- pnpm
- Wrangler CLI (`pnpm add -g wrangler`)
- Cloudflare account

### Steps

1. Login to Cloudflare:
```bash
wrangler login
```

2. Create D1 database:
```bash
wrangler d1 create new-trello-db
```

3. Update `wrangler.toml` with your database_id

4. Run migrations on remote:
```bash
pnpm run db:migrate:remote
```

5. Deploy:
```bash
pnpm run deploy
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start local dev (frontend + worker) |
| `pnpm run build` | Build frontend |
| `pnpm run deploy` | Build + deploy to Cloudflare |
| `pnpm run db:init:local` | Initialize local D1 |
| `pnpm run db:migrate:local` | Apply migrations locally |
| `pnpm run db:migrate:remote` | Apply migrations to production |
| `pnpm run typecheck` | TypeScript type checking |

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Current user + workspaces

### Workspaces
- `GET /api/workspaces` - List workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `GET /api/workspaces/:id/members` - List members
- `POST /api/workspaces/:id/invites` - Add member

### Boards
- `GET /api/workspaces/:id/boards` - List boards
- `POST /api/workspaces/:id/boards` - Create board
- `GET /api/boards/:id` - Get board (with lists & cards)
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Lists
- `POST /api/boards/:id/lists` - Create list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/boards/:id/lists/reorder` - Reorder lists

### Cards
- `POST /api/lists/:id/cards` - Create card
- `GET /api/cards/:id` - Get card details
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/:id/move` - Move card
- `POST /api/cards/:id/archive` - Archive card

### Labels
- `GET /api/boards/:id/labels` - List labels
- `POST /api/boards/:id/labels` - Create label
- `PUT /api/labels/:id` - Update label
- `DELETE /api/labels/:id` - Delete label
- `POST /api/cards/:cardId/labels/:labelId` - Assign label
- `DELETE /api/cards/:cardId/labels/:labelId` - Remove label

### Comments
- `GET /api/cards/:id/comments` - List comments
- `POST /api/cards/:id/comments` - Add comment
- `PUT /api/comments/:id` - Edit comment
- `DELETE /api/comments/:id` - Delete comment

### Activity
- `GET /api/boards/:id/activity` - Board activity log
- `GET /api/cards/:id/activity` - Card activity log

## Database Schema

See `migrations/0001_initial.sql` for the full schema including:
- users, sessions
- workspaces, workspace_members
- boards, board_members
- lists, cards
- labels, card_labels
- comments
- activity_logs

## License

MIT
