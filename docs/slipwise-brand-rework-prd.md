# Slipwise Brand Guidelines Rework PRD

## Summary
This PRD is a **revision of the existing Slipwise redesign direction**, not a net-new product roadmap. The current product structure is still valid:
- homepage as the public-facing entry point
- shared workspace shell for voucher, salary slip, and invoice
- detailed document-preparation pages under each module
- export, print, and live preview flows

What is changing is the **brand system, visual language, and styling direction** across those existing surfaces.

The previous Slipwise direction was built around:
- cool blue backgrounds
- bright SaaS accenting
- Manrope and Sora typography
- glow-based hero styling
- product chrome that feels more startup-SaaS than premium editorial SaaS

That direction is now being replaced with a warmer, more mature brand system inspired by the attached reference website. The new direction should feel:
- premium
- international
- restrained
- editorially refined
- calm
- product-first

It should **not** feel:
- blue SaaS
- futuristic or glassy
- overly playful
- blog-like in structure
- copied directly from the reference site

This rework will happen in phases so the brand can be rolled out safely and reviewed cleanly.

## Product Goal
Rebrand Slipwise so the product keeps its current information architecture and workflows, but presents them through a stronger and more distinctive visual system.

The end result should make Slipwise feel like:
- a serious browser-based document product
- a mature SaaS interface rather than an internal tool
- a product with its own visual identity
- a cleaner and more premium experience on both homepage and detailed workspaces

This rework is **not** about changing what the product does. It is about changing how it looks, reads, and feels.

## What Stays The Same
The following remain structurally valid and should not be rewritten unless a small visual adjustment requires it:
- the current route structure
- homepage-first product entry
- voucher, salary slip, and invoice workspaces
- export architecture unless needed for minor visual wrapper consistency
- PDF, PNG, and print flows
- live preview model
- phased rollout approach

This means:
- we do **not** need to rewrite the whole product plan from scratch
- we **do** need to replace the visual and branding assumptions inside the plan

## What Changes
The redesign should replace the old visual system with a new brand foundation based on the following locked inputs.

### Typography
Primary font:
- `Lato`

Typography goals:
- more neutral and polished than the current stack
- less “startup hero” feeling
- calmer headline rhythm
- more readable body text
- consistent use across homepage and workspaces

Rules:
- Lato should be the primary font for headings and UI unless a small technical exception is necessary
- current Manrope/Sora identity should be removed from the active brand system
- heading tracking should be calmer than the current compressed style

### Core Brand Colors
The new palette is locked to:
- title / heading text: `#222222`
- body / secondary text: `#575760`
- muted / tertiary text: `#adadad`
- accent red: `#e8401e`

These colors should be translated into semantic tokens for:
- page background
- panel background
- card background
- text primary
- text secondary
- text muted
- border subtle
- border strong
- accent
- accent hover
- focus ring
- positive / error states

### Background Direction
The overall site background should move away from pure white and blue-tinted white.

New background principles:
- warm off-white base
- softer contrast than the current homepage
- enough cleanliness for product UI
- white reserved for high-clarity inner surfaces

Approved white usage:
- form cards
- preview/document containers
- modal interiors
- top-level high-clarity content surfaces

### Accent Usage
The red accent `#e8401e` should be used with discipline.

Use it for:
- primary CTA emphasis
- inline links
- small section markers
- important highlights
- selected states when appropriate
- limited icon emphasis

Do not use it for:
- large red backgrounds
- repeated loud CTA clusters
- full-page red treatment
- every active element on the page

## Brand Translation Strategy
The attached reference is editorial and article-driven. Slipwise is a SaaS product. Therefore the redesign should **adapt** the brand language, not copy the layout model.

What to borrow:
- off-white background tone
- charcoal and muted-grey hierarchy
- restrained red accents
- refined spacing and rhythm
- cleaner, quieter page composition
- more mature content presentation

What not to copy:
- article-style page structure
- narrow reading-column product layouts
- publication-like hierarchy inside workspaces
- overly text-heavy page composition where product clarity suffers

The correct target is:
- **Adapted SaaS**

That means:
- homepage still reads like a product homepage
- workspaces still read like workspaces
- the product becomes warmer and more refined without becoming an editorial publication clone

## Rollout Plan
The phase structure remains valid, but each phase now follows the new brand direction.

### Phase 1: Brand Foundation
Goal:
- replace the old Slipwise blue identity at the token and font level

Scope:
- global font loading
- global CSS variables
- shadows
- borders
- radii
- background surfaces
- accent system
- focus and selection styling
- utility shell classes used across the product

Deliverables:
- `Lato` wired at the root
- old blue/cyan/mint token family removed from the active design system
- new off-white background and neutral surface tokens
- new red accent token family

Acceptance criteria:
- no new or major screen still depends on the old blue identity
- typography clearly reflects the new direction
- the product shell immediately feels warmer and calmer

### Phase 2: Homepage Redesign
Goal:
- redesign the homepage under the new brand without changing the homepage’s core product structure

Scope:
- sticky header
- hero
- product mockup
- feature/solutions/workflow sections
- workspace entry section
- FAQ
- final CTA
- footer
- modal and popup branding where homepage-owned

Design requirements:
- remove blue glow-led hero styling
- replace the current cold visual tone with warm off-white and charcoal
- redesign CTA hierarchy under the red-accent system
- make the mockup calmer, cleaner, and less bright-SaaS
- keep the homepage product-led, not article-led

Acceptance criteria:
- homepage clearly reflects the new brand guidelines
- old Slipwise blue visual DNA is no longer present
- sections feel cohesive under the new typography, surface, and accent system
- mobile homepage also reflects the same maturity

### Phase 3: Workspace Shell Redesign
Goal:
- apply the new brand system to voucher, salary slip, and invoice workspaces without changing their product structure

Scope:
- workspace page header areas
- shell backgrounds
- section wrappers
- action rows and buttons
- builder/preview framing
- navigation pills/tabs
- mobile workspace tabs
- modals and dialogs

Design requirements:
- reduce the current cold, bright shell language
- align workspace chrome with the calmer homepage
- use red only where it creates clear hierarchy
- preserve clarity for form-heavy screens

Acceptance criteria:
- all three workspaces feel like one product under the new brand
- old blue shell cues are gone
- workspace actions and dialogs match the homepage’s new tone

### Phase 4: Component and Interaction Polish
Goal:
- normalize the component layer after the homepage and workspace shells are migrated

Scope:
- buttons
- links
- pills
- cards
- forms
- tabs
- modals
- export dialog
- workspace picker
- helper text
- empty/error states

Interaction principles:
- subtle hover behavior
- fast, stable transitions
- no heavy or flashy motion
- interactions should feel premium and quiet

Acceptance criteria:
- shared components no longer carry old styling logic
- overlays and small surfaces feel fully designed, not partially migrated
- mobile component behavior remains clean and usable

### Phase 5: Production Readiness and QA
Goal:
- verify that the new brand system is consistent and stable in production-ready conditions

Scope:
- desktop, tablet, and mobile review
- homepage review
- voucher review
- salary slip review
- invoice review
- export modal review
- workspace picker review
- print/PDF/PNG checks after the redesign
- Vercel/live review after brand rollout

Acceptance criteria:
- no screen looks split between old and new brand systems
- all critical flows still work
- the redesign feels intentional across the product, not only on the homepage

## Homepage Direction Under The New Brand
The homepage structure remains valid. The problem is the old styling system, not the homepage concept itself.

This means the homepage should keep:
- product-first hero
- clear CTA hierarchy
- feature and workflow explanation
- workspace/module entry points
- FAQ and final CTA

But it should change:
- font
- colors
- surfaces
- mockup treatment
- spacing rhythm
- accent usage
- navigation styling
- card styling

Homepage design goals:
- warmer
- cleaner
- less glossy
- less blue
- more refined
- more typographic
- more international in tone

The homepage should still feel like a SaaS homepage, not a magazine page.

## Workspace Direction Under The New Brand
The workspaces also keep their current structure. The redesign is about the styling system wrapped around them.

That includes:
- title hierarchy
- section shells
- shell background
- preview chrome
- actions and CTA styling
- tabs and pills
- dialogs and overlays
- mobile visual treatment

Workspace design goals:
- calmer shell
- more mature typography
- less saturated chrome
- better use of off-white and white layering
- restrained red as emphasis
- preserved usability for dense form tasks

## Technical Implementation Guidance
This redesign should be implemented as a front-end design-system rollout, not a feature rewrite.

Preferred implementation order:
1. `src/app/layout.tsx`
   - update root font loading
2. `src/app/globals.css`
   - replace tokens, shell helpers, and base surface rules
3. homepage surfaces
   - header, hero, sections, mockup, footer
4. shared workspace shell
   - document layout, shared panels, dialogs
5. component layer
   - buttons, forms, cards, tabs, modals

Implementation rules:
- centralize token changes instead of scattering raw color replacements
- preserve existing behavior unless a visual wrapper requires a small compatibility fix
- do not rewrite export logic, schemas, or routing as part of the brand rework
- use shared components where possible so homepage and workspaces stay aligned

## Non-Goals
This PRD does not introduce:
- auth
- persistence
- backend expansion
- pricing/billing systems
- new product modules
- major route restructuring
- document schema redesign
- full product copy rewrite unless needed to support the new brand tone

## Risks And Mitigations
### Risk: The redesign becomes too editorial
Mitigation:
- keep product structure intact
- use editorial tone only as visual inspiration

### Risk: Red is overused
Mitigation:
- treat red as an emphasis tool, not the default interface color

### Risk: Homepage and workspaces diverge
Mitigation:
- redesign homepage and shared workspace shell under the same token system before polishing details

### Risk: Partial migration leaves old blue styling behind
Mitigation:
- phase work around shared tokens and shells first
- avoid mixing old and new surface systems in the same merged phase

## Test Plan
### Visual QA
- homepage desktop
- homepage mobile
- voucher desktop and mobile
- salary slip desktop and mobile
- invoice desktop and mobile
- export dialogs and workspace picker

### Regression QA
- PDF export
- PNG export
- print flow
- live preview
- workspace navigation
- homepage CTA flows

### Brand QA
- Lato is consistently applied
- off-white and neutral surfaces are used correctly
- charcoal and grey text hierarchy is consistent
- restrained red accent is used intentionally
- no visible blue-led legacy styling remains on user-facing surfaces

## Success Criteria
This PRD is successful when it produces a redesign that:
- preserves the product structure that already works
- replaces the old visual system decisively
- gives Slipwise a more mature and distinctive brand identity
- keeps the homepage and workspaces visually aligned
- feels premium, calm, and internationally credible

## Final Note
This is a **brand-guidelines rewrite of the existing redesign plan**, not a restart of the product roadmap. The structure is still valid. The branding assumptions are what change. Implementation should therefore keep the product architecture, preserve current flows, and apply the new identity systematically across homepage first, then workspaces.
