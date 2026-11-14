@AGENTS.md

# Who's at the Cellar

## What this is

Who's at the Cellar is for comedy fans who want to catch their favourite comedians at the Comedy Cellar in New York without checking the lineup page every day. A signed-in user stars comedians, sees only the upcoming shows those comedians are on (each with a link to the Cellar's own booking page), gets an email when a starred comedian is added to a lineup, checks one night with seats left, and can ask a chat about the lineups.

A star is the alert. There is no separate favourites list, alert list or settings screen.

- Repo: https://github.com/khaledimad/cellar-night
- Live address: https://www.whosatthecellar.com (also https://cellar-night.vercel.app)

## Stack

- Next.js 16 App Router, TypeScript, Tailwind, npm.
- Supabase Auth (email and password) and Postgres, read and written through Drizzle on the server.
- Claude Haiku 5.5 (`claude-haiku-5-5`) for the chat, with tools.
- Nodemailer over Gmail for the alert email.
- GitHub Actions calls the refresh route every 2 hours.
- Vercel hosts the app.

## Folder map

| Path | Holds |
|---|---|
| `proxy.ts` | Route guard: signed-out visitors go to `/login` |
| `app/login` | Sign-up and sign-in page |
| `app/auth` | Auth server actions: `signUp`, `signIn`, `signOut` |
| `app/(app)` | Signed-in pages: My comedians (`/`), Tonight (`/tonight`), Ask the Cellar (`/ask`) |
| `app/api/ingest` | Protected refresh route |
| `app/actions` | Server actions for starring and for the chat |
| `components` | UI parts |
| `lib/supabase` | Server and browser Supabase clients (auth only) |
| `lib/db` | Drizzle client (`index.ts`) and table definitions (`schema.ts`) |
| `lib/names.ts` | `normalizeName`, the only way names are matched |
| `lib/booking.ts` | `bookingUrl` and `nyEpochSeconds` |
| `lib/ingest` | Lineup feed fetch, HTML parse, upsert |
| `lib/alerts` | Finds new appearances for starred comedians and sends the email |
| `lib/seats` | Booking feed fetch and seat counts |
| `lib/queries` | Read queries and star/follow functions; plain arguments, no cookies |
| `lib/chat` | Chat tool loop and tools |
| `drizzle` | Generated SQL migrations |
| `tests` | Vitest tests |
| `.github/workflows` | The 2-hourly refresh |

Tables are defined in `lib/db/schema.ts`; migrations live in `drizzle/`.

## Commands

```bash
npm install
npm run dev                 # dev server
npm run build               # production build
npx tsc --noEmit            # type check
npx vitest run              # tests
npx drizzle-kit generate    # write a migration from schema.ts
npx drizzle-kit migrate     # apply migrations over DIRECT_URL
# trigger a refresh by hand
curl -s -X POST "$APP_URL/api/ingest" -H "x-ingest-secret: $INGEST_SECRET"
```

## Data model

| Table | What | Unique key |
|---|---|---|
| `rooms` | A room or show title, raw and cleaned | raw_name |
| `comedians` | A comedian as billed, with the cleaned name | name_norm |
| `shows` | One show: listed date, billed time, true start, room, seat counts | show_date, show_time, room_id |
| `appearances` | A comedian on a show, with bill position | show_id, comedian_id |
| `favourites` | A user's star on a comedian | user_id, comedian_id |
| `alerts_sent` | An alert already emailed | user_id, show_id, comedian_id |
| `ingest_runs` | One row per refresh | id |

- A star is the alert subscription.
- Seat counts sit on the show row and are null until the booking feed has been read. A show is full when `capacity - booked < 1`.
- The booking link is built by `bookingUrl` from the listed date and billed time, never taken from the lineup feed.
- `show_date` is the listed date; `starts_at` is the true start in New York (one day later when the billed time is before 5:00 am) and is used only for ordering and "upcoming".
- Raw billed text is kept beside the cleaned value.

## Conventions

- This Next.js version differs from older ones: read `node_modules/next/dist/docs/` before using an API.
- `proxy.ts` exporting `proxy`, not `middleware.ts`.
- `cacheComponents` is on: anything reading cookies, the database or search params sits under `Suspense`. Do not use `export const dynamic`.
- `cookies()` is async.
- Every server action checks the signed-in user on the server.
- Tables are never read from the browser; nothing uses the Supabase data API.
- Ingest uses upserts only; a second run with no feed change adds 0 rows.
- Name matching goes through `normalizeName`; no fuzzy matching.
- postgres.js with `prepare: false` on the pooled connection.

## Env vars (names only)

| Name | For |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project address |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key, auth only |
| `DATABASE_URL` | Pooled Postgres connection (port 6543), used by the app |
| `DIRECT_URL` | Direct Postgres connection (port 5432), used for migrations |
| `ANTHROPIC_API_KEY` | Claude API key for the chat |
| `INGEST_SECRET` | Secret the refresh route expects in `x-ingest-secret` |
| `GMAIL_SMTP_USER` | Gmail account that sends the alert email |
| `GMAIL_APP_PASSWORD` | App password for that account |
| `APP_URL` | Public address of the app |

Never commit `.env.local`; never log a value.

## Known limits

See "What is incomplete" in README.md.
