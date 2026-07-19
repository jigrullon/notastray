// Cooldown windows for scan notifications. Pure constants only — this file is
// imported by both client (PetProfileClient) and server (notify-owner) bundles.
//
// Philosophy: every guard fails open. A duplicate alert is annoying; a missed
// alert for a lost pet is a product failure. Windows drop sharply when a pet
// is marked lost so genuine repeat sightings still get through.

// Client-side (localStorage) cooldown: how long after a successful send the
// same browser skips auto-notifying for the same tag. Survives tab discard.
export const CLIENT_COOLDOWN_MS = 12 * 60 * 60 * 1000 // 12 hours

// Client-side cooldown when the pet is marked lost — repeat sightings matter.
export const CLIENT_COOLDOWN_LOST_MS = 30 * 60 * 1000 // 30 minutes

// Server-side per-visitor (IP+UA fingerprint) cooldown: backstop for clients
// where localStorage or the Navigation Timing API is unavailable/unreliable.
// Must stay <= 1 hour: dedup filters the same last-hour scan_events snapshot
// already fetched for rate limiting (no extra query, no new index).
export const SERVER_VISITOR_COOLDOWN_MS = 60 * 60 * 1000 // 60 minutes

// Server-side per-visitor cooldown when the pet is marked lost.
export const SERVER_VISITOR_COOLDOWN_LOST_MS = 10 * 60 * 1000 // 10 minutes
