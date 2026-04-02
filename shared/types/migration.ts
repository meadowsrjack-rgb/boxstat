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
  programId?: string | null;
  teamId?: number | null;
}

export interface MigrationProgram {
  id: string;
  name: string;
  code: string;
  isNew: boolean;
}

export interface MigrationTeam {
  id: number;
  name: string;
  programId: string;
  isNew: boolean;
}

export interface MigrationPayload {
  parents: MigrationParent[];
  players: MigrationPlayer[];
  program?: MigrationProgram | null;
  teams?: MigrationTeam[];
}

export interface MigrationResult {
  invited: number;
  skipped: number;
  errors: string[];
}

export interface InviteRecord {
  parent: MigrationParent;
  players: MigrationPlayer[];
  programName?: string;
  teamNames?: Record<number, string>;
}
