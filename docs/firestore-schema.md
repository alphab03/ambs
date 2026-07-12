# Firestore Schema

Six collections. Everything is scoped to a `groupId` so multiple closed friend groups can share one deployment later without cross-contamination, even though we're launching with one group.

## `groups`
One doc per friend group.

```
groups/{groupId}
  name: string
  memberIds: string[]          // refs into users
  timezone: string             // e.g. "America/New_York"
  sendWindowStart: string      // "09:00" - earliest the daily dare can go out
  sendWindowEnd: string        // "20:00" - latest
  deadlineHours: number        // hours after send before it auto-expires (default 4)
  createdAt: timestamp
```

## `users`
One doc per person, keyed by a generated id (not phone number, so phone can be rotated).

```
users/{userId}
  phone: string          // E.164, e.g. "+12025551234"
  name: string
  groupIds: string[]
  createdAt: timestamp
```

## `dares`
The curated pool. Global for now (not per-group) since one person is curating for one group — easy to add `groupId` scoping later if this expands.

```
dares/{dareId}
  text: string            // "Send your ex a 'thinking of you' text and screenshot it"
  active: boolean         // false = retired from rotation, keeps history intact
  createdAt: timestamp
```

## `assignments`
One doc per day per group — the actual "today's dare" instance. This is the hub everything else hangs off.

```
assignments/{assignmentId}
  groupId: string
  dareId: string
  assignedUserId: string       // who got picked today
  sentAt: timestamp            // randomized within group's send window
  deadlineAt: timestamp        // sentAt + deadlineHours
  status: "pending" | "completed" | "expired"
  proofPath: string | null     // Firebase Storage path, set on completion
  proofSubmittedAt: timestamp | null
  outcome: "yes" | "no" | null // null until deadline resolves
  resolvedAt: timestamp | null
```

## `predictions`
Subcollection of `assignments` — one per (assignment, predictor).

```
assignments/{assignmentId}/predictions/{userId}
  predictorUserId: string
  call: "yes" | "no"
  lockedAt: timestamp     // must be < assignment.deadlineAt, enforced server-side
  correct: boolean | null // set when outcome resolves
```

Using `userId` as the doc id inside the subcollection makes "did this person already predict" a single `get` instead of a query, and makes double-predicting impossible by construction.

## `leaderboardStats`
Denormalized rollup so the dashboard leaderboard doesn't require aggregation queries every load. Updated whenever a prediction resolves.

```
leaderboardStats/{groupId}_{userId}
  groupId: string
  userId: string
  totalPredictions: number
  correctPredictions: number
  accuracy: number          // correctPredictions / totalPredictions
  updatedAt: timestamp
```

## Access pattern notes
- **Video gating**: to check if `userId` can watch the proof for `assignmentId`, read `assignments/{assignmentId}/predictions/{userId}` and check `correct === true`. Enforce this server-side in the signed-URL endpoint, not just client-side.
- **"Did I already predict today"**: same doc read as above, before `correct` is set.
- **Daily picker**: query `dares` where `active == true`, pick random client-side (small pool, no need for a random-sort trick yet).
- **History page**: query `assignments` where `groupId == X` order by `sentAt desc`.
