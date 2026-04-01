export interface MigrationParent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface MigrationPlayer {
  id: number;
  firstName: string;
  lastName: string;
  parentId: number | null;
  subscriptionEndDate: string; // MM/DD/YYYY
}

export interface MigrationPayload {
  organizationId: string;
  parents: MigrationParent[];
  players: MigrationPlayer[];
}

export interface MigrationResult {
  invited: number;
  skipped: number;
  errors: string[];
}

export interface InviteRecord {
  parent: MigrationParent;
  players: MigrationPlayer[];
}
