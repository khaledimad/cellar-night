# Cellar Night

For comedy fans who want to catch their favourite comedians at the Comedy Cellar in New York. Star the comedians you love and skip the searching: the alerts come to you.

The Cellar posts its lineups a few days ahead and they change often. Finding out that someone you love is on means checking the lineup page every day. Cellar Night checks it for you.

## Links

- Live app: https://www.whosatthecellar.com
- Also at: https://cellar-night.vercel.app
- Repo: https://github.com/khaledimad/cellar-night

## What works

- **Sign up, sign in and sign out** with email and password. Every page except the login page needs a signed-in user.
- **My comedians.** Search with a dropdown, star a comedian, and see only the upcoming shows your comedians are on, each with a link to the Cellar's own booking page for that show. Secret pop-up shows can be starred like a comedian. A name that is not billed yet can be followed anyway.
- **Alert email.** A star is the alert. When a starred comedian is added to a lineup, you get one email per refresh listing every new show, with date, time, room and the booking link. The same show is never sent twice.
- **Tonight.** One night at a time for the next 7 days, one line per show, with seats left, a switch to hide sold-out shows, and each lineup one tap away with a star beside every name.
- **Ask the Cellar.** A chat that answers questions about the upcoming lineups ("who is on Wednesday with seats left?") and can follow a comedian for you. It answers only from the database.
- **Refresh every 2 hours.** A scheduled job reloads every date the Cellar's lineup feed holds, then the seat counts from its booking feed.

## What is incomplete

- **A comedian dropped from a lineup stays listed.** The refresh adds and updates; it does not yet remove an appearance the feed no longer shows.
- **Alerts cover additions only.** There is no email when a show sells out, is cancelled, or a comedian is removed.
- **Seat counts depend on the booking feed.** A show the booking feed does not list shows no seat status rather than a guess.
- **Names are matched exactly after cleanup.** "Louis C.K." and "Louis CK" are the same person; a misspelled name followed in advance will not match a later billing.
- **No password reset and no email confirmation.**
- **The chat keeps no history.** A conversation lasts for one page visit, and the limit of 20 questions an hour is counted in memory, so it resets when the app redeploys.
- **Emails are sent from a Gmail account**, which is fine for a handful of users and not for many.

## Future releases

- A daily and a weekly digest email, as an alternative to an email per refresh.
- How often a comedian has played the Cellar, built from the lineups collected over time.
- More clubs.
- Remove dropped appearances and email when a starred comedian's show changes.

## How to run

```bash
npm install
cp .env.example .env.local   # then fill in the values
npx drizzle-kit migrate      # create the tables
npm run dev
```

Load the lineups once the app is running:

```bash
curl -X POST "$APP_URL/api/ingest" -H "x-ingest-secret: $INGEST_SECRET"
```

Tests: `npx vitest run`. Type check: `npx tsc --noEmit`.

The scheduled refresh is `.github/workflows/refresh.yml`; it needs the repo secrets `APP_URL` and `INGEST_SECRET`.

## Data model

- `comedians` and `rooms` keep the billed text beside a cleaned value used for matching.
- `shows` is one show on one night: listed date, billed time, true start time, room, and seat counts once the booking feed has been read.
- `appearances` links a comedian to a show, with the order on the bill.
- `favourites` is a user's star on a comedian; a star is also the alert subscription.
- `alerts_sent` records every alert already emailed, and `ingest_runs` records each refresh.

## How it fits together

- Next.js 16 (App Router) on Vercel; Supabase for sign-in and Postgres; Drizzle for every read and write, on the server only.
- `lib/ingest` fetches and parses the lineup feed and upserts it; `lib/alerts` emails users about new appearances of starred comedians; `lib/seats` reads seats left.
- `lib/queries` holds the read queries and the star and follow functions, shared by the pages and by the chat's tools.
- `lib/chat` runs Claude Haiku 5.5 with three tools: search shows, my shows, follow a comedian.

## AI tools used

- Claude Code wrote the code.
- Claude Haiku 5.5 answers questions in Ask the Cellar.
