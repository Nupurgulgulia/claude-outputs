# MESA Repository App — Context for Claude Code

Owner: Nupur, PG student, Mesa School of Business (PGP Cohort IV, Batch 2027). Nexus LMS: https://students.mesaschool.co.in
**Hard deadline: Nupur loses Nexus access in ~1 year. This app must become the permanent, self-sufficient repository.**

## Goals (in priority order)
1. **Exam prep (v1 focus):** per-course mock exams, flashcards, weak-topic tracking, built from the archived PDFs/decks/notes. Upcoming exams: Mid Term Exam 23 Nov 2026, Business Metrics & Mindset Final 2 Dec, End Term 22–23 Dec 2026. Term 1 end-terms were 16 Oct (no grades published on Nexus yet).
2. **Permanent repository** of everything learned: every file, note, link, recording link, assignment, announcement, term-wise (Pre-Term, Term 1, Term 2).
3. **Lifetime timeline** of what she did/achieved at MESA (calendar events past + upcoming, assignments, MRS, attendance, startup-leader sessions, hackathons, flea market, etc.).
4. **Recommendations** on how to use MESA fully (MRS eligibility, ILS/BSL, office hours, specialisation primer, pending assignments, low attendance in Art of Selling 61.5% and AI 68.2%).
5. Later: brother's UG LMS as a **separate profile, only with his consent**. Schema is already profile-scoped (`profile_id`).

## Decisions already made
- Private web app (single user, auth required). Archive in BOTH Neon cloud and a local computer folder (`C:\Users\NUPUR\Documents\MESA-Archive`).
- YouTube class recordings: **links only** for now (88 recordings). Revisit downloading videos later (they may vanish after she leaves).
- Sync cadence: every few hours, add only new items.
- Backend: **Neon** (not Supabase). Neon project `mesa-archive`, id `cold-grass-13336903`, branch `br-bitter-frog-azrkg0by` (main), region aws-ap-southeast-1, org `org-restless-rice-08854398`. Bucket `mesa-files` (private). DB `neondb`.
- Credentials: NOT in this folder. Get a connection string via Neon MCP `get_connection_string`; create a fresh storage credential via `create_credential` (storage:read/write). The ingest credential `nexus-ingest` (key id nak_live_a6a2077dbb3b…) was created for the browser and **must be revoked** (`revoke_credential`) once ingest finishes.

## Data on hand (see `data/mesa_data.json`, 115 KB, captured 2026-10-20)
Keys: student, program, lms, captured, grades, terms, courses(24), calendar(424), assignments(48), notifications(18), attendance, mrs.
- Course: id, term, title, faculty, mode, outline (Google Sheet URL), folders[{tab,name,date,files[{name,type,size}],links}], recordings[{title,date,youtube_id,url}], announcements, extra.
- 238 listed items: PDF 91, LINK 87, NOTE 37, DOCX 9, PPTX 9, XLSX 4, PNG 1. 88 recordings. 39 assignments submitted / 9 pending. Attendance 94/119 (79%). MRS 1 baseline 62.9/100; Resume Stress Test due 25 Oct 23:59.
- Known data uncertainty: a few recording dates may be swapped (Entrepreneurship 101 S5 part 2, DDDM S8/S9 order, Finance S5 undated). Term split rule: events before 2026-10-19 = Term 1, else Term 2.
- Course IDs (Nexus /student/lms/courses/<id>) are in `scripts/ingest.js` queue below and in mesa_data.json.

## Neon state right now
Tables created (profile-ready): `profiles, courses, files, recordings, calendar_events, assignments, notifications, sync_log`. Row `profiles('nupur')` exists.
Loaded: calendar_events (424), assignments (48), notifications (18).
**NOT yet loaded:** `courses`, `files`, `recordings` (load from mesa_data.json; `files.storage_key` should map to bucket keys), attendance/MRS (no tables yet — add).
Bucket key convention: `<Term>/<Course short name>/<Tab>/<Folder>/<filename>` e.g. `Term 1/Business Reader/Resources/Session 1/Business Reader Session 1 PPT.pdf`. Link/notes items are stored as `*.note.json` ({label,text,links,url}). `_meta/` holds test objects (safe to delete).
Ingest status: bulk file ingest was running in Nupur's built-in browser (Business Reader 11/11 and Start Strong 26/26 done, 0 failures; 22 other courses in progress). Verify with Neon `list_storage_objects` and reconcile against `files` count (expect ~114 binary + ~124 note/link objects). Anything missing or failed must be flagged, never silently dropped.

## Hard technical constraints (learned the hard way)
- Nexus is Next.js; no public API. Data is only reachable by driving the logged-in UI.
- Files open in an in-page PDF viewer; the dialog's **Download** button creates a synthetic `<a download href=signed GCS URL>`. Signed URLs expire in minutes. Page JS can `fetch` them and PUT to Neon with SigV4 (CORS fine from the Nexus origin; Nexus has no CSP).
- The Claude cloud sandbox **cannot reach Neon storage directly** (proxy 403). Uploads must originate from the Nexus tab in her browser, or presigned URLs used from a machine with open egress. A Claude Code session on her own computer likely CAN reach Neon directly.
- javascript_tool has a 45 s timeout: run long jobs fire-and-forget, store progress in localStorage, poll.
- Browser Download clicks do not reliably land in ~/Downloads.
- Auto-sync = a scheduled task running in her desktop app's built-in browser (create_trigger, requires_local_device). Works only when her computer/app is on and Nexus session is valid; cannot enter passwords. After Nexus access ends, no more sync — the app is then a frozen archive.
- Not available from Nexus: transcripts, grades (none published), video files (YouTube only).
- YouTube links could rot; Google Docs/Drive links in notes are not yet captured as content.

## Suggested architecture
Next.js (or Vite+React) + Neon Postgres; files served via presigned download URLs from `mesa-files`; simple auth (one password/Neon Auth); PDF text extraction (pdf-parse/pdfjs) into a `chunks` table with full-text search (tsvector) and optionally embeddings; exam engine generating MCQs/short answers per course from chunks; progress/weak-topic tracking table; timeline view from calendar_events+assignments+notifications; recommendations page driven by deadlines, MRS, attendance.
The MESA "Art of Selling" course has an existing exam-engine skill (anthropic-skills:artofselling: MCQs, discovery questions, voice call, PSBA pitch, objections, negotiation) — reuse its structure for that course.
