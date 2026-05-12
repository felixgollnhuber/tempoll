# Product

## Register

product

## Users

Two audiences, with the primary one carrying the weight:

- **Primary: pragmatic adults inside a team** (work, hobby club, friend group) who need to find a meeting window fast, without making anyone create an account. They land on a public link, type a name, paint availability on a heatmap, and leave. They are not romantics about scheduling software. They want the friction gone.
- **Secondary: operators self-hosting tempoll.** Indie hackers, technical teams, privacy-minded organizations who want a polished When2Meet replacement on their own Postgres stack. They care about clean Docker/Coolify setup, sane defaults, and a product that does not embarrass them when they share the link.

The organizer is just a participant with a private manage URL. There is no "admin" persona in the heavy enterprise sense.

## Product Purpose

tempoll is a modern, account-free, self-hostable When2Meet alternative.

- Organizer creates an event from one date range, one daily window, one slot size.
- Public link goes out. Participants join with only a name and paint availability on a live heatmap.
- The system ranks the best meeting windows from shared overlap.
- The organizer holds a separate private URL to rename or remove participants and to close the board.
- Realtime updates use Postgres `LISTEN/NOTIFY` and SSE so the heatmap stays live.

Success looks like: a team finds the meeting window in fewer minutes than it took to write the message that triggered the scheduling round. The product should feel inevitable, not impressive.

## Brand Personality

Three words: **smart, calm, functional.** Reading order matters.

- *Smart* means the product knows what it is doing: ranked overlap, sensible defaults, dense compact grid, no popup begging for an email. Smart shows up in microcopy, in the absence of busywork, and in resisting feature creep.
- *Calm* means typographic discipline, restrained color, generous breathing room around dense information. Closer to Linear or Cursor than to a marketing-led SaaS landing.
- *Functional* means dense and practical over decorative. The heatmap is the product. Everything else exists to serve it.

There is room for a small amount of personality on top of that baseline. Calm with a wink, not calm and beige. One precise moment of character (a piece of copy, a small motion, a deliberate accent) is worth more than seventeen rounded cards.

Voice: declarative, concrete, no marketing puffery, no exclamation marks, no "Effortless scheduling for the modern team" energy. Short sentences. Verbs over adjectives.

## Anti-references

What tempoll must **not** look or sound like:

- **Calendly-style enterprise overload.** Stacked feature shelves, big hero images of laptops, "trusted by" logos, "Get a demo" CTAs. tempoll is the opposite end of that axis.
- **Generic AI-output tells.** All the patterns called out in the impeccable shared design laws: gradient text, glassmorphism as default, hero-metric template, identical icon-plus-heading card grids, side-stripe borders on callouts, em dashes in body copy, "modern scheduling reimagined" prose.
- **Bland-by-default SaaS.** Cream backgrounds, slate-gray text, pill badges, Inter at every size, the obvious shadcn-demo or Tailwind-UI-marketing skeleton. Generic = fad = fail.
- **Notion-clone / Vercel-dark-clone.** Borrowing somebody else's complete visual identity. tempoll has its own.
- **Dashboardified scheduling.** Oversized cards, big chart hero, "your scheduling insights" framing. The heatmap is the product, not a widget inside a dashboard.

## Design Principles

Five strategic principles. Visual specifics (palette, type scale, radii) live in DESIGN.md, not here.

1. **Density is the feature.** The scheduling grid stays close to classic When2Meet density. Compact, scannable, fast. Never expand the grid because there is empty space on the page; expand it because the user benefits.
2. **Calm with a wink.** Linear/Cursor discipline as the baseline, then one precise moment of personality per surface. Voice, motion, accent color, microcopy. Never decorative noise across the whole surface.
3. **Friction is honesty.** Account-free is a stance, not a missing feature. Surface what is private (organizer URLs) instead of hiding it. Never use dark patterns to harvest contact info.
4. **Self-hostable is the brand.** The setup wizard, the docs, the env naming, and the UI all share the same craft level. If an operator opens the repo, the README should feel made by the same hand that made the heatmap.
5. **Earn every element.** A new card, badge, illustration, or icon must justify its presence by changing the user's decision. If removing it changes nothing, remove it.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA** as the default. Not a launch-blocking priority, but anything cheap is taken.

- **Color is never the only signal.** The heatmap density scale varies lightness and saturation, not only hue, so it stays legible for the common color-vision deficiencies.
- **Reduced motion respected.** Honor `prefers-reduced-motion`. No autoplay decorative motion.
- **Keyboard reachable.** The heatmap, the create flow, and the organizer manage surface should all be operable by keyboard. Mouse-drag selection has a keyboard equivalent (arrow keys + space/enter).
- **Semantic markup as default.** Real headings, real buttons, real form labels. Radix and shadcn primitives are used as designed, not flattened into divs.
- **Focus is visible.** No `outline: none` without an equivalent ring.
- **Text contrast safe by default.** Body and UI text meet AA against the chosen surfaces. Tinted neutrals are checked, not assumed.

If a future accessibility-first audience (corporate procurement, public-sector self-hosters) shows up, this section can tighten to AAA in specific areas without rewriting the product.
