# Requirements: Mobile UX Polish

## Overview
Perbaikan menyeluruh pengalaman mobile untuk New Trello — fokus pada Kanban board interaction, touch affordance, navigasi, dan card detail experience. Target: aplikasi terasa native dan intuitif di perangkat sentuh (360px–768px).

## Requirement 1: Kanban Mobile Drag Interaction Overhaul

### User Story
Sebagai pengguna mobile, saya ingin memindahkan kartu antar daftar dengan gesture yang intuitif dan cepat, tanpa harus long-press 1.5 detik yang membingungkan.

### Acceptance Criteria
- [ ] Drag kartu di mobile menggunakan long-press **300ms** (bukan 1.5 detik) dengan visual feedback berupa scale-up + shadow saat drag aktif.
- [ ] Saat user mulai long-press, kartu menampilkan animasi "lift" (scale 1.03, shadow-lg, opacity 0.9) sebagai affordance bahwa drag akan dimulai.
- [ ] Alternatif non-drag: setiap kartu memiliki tombol "Pindahkan" yang membuka bottom sheet dengan pilihan daftar tujuan (untuk user yang tidak nyaman drag).
- [ ] Daftar (list) di mobile **tidak bisa di-drag** (tetap seperti sekarang) — reorder list hanya via menu aksi.
- [ ] Saat kartu sedang di-drag, area drop target daftar lain menampilkan highlight border (brand-200) sebagai visual cue.

---

## Requirement 2: Touch Affordance & Scroll Indicators

### User Story
Sebagai pengguna mobile, saya ingin tahu bahwa ada daftar lain di kanan/kiri yang bisa saya scroll, dan saya ingin tahu cara berinteraksi dengan kartu.

### Acceptance Criteria
- [ ] Board horizontal scroll menampilkan **fade gradient** di tepi kiri/kanan saat ada konten tersembunyi di arah tersebut.
- [ ] Saat pertama kali membuka board dengan >1 list, tampilkan **scroll hint animation** (geser sedikit ke kanan lalu kembali, sekali saja per sesi).
- [ ] Setiap kartu menampilkan **swipe hint** pada first-run: tooltip kecil "Tahan untuk memindahkan" yang muncul sekali lalu tidak muncul lagi (simpan di localStorage).
- [ ] Dot indicator di bawah board menunjukkan posisi scroll horizontal (seperti carousel dots) — hanya di mobile.
- [ ] Pull-to-refresh gesture di halaman board memicu refetch kanban snapshot.

---

## Requirement 3: Navigasi & Active State Polish

### User Story
Sebagai pengguna, saya ingin tahu dengan jelas di mana saya berada dalam aplikasi — board mana yang aktif, workspace mana yang dipilih.

### Acceptance Criteria
- [ ] Board aktif di sidebar (mobile overlay) memiliki background `bg-brand-50`, left border `border-l-2 border-brand-500`, dan font-weight `font-semibold`.
- [ ] Workspace yang dipilih di WorkspaceSwitcher memiliki checkmark icon dan background highlight.
- [ ] Breadcrumb ringan di Topbar mobile: "Workspace > Board" yang bisa di-tap untuk navigasi mundur.
- [ ] Saat sidebar mobile terbuka, body scroll di-lock (prevent background scroll).
- [ ] Transisi sidebar mobile menggunakan slide-in dari kiri dengan duration 200ms ease-out (bukan instant appear).

---

## Requirement 4: Card Detail Slide-in Drawer

### User Story
Sebagai pengguna, saya ingin melihat detail kartu dalam drawer yang terasa smooth dan native — slide dari kanan di desktop, full-screen di mobile.

### Acceptance Criteria
- [ ] Desktop (≥768px): Card detail muncul sebagai drawer dari kanan, lebar 480px, dengan backdrop semi-transparan. Animasi slide-in 250ms ease-out.
- [ ] Mobile (<768px): Card detail muncul sebagai **full-screen sheet** yang slide-up dari bawah, dengan handle bar di atas untuk swipe-down-to-close.
- [ ] Swipe-down gesture di mobile menutup drawer (threshold: 100px ke bawah).
- [ ] Drawer memiliki sticky header dengan judul kartu + tombol close.
- [ ] Konten drawer scrollable secara independen dari background.
- [ ] Saat drawer terbuka, background board tetap visible (di desktop) tapi tidak interaktable.
- [ ] Keyboard Escape menutup drawer (desktop).
- [ ] URL tetap update dengan `?card=<id>` (existing behavior dipertahankan).

---

## Requirement 5: Micro-interactions & Polish

### User Story
Sebagai pengguna, saya ingin aplikasi terasa responsif dan hidup — setiap interaksi memberikan feedback visual yang jelas.

### Acceptance Criteria
- [ ] Tombol memiliki `active:scale-[0.97]` untuk feedback tap di mobile.
- [ ] Card hover/tap state: subtle lift (translateY -1px) + shadow transition.
- [ ] List header tap untuk rename: smooth height transition saat input muncul.
- [ ] Toast notifications slide-in dari bawah di mobile (bukan dari atas).
- [ ] Loading skeleton untuk kartu menggunakan shimmer animation (bukan hanya static gray).
- [ ] Saat membuat kartu baru, kartu muncul dengan fade-in + slide-down animation.
- [ ] Board tab switching menggunakan underline slide animation (bukan instant switch).

---

## Requirement 6: Lightweight First-Run Hint (Opsional)

### User Story
Sebagai pengguna baru, saya ingin petunjuk singkat tentang cara menggunakan board tanpa harus membaca dokumentasi.

### Acceptance Criteria
- [ ] Saat user pertama kali membuka board yang memiliki kartu, tampilkan **coach mark overlay** yang menunjuk ke: (1) area drag kartu, (2) tombol tambah kartu, (3) scroll horizontal.
- [ ] Coach mark bisa di-dismiss dengan tap "Mengerti" atau tap di mana saja.
- [ ] Coach mark hanya muncul sekali (flag `nt:onboarding-board-seen` di localStorage).
- [ ] Jika board kosong (empty state), tampilkan inline hint "Mulai dengan menambahkan daftar pertama Anda" dengan arrow pointing ke AddListComposer.
- [ ] Tidak ada modal blocking — semua hint bersifat non-intrusive overlay.

---

## Non-Functional Requirements

- Semua perubahan harus backward-compatible — fitur existing tidak boleh rusak.
- Animasi menggunakan CSS transitions/transforms (GPU-accelerated), bukan JavaScript animation library.
- Tidak ada dependency baru kecuali benar-benar diperlukan (sesuai steering `tech-stack.md`).
- Semua teks user-facing tetap Bahasa Indonesia.
- Performance: animasi harus 60fps, tidak ada jank saat scroll horizontal board.
- Accessibility: focus states tetap ada, aria-labels dipertahankan, reduced-motion media query dihormati.
