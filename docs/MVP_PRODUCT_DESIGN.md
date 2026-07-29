# FarmerBook Web MVP — Product and End-to-End Design

| Field | Value |
|---|---|
| Status | Draft for founder review |
| Last updated | 2026-07-29 |
| Product owner | Founder — name TBD |
| Intended release | Controlled pilot |
| Target size | 100–500 pilot users |
| Delivery model | Responsive web application |

## 1. Product summary

FarmerBook is a professional networking website for farmers. It helps a farmer establish a useful professional identity, find people working with similar crops nearby, share knowledge or opportunities, and start a direct conversation.

The MVP is not a complete LinkedIn clone and is not an agricultural marketplace. It tests one proposition:

> Will farmers repeatedly use a trusted, crop- and location-aware professional network to learn from and connect with other people in agriculture?

The MVP must be useful on an ordinary Android phone browser. It will also work on a laptop, but mobile web is the primary experience.

## 2. Assumptions requiring validation

These assumptions allow implementation to begin without expanding the prototype:

- The pilot will target one district or a small group of neighboring districts.
- The founder will select one primary local language in addition to English before implementation begins.
- Pilot users can use an email address for authentication. Paid SMS/phone OTP is deferred.
- Internal demonstrations may use the backend platform's development mail service, but a real pilot requires a configured transactional-email service because the development sender is restricted and heavily rate-limited.
- Users may identify their district, but the application will not collect precise farm coordinates or land-document data.
- The pilot is invite-oriented and moderated by one administrator.
- A chronological feed is sufficient to validate engagement; an algorithmic recommendation system is unnecessary.
- Image posts are useful. Video and audio uploads are not required for the first pilot.
- “Follow” is a one-way relationship. A two-way connection request and approval workflow is deferred.
- Direct messaging is plain text and asynchronous. Read receipts, attachments, calls, and end-to-end encryption are deferred.

The product owner must validate the region, crop focus, local language, and email-login assumption before inviting real users. If pilot farmers cannot reliably use email, phone OTP becomes a deliberate scope and operating-cost decision.

## 3. Users and permissions

### 3.1 Farmer

A farmer creates and edits their profile, publishes and manages their own posts, comments and reacts, follows or blocks people, exchanges direct messages, and reports content or accounts.

### 3.2 Agriculture participant

An agriculture participant may be an agronomist, FPO representative, buyer, trainer, NGO worker, or other invited ecosystem participant. They have the same MVP capabilities as a farmer, but their role is visibly labeled. Verification badges are assigned only by an administrator.

### 3.3 Administrator

An administrator can inspect reports, hide or restore content, suspend an account from the pilot, and assign a verification status. Administrator authority is stored in protected authentication metadata and cannot be granted through normal profile editing.

## 4. MVP outcomes and success measures

The first pilot succeeds if the product demonstrates useful participation rather than merely collecting registrations.

The following are initial hypotheses, not evidence-backed targets. They must be revisited after the first ten user interviews:

- At least 100 invited users finish registration during the pilot.
- At least 60% of registered users complete the four required profile fields.
- At least 40% of activated users publish a post, comment, react, follow someone, or send a message in their first session.
- At least 25% of activated users return in week four.
- At least 30 useful farmer-to-farmer conversations are reported or observed during the pilot.
- All safety reports receive an administrator decision within 24 hours during the controlled pilot.

Analytics must never expose the content of private messages to normal product analytics.

## 5. Scope

### 5.1 Required for the MVP

1. A public landing page explaining FarmerBook and linking to registration.
2. Email/password registration, email verification, login, logout, password reset, and protected application pages.
3. A guided profile setup with full name, public handle, participant type, district, state, primary crops, short biography, experience, preferred language, and optional avatar.
4. A chronological feed containing active posts.
5. Text posts with one optional compressed image and one category: discussion, question, or opportunity.
6. Post detail pages with comments and one “helpful” reaction per user.
7. Farmer discovery by name, handle, crop, participant type, district, and state.
8. Follow and unfollow.
9. Public-within-the-pilot profile pages showing profile details, counts, and recent posts.
10. One-to-one text messaging between authenticated users.
11. Block, report, and content-safety controls.
12. A small administrator area for pending reports and basic account/content actions.
13. English plus one pilot language, with all application-interface text stored in translation dictionaries.
14. Responsive layouts for 360-pixel-wide phones through desktop screens.
15. Privacy notice, terms, community rules, account deletion, and feedback contact.
16. Basic privacy-preserving product events for signup, profile completion, posting, following, messaging, and reporting.
17. Custom transactional-email delivery, domain authentication, and signup-abuse protection before real farmers are invited.

### 5.2 Explicitly out of scope

- Native Android or iOS applications
- SMS/phone OTP
- Payments, produce sales, auctions, shipping, escrow, loans, or insurance
- Separate job-board or government-scheme modules
- AI diagnosis, AI content generation, or personalized recommendations
- Video, live streaming, stories, voice calls, or message attachments
- Groups, pages, events, newsletters, advertisements, or subscriptions
- Multiple images per post
- Connection requests, endorsements, recommendations, or resume import
- Push notifications, email digests, and read receipts
- Exact farm coordinates, identity documents, land records, or financial data
- Public indexing of pilot profiles by search engines
- Automated verification of farmers or organizations
- Large-scale content moderation

## 6. Information architecture

The primary navigation has five destinations:

    FarmerBook
      ├── Feed
      ├── Discover
      ├── Network
      ├── Messages
      └── My Profile

On a phone, these destinations appear in a bottom navigation bar. On a desktop, they appear in a left sidebar. “Create post” is prominent in the feed. Administration is available only to administrators and is not part of the primary farmer navigation.

Planned routes:

| Route | Purpose | Access |
|---|---|---|
| `/` | Public value proposition and pilot call to action | Public |
| `/login` | Login | Signed-out |
| `/signup` | Registration | Signed-out |
| `/forgot-password` | Password-reset request | Signed-out |
| `/auth/callback` | Authentication callback | Public system route |
| `/onboarding` | Required initial profile fields | Authenticated, incomplete profile |
| `/feed` | Chronological post feed and post composer | Authenticated |
| `/posts/[postId]` | Post and comments | Authenticated |
| `/discover` | Farmer filters and results | Authenticated |
| `/network` | Followed people and followers | Authenticated |
| `/farmers/[handle]` | Farmer profile and recent posts | Authenticated |
| `/settings/profile` | Edit profile, language, and avatar | Authenticated owner |
| `/settings/account` | Password, privacy, and deletion | Authenticated owner |
| `/messages` | Conversation list | Authenticated |
| `/messages/[conversationId]` | One-to-one conversation | Conversation member |
| `/community-rules` | Pilot rules | Public |
| `/privacy` | Privacy notice | Public |
| `/terms` | Terms | Public |
| `/admin/reports` | Moderation queue | Administrator |
| `/admin/users/[userId]` | Account moderation | Administrator |

## 7. Critical user journeys

### 7.1 Registration and activation

1. A visitor opens the landing page and selects “Join the pilot.”
2. They enter their email, password, and agreement to the terms and community rules.
3. The website instructs them to verify their email.
4. After verification and login, the user must complete full name, handle, participant type, district, state, one primary crop, and preferred language.
5. The user arrives at the feed with a welcome panel prompting them to follow three relevant people or publish an introduction.

Acceptance:

- Invalid or duplicate fields produce plain-language messages next to the field.
- A handle is 3–30 lowercase letters, digits, or underscores and is unique.
- A user with an incomplete profile is redirected to onboarding from protected product pages.
- Passwords and verification tokens are handled by the authentication service and are never stored in application tables.

### 7.2 Publish and discuss

1. An activated user writes up to 2,000 characters, selects a category, and optionally adds one image.
2. The image is validated, resized when practical in the browser, and uploaded.
3. The new post appears at the top of the chronological feed.
4. Other users can mark it helpful, open its detail page, and add comments of up to 500 characters.
5. The author can edit the text/category or remove the post. Removed content is hidden rather than immediately hard-deleted so a pending safety report can be reviewed.

Acceptance:

- Empty posts cannot be submitted.
- Only JPEG, PNG, or WebP images up to 5 MB before compression are accepted.
- Repeated submission is disabled while a request is running.
- Users may edit or remove only their own posts and comments.
- A blocked relationship hides each participant’s content from the other.

### 7.3 Discover and follow

1. A user opens Discover.
2. They search by name or filter by crop, district, state, or participant type.
3. A result card shows the person’s name, role, district, top crops, short bio, and verification badge if present.
4. The user opens the profile and follows or unfollows it.
5. Network shows following and follower lists.

Acceptance:

- Search is case-insensitive and does not require exact spelling for full names or handles.
- An empty filter set shows recently joined active users.
- A user cannot follow themselves.
- Following the same account twice has no duplicate effect.

### 7.4 Start a direct conversation

1. A user selects “Message” on another user’s profile.
2. The system opens the existing one-to-one conversation or creates exactly one conversation for that pair.
3. Either member can send plain-text messages of up to 2,000 characters.
4. The conversation list orders conversations by latest message.

Acceptance:

- Only the two conversation members can read or write its messages.
- A block prevents new messages in either direction and removes the conversation from the normal list.
- Sending the same form twice must not create duplicate conversations.
- The MVP may use periodic refresh instead of guaranteed real-time delivery.

### 7.5 Report and moderate

1. A user reports a post, comment, message, or profile using a predefined reason and optional details.
2. The reporter receives confirmation without learning later administrator notes.
3. An administrator reviews the queue and chooses dismiss, hide content, or suspend account.
4. Every decision records the administrator and timestamp.

Acceptance:

- Users cannot view reports from other users.
- A normal user cannot open administrator routes or call administrator actions.
- Hidden posts and comments disappear from farmer-facing queries.
- Suspended accounts cannot access protected pages.
- Moderation actions are auditable.

### 7.6 Delete an account

1. The user opens Account Settings and requests deletion.
2. A confirmation screen explains that the action signs them out and removes their public presence.
3. After explicit confirmation, the account is disabled, profile and content are hidden, and a server-side deletion job removes authentication data according to the documented retention policy.

Acceptance:

- Account deletion cannot be triggered with a single accidental click.
- The user is signed out after confirmation.
- Deleted or disabled accounts cannot log in or appear in discovery.

## 8. Screen design

### 8.1 Visual direction

FarmerBook should feel trustworthy and practical, not like an e-commerce marketplace. Use generous spacing, strong labels, familiar icons paired with text, and limited animation.

Proposed visual tokens:

| Token | Value |
|---|---|
| Primary | Forest green `#14532D` |
| Interactive | Leaf green `#15803D` |
| Highlight | Harvest amber `#D97706` |
| Background | Warm off-white `#F8FAF7` |
| Surface | White `#FFFFFF` |
| Text | Charcoal green `#17201A` |
| Muted text | `#526158` |
| Error | Deep red `#B91C1C` |
| Radius | 12 px cards; 8 px controls |
| Body type | System sans-serif with Noto Sans fallback for the pilot script |

Color is never the only indication of status. Touch targets are at least 44 by 44 CSS pixels. Body text is at least 16 CSS pixels on mobile.

### 8.2 Mobile feed

    ┌────────────────────────────┐
    │ FarmerBook       Search  Me│
    ├────────────────────────────┤
    │ Share a question or update │
    │ [ Write a post…          ] │
    ├────────────────────────────┤
    │ Ravi K. · Rice · Mysuru    │
    │ QUESTION                   │
    │ Has anyone tried…          │
    │ [optional image]           │
    │ Helpful 12  Comments 4     │
    ├────────────────────────────┤
    │ Home Discover Network Chat │
    └────────────────────────────┘

Cards show meaningful identity first: name, role/crops, and location. Counts are secondary. Posts use a “Helpful” action rather than a collection of social reactions in the MVP.

### 8.3 Farmer profile

    ┌────────────────────────────┐
    │ ← Profile                  │
    │ [avatar] Ravi Kumar        │
    │ Farmer · Mysuru, Karnataka │
    │ Rice · Ragi                │
    │ [Follow] [Message] [•••]   │
    │ About                      │
    │ 12 years growing…          │
    │ Recent posts               │
    └────────────────────────────┘

Farm size is optional and is not displayed unless the user supplies it. Exact address, phone number, and email are never displayed.

### 8.4 Discover

Mobile shows a search field, a “Filters” sheet, removable filter chips, and one-column result cards. Desktop shows filters in a side panel. Applying filters updates the URL query parameters so the page is repeatable and testable.

### 8.5 Empty, loading, and error states

Every data screen must define:

- A skeleton or compact loading state that does not move navigation.
- An empty state explaining why it is empty and giving one next action.
- A recoverable error message with Retry.
- An offline message when the browser reports no connectivity.

No raw database, authentication, or server error is displayed to a user.

## 9. Technical architecture

The MVP uses a single full-stack web repository:

    Browser
       │
       ▼
    Next.js web application
       ├── server-rendered pages and server actions
       ├── authentication session proxy
       └── responsive browser components
       │
       ▼
    Supabase
       ├── Auth: email identity and sessions
       ├── Postgres: application records
       └── Storage: avatars and post images

Recommended implementation:

- Next.js 16 App Router with TypeScript
- Tailwind CSS for styling
- Supabase Postgres, Auth, and Storage
- `@supabase/ssr` for cookie-based server authentication
- Zod for server-side input validation
- Vitest and Testing Library for unit/component tests
- Playwright for browser-level critical-journey tests
- Vercel or an equivalent Next.js host for the pilot

There is no separate Express API, message broker, external search engine, recommendation service, or microservice. Next.js server actions and server-only modules perform protected writes. Supabase Row Level Security, abbreviated RLS, is a database feature that applies authorization rules even if an application query is incorrect.

The Supabase service-role key bypasses RLS. It must exist only in server-side environment variables and be used only for administrator operations and account deletion. It must never have a `NEXT_PUBLIC_` prefix or be included in browser code.

## 10. Data model

All primary keys are UUIDs unless stated otherwise. All timestamps are stored in UTC. Every user-created content table has `created_at`, `updated_at`, and a moderation `status`.

### 10.1 `profiles`

| Column | Purpose |
|---|---|
| `id` | Matches the Supabase authentication user ID |
| `handle` | Unique public identifier |
| `full_name` | Display name |
| `participant_type` | `farmer`, `expert`, `fpo`, `buyer`, `ngo`, or `other` |
| `bio` | Up to 500 characters |
| `district` / `state` | Coarse public location |
| `primary_crops` | Normalized array of crop identifiers |
| `years_experience` | Optional non-negative integer |
| `farm_size_acres` | Optional private-by-default numeric value |
| `preferred_language` | Supported language code |
| `avatar_path` | Storage object path, not a public arbitrary URL |
| `verification_status` | `none`, `pending`, or `verified`; admin-managed |
| `account_status` | `active`, `suspended`, or `deleted`; admin/server-managed |

### 10.2 Social content

- `posts`: author, category, body, optional image path, moderation status.
- `comments`: post, author, body, moderation status.
- `post_reactions`: post and user with a composite unique key; the only MVP reaction is `helpful`.
- `follows`: follower and followed user with a composite primary key.
- `blocks`: blocker and blocked user with a composite primary key.

### 10.3 Messaging

- `conversations`: identifier and latest-message timestamp.
- `conversation_members`: conversation and user. A database constraint or transactional function ensures a one-to-one conversation has exactly two distinct members.
- `direct_conversation_pairs`: canonical lower/higher user ID pair with a unique constraint to prevent duplicate conversations.
- `messages`: conversation, sender, body, moderation status, created timestamp.

### 10.4 Safety and administration

- `reports`: reporter, target type, target ID, reason, optional details, state, reviewer, reviewed timestamp, and resolution note.
- `moderation_actions`: administrator, action, target type, target ID, reason, and timestamp.

### 10.5 Product analytics

- `product_events`: user ID where available, event name, small non-sensitive metadata object, and timestamp.

Do not copy post bodies, message bodies, email addresses, passwords, access tokens, or precise locations into analytics metadata.

## 11. Authorization model

Every exposed table has RLS enabled and tested.

- Active authenticated users may read active profiles and active posts/comments, except across blocks.
- Users may insert or change only their own profile and content.
- User-editable profile updates cannot modify verification or account status.
- Users may create and delete only follow/block rows where they are the acting user.
- Only conversation members may read a conversation and its messages.
- A sender may insert a message only when they are a member and neither participant has blocked the other.
- Users may insert reports and read only their own submitted reports.
- Administrator reads and actions use a protected server-only path after checking administrator authentication metadata.
- Storage policies restrict avatar uploads to the owner’s folder and post-image uploads to the author’s folder.

Authorization must be validated at both the database boundary and the server action. Hiding a button in the browser is not authorization.

## 12. Performance and accessibility

For the controlled pilot:

- Feed queries return at most 20 posts per page and use cursor-based pagination.
- Images are resized for display and served in modern formats when supported.
- Search returns at most 25 profiles per page.
- Database indexes cover post creation time, handle, location, participant type, crops, follow relationships, conversation membership, and report state.
- Pages must remain usable at 360 px width and at 200% browser zoom.
- Keyboard users can reach and operate every action.
- Form fields have visible labels and errors associated with the relevant field.
- The feed, login, onboarding, discover, profile, and message views target a Lighthouse accessibility score of at least 90.
- The production build contains no TypeScript or lint errors.

## 13. Security and privacy checklist

- Collect only information necessary for the pilot.
- Publish community rules that prohibit scams, harassment, dangerous advice, and disclosure of another person’s personal information.
- Require verified email before posting or messaging.
- Validate all input on the server and constrain length in the database.
- Escape user content through normal React rendering; do not render user-authored HTML.
- Restrict uploads by MIME type and size, and use generated storage paths.
- Add rate limits to registration, login, posting, comments, messaging, and reporting before opening the pilot.
- Keep secrets in host environment settings and maintain a committed `.env.example` with names only.
- Configure a custom transactional-email sender, CAPTCHA or equivalent signup-abuse control, and appropriate authentication rate limits before a real pilot.
- Enable dependency updates, database backups, error monitoring, and cost alerts.
- Do not log access tokens, passwords, full message bodies, or private profile values.
- Provide block, report, logout, password reset, and account deletion.
- Have the privacy notice and retention process reviewed before inviting real farmers. Compliance classification remains pending qualified legal review.

## 14. Analytics events

The MVP records:

- `signup_completed`
- `profile_completed`
- `post_created`
- `comment_created`
- `reaction_added`
- `profile_followed`
- `conversation_started`
- `message_sent`
- `content_reported`
- `account_deleted`

An administrator dashboard may show aggregate counts only. A dedicated analytics vendor is unnecessary for the first pilot; SQL views can calculate pilot measures.

## 15. Release gates

The pilot cannot open until:

1. The product owner has chosen region, crop focus, local language, pilot size, and invitation method.
2. All required journeys pass automated browser tests.
3. RLS tests prove that users cannot edit another profile/post, read another conversation, or access reports/admin operations.
4. A moderator has tested report, hide, suspend, and restore flows.
5. Privacy notice, community rules, feedback channel, and incident contact are present.
6. Custom transactional email, sending-domain authentication, and signup-abuse protection are configured and tested with non-team email addresses.
7. A restorable database-backup method, error monitoring, and cost alerts are enabled.
8. Seed/demo data has been removed or clearly labeled.
9. Five representative users complete a moderated usability test without assistance on the primary journeys.

## 16. Open decisions

| Decision | Owner | Needed by | Default if unresolved |
|---|---|---|---|
| Pilot district/state | Product owner | Before UI copy and seed data | Use generic sample locations |
| Crop focus | Product owner | Before discovery filters | Use a small generic crop list |
| Local language | Product owner | Before translation work | English-only internal demo; do not open pilot |
| Authentication feasibility | Product owner after five interviews | Before pilot | Email/password |
| Invitation model | Product owner | Before deployment | Admin shares a private signup URL |
| Product/domain name | Product owner | Before public deployment | Working name FarmerBook |
| Moderator and response hours | Product owner | Before pilot | Pilot remains closed |
| Privacy/retention approval | Legal reviewer | Before pilot | Pilot remains closed |

## 17. Budget and effort guardrail

The implementation is designed for one AI-assisted builder over approximately 15–20 focused working days, plus founder interviews and pilot operations. An internal demonstration can target ₹2,000–₹10,000 in cash expense when the founder performs the work. A real 100–500-user pilot must additionally budget for dependable transactional email and either a paid database-backup capability or an independently verified logical-backup process. Hosting and mail usage should be measured before naming a recurring amount.

Any request that adds paid OTP, native apps, video, payments, automated AI advice, many languages, or an open public launch must be estimated and approved as a separate scope change.
