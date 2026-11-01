Paste everything below into Claude Code, in the same project folder as the existing MESA app. Put the new `mesa_data_2026-10-22.json` in `data/` first.

---

The MESA app already works for one user (me, Nupur): Neon project `mesa-archive` (cold-grass-13336903, branch br-bitter-frog-azrkg0by), private bucket `mesa-files`, a sync routine, and `data/mesa_data_2026-10-22.json` (33 courses, 288 items, 120 files, 90 recordings, 43 announcements, 443 calendar events, 48 assignments, 122 attendance sessions; last sync 2026-10-21 22:02 IST). Read `CONTEXT.md` and the current schema first and do not redo decisions already made.

## New goal
Turn it into a multi-user system: separate logins for **batches** and **individual members**, where each person's progress can be tracked. Roles:
- **Member**: sees only their own data and progress.
- **Batch lead / mentor** (optional per batch): sees progress of members in their batch, only what the members have agreed to share.
- **Admin** (me): creates batches, invites members, sees system health. Admin must NOT automatically see everyone's private data either.

## What "progress" means (define these, then ask me to confirm before building)
Per member, per course: material opened/read, flashcards reviewed, mock exams taken with scores and weak topics, assignments done/pending (from Nexus), attendance, MRS status, exam readiness score. Per batch: aggregates and a leaderboard-free view (no public ranking unless I ask for it).

## Hard problems I want you to confront BEFORE writing code
1. **Whose Nexus data is it, and how does each member get it into the app?** My sync works because I am logged in to my own Nexus in my own browser. A central server cannot log in as other students, and I will not collect their Nexus passwords. Propose the realistic options (e.g. each member runs a small local sync with their own login; a browser extension; manual JSON import; or MESA-provided export) and recommend one. Tell me the downside of each. Check what MESA's terms allow and flag the risk of automated access.
2. **Consent and privacy.** Every member must opt in, see exactly what is shared with their batch lead, and be able to export and delete their data. Grades, attendance and MRS scores are sensitive: default to private, share only per-field with explicit consent. Minors may be in the UG batch (my brother): if any member is under 18, say what that changes (parental consent, data handling) and do not onboard them until it is resolved.
3. **Shared vs per-user content.** Course files are the same for everyone in a batch. Store each file once (dedupe by SHA-256), keyed by course/batch, and keep progress/personal data in per-user tables. Flag copyright/licensing risk of redistributing MESA's course materials to people outside MESA and propose a safe rule (e.g. only members verified as enrolled in that batch see that batch's files).
4. **Batches differ.** PG and UG programs and cohorts have different courses. Model: organisation -> program -> batch/cohort -> course -> items; membership links users to batches. Brother's UG LMS becomes a separate batch with his consent.
5. **Security.** Real authentication (email + magic link or Neon Auth/OAuth, not a shared password), role-based access control, and database-level isolation (Postgres row-level security keyed on user_id and batch_id) so a bug in the UI cannot leak another member's data. Audit log of who viewed whose progress. No secrets in the repo.

## Deliverables, in order. Stop and show me results after each step.
1. A short written design: roles, data model (users, batches, memberships, consent grants, per-user progress tables, shared content tables), the chosen answer to problem 1, and a list of decisions you need from me. Wait for my approval.
2. Migrations for the new schema, with row-level security policies and tests that prove a member cannot read another member's rows, and a batch lead cannot read fields that were not consented.
3. Migrate my existing data into this model as the first user and first batch without losing anything (counts before/after).
4. Auth, invitations (admin invites a batch or an individual), onboarding with the consent screen.
5. Progress tracking: events captured from exam prep/flashcards/reading, a per-member dashboard, a per-batch dashboard for leads (respecting consent), and CSV export for the admin of consented data only.
6. Multi-user sync: the chosen onboarding path from problem 1, producing each member's data into their own profile without ever touching another member's account.
7. Verification: a test with at least three fake members across two batches proving isolation, consent behaviour, and that progress numbers match raw events. Report what you could not test.

Rules: tell me plainly when something cannot be done or is a guess, challenge decisions you think are wrong before building them and say the downside, and never mark a step done without evidence (counts, tests, a screenshot).
