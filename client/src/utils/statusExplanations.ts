export type UserStatusLabel =
  | "Active"
  | "Invited"
  | "Self-Claimed"
  | "Unpaid"
  | "Needs Team"
  | "Payment Failed"
  | "Low Balance"
  | "Grace Period"
  | "Expired"
  | "No Enrollment";

export interface StatusExplanation {
  meaning: string;
  howGotHere: string;
  pathToActive: string;
}

export const STATUS_EXPLANATIONS: Record<UserStatusLabel, StatusExplanation> = {
  Active: {
    meaning: "Paid up, on a team, and good to go.",
    howGotHere:
      "They (or their parent) finished sign-up, paid for a program, and got placed on a team.",
    pathToActive: "Already Active — no action needed.",
  },
  Invited: {
    meaning: "An account has been created for them but they haven't logged in yet.",
    howGotHere:
      "An admin or coach added them and an invite email was sent, but they haven't claimed the account.",
    pathToActive:
      "Have them open the invite email and finish setting up their account, then make sure they're enrolled and on a team.",
  },
  "Self-Claimed": {
    meaning:
      "A parent claimed this child themselves and is waiting on admin verification or payment.",
    howGotHere:
      "The parent registered and added this player from their own profile rather than being assigned by an admin.",
    pathToActive:
      "Verify the parent's claim, collect payment for a program, and confirm the player's team assignment.",
  },
  Unpaid: {
    meaning: "Enrolled in a program, but no payment is on file.",
    howGotHere:
      "An admin granted access (a trial or comp spot) without a Stripe subscription or one-time payment attached.",
    pathToActive: "Have them complete payment for the program they're enrolled in.",
  },
  "Needs Team": {
    meaning: "Paid and enrolled, but not yet placed on a team in that program.",
    howGotHere:
      "Their enrollment is active but no one has assigned them to a team for that program.",
    pathToActive: "Add them to a team in the program they're enrolled in.",
  },
  "Payment Failed": {
    meaning: "Their last payment attempt was declined.",
    howGotHere:
      "Stripe couldn't charge their card on the last billing attempt (expired card, insufficient funds, etc.).",
    pathToActive:
      "Ask them to update their payment method so the next charge can go through.",
  },
  "Low Balance": {
    meaning: "Their access is about to expire (within the next few days).",
    howGotHere:
      "Their current enrollment ends soon and there's no renewal lined up yet.",
    pathToActive:
      "Renew the subscription or extend their enrollment before the end date passes.",
  },
  "Grace Period": {
    meaning: "Payment was missed, but they still have temporary access.",
    howGotHere:
      "A renewal failed and the account dropped into the grace window so they don't lose access immediately.",
    pathToActive:
      "Get the outstanding payment resolved before the grace period ends.",
  },
  Expired: {
    meaning: "Their enrollment has ended and they no longer have access.",
    howGotHere:
      "An enrollment ran past its end date (or the grace period after it) without renewing.",
    pathToActive:
      "Re-enroll them in a program and collect payment to restore access.",
  },
  "No Enrollment": {
    meaning: "The account exists but isn't tied to any program.",
    howGotHere:
      "They've signed up but haven't been placed in a program yet — common for brand-new accounts.",
    pathToActive:
      "Enroll them in a program (and collect payment) so they can be assigned to a team.",
  },
};

export const STATUS_LABELS: UserStatusLabel[] = [
  "Active",
  "Invited",
  "Self-Claimed",
  "Unpaid",
  "Needs Team",
  "Payment Failed",
  "Low Balance",
  "Grace Period",
  "Expired",
  "No Enrollment",
];
