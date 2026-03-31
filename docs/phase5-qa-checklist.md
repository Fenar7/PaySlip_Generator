## Phase 5 QA Checklist

### Audited surfaces
- Homepage on desktop and mobile shell breakpoints
- Workspace picker modal and homepage CTA flows
- Voucher, salary slip, and invoice workspaces
- Shared mobile workspace tabs and preview chrome
- Export dialog, print/export entry points, and branded recovery states

### Fixes applied
- Let the homepage header CTA cluster wrap on smaller widths so the wordmark and actions do not crowd each other
- Unmounted the homepage workspace picker when closed, returned focus to the trigger, and closed it explicitly before workspace navigation
- Tightened mobile workspace tabs so the sticky tab rail breathes better on narrow screens
- Added a default active treatment to the first desktop workspace-map item so the rail no longer reads as inert
- Reduced mobile preview chrome so the document uses more of the phone viewport
- Simplified export dialog helper cards on phones and kept richer detail for larger screens
- Normalized repeater `Remove` buttons to the shared Slipwise button treatment
- Removed stale client download helpers that no longer match the fetch-based export path

### Automated verification
- `npm run lint`
- `npm run build`
- `npm test`
- `npm run test:e2e`

### Added regression coverage
- Homepage workspace picker opens and closes cleanly
- Branded `not-found` route renders correctly
- Voucher export dialog success path from the real UI
- Salary slip export dialog failure and retry path from the real UI
- Invoice export dialog success path from the real UI

### Manual sanity checks completed
- Homepage CTA flow and picker behavior
- Workspace shell consistency across voucher, salary slip, and invoice
- Mobile tab switching and preview framing sanity pass
- Export dialog open, retry, and close behavior

### Intentionally out of scope
- No new features
- No document template redesign
- No export transport or schema changes beyond keeping the current path clean
