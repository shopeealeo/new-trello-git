# Design: Mobile UX Polish

## Architecture Overview

Perubahan ini bersifat **frontend-only** — tidak ada perubahan backend/Worker/D1. Semua perbaikan terjadi di `apps/web/src/lib/components/` dan route pages.

```
apps/web/src/lib/
├── components/
│   ├── kanban/
│   │   ├── KanbanBoard.svelte        ← scroll indicators, hint animation
│   │   ├── KanbanList.svelte         ← drag delay reduction, drop highlight
│   │   ├── KanbanCard.svelte         ← tap feedback, move button mobile
│   │   ├── CardDetailDrawer.svelte   ← REFACTOR: slide-in drawer
│   │   ├── MobileCardMoveSheet.svelte ← NEW: bottom sheet move picker
│   │   ├── ScrollIndicator.svelte    ← NEW: fade edges + dots
│   │   └── BoardCoachMark.svelte     ← NEW: first-run overlay
│   ├── common/
│   │   ├── Button.svelte             ← active:scale tap feedback
│   │   ├── ToastHost.svelte          ← mobile position bottom
│   │   └── ShimmerSkeleton.svelte    ← NEW: animated skeleton
│   └── layout/
│       ├── Sidebar.svelte            ← active states, slide transition, scroll lock
│       ├── Topbar.svelte             ← breadcrumb mobile
│       └── AppShell.svelte           ← body scroll lock when sidebar open
├── stores/
│   └── onboarding-store.ts           ← NEW: localStorage flags for hints
└── utils/
    └── touch.ts                      ← NEW: swipe detection helpers
```

## Design Decisions

### 1. Drag Delay: 300ms (bukan 1500ms)

**Alasan:** 1500ms terlalu lama — user mengira app tidak responsif. 300ms cukup untuk membedakan tap (buka detail) vs drag (pindah kartu), sesuai dengan standar iOS/Android native drag behavior.

**Implementasi:** Ubah `TOUCH_CARD_DRAG_DELAY_MS` di `KanbanList.svelte` dari 1500 → 300. Tambahkan visual feedback (scale + shadow) saat delay berjalan via CSS class yang di-toggle.

### 2. Card Detail: Drawer Pattern (bukan Modal)

**Desktop:** Drawer 480px dari kanan, backdrop `bg-black/20`, konten board tetap terlihat di belakang. Ini memungkinkan user melihat konteks board sambil membaca detail kartu.

**Mobile:** Full-screen bottom sheet dengan swipe-down-to-close. Handle bar 40px di atas sebagai affordance. Ini pattern yang familiar dari Maps, Instagram, dan app native lainnya.

**Transisi:**
- Desktop: `transform: translateX(100%)` → `translateX(0)` dengan `transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1)`
- Mobile: `transform: translateY(100%)` → `translateY(0)` dengan spring-like easing

### 3. Scroll Indicators: Fade + Dots

**Fade gradient:** `pointer-events-none` overlay di kiri/kanan board scroll container. Menggunakan CSS `mask-image: linear-gradient(...)` atau pseudo-element dengan gradient from transparent to bg-color.

**Dots:** Rendered berdasarkan jumlah list dan posisi scroll. Update via `IntersectionObserver` pada setiap list element — lebih performant daripada scroll event listener.

### 4. Sidebar Transition

Saat ini sidebar mobile muncul instant (`{#if mobileOpen}`). Akan diubah ke:
- Selalu render sidebar di DOM (tapi off-screen `translateX(-100%)`)
- Toggle class untuk slide-in
- Backdrop fade-in terpisah
- Body scroll lock via `overflow: hidden` pada `<body>` saat open

### 5. Onboarding: Coach Mark Pattern

Lightweight overlay dengan:
- Semi-transparent backdrop (`bg-black/40`)
- "Spotlight" cutout pada elemen target (via `clip-path` atau box-shadow trick)
- Tooltip bubble dengan arrow pointing ke target
- Single dismiss button "Mengerti"
- Max 3 steps, auto-advance tidak diperlukan

## Component Specifications

### MobileCardMoveSheet (NEW)

```
Props:
  - open: boolean
  - cardTitle: string
  - lists: { id: string; name: string }[]
  - currentListId: string
  - onSelect: (listId: string) => void
  - onClose: () => void

Behavior:
  - Bottom sheet (slide up from bottom, max-height 60vh)
  - List items sebagai radio-style buttons
  - Current list ditandai dengan checkmark + disabled
  - Tap list lain → onSelect → auto close
  - Swipe down atau tap backdrop → close
```

### ScrollIndicator (NEW)

```
Props:
  - containerRef: HTMLElement (scroll container)
  - itemCount: number

State:
  - canScrollLeft: boolean
  - canScrollRight: boolean  
  - activeIndex: number

Renders:
  - Left fade (opacity based on canScrollLeft)
  - Right fade (opacity based on canScrollRight)
  - Dot row (only on mobile, below container)
```

### BoardCoachMark (NEW)

```
Props:
  - boardId: string
  - targets: { element: string; message: string }[]

Behavior:
  - Check localStorage `nt:onboarding-board-{boardId}` 
  - If not seen, render overlay after 1s delay
  - Highlight first target, show message
  - "Mengerti" button dismisses and sets flag
```

## Animation Specifications

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Card drag start | long-press 300ms | scale(1.03) + shadow-lg | 150ms | ease-out |
| Card drop | release | scale(1) + shadow-xs | 200ms | ease-in-out |
| Drawer open (desktop) | click card | translateX(100% → 0) | 250ms | cubic-bezier(0.32,0.72,0,1) |
| Drawer open (mobile) | click card | translateY(100% → 0) | 300ms | cubic-bezier(0.32,0.72,0,1) |
| Drawer close (mobile) | swipe down | translateY(0 → 100%) | 200ms | ease-in |
| Sidebar open | hamburger tap | translateX(-100% → 0) | 200ms | ease-out |
| Sidebar close | backdrop tap | translateX(0 → -100%) | 150ms | ease-in |
| Toast (mobile) | trigger | translateY(100% → 0) | 250ms | ease-out |
| New card appear | after create | opacity(0→1) + translateY(-8px→0) | 200ms | ease-out |
| Tab underline | tab switch | translateX + width | 200ms | ease-in-out |
| Scroll hint | first load | translateX(0 → -30px → 0) | 600ms | ease-in-out |

## Reduced Motion

Semua animasi di-wrap dengan:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 768px (mobile) | Full-screen card drawer, bottom sheet move, dots indicator, no list drag |
| ≥ 768px (tablet/desktop) | Side drawer 480px, no dots, list drag enabled |

## State Management

Onboarding flags disimpan di localStorage:
- `nt:onboarding-drag-hint-seen` — hint "tahan untuk memindahkan"
- `nt:onboarding-board-coach-seen` — coach mark overlay
- `nt:scroll-hint-shown-{boardId}` — scroll hint animation per board

Tidak perlu store Svelte untuk ini — cukup utility functions yang baca/tulis localStorage langsung.
