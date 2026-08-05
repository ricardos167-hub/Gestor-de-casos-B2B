// The single hardcoded Super Admin identity. Every other elevated account
// ("admin" role) is created by this account and stored in Firestore
// (see AppUser in types.ts) — the Super Admin itself is never stored there.
export const SUPER_ADMIN_EMAIL = 'ricardo.s167@gmail.com';

export const MIN_ACCOUNT_PASSWORD_LENGTH = 6;
