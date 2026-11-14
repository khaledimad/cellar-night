# Cellar Night

For comedy fans who want to catch their favourite comedians at the Comedy Cellar in New York. Star the comedians you love and skip the searching: the alerts come to you.

## Links

- Live app: https://cellar-night.vercel.app
- Repo: https://github.com/khaledimad/cellar-night

## What works

- Sign up, sign in and sign out with email and password.

## What is incomplete

To be filled in.

## Future releases

- A daily and a weekly digest email.
- How often a comedian has played the Cellar.
- More clubs.

## How to run

```bash
npm install
cp .env.example .env.local   # then fill in the values
npx drizzle-kit migrate      # create the tables
npm run dev
```

Tests: `npx vitest run`.

## Data model

- `comedians` and `rooms` keep the billed text beside a cleaned value used for matching.
- `shows` is one show on one night, with its seat counts once the booking feed has been read.
- `appearances` links a comedian to a show.
- `favourites` is a user's star on a comedian; a star is also the alert subscription.
- `alerts_sent` and `ingest_runs` record what was emailed and each refresh.

## AI tools used

- Claude Code wrote the code.
- Claude Haiku 5.5 answers questions in Ask the Cellar.
