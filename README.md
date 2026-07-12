# challenge-app

A daily-challenge SMS game for a closed friend group, with a points-based prediction
market on whether the assignee actually pulls it off. Predicting correctly
unlocks the proof video; predicting wrong keeps it locked. No real money —
points only.

## Structure

```
backend/     Node/Express API + Twilio webhook + scheduler (Firestore-backed)
dashboard/   React (Vite) companion site: leaderboard, history, gated proof video
docs/        Firestore schema reference
```

## How it works

1. Once a day, the scheduler picks a random active challenge and a random group
   member, at a random time inside the group's send window, and texts it to
   them via Twilio.
2. They have until the deadline (default 4 hours) to do it and upload proof
   through the dashboard. No proof by the deadline auto-resolves to "no."
3. Before the deadline, other members predict yes/no from the dashboard.
   Predictions lock the moment they're submitted.
4. When the challenge resolves, predictions are scored and the leaderboard updates.
   Only members who predicted correctly can watch the proof video.

## Local setup

### Backend

```
cd backend
cp .env.example .env        # fill in Firebase + Twilio values
npm install
npm run seed                # loads the starter pool of 7 challenges
npm run dev
```

You'll need a Firebase service account key (Project Settings -> Service
Accounts -> Generate new private key) saved wherever
`FIREBASE_SERVICE_ACCOUNT_PATH` points, and a Firebase Storage bucket for
proof uploads.

For Twilio: buy a number, then point its "A Message Comes In" webhook at
`{BASE_URL}/webhooks/sms` (use `ngrok` for local testing).

You'll also need to manually create one `groups` doc and its `users` docs in
Firestore before the scheduler can run — there's no onboarding UI yet since
we're starting with one curated group.

### Dashboard

```
cd dashboard
cp .env.example .env         # point VITE_API_BASE_URL at the backend, set VITE_GROUP_ID
npm install
npm run dev
```

## Deploy

Mirrors the Agora setup: both `backend` and `dashboard` deploy as separate
Railway services (or the dashboard as a static build wherever's convenient).
Set the same env vars from `.env.example` in Railway's dashboard, and swap
the service account file approach for a Railway secret / base64 env var
since you can't commit `serviceAccountKey.json`.

## Known gaps (intentional, for a v0)

- No auth — the dashboard's "who are you" picker is just a name dropdown
  backed by `localStorage`. Fine for a closed group of friends, not fine
  beyond that.
- Proof upload is dashboard-only; MMS-to-webhook proof submission from the
  SMS thread itself is a natural v1 addition.
- `challenges` pool is global, not per-group — matches "one curated group for
  now"; add `groupId` scoping if this grows to multiple groups.
- No admin UI for managing groups/members/challenge pool beyond a couple of
  bare `POST /api/challenges/pool` and Firestore console edits.

## Pushing to GitHub

```
cd dare-app
git remote add origin <your-empty-repo-url>
git branch -M main
git push -u origin main
```
