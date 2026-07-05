# DevLog — A DSA Learning Journal

A personal + community learning journal for tracking daily DSA practice — built with vanilla JS and Supabase (Postgres + Auth + Row Level Security).

**Live demo:** https://devlog-zeta-five.vercel.app/

---

## Why I built this

I wanted a lightweight way to track my daily DSA practice with more structure than a plain notebook — topics, difficulty, code snippets, and a visible streak to stay consistent. Building it also gave me hands-on experience with authentication, relational database security (Row Level Security), and designing a schema that supports both a private and a public view of the same data.

---

## Features

- **Email/password authentication** with a full forgot-password flow (email-based recovery, not just login/signup)
- **Personal journal** — log what you learned, tag it by topic, mark difficulty (Easy/Medium/Hard), optionally attach a syntax-highlighted code snippet
- **Contribution grid + streak tracker** — GitHub-style heatmap of the last 12 weeks, with a live "current streak" counter. All date math for this is centralized in one shared module (`dateUtils.js`) imported by every page, so the streak, the grid, and the feed's stats can't silently drift apart from each other
- **Public community feed** — see what everyone using the app is learning, with search and tag filtering
- **Public profile pages** — shareable, read-only view of any user's logs
- **Full CRUD on your own logs** — create, edit (including difficulty), delete — enforced at the database level, not just the UI

---

## Tech stack

| Layer               | Choice                                                         |
| ------------------- | -------------------------------------------------------------- |
| Frontend            | Vanilla HTML/CSS/JS (no framework — kept intentionally simple) |
| Backend / DB        | Supabase (Postgres)                                            |
| Auth                | Supabase Auth (email/password)                                 |
| Authorization       | Postgres Row Level Security (RLS)                              |
| Syntax highlighting | highlight.js (CDN)                                             |
| Hosting             | Vercel                                                         |

---

## How the security model works (the part I'm proudest of)

Every log lives in a single `logs` table, but two very different audiences need to see it: the owner (who can edit/delete it) and the public (who can only read it). Instead of building separate API endpoints or duplicating data, this is enforced entirely with **Postgres Row Level Security policies**:

| Action        | Who can do it                                    |
| ------------- | ------------------------------------------------ |
| SELECT (read) | Everyone — including logged-out visitors         |
| INSERT        | Only as yourself (`auth.uid() = user_id`)        |
| UPDATE        | Only your own rows, and can't reassign ownership |
| DELETE        | Only your own rows                               |

This means the database itself is the source of truth for permissions — the frontend JS never has to be trusted to "do the right thing," because even a malicious or buggy client can't bypass these rules.

**A bug I found and fixed along the way:** an old default Supabase policy (`with_check: true` on INSERT for any authenticated user) was silently overriding a stricter ownership-check policy, since Postgres OR's multiple policies for the same action together. This meant any logged-in user could technically insert a log under someone else's `user_id`. I found it by explicitly querying `pg_policies` and comparing `qual`/`with_check` across all rules, not just eyeballing the dashboard UI.

**Another bug, found while writing this very README:** the main journal page computed "today" using IST (UTC+5:30), but the public profile page and community feed both computed it using raw UTC — three separate copies of near-identical date logic, two different timezone assumptions. For most of the day this was invisible, but near midnight IST, a log could count toward "today" on one page and "yesterday" on another, for the exact same data. Fixed by extracting the date logic into a single shared `dateUtils.js` module every page imports, so there's now exactly one implementation instead of three.

---

## Local development

1. Clone the repo
2. Open `index.html` with a live server (e.g. VS Code's Live Server extension)
3. Update `supabase.js` with your own Supabase project URL and anon/publishable key if running against your own database

---

## Possible future improvements

- Per-log public/private toggle (currently all logs are public by default)
- Pagination on the community feed for scale
- Comments or reactions on public logs

---

## Author

Built by Shipra Yadav.
