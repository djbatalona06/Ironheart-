# Design System: IRONHEART

> Gym-hardcore, black-and-gold. Do NOT use any gym brand's trademarked logo,
> name, or assets, or any other app's UI. Inspired-by aesthetic only. Media is
> user-uploaded or CC0.

## Color Tokens
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0A0A0A` | Page background |
| `--surface` | `#141414` | Cards |
| `--surface-2` | `#1F1F1F` | Elevated cards |
| `--border` | `#2A2A2A` | Card borders, empty calendar cell |
| `--gold` | `#D4AF37` | Primary accent, CTAs, "both trained" cell |
| `--gold-bright` | `#F5C542` | Hover, highlights |
| `--gold-dim` | `#8A7024` | Disabled gold |
| `--text` | `#F5F5F5` | Primary text, "only you" cell |
| `--text-muted` | `#A0A0A0` | Secondary text |
| `--partner` | `#5DA9E9` | "Only partner" cell, partner name/avatar ring |
| `--danger` | `#E63946` | Owes / missed, delete |
| `--success` | `#2ECC71` | Goal hit, PR, macro hit |
| `--macro-protein` | `#E63946` | Protein ring |
| `--macro-carbs` | `#F5C542` | Carbs ring |
| `--macro-fat` | `#8A7024` | Fat ring |

Partner color is blue, not red, because red already means "owes" or danger.

## Typography
- **Display**: Anton or Bebas Neue, ALL CAPS, tight tracking
- **Heading**: Inter 700
- **Body**: Inter 400/500
- **Numbers**: JetBrains Mono (weights, reps, timers, macros, day counts)

## Shape
- Radius: 8px cards, 999px pills/buttons
- Gold glow: `0 0 24px rgba(212,175,55,0.15)`
- Borders: `1px solid var(--border)`, gold on hover/focus

## Motion (CSS only)
- Page transitions: 250ms ease-out
- Button press: `scale(0.97)`
- Goal hit / challenge win: `canvas-confetti` in gold
- PR: gold pulse + `navigator.vibrate(10)` where supported
- Respect `prefers-reduced-motion`

## Key Component: `WeekCalendar`
One row per pact, Mon–Sun (week start = Monday, pact timezone).

| Cell state | Fill | Notes |
|---|---|---|
| both | `--gold` | Both partners logged ≥1 workout that day |
| me | `--text` | Only current user |
| partner | `--partner` | Only partner |
| none | `--border` | No one / rest / future day (future = outlined only) |
| today | any of the above + gold ring | |
| verified | small camera dot bottom-right | A photo is attached to that day's workout |

- **Header**: partner avatar + name, pills `You 3/4` and `Alex 2/4` (mono numbers).
  Pill turns `--success` when that person's goal is met.
- **After close**: banner `Alex owes: buy dinner` in `--danger` or
  `Both hit. Streak 6` in `--success`.
- **Interactions**: tap day → sheet with both partners' workouts that day;
  horizontal swipe → previous weeks (read-only).
- **A11y**: each cell has `aria-label` like "Wednesday: you and Alex trained,
  verified". Colors are never the only signal: cells also carry an initial
  ("Y", "A", or both) at small size.

## Other Components
- `Button` variants: gold, ghost, danger
- `Card` with gold top border on hover
- `Tabs` with gold underline
- `Dialog`: 80% black backdrop + blur
- `MacroRing`: SVG circular progress
- `LedgerRow`: "You owe Alex 2 dinners" + Settle button

## Navigation (mobile-first, 5 tabs)
**Home · Workouts · Camera (center, gold circle) · Nutrition · Wagers**
- Header: app title left; notifications bell (unread badge) + profile avatar right
- Generator lives inside Workouts (`Generate` button at top of the list)
- Wagers tab: `Pacts` (ledger) | `Challenges`

## References (feel only)
Nike Run Club (stat cards, big numbers), Strong/Hevy (logging density),
MyFitnessPal (macro rings), partner-fitness apps (weekly shared progress).

## Accessibility
- Contrast ≥ 4.5:1 (check `--partner` text on `--bg`)
- Tap targets ≥ 44px
- Focus ring: 2px gold
