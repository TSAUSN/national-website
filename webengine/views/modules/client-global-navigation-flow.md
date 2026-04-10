# Salvation Army Website: Page Context and Cookie Logic (Manager Summary)

## Executive summary

For key pages (Services, Contact Us, About Us, Stories Landing, Events Landing, Leadership), the site automatically decides which Salvation Army organizational context should be active for the visitor.

That context is saved in browser cookies and used to keep the experience consistent:

- Correct regional donate/volunteer/employment links
- Correct contact image/title/header
- Correct organization label (location, division, territory, or national)
- Correct analytics attribution

If page data is complete, the site uses that first. If not, it falls back to parent-page structure. If that is also unavailable, it safely falls back to national.

## Pages included in this flow

- Services
- Contact Us
- About Us
- Stories Landing Page
- Events Landing Page
- Leadership Landing Page

## Why this matters to the business

- Visitors see local information that matches their intended territory.
- Donation and engagement links stay region-appropriate.
- Analytics and reporting tie activity to the correct organizational level.
- Incomplete editorial data does not break navigation because fallback logic exists.

## Decision flow (plain language)

When a visitor opens one of the pages above, the site resolves context in this order:

1. Use page-level assignments (best source)
   - Linked Location
   - else Linked Division
   - else Linked Territory
2. If page-level assignments are missing, use parent-page relationships (backup source)
3. If neither is available, use National context (safe default)

This is the intended behavior:

- Explicit page assignments have highest priority.
- Site structure is the backup.
- National prevents empty or broken state.

## Territory mapping used

Once a territory is resolved, the system applies one of four territory profiles:

- Western Territory
- Eastern Territory
- Southern Territory
- Central Territory

That territory profile controls:

- Donate URL
- Volunteer URL
- Employment URL
- Ways to Give / Planned Giving / Mutual Funds URLs
- Tealium profile
- Classy campaign/organization values

## Services page: detailed behavior

Services has the most complex routing, because it can be linked at multiple levels.

- If linked to a Location:
  - Location becomes primary context.
  - Division and territory come from explicit fields if present; otherwise from the linked location.
- If not linked to a location but linked to a Division:
  - Division becomes context.
  - Territory comes from explicit field if present; otherwise from linked division.
- If linked only to a Territory:
  - Territory context is used directly.
- If none of the above are linked:
  - Parent-page context is used as backup.
- If parent is also not usable:
  - National context is applied.

## Contact/About/Stories/Events/Leadership pages: behavior

These pages follow the same pattern as Services, but without the same level of branching complexity:

- Page-level assignments first
- Parent-level backup second
- National fallback last

Result: these pages still inherit the same regional links and contact/analytics context as Services.

## What success looks like

For each page in scope, expected outcomes are:

1. The organization context is set correctly (location/division/territory/national).
2. Territory-specific links match the expected region.
3. Contact block matches the resolved context.
4. Navigation remains consistent as users move across related pages.
5. Analytics reflects the same resolved context.

## Recommended manager-level QA checks

1. Open a page with explicit Location assignment and confirm regional links/contact match that location's territory.
2. Open a page with only Division assignment and confirm territory links come from that division's territory.
3. Open a page with only Territory assignment and confirm territory profile is applied.
4. Open a page with missing assignments but valid parent context and confirm parent fallback works.
5. Open a page with no assignments and no parent context and confirm national fallback appears.

## Current operational note

The flow is designed to be resilient to missing content relationships, but data quality in page assignments still directly affects how precisely local context is chosen.
