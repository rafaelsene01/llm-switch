---
name: LLM Switch
description: Self-hosted LLM gateway — per-user routing, quota control, multi-provider switching
colors:
  primary: "#33CC85"
  primary-dim: "#2C9664"
  background: "#09090B"
  surface: "#111113"
  surface-raised: "#202027"
  foreground: "#F4F4F5"
  foreground-muted: "#818189"
  border: "#25252C"
  destructive: "#D43A3A"
  background-light: "#FFFFFF"
  surface-light: "#F4F4F5"
  foreground-light: "#18181B"
  border-light: "#E4E4E7"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#2DB873"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: LLM Switch

## 1. Overview

**Creative North Star: "The Workshop Bench"**

This is a tool, not a product. Tools do not perform. They sit ready, legible under any light, each element placed where it belongs — not where it looks impressive. LLM Switch's visual language follows that discipline: dark by default (the admin works at night, the gateway runs silently), density earned through real hierarchy, zero surfaces that exist only to fill space.

The emerald primary is not an accent for decoration. It is a signal: active, routing, alive. When it appears, something is running. When it doesn't, nothing is asking for attention. Color here earns its place the way a status LED does — by meaning something specific every time.

This system explicitly rejects the vocabulary of SaaS dashboards: gradient hero cards, metric tiles with colored backdrops, glassmorphism panels, illustration-heavy empty states. It also rejects the opposite failure mode — the anemic shadcn/ui clone where every component reads as a default, every color is `zinc-800`, and the entire dashboard feels like a placeholder waiting for a real design.

**Key Characteristics:**
- Dark-mode default; light mode fully supported but secondary
- Single emerald accent used exclusively for active/live/interactive states
- Tinted near-black neutrals (blue-cast zinc, never pure gray)
- Density through deliberate hierarchy, not by cramming elements
- Shadows as structural layer, never decorative
- Outfit geometric sans throughout — modern, legible, not precious

## 2. Colors: The Active Signal Palette

One accent. It means one thing: the system is live.

### Primary
- **Active Signal Green** (`#33CC85` dark / `#2C9664` light): Reserved for interactive affordances (primary buttons, active nav states, toggles in the ON position, ring focus). Never used decoratively. If it's green, it either does something or it's doing something.

### Neutral
- **Void** (`#09090B`): Page background in dark mode. Near-black with a faint blue cast (HSL 240 10% 4%); never pure black.
- **Bench Surface** (`#111113`): Card/panel background. Slightly lifted from Void; the material the work sits on.
- **Raised Surface** (`#202027`): Secondary panels, hover states, selected rows. Third layer in the dark mode depth stack.
- **Ash** (`#F4F4F5`): Primary text in dark mode; page background in light mode.
- **Muted Ash** (`#818189`): Secondary text, labels, metadata. Sufficient contrast against Bench Surface (>4.5:1 verified).
- **Seam** (`#25252C`): Borders and dividers in dark mode. Barely visible — structure without noise.

### Destructive
- **Cut Red** (`#D43A3A`): Delete actions, error states, the switch-off indicator. Never used for emphasis or warnings — reserved strictly for irreversible or failed states.

### Named Rules

**The One Signal Rule.** Active Signal Green appears on ≤15% of any given screen surface. Its rarity is the information. A screen where everything is green communicates nothing; a screen where one toggle glows green tells you the gateway is running.

**The No Pure Black Rule.** `#000000` and `#FFFFFF` are prohibited. Every neutral is tinted toward the blue-zinc hue (HSL 240°). If you're about to reach for pure black, add a faint cast.

**The Gray-On-Color Prohibition.** Never place `foreground-muted` on top of a colored background. Use a tint of that color's hue or a high-contrast foreground instead. Muted text is calibrated against dark neutrals only.

## 3. Typography

**Primary Font:** Outfit (via Google Fonts, CSS var `--font-sans`)
**Fallback Stack:** system-ui, sans-serif
**Mono:** system monospace (code snippets, API keys only)

**Character:** Outfit is geometric without being cold. It reads well at small sizes (12–14px dense tables) and large ones (page titles). It does not require typographic tricks to feel intentional — but it rewards precise sizing and weight contrast.

### Hierarchy
- **Display** (semibold 600, 20px/1.3, tracking -0.025em): Page titles. One per view. `.text-page-title` utility.
- **Title** (semibold 600, 16px/1.4, tracking -0.015em): Section headers, dialog titles, card headers.
- **Body** (regular 400, 14px/1.5): All running text, table cells, form field values. Max 65ch line length.
- **Label** (semibold 600, 10px/1, tracking 0.1em, uppercase): Section labels, column headers, metadata categories. `.text-section-title` utility.
- **Caption** (regular 400, 12px): Timestamps, secondary metadata, helper text. `.text-caption` utility.

### Named Rules

**The Weight-Then-Size Rule.** Hierarchy is achieved through weight contrast first, size second. Two elements at the same size but different weights (400 vs 600) read as distinct levels. Do not introduce new size steps to establish hierarchy when a weight shift would suffice.

**The No Decorative Type Rule.** No gradient text. No outlined text. No text shadows. Weight and size are the only tools.

## 4. Elevation

This system is flat by default. Surfaces at rest carry no shadows. Depth enters only in response to state or layer: a card hovered, a modal opened, a dropdown summoned.

Three shadow levels exist in the token vocabulary:

### Shadow Vocabulary
- **card** (`0 1px 2px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.35)` in dark; lighter in light): Resting card elevation. Used on `.shadow-card`. Subtle — provides edge definition, not drama.
- **dropdown** (`0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)` in dark): Floating menus, popovers. Lifts them clearly above page content.
- **modal** (`0 24px 64px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.45)` in dark): Dialogs. Heaviest shadow; signals the highest layer.

Depth between layers is also maintained tonally: Void → Bench Surface → Raised Surface is a three-step tonal stack that works without shadows at all. Shadows reinforce; tonal hierarchy carries.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. A card on the page has `.shadow-card`. That same card on hover does not gain a larger shadow — it gains a background tint shift (Bench Surface → Raised Surface). Shadows are for floating elements, not hover feedback.

## 5. Components

### Buttons

Gently rounded (6px radius). No pill shapes. No square corners.

- **Primary:** Active Signal Green background (`#33CC85`), Void text (`#09090B`). Padding 8px 16px. Font: 14px semibold 600. Transition: background 150ms ease-out-quart. Hover → `#2DB873` (10% darker). Active → scale(0.98). Focus-visible: 2px ring in Active Signal with 2px offset.
- **Ghost/Secondary:** Transparent background, Ash text. Border: 1px Seam. Hover → Raised Surface background. Same radius, padding, font as primary.
- **Destructive:** Cut Red background, Ash text. Same shape. Reserved for delete/danger confirmations only — never used to flag warnings.
- **Disabled:** 40% opacity on any variant. Cursor: not-allowed. No hover state.

### Cards / Containers

- **Corner Style:** 8px radius (rounded-lg).
- **Background:** Bench Surface (`#111113`) in dark mode; white in light.
- **Shadow:** `.shadow-card` at rest. No hover shadow escalation.
- **Border:** 1px Seam (`#25252C` dark / `#E4E4E7` light) at 60% opacity (`border-border/60`).
- **Padding:** 20px uniform. Nested cards are prohibited.

### Inputs / Fields

- **Style:** Solid stroke border (1px Seam). Background: Void (`#09090B`) in dark, white in light. Radius: 6px.
- **Focus:** 2px ring in Active Signal, 2px offset. No border color change on focus — ring is the only indicator.
- **Error:** Border shifts to Cut Red (`#D43A3A`). Error message below in 12px Caption.
- **Disabled:** Background shifts to Raised Surface. Opacity 60%. No pointer events.
- **Placeholder:** Muted Ash (`#818189`).

### Navigation (Sidebar)

- **Structure:** Fixed left rail, 56px wide collapsed. Full-bleed from top to bottom.
- **Background:** Void — same as page, no separate panel surface.
- **Nav items:** Icon + label (when expanded). 36px height. Padding 8px. Radius 6px on hover/active.
- **Default:** Muted Ash icon + label.
- **Hover:** Raised Surface background (`#202027`). Ash text.
- **Active:** Active Signal Green icon + Ash text. Raised Surface background.
- **Section labels:** 10px semibold uppercase, tracking 0.1em, Muted Ash. Not interactive.

### Status Indicators

Pulse dot (`.animate-pulse-dot`) signals live state: 8px circle, Active Signal Green, 2.4s ease-in-out pulse. Used for "gateway running", "connection healthy". Cut Red variant for "offline", "error". No other colors used for status.

### Badges / Tags

- Small pill, 4px radius. Padding 2px 8px. 12px semibold.
- Variants: default (Raised Surface bg + Ash text), success (Active Signal bg + Void text), destructive (Cut Red bg + Ash text).
- Never use arbitrary colors for badge variants.

## 6. Do's and Don'ts

### Do:
- **Do** use Active Signal Green exclusively for interactive and live-state affordances. If it's green, it either does something or confirms something is running.
- **Do** tint all neutrals toward HSL 240° (blue-zinc). Check: if the neutral passes for pure gray on a calibrated monitor, add more tint.
- **Do** use `.shadow-card` on floating or contained panels, `.shadow-dropdown` on menus, `.shadow-modal` on dialogs. Match the token to the layer.
- **Do** keep body text at 14px minimum, max 65ch line length.
- **Do** use weight contrast (400 vs 600) as the first tool for hierarchy. Size steps are secondary.
- **Do** use `.animate-fade-in-up` (280ms ease-out-quart) for content arrival. Keep transitions 150–300ms.
- **Do** respect `prefers-reduced-motion`: wrap all non-essential animations in the media query.
- **Do** keep WCAG AA contrast on all text. Muted Ash (`#818189`) is the floor for secondary text on Bench Surface.

### Don't:
- **Don't** build SaaS dashboard layouts with gradient hero cards, colored metric tiles, or gradient-accented stat blocks. That is the category reflex this system rejects.
- **Don't** produce a generic shadcn/ui defaults clone. Every component choice must be deliberate: border radius, spacing, weight, color assignment.
- **Don't** use illustrations, large decorative icons, or motivational copy. Empty states get a small icon, a direct label, and an action. Nothing else.
- **Don't** use `border-left` greater than 1px as a colored stripe accent on cards or list items. Rewrite with a full border, a background tint, or a leading icon.
- **Don't** use gradient text (`background-clip: text`). Use solid color. Weight for emphasis.
- **Don't** use glassmorphism (`backdrop-filter: blur`) decoratively. Reserved for intentional overlay contexts only.
- **Don't** nest cards. A card inside a card is always the wrong answer.
- **Don't** place Muted Ash text on any colored background. Muted text is calibrated against dark neutrals only.
- **Don't** animate layout properties (width, height, padding, top/left). Animate transform and opacity only.
- **Don't** use bounce or elastic easing. Ease-out-quart or ease-out-expo for all transitions.
- **Don't** add more accent colors. The palette is one accent (emerald), one destructive (red), and tinted neutrals. If you feel the urge to add a warning amber or an info blue, reconsider the component design first.
