# Brief: Done for you cold email agency (new commercial page)

Owner: Grayson (SEO). Build: Noah. Copy and head approval: Ethan. Gate and merge: Ryan (PR must link this file). IndexNow runs on merge.
Deadline: next after /meta-ads-for-distributors/ (baseline item 2; Nolan queue after M&A buyer outreach).
Written: October 28, 2026 PKT. Repo base: main at d706cb5.
Baseline: item 2 in `BASELINE_AUDIT_2026-10-28.txt`. Sibling money URL (locked): `/cold-email-agency/`.

## 0. Rules for this page (read first)

- Nolan copy rules (October 28, 2026): no dashes of any kind in the copy (no hyphen, en dash, or em dash in visible prose). No guarantees. No client names. No phone numbers. No competitor dollar figures. Nothing about Israel.
- Title 60 characters or fewer. Meta description 160 or fewer.
- Stats allowed only if already on beleaded.com and phrased the same way: 400K+ emails a day of sending capacity, 99% delivery rate across programs, 30+ client programs. Nothing else. Do not print Target up to 25,000 new contacts a month on this page.
- No prices anywhere on this page. Do not print Programs start from $2,000 a month. If `$2,000` appears in shared chrome you copy into the file, rewrite that chrome line on this page so the dollar figure is gone. The required companion sentence still ships as its own line: "Email and LinkedIn. Calling is quoted separately."
- Approved process lines from `/cold-email-agency/` and siblings you may reuse: "Most programs go live in about three weeks." "You own the list and every reply." "warmed for two to three weeks." "same business day" for replies. Open compounds in prose: done for you, cold email, plain text, 30 minute, follow up, LinkedIn.
- Capabilities only: what `/cold-email-agency/`, `/lead-generation-services/`, `/linkedin-lead-generation-agency/`, and `/outsourced-sdr-team/` already claim (verified lists, separate sending domains with SPF DKIM DMARC, plain text sequences, LinkedIn alongside email, reply handling and booking, weekly reporting, list and reply ownership). Done for you is the framing of that same work, not a new product.
- New URL. No existing URL is renamed, redirected, or removed.
- Locked pages untouched (no patches or edits): `/paid-social-agency/`, `/appointment-setting/`, `/cold-email-agency/`, `/guides/best-meeting-booking-company/`. Outbound links from this page to those URLs are fine.
- `/guides/best-b2b-lead-generation-agencies/` body is off limits until Nov 8. Do not patch that guide body for this ship.
- Do not duplicate `/guides/be-leaded-vs-belkins/` or `/guides/salesroads-alternatives/`.

## 1. The page

- URL: `https://www.beleaded.com/done-for-you-cold-email-agency/`
- File: `done-for-you-cold-email-agency/index.html` (new folder, new file)
- Slug for every Calendly link: `utm_content=done-for-you-cold-email-agency`
- Title (42 characters): `Done for You Cold Email Agency | Be Leaded`
- Meta description (148 characters): `Done for you cold email agency for B2B teams: we build lists, domains, sequences and reply handling, then book qualified meetings. Book a call.`
- H1: `Done for you cold email agency`
- Breadcrumb label: `Done for you cold email`
- og:image:alt: `Done for you cold email agency`
- article:published_time / modified_time: `2026-10-28` (or the merge date)

### Why this page

- Baseline item 2. Head commercial query "done-for-you cold email agency / DFY cold email" shows competitors only. Be Leaded is absent.
- `/cold-email-agency/` is locked and keeps the broader "cold email and appointment setting" money URL. Blog and guides already use the exact anchor "done for you cold email agency" pointing at that locked page. This new URL captures the DFY SERP without editing the locked page.
- Primary job: convert buyers who search for a done for you cold email agency (hands off, managed end to end). Differentiate from the locked sibling by DFY framing: you do not run the tools; we do.

### How this differs from `/cold-email-agency/`

| | `/cold-email-agency/` (locked) | `/done-for-you-cold-email-agency/` (this page) |
|---|---|---|
| Primary query | cold email agency | done for you cold email agency / DFY cold email |
| H1 / framing | Cold email agency that books qualified meetings | Done for you cold email agency |
| Breadcrumb | Cold email and appointment setting | Done for you cold email |
| Emphasis | Agency offer + DIY vs hire table + pricing section | Hands off managed program: you approve, we run |
| Pricing on page | Yes (locked; leave) | None |
| Status | Locked; no patches | New URL; sitemap and llms only |

## 1A. Target query

Primary query: `done for you cold email agency` (SERP also written done-for-you / DFY cold email)

Secondary queries:
- `DFY cold email`
- `done for you cold email`
- `managed cold email agency`
- `hands off cold email agency`

Monthly search volume: not available from free tools. No volume figure appears in this brief.

Search intent: commercial. The searcher wants an agency that runs cold email end to end so their team only takes meetings.

Buyer questions this page answers:
1. What is a done for you cold email agency?
2. What do you run end to end?
3. Do we still approve the list and the copy?
4. Do you send from our company domain?
5. How soon does a program go live?
6. Who owns the list and the replies when we stop?
7. How is this different from buying cold email software?

Booking CTA: `https://calendly.com/ahmad-beleaded/30min?utm_source=beleaded&utm_medium=site&utm_campaign=hero&utm_content=done-for-you-cold-email-agency`

## 2. Template (copy from `cold-email-agency/index.html`)

Build the file by copying `cold-email-agency/index.html` and changing only what is listed here. Do not edit the locked source file in the repo.

Head:
- Keep the gtag block, charset, viewport, robots, theme-color, favicons (`?v=20261001c`), font preloads, inline class script, `/assets/site.css` and `/assets/site.js` versions from the template.
- Replace title, meta description, canonical, og and twitter title/description/url, og:image:alt, article times.
- Set every Calendly `utm_content` on the page to `done-for-you-cold-email-agency`.
- Do not add the page to the sitewide nav.
- Shared chrome: rewrite the drop item span `What $2,000 a month includes` to `What a monthly program includes` on this file only so the page has no prices.
- Button and link text: `Book a 30 minute call` (open compound, no hyphen).

Body shell: svg sprite, progress, skip link, header, footer, book bar copied as in the template, with utm_content updates.

Use the same blocks as the template: `page-hero` with crumbs, lead, answer box and proof strip (three stats only); `features` / `feature`; `work-grid` / `work-card` or fit panels; `steps`; `compare` rows for DFY vs DIY vs hire (no dollar figures); `faq-list`; `svc-cards`; `cta-band`. Drop the locked page's pricing section and any Offer with a dollar amount from page specific Service schema.

Calendly links (all `target="_blank" rel="noopener"`, `&amp;` in HTML):
- nav, hero, end, footer, book bar: campaigns `nav`, `hero`/`inline`, `end`, `footer`, `bookbar` with `utm_content=done-for-you-cold-email-agency`

## 3. Final copy

Everything in this section is final copy for Ethan to approve. No dashes of any kind. No prices. Links shown as [anchor](URL).

### Hero

Breadcrumb: Home > Services > Done for you cold email

H1: Done for you cold email agency

Lead: Be Leaded is a done for you cold email agency for B2B teams. We build the list, the sending domains, the plain text sequences and the reply handling, then put qualified meetings on your calendar. You approve the buyer rules and the copy. You take the calls. We run the rest.

Answer box:
> **Done for you cold email** means a managed program where Be Leaded owns the work end to end: verified lists, separate sending domains, sequences you approve, same business day replies, and meetings that match a written definition. You do not buy a tool seat and run it yourself. For the broader cold email and appointment setting program page, see [cold email agency](/cold-email-agency/). When the same motion sits inside a wider outbound plan, that is [B2B lead generation](/lead-generation-services/).

CTA: Book a 30 minute call (hero). Ghost: See what we run → `#what-we-run`

proof-strip (three only):
- 400K+ Emails a day of sending capacity
- 99% Delivery rate across programs
- 30+ Client programs

### H2: What we run end to end (`id="what-we-run"`)

Lead: The same cold email system already described on our service pages, framed as a hands off program.

Features:
- Verified lists: Accounts and contacts matched to your buyer, verified before a single email goes out. Catch all and unverifiable addresses stay off the list.
- Sending infrastructure: Separate domains and inboxes with SPF, DKIM and DMARC, warmed for two to three weeks and checked every morning. Your company domain never sends cold volume.
- Sequences written for your market: Short plain text emails built on something true about each account. You approve every one before it sends.
- LinkedIn alongside email: Connection requests and messages timed with the email sequence, so prospects see a name they recognize. See [LinkedIn lead generation](/linkedin-lead-generation-agency/).
- Reply handling and booking: We answer replies the same business day, handle the back and forth, and put qualified meetings on your calendar.
- Weekly reporting: Sends, replies and meetings, what is working and what we are changing next. You can read every reply.

### H2: Done for you, not a tool seat

Lead: Buyers searching this term usually want someone else to run the system.

Compare rows (Stage / What usually happens / What we do):
- The stack: You buy a sequencer, a data tool and a warm up service, then someone on your team learns each one. / We bring the stack. Your team never logs into a sequencer to send cold volume.
- The list: A CSV export that goes stale, with catch alls and role spam mixed in. / A list built to your buyer rules, verified, and approved by you before send one.
- The replies: Interested notes sit until Friday. Curious and angry replies get the same delayed template. / Same business day handling. Only meetings that match your written definition reach the calendar.
- After the program: The agency keeps the data, or the tool seats expire and the history goes with them. / You own the list and every reply.

### H2: Who it fits

Cards:
- Founders and Heads of Sales (B2B teams): You know the buyer. You do not want to hire or manage the outbound stack yourself.
- RevOps and growth leads (Teams with a defined ICP): You can approve a list sample and a sequence. You want meetings, not another tool to babysit.
- Teams comparing agencies (DFY shoppers): You searched done for you because DIY and seat based SDR shops already failed the hands off test.

### H2: How it works

Lead: Most programs go live in about three weeks.

Steps:
- Day 1 Mandate call: Buyer rules, segments, what a qualified meeting means, and which calendar receives the booking.
- Days 2 to 14 Build: List research, verification, sending domains, warmup, and the first sequences for your approval.
- Week 3 Launch: Sends begin. Replies are handled the same business day. Meetings land on your calendar.
- Every week Report: Sends, replies, meetings, and what we change next.

### H2: Is it a fit?

Works well for:
- B2B teams with a buyer you can describe in one paragraph
- Teams that can take a booked meeting the same week it lands
- Buyers who want a managed program, not software seats

Not a fit for:
- Teams that want to run Instantly or Smartlead themselves. Stay on DIY tools.
- Anyone who needs a promised meeting count. We do not promise a number of demos.
- Programs that need phone first. Calling is a separate scope.

Companion line (own sentence): Email and LinkedIn. Calling is quoted separately.

### FAQ

1. Q: What is a done for you cold email agency?
   A: A done for you cold email agency builds and runs outbound email for you end to end. At Be Leaded that covers verified lists, separate sending domains, plain text sequences you approve, same business day reply handling, and qualified meetings on your calendar.

2. Q: What do you run end to end?
   A: The list, the domains and warmup, the copy, the send, the replies and the booking. LinkedIn sits beside email when it fits. You approve the buyer rules and every sequence before launch.

3. Q: Do we still approve the list and the copy?
   A: Yes. Done for you does not mean unreviewed. You approve a list sample and every sequence. We do not send a message you have not signed off.

4. Q: Do you send from our company domain?
   A: No. We register separate sending domains that point back to your brand, so your company domain never carries cold volume. SPF, DKIM and DMARC sit on those domains.

5. Q: How soon does a program go live?
   A: Most programs go live in about three weeks. Warmup and your sign off on the first sequences sit inside that window.

6. Q: Who owns the list and the replies when we stop?
   A: You do. You own the list and every reply.

7. Q: How is this different from buying cold email software?
   A: Software gives you seats and a sequencer. A done for you cold email agency runs the work: the list, the infrastructure, the copy, the replies and the booking. Your team shows up to qualified meetings.

### Related

Four svc-cards: Cold email agency → `/cold-email-agency/` (outbound only; page stays locked); B2B lead generation → `/lead-generation-services/`; LinkedIn lead generation → `/linkedin-lead-generation-agency/`; Outsourced SDR team → `/outsourced-sdr-team/`. Optional fifth when space: How to choose a cold email agency → `/guides/choosing-a-cold-email-agency/`.

Optional related card on this page pointing at `/paid-social-agency/` is allowed as outbound only (hub locked; no inbound edit).

### End CTA band

H2: Tell us who you want to meet.

Text: Thirty minutes with the founder. You will leave with a clear picture of your market, what a done for you program would look like, and whether this track fits your team.

Button: Book a 30 minute call (end). Email line with Copy button, ids `cta-email-done-for-you-cold-email-agency`.

## 4. JSON-LD

One `@graph`:
1. Organization, ProfessionalService/LocalBusiness, Person, WebSite: copy from the cold email template (utm_content updated). Leave sitewide `priceRange` `$2000+` on LocalBusiness as Nolan directed for other pages. No page specific Offer with a dollar amount.
2. WebPage + FAQPage at `#webpage` with the seven FAQ answers as plain text.
3. BreadcrumbList: Home > Services > Done for you cold email.
4. Service at `#service`: name "Done for you cold email agency"; serviceType "Done for you cold email"; alternateName "DFY cold email agency"; no offers priceSpecification.

## 5. Sitemap, llms.txt, llms-full.txt, IndexNow

See `patches/sitemap.xml.patch.md`, `patches/llms.txt.patch.md`, `patches/llms-full.txt.patch.md`, and `patches/llms-full-block.txt`.

sitemap.xml: add the new url after `/cold-email-agency/` with lastmod 2026-10-28 and priority 0.9. Do not change lastmod on locked URLs.

llms.txt: insert a Commercial intents line for this URL near the Cold email line. No edit to the locked page's existing llms line beyond inserting a neighbor.

llms-full.txt: full mirror block of this page's visible copy.

## 6. Internal links (inbound)

Locked untouched: `/paid-social-agency/`, `/appointment-setting/`, `/cold-email-agency/`, `/guides/best-meeting-booking-company/`.
Hold until Nov 8: `/guides/best-b2b-lead-generation-agencies/` body.

Unlocked inbound patches (body only, no title or meta changes):
1. `/lead-generation-services/` related svc-cards: add a card to this URL, anchor "Done for you cold email agency".
2. `/outsourced-sdr-team/` related or fit prose: one contextual link, anchor "done for you cold email agency".
3. `/guides/choosing-a-cold-email-agency/`: one contextual link in the closing or related block, anchor "done for you cold email agency".
4. `/blog/best-cold-email-software/`: the existing sentence that already uses the exact anchor "done for you cold email agency" and points at `/cold-email-agency/` may be retargeted to this new URL (body href only; unlocked blog). If Ethan prefers to leave that blog href on the locked money URL, skip this patch and keep only the three above.

Do not change titles or meta on those sources.

## 7. Differentiation checklist for QA

- Title contains Done for You and Cold Email Agency; ≤60 chars.
- H1 is Done for you cold email agency (open compounds).
- No `$2,000`, no Programs start from, no competitor dollars, no phone, no client names, no guarantee verbs promising demos.
- No hyphen, en dash, or em dash in visible main copy (URL slug and CSS class names exempt).
- proof-strip has exactly the three approved stats.
- Companion line present as its own sentence.
- Locked four pages and B2B lead gen guide body untouched in this ship.
