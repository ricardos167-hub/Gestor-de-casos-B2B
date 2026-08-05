// Client-side only SHA-256 hashing, used to avoid storing plain-text passwords
// in Firestore. NOTE: this is not real security — Firestore rules here are not
// tied to an authenticated identity (no Firebase Auth), so anyone with the
// Firebase config (already public in the app bundle) could read these hashes
// or write new accounts directly against Firestore, bypassing the UI entirely.
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
