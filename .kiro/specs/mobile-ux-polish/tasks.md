# Tasks: Mobile UX Polish

## Task 1: Reduce drag delay & add visual feedback on drag start

- [ ] Di `KanbanList.svelte`, ubah `TOUCH_CARD_DRAG_DELAY_MS` dari `1500` → `300`.
- [ ] Tambahkan CSS class `dragging` pada kartu saat drag aktif: `scale-[1.03] shadow-lg opacity-90 rotate-[1deg]`.
- [ ] Tambahkan `transition: transform 150ms ease-out, box-shadow 150ms ease-out` pada `.kanban-card` base class.
- [ ] Tambahkan `@media (prefers-reduced-motion: reduce)` yang disable animasi.
- [ ] Verifikasi: tap cepat (<300ms) tetap membuka detail kartu, bukan memulai drag.

## Task 2: Add mobile "Move" button as drag alternative

- [ ] Buat komponen `MobileCardMoveSheet.svelte` di `apps/web/src/lib/components/kanban/`:
  - Bottom sheet (slide-up, max-height 60vh, rounded-t-2xl)
  - Header: "Pindahkan kartu" + close button
  - List items: semua daftar di board, current list ditandai checkmark + disabled
  - Tap item → panggil `onSelect(listId)` → auto close
  - Backdrop tap atau swipe-down → close
  - Animasi: translateY(100% → 0) 250ms
- [ ] Di `KanbanCard.svelte`, tambahkan tombol "↕" (move icon) yang hanya muncul di mobile (`md:hidden`), posisi absolute bottom-right kartu.
- [ ] Tombol move membuka `MobileCardMoveSheet` dengan daftar list dari props `otherLists`.
- [ ] Saat user pilih list, panggil `onMoveToList(targetListId, 9999)` (append ke akhir).
- [ ] Semua teks Bahasa Indonesia: "Pindahkan kartu", "Pindahkan ke...", list names.

## Task 3: Scroll indicators (fade edges + dots)

- [ ] Buat komponen `ScrollIndicator.svelte` di `apps/web/src/lib/components/kanban/`:
  - Props: `containerEl: HTMLElement | null`, `itemCount: number`
  - Render: left fade gradient, right fade gradient, dot row (mobile only)
  - Fade: `pointer-events-none absolute inset-y-0 w-8` dengan gradient `from-stone-50 to-transparent`
  - Dots: `flex gap-1.5 justify-center py-2`, active dot = `bg-brand-500 w-2 h-2`, inactive = `bg-stone-300 w-1.5 h-1.5`
  - Update via `IntersectionObserver` pada list elements (threshold 0.5)
  - Hide left fade saat scrollLeft === 0, hide right fade saat scrolled to end
- [ ] Integrasikan di `KanbanBoard.svelte`:
  - Wrap scroll container dengan `relative` parent
  - Mount `ScrollIndicator` dengan ref ke scroll container
  - Dots hanya render di `md:hidden` (mobile)
- [ ] Tambahkan scroll hint animation (sekali per board per sesi):
  - Saat board load dengan >1 list, scroll container 30px ke kanan lalu kembali (600ms)
  - Cek `localStorage` key `nt:scroll-hint-{boardId}` sebelum trigger
  - Set flag setelah animasi selesai

## Task 4: Sidebar slide transition & scroll lock

- [ ] Di `Sidebar.svelte`, ubah mobile sidebar dari conditional render (`{#if mobileOpen}`) ke always-rendered dengan transform:
  - Default: `transform: translateX(-100%)` + `visibility: hidden`
  - Open: `transform: translateX(0)` + `visibility: visible`
  - Transition: `transition: transform 200ms ease-out, visibility 0s linear 0s` (open) / `transition: transform 150ms ease-in, visibility 0s linear 150ms` (close)
- [ ] Backdrop: fade-in `opacity 0→1` terpisah dari sidebar slide.
- [ ] Body scroll lock: saat `mobileOpen = true`, tambahkan `overflow: hidden` ke `document.body`. Hapus saat close.
- [ ] Cleanup: pastikan scroll lock di-remove pada `onDestroy`.

## Task 5: Active states for sidebar navigation

- [ ] Di `BoardList.svelte` (atau komponen yang render board items di sidebar):
  - Board aktif (`activeBoardId === board.id`): tambahkan `bg-brand-50 border-l-2 border-brand-500 font-semibold text-brand-700`
  - Board non-aktif: `hover:bg-stone-50 text-stone-700`
- [ ] Di `WorkspaceSwitcher.svelte`:
  - Workspace yang dipilih: tambahkan checkmark icon (SVG) di kanan + `bg-stone-100 font-medium`
  - Workspace lain: `hover:bg-stone-50`
- [ ] Transisi warna: `transition-colors duration-150`

## Task 6: Mobile breadcrumb in Topbar

- [ ] Di `Topbar.svelte`, tambahkan breadcrumb untuk mobile (`md:hidden`) saat `boardId` tersedia:
  - Format: `[Workspace name] › [Board name]`
  - Workspace name di-tap → navigate ke workspace page
  - Truncate masing-masing max 12 karakter dengan ellipsis
  - Style: `text-xs text-stone-500`, workspace part = `hover:text-brand-600`
- [ ] Props tambahan yang dibutuhkan: `workspaceName?: string`, `boardName?: string`, `workspaceId?: string`
- [ ] Pass props dari `AppShell` → `Topbar` berdasarkan context aktif.

## Task 7: Refactor CardDetailDrawer — slide-in drawer

- [ ] Refactor `CardDetailDrawer.svelte` menjadi responsive drawer:
  - **Desktop (≥768px):** Fixed right panel, width 480px, `translateX(100% → 0)`, backdrop `bg-black/20`
  - **Mobile (<768px):** Full-screen bottom sheet, `translateY(100% → 0)`, handle bar di atas (w-10 h-1 rounded-full bg-stone-300 mx-auto mt-2)
  - Animasi masuk: 250ms `cubic-bezier(0.32, 0.72, 0, 1)`
  - Animasi keluar: 200ms ease-in
- [ ] Mobile swipe-down-to-close:
  - Track touch start Y, touch move Y
  - Jika deltaY > 100px dan direction down → close drawer
  - Selama swipe, drawer ikut translateY sesuai finger position
  - Jika release sebelum threshold → snap back
- [ ] Sticky header di drawer: judul kartu (truncate) + close button (X icon)
- [ ] Konten drawer: scroll independen (`overflow-y-auto`)
- [ ] Escape key menutup (desktop) — sudah ada, pastikan tetap berfungsi
- [ ] Backdrop click menutup (desktop)
- [ ] Body scroll lock saat drawer open di mobile

## Task 8: Button tap feedback & micro-interactions

- [ ] Di `Button.svelte`, tambahkan `active:scale-[0.97] active:shadow-none` ke base class.
- [ ] Di `KanbanCard.svelte`, tambahkan hover/tap state:
  - `hover:-translate-y-px hover:shadow-sm` (sudah partial, pastikan konsisten)
  - `active:translate-y-0 active:shadow-xs` untuk tap feedback
- [ ] Toast position mobile: di `ToastHost.svelte`, ubah posisi toast dari top ke bottom di mobile:
  - Mobile: `fixed bottom-4 left-4 right-4` (atau `bottom-safe` jika ada safe area)
  - Desktop: tetap di posisi sekarang (top-right atau bottom-right)
- [ ] New card animation: saat kartu baru ditambahkan ke list, tambahkan class `animate-card-in` yang melakukan `opacity 0→1, translateY(-8px→0)` selama 200ms.
  - Definisikan `@keyframes card-in` di `app.css`
  - Trigger via flag `_isNew` pada card object yang di-clear setelah 300ms

## Task 9: Shimmer skeleton for loading states

- [ ] Buat `ShimmerSkeleton.svelte` di `apps/web/src/lib/components/common/`:
  - Props: `width?: string`, `height?: string`, `rounded?: string`, `count?: number`
  - Render: div dengan `bg-stone-200 animate-shimmer` + gradient overlay yang bergerak
  - Keyframe `shimmer`: `background-position: -200% 0 → 200% 0` (2s infinite)
- [ ] Update `KanbanSkeleton.svelte` untuk menggunakan `ShimmerSkeleton` alih-alih static gray blocks.
- [ ] Update `LoadingState.svelte`: tambahkan opsi `variant="skeleton"` yang render shimmer bars alih-alih spinner (untuk inline loading).

## Task 10: Tab underline animation

- [ ] Di `Tabs.svelte`, tambahkan animated underline indicator:
  - Render `<div>` absolute di bawah tab aktif
  - Width dan translateX dihitung berdasarkan posisi tab aktif (via `bind:this` pada tab elements)
  - Transition: `transition: transform 200ms ease-in-out, width 200ms ease-in-out`
  - Color: `bg-brand-500 h-0.5 rounded-full`
- [ ] Pastikan underline update saat `active` prop berubah.
- [ ] Fallback: jika JS belum load, underline tetap muncul di posisi yang benar (no flash).

## Task 11: Board coach mark (first-run hint)

- [ ] Buat `BoardCoachMark.svelte` di `apps/web/src/lib/components/kanban/`:
  - Cek `localStorage` key `nt:coach-board-seen`
  - Jika belum seen dan board punya ≥1 list dengan ≥1 card, tampilkan setelah 1.5s delay
  - Overlay: `fixed inset-0 bg-black/50 z-50`
  - Tooltip bubble: positioned near first card area, dengan teks:
    - "Tahan kartu untuk memindahkan ke daftar lain"
    - "Atau gunakan tombol ↕ di kartu"
    - "Geser ke kanan untuk melihat daftar lainnya"
  - Button: "Mengerti" (brand primary, centered)
  - Dismiss: set localStorage flag, remove overlay
- [ ] Integrasikan di halaman board (`+page.svelte`): render `<BoardCoachMark />` setelah kanban loaded.
- [ ] Pastikan coach mark tidak muncul jika board kosong (empty state sudah punya hint sendiri).

## Task 12: Pull-to-refresh on board (mobile)

- [ ] Di `KanbanBoard.svelte`, tambahkan pull-to-refresh untuk mobile:
  - Detect overscroll di bagian atas (touchstart + touchmove saat scrollTop === 0)
  - Tampilkan spinner indicator saat pull > 60px
  - Release → panggil `kanbanStore.refetch()`
  - Spinner hilang setelah refetch selesai
  - Hanya aktif di mobile (cek `isTouchDevice()`)
- [ ] Indicator: small spinner + "Menyegarkan..." text, positioned above board content
- [ ] Pastikan tidak conflict dengan native browser pull-to-refresh (gunakan `overscroll-behavior: contain` pada scroll container)

---

## Urutan Eksekusi (Dependency Order)

```
Task 1 (drag delay)           ← standalone, bisa langsung
Task 2 (move sheet)           ← standalone
Task 3 (scroll indicators)    ← standalone
Task 4 (sidebar transition)   ← standalone
Task 5 (active states)        ← standalone
Task 6 (breadcrumb)           ← depends on AppShell context
Task 7 (card drawer refactor) ← largest task, standalone
Task 8 (micro-interactions)   ← standalone, small changes
Task 9 (shimmer skeleton)     ← standalone
Task 10 (tab animation)       ← standalone
Task 11 (coach mark)          ← depends on Task 1, 2, 3 being done
Task 12 (pull-to-refresh)     ← standalone
```

**Rekomendasi batch:**
- **Batch 1 (Quick wins):** Task 1, 4, 5, 8 — perubahan kecil, impact besar
- **Batch 2 (Core mobile):** Task 2, 3, 7 — fitur baru utama
- **Batch 3 (Polish):** Task 6, 9, 10, 12 — refinement
- **Batch 4 (Onboarding):** Task 11 — setelah semua interaksi stabil
