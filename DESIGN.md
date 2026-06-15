---
name: tempoll
description: Account-free, self-hostable When2Meet alternative with a live heatmap.
colors:
  tempoll-teal: "oklch(0.52 0.15 192.8)"
  teal-ink: "oklch(0.98 0.01 84.36)"
  warm-paper: "oklch(0.98 0.012 84.36)"
  dusk-ink: "oklch(0.23 0.02 229.72)"
  sand-linen: "oklch(0.93 0.03 79.57)"
  sand-linen-ink: "oklch(0.28 0.04 230.11)"
  apricot-wash: "oklch(0.92 0.05 67.92)"
  page-tint: "oklch(0.95 0.015 84.36)"
  slate-blue: "oklch(0.52 0.02 230.52)"
  paper-edge: "oklch(0.88 0.02 84.36)"
  alert-red: "oklch(0.62 0.21 25.03)"
  alert-red-ink: "oklch(0.98 0.01 84.36)"
  dune: "oklch(0.82 0.09 75.19)"
  mint-signal: "oklch(0.72 0.14 167.12)"
  cool-sky: "oklch(0.68 0.16 202.5)"
  lime-flag: "oklch(0.72 0.14 120.32)"
  coral: "oklch(0.75 0.14 20.1)"
typography:
  display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body-small:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label-eyebrow:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
    textTransform: "uppercase"
rounded:
  sm: "0.6rem"
  md: "0.8rem"
  lg: "1rem"
  xl: "1.4rem"
  2xl: "1.8rem"
components:
  button-primary:
    backgroundColor: "{colors.tempoll-teal}"
    textColor: "{colors.teal-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.tempoll-teal}"
    textColor: "{colors.teal-ink}"
  button-outline:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.dusk-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "{colors.sand-linen}"
    textColor: "{colors.sand-linen-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.dusk-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  card:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.dusk-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  badge-primary:
    backgroundColor: "{colors.tempoll-teal}"
    textColor: "{colors.teal-ink}"
    rounded: "{rounded.md}"
    padding: "0.125rem 0.625rem"
  badge-secondary:
    backgroundColor: "{colors.sand-linen}"
    textColor: "{colors.sand-linen-ink}"
    rounded: "{rounded.md}"
    padding: "0.125rem 0.625rem"
  segmented-control:
    backgroundColor: "{colors.warm-paper}"
    rounded: "{rounded.md}"
    padding: "0.125rem"
    height: "2rem"
  segmented-control-item-active:
    backgroundColor: "{colors.sand-linen}"
    textColor: "{colors.sand-linen-ink}"
    rounded: "{rounded.sm}"
    padding: "0 0.75rem"
  heatmap-cell-full:
    backgroundColor: "{colors.tempoll-teal}"
    rounded: "{rounded.sm}"
    height: "1.75rem"
---

# Design System: tempoll

## 1. Overview

**Creative North Star: "The Cool Tool"**

tempoll is a tool that looks like it was built by someone who uses it. The aesthetic is *functional confidence*: the heatmap is the product, and every surrounding element is calibrated to make that grid feel inevitable, fast, and a little bit hand-made. Linear's typographic discipline meets Raycast's small-but-real personality. The bias is always toward density and information over decoration, but never at the cost of warmth.

The system explicitly rejects three families of look: the **Calendly-style SaaS landing** (stacked feature shelves, trusted-by logos, hero laptops), the **default shadcn / Tailwind-UI demo** (slate-on-cream, pill badges, identical icon-plus-heading card grids), and the **generic AI tool tells** named in PRODUCT.md (gradient text, glassmorphism, hero-metric template, side-stripe borders, em dashes in body copy). Generic is the failure mode. Every surface should be unmistakably tempoll, not "another shadcn project".

The atmosphere is warm and daylit, not corporate-neutral. The background is a paper-warm cream with two faint teal radial washes, top and bottom; the foreground text is a deep blue-tinted ink rather than pure black. The signature accent is a single, gathered teal — used sparingly, as state and structure, never as decoration. The mood is *workshop*, not *boardroom*.

**Key Characteristics:**
- Warm paper background (oklch warm-cream) with two faint primary radial gradients as ambient atmosphere
- One signature accent: Tempoll Teal (`oklch(0.52 0.15 192.8)`), used as state and information, never as decoration
- Two-font system: Space Grotesk for headings/labels, Manrope for body. No third typeface, no system fallback drift
- Heatmap density-first scheduling grid, kept close to classic When2Meet compactness
- Whisper layering (subtle resting shadows on cards/buttons + ambient background gradient), no glassmorphism, no aggressive elevation
- Small, kept-promises of personality: tactile hover-lifts on the heatmap, a deliberate microcopy voice, visible private-link markers — never decoration for its own sake

## 2. Colors: The Daylit Workshop Palette

A restrained palette: a single saturated teal accent on a warm paper background, supported by warm linen and apricot wash tones for secondary surfaces. Chroma stays low at the extremes so the cream never goes garish and the ink never goes plastic-black.

### Primary
- **Tempoll Teal** (`oklch(0.52 0.15 192.8)`): The one branded accent. Used for the primary call-to-action, focus rings, the heatmap fill scale, the participant-selection outline, link colour, and a handful of state markers. This is the *only* saturated colour in the system and it earns its presence by being information, never decoration. Used on under ~10% of any given screen, the heatmap excepted.

### Secondary
- **Sand Linen** (`oklch(0.93 0.03 79.57)`): The warm secondary surface. Used for `secondary` button fill, active segmented-control state, secondary badges. Reads as a quiet sibling of Warm Paper, half a step warmer.
- **Apricot Wash** (`oklch(0.92 0.05 67.92)`): The hover surface and accent layer. Used for hover states on ghost/outline buttons and as an accent-foreground surface. Slightly peachier than Sand Linen, never used as a fill at rest.

### Tertiary (chart / heatmap data hues)
Used **only** in data-visualisation and example contexts (landing-page preview heatmap, future charts). Never as decorative accents in product UI.
- **Dune** (`oklch(0.82 0.09 75.19)`): warm sand, the lightest density example.
- **Mint Signal** (`oklch(0.72 0.14 167.12)`): mid-green-teal.
- **Cool Sky** (`oklch(0.68 0.16 202.5)`): cool blue, sibling of Tempoll Teal.
- **Lime Flag** (`oklch(0.72 0.14 120.32)`): yellow-green.
- **Coral** (`oklch(0.75 0.14 20.1)`): warm coral, used as the contrast hue.

### Neutral
- **Warm Paper** (`oklch(0.98 0.012 84.36)`): App background. Warm cream tinted toward the page hue, not white. Never `#fff`.
- **Page Tint** (`oklch(0.95 0.015 84.36)`): Muted surface. Used for subtle internal panels (`bg-muted/X`), the heatmap container backdrop, inactive participant rows.
- **Paper Edge** (`oklch(0.88 0.02 84.36)`): Border and input outline. The dividing line between surfaces; never used as a fill.
- **Dusk Ink** (`oklch(0.23 0.02 229.72)`): The foreground text colour. Deep, blue-tinted, never pure black. Used for headings, body, primary UI text. The blue tint is on purpose: it makes the whole system feel cooler-than-cream without ever going cold.
- **Slate Blue** (`oklch(0.52 0.02 230.52)`): Muted-foreground. Used for secondary copy, eyebrow labels, helper text, metadata.

### Destructive
- **Alert Red** (`oklch(0.62 0.21 25.03)`): Used only for destructive button variant, error states, and the `CLOSED` event badge. Not a decorative colour.

### Named Rules

**The One Teal Rule.** Tempoll Teal is the only saturated hue in the product UI at rest. If you reach for a second branded colour for a button, badge, or surface, stop — it belongs in the chart palette only. The teal's rarity is what makes the heatmap density legible at a glance.

**The Warm Paper Rule.** The app background is never `#fff` or pure neutral gray. It is always Warm Paper or one of its tinted siblings (Page Tint, Sand Linen). The two radial primary washes on `body` are part of the brand and must not be flattened to a solid fill.

**The Ink, Not Black, Rule.** Body and heading text is Dusk Ink (oklch with a blue tint), never `#000` or `oklch(0 0 0)`. Pure black on warm paper reads cheap.

## 3. Typography

**Display / Heading Font:** Space Grotesk (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Body Font:** Manrope (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Mono Font:** Space Grotesk (intentional — there is no separate mono in the system today; if a true monospace surface emerges, introduce one deliberately rather than letting the system fallback land on Courier)

**Character:** Space Grotesk's slightly geometric, slightly humanist headings sit one notch warmer than a stricter geometric (e.g. Inter, Space Mono) and pair cleanly with Manrope's friendlier, rounder body. Together they read confident-but-not-corporate: Linear's clarity, a hair more humanity.

### Hierarchy

- **Display** (Space Grotesk 600, `clamp(3rem, 7vw, 3.75rem)`, line-height 1.05, letter-spacing `-0.02em`): Hero headline only. Used on the home page H1 and the marketing surfaces. One per page maximum.
- **Headline** (Space Grotesk 600, `1.5rem` / 24px, line-height 1.15, letter-spacing `-0.01em`): Section headings, card titles inside major product surfaces (e.g. event title on the heatmap card).
- **Title** (Space Grotesk 600, `1rem` / 16px, line-height 1.25): Card titles, dialog titles, sidebar section headings. The workhorse heading size in product UI.
- **Body** (Manrope 400, `1rem` / 16px, line-height 1.55): Default reading text. Capped at 65–75ch line length on long-form surfaces (legal pages, setup wizard descriptions).
- **Body Small** (Manrope 400, `0.875rem` / 14px, line-height 1.5): UI text inside controls (buttons, inputs, labels, descriptions).
- **Label / Eyebrow** (Manrope 500, `0.625rem`–`0.6875rem` / 10–11px, line-height 1, letter-spacing `0.16em`, uppercase): Eyebrow labels above metadata clusters (the calendar/clock/users summary on the heatmap header, the "Available" / "Unavailable" subheads in the slot details panel). This is one of the small signature moments — the wide letter-spacing is the tactile detail.

### Named Rules

**The Two-Font Rule.** Two typefaces, no more. Space Grotesk for everything that wants weight and structure (headings, eyebrow labels, button text where size implies it). Manrope for everything that wants to read like prose (body, descriptions, helper text). Resist the urge to bring in a third face "for variety". Variety comes from weight, size, and letter-spacing, not from new families.

**The Wide-Eyebrow Rule.** Eyebrow labels (`text-[10px]` to `text-[11px]`) always carry `tracking-[0.14em]` to `tracking-[0.16em]` and `uppercase`. This is the system's typographic signature — never use those tiny sizes without the wide tracking, or they read as broken UI.

**The No-Italic-Body Rule.** Italic is reserved for genuine quotation or emphasis on a single word. Never italic for "ambience" or to differentiate metadata.

## 4. Elevation

tempoll uses **whisper layering**: surfaces sit just barely above the page, conveyed by a *very* subtle resting shadow (`shadow-sm`) on cards, buttons, inputs, and segmented controls, plus an ambient background atmosphere on `body`. No glassmorphism, no backdrop blur, no aggressive `shadow-lg` panels. Depth reads as soft daylight, not as floating chrome.

The `body` element carries two faint radial-gradient washes of Tempoll Teal (top and bottom, both ≤10% alpha). This is **part of the brand**, not a decoration. It is what stops the warm cream from feeling flat and signals the teal as the room temperature without ever stating it loudly.

### Shadow Vocabulary

- **Resting shadow** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-sm`): default for Card, Input, Button (outline/secondary/destructive variants), Badge (primary/destructive), SegmentedControl. Implies "this is a control or a surface", never "this is floating".
- **Lifted shadow** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` — Tailwind `shadow`): the default `Button` primary variant uses this slightly stronger resting shadow to mark it as the primary CTA. Also used on the participant colour dot.
- **Ambient background gradient** (radial primary/10 at top, radial primary/8 at bottom on body): the room temperature of the app. Not a per-component shadow; a single global wash.

### Named Rules

**The Whisper Rule.** No surface in the product UI rises above `shadow` (Tailwind default). `shadow-md`, `shadow-lg`, `shadow-xl` are reserved for transient overlays *only* (popovers, sheets, dialogs) and even then, prefer the minimum that reads clearly.

**The No-Glass Rule.** `backdrop-filter: blur(...)` and translucent-with-blur surfaces are prohibited. The existing `.glass-card` utility is explicitly `backdrop-blur-none` for that reason — it survives as a class for grep, but it has no glass in it.

**The Background-Is-Brand Rule.** The two radial primary washes on `body` are part of the design system. Do not replace `body` background with a solid colour, even on dense product surfaces. The wash is what tells the user "this is tempoll" before any logo loads.

## 5. Components

The grid is the product; everything else is a frame. Every component is *quiet by default, tactile on contact*. Hover and focus are where the personality lives.

### Buttons

Workhorse control. Always tappable, never the loudest thing on a screen.

- **Shape:** Gently rounded corners (`0.8rem` / `rounded-md`). Never pill-shaped.
- **Heights:** `xs` 1.75rem · `sm` 2rem · default 2.25rem · `lg` 2.5rem. The product almost always uses default or `sm`.
- **Primary:** Tempoll Teal fill, Teal Ink text, resting `shadow`. Hover: same fill at 90% alpha. The primary CTA is the only place teal appears as a fill in product UI; treat it like a budget.
- **Outline / Secondary / Ghost:** Warm Paper or Sand Linen fill, Dusk Ink text, Paper Edge border (outline) or none (ghost). Hover lifts to Apricot Wash with Sand Linen Ink text.
- **Hover transitions:** `transition-colors` (~150ms ease-out). Buttons do not translate or scale on hover — that level of tactility is reserved for the heatmap cells (see Heatmap below).
- **Focus:** `ring-2 ring-ring ring-offset-2` where `ring` is Tempoll Teal. Always visible. Never `outline: none` without an equivalent ring.

### Inputs / Fields

- **Style:** Warm Paper fill, Paper Edge 1px border, `0.8rem` / `rounded-md` corners, resting `shadow-sm`. Height 2.25rem matches the default button.
- **Focus:** `ring-2 ring-ring ring-offset-2` (Tempoll Teal). The border itself doesn't shift hue — the ring carries the focus signal.
- **Placeholder:** Slate Blue (muted-foreground).
- **Disabled:** 50% opacity, no pointer events.

### Cards / Containers

- **Corner Style:** Softer than buttons — `1.4rem` / `rounded-xl`. The card's roundness is what gives the daylit-workshop feel; sharp corners would push the system back toward generic SaaS.
- **Background:** Warm Paper (`card` token).
- **Border:** 1px Paper Edge.
- **Shadow:** Resting `shadow-sm` (whisper layer).
- **Internal Padding:** `1.5rem` default. Compact cards (heatmap header, slot details, participant rows) override to `1rem` or `0.75rem` — density wins.
- **No nested cards.** A card never contains another card. Internal sections use `rounded-md` muted containers (`bg-muted/20`) or `border-t` dividers instead.

### Badges

- **Shape:** `0.8rem` / `rounded-md` corners (matching buttons), small height (~20–28px).
- **Primary:** Tempoll Teal fill, Teal Ink text. Used sparingly — usually for status counters ("4 participants") on marketing surfaces.
- **Secondary:** Sand Linen fill, Sand Linen Ink text. The workhorse badge for inline metadata.
- **Destructive:** Alert Red fill, Teal Ink text. Used for `CLOSED` event status only.
- **Outline:** Foreground text, transparent fill, Paper Edge border. Used for tertiary signals.

### Segmented Control

A distinctive native component, used as the Edit / View mode toggle on the heatmap and as an inline tab pattern.

- **Container:** Warm Paper fill, 1px Paper Edge border, `0.8rem` / `rounded-md` corners, resting `shadow-sm`, `0.125rem` internal padding.
- **Item (inactive):** transparent fill, Dusk Ink text, Manrope 500 at `text-xs`. Hover: Page Tint fill.
- **Item (active):** Sand Linen fill, Sand Linen Ink text, inner `shadow-sm`. The lift is so small it reads as "settled", not as "raised".
- **Focus:** `ring-2 ring-ring`.

### Navigation (App Chrome)

The top bar carries the wordmark on the left, primary actions in the middle, and the "Recent events" surface on the right. It's a thin horizontal strip, not a full app shell. Quiet by default.

- **Background:** Warm Paper.
- **Type:** Title (Space Grotesk 600 16px) for the wordmark; Body Small (Manrope 400 14px) for actions.
- **Default state:** no underline, no background, just type.
- **Hover state:** very subtle Apricot Wash background tint, no underline shift.
- **Active route:** Tempoll Teal text with a subtle Sand Linen underline (or an explicit "active" pill — pick one, never both).

### Heatmap Cell (Signature Component)

This is the product. Compact, dense, readable, tactile.

- **Cell heights:** 15-minute slots → `1rem` (16px). 30-minute slots → `1.25rem` (20px). Larger slots → `1.75rem` (28px). Density first; never grow the cell because the page has room.
- **Density scale (single-hue alpha ramp on Tempoll Teal):**
  - 0% overlap → Warm Paper (empty cell)
  - <20% → `primary/12` (Tempoll Teal at 12% alpha)
  - 20–40% → `primary/24`
  - 40–60% → `primary/36`
  - 60–80% → `primary/50`
  - 80–<100% → `primary/65`
  - 100% (everybody available) → `primary/80`
- **Current-user selection** (Edit mode): `outline outline-2 -outline-offset-2 outline-primary` plus `ring-2 ring-inset ring-background`. The double signal (outline + inner ring) survives both light and dark cells.
- **Active view slot** (View mode): `ring-2 ring-inset ring-foreground/20`. A quieter signal because View mode is read-only.
- **Final / fixed slot** (decided meeting window): Amber-100 fill with `ring-1 ring-inset ring-amber-600/80`. Amber is the only colour outside the system palette used in product UI — it lives **here only** as the "this is the answer" marker, not anywhere else.
- **Participant highlight overlay** (when a participant is selected in the sidebar): a 135° repeating-linear-gradient of the participant's colour at ~88% alpha + a flat 24%-alpha overlay + a 2px outline at 92% alpha. This is the system's most ornamental moment, and it earns it: it lets a viewer trace one person's availability across the grid without dimming everyone else.
- **Hover (Edit mode):** `cursor-crosshair`, brightness drops to 98% (`hover:brightness-[0.98]`).
- **Hover (View mode):** `cursor-pointer`, brightness 99%.
- **Painting feedback:** the cell paints under the pointer-drag immediately (`onPointerDown` / `onPointerMove`); this is the system's signature tactile moment and must never be debounced or animated-in. It must feel like dragging a brush, not like submitting a form.

### Participant Row (Sidebar)

A small, recurring component: avatar dot + name + slot count + active marker.

- **Container:** `rounded-md` muted button (`bg-muted/20`), Paper Edge border, hover `bg-muted/35`.
- **Active state:** Page Tint background with `shadow-sm`. The colour dot remains the participant's colour at full saturation.
- **Colour dot:** `size-2.5` (10px), `rounded-full`, with a tiny `shadow-sm`. The dot is the participant's identity in the heatmap — it must match the participant-highlight overlay colour.

## 6. Do's and Don'ts

### Do:

- **Do** treat Tempoll Teal as the single saturated hue in product UI at rest. If the design needs a second colour, it belongs in the chart/heatmap palette only.
- **Do** keep the background as Warm Paper with the two radial teal washes. The wash is brand, not decoration.
- **Do** lead with density on the heatmap. If the design improves by making the grid smaller and tighter, do that. Density is the feature.
- **Do** use Dusk Ink (blue-tinted oklch) for foreground text. Never `#000`, never pure neutral gray.
- **Do** use Space Grotesk for headings and eyebrow labels, Manrope for body. Two families, no third.
- **Do** carry eyebrow labels with `tracking-[0.14em]` to `tracking-[0.16em]` + uppercase. The wide tracking is the signature.
- **Do** put personality in motion and microcopy: a tactile hover-lift on heatmap painting, a deliberate sentence in an empty state, a precise focus ring. Earn each one.
- **Do** keep components quiet at rest, tactile on contact: subtle `shadow-sm` everywhere, sharper feedback only on hover/focus/active.
- **Do** mark private organizer links visibly as sensitive in the UI. Privacy is a visual responsibility, not just a backend one.
- **Do** respect `prefers-reduced-motion`: skip the heatmap brightness-shift hover when the user has reduced motion enabled.

### Don't:

- **Don't** use gradient text. The brand is one solid Tempoll Teal, not a gradient sweep. (PRODUCT.md: "Generic AI-output tells".)
- **Don't** use glassmorphism. No `backdrop-filter: blur(...)` on UI surfaces. The `.glass-card` utility is intentionally not glass.
- **Don't** use the hero-metric template (big number + small label + supporting stats + gradient accent). It's the most-trained AI cliche; tempoll's home page is a heatmap preview, not a dashboard.
- **Don't** repeat icon-plus-heading card grids. The home page has exactly one set of three feature cards by design; don't reach for that pattern again in product UI. (PRODUCT.md: "Identical card grids".)
- **Don't** use side-stripe borders (a colored `border-left` greater than 1px) on callouts, alerts, or cards. Banned. Use full borders, leading icons, or background tints instead.
- **Don't** nest cards. A card never contains a card. Use `rounded-md` muted containers or `border-t` dividers internally.
- **Don't** add a third typeface "for variety". Variety comes from weight, size, and letter-spacing.
- **Don't** use em dashes (`—` or `--`) in body copy. Use commas, colons, semicolons, periods, or parentheses. (PRODUCT.md voice rule.)
- **Don't** lean on `shadow-md`, `shadow-lg`, `shadow-xl` in product UI. Whisper layering is the rule; transient overlays are the only exception.
- **Don't** dashboardify the heatmap. Oversized cards, "your scheduling insights" framing, big chart hero treatments — none of it. The heatmap is the product. (PRODUCT.md: "Dashboardified scheduling".)
- **Don't** use Calendly-style enterprise copy ("Get a demo", "Trusted by", "Effortless scheduling reimagined"). The voice is declarative and concrete. (PRODUCT.md: "Calendly-style enterprise overload".)
- **Don't** introduce a Cream-Slate-Pill-Inter shadcn-default skeleton. The Warm Paper + Tempoll Teal + Space Grotesk + Manrope + `rounded-xl` Card combination is the answer to "is this generic?" — keep all four legs of the table.
