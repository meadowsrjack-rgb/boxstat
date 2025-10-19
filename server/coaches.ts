// Admin email - only this email has full admin access
const ADMIN_EMAIL = "meadowsrjack@gmail.com";

// Coach email domains - any email from these domains is automatically a coach
const COACH_EMAIL_DOMAINS = [
  "@upyourperformance.org",
  "@upyourperformance.com"
];

// Known coach emails (for reference/documentation)
export const COACH_EMAILS = [
  "coach.carlos@upyourperformance.com",
  "jack@upyourperformance.org",
  "malia@upyourperformance.org",
  "toffic@upyourperformance.org",
  "cory@upyourperformance.org",
  "carlos@upyourperformance.org",
  "tony@upyourperformance.org"
];

/**
 * Checks if the provided email belongs to the admin
 * @param email The email address to check
 * @returns true if the email is the admin email, false otherwise
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Checks if the provided email belongs to a coach
 * Uses domain-based detection: any email ending with @upyourperformance.org or @upyourperformance.com
 * @param email The email address to check
 * @returns true if the email is a coach email, false otherwise
 */
export function isCoachEmail(email: string): boolean {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return COACH_EMAIL_DOMAINS.some(domain => lowerEmail.endsWith(domain));
}

// Legacy team coaches mapping (for reference)
export const TEAM_COACHES: Record<string, { name: string; email?: string; phone?: string }> = {
  "11u-black": { name: "Coach Tony", email: "tony@upyourperformance.org" },
  "12u-white": { name: "Coach Kim", email: "kim@example.com" },
  "youth-girls": { name: "Coach Riley" },
  "unassigned": { name: "TBD" }
};
