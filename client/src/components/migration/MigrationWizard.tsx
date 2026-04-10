import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Loader2, X, Plus, Users, Baby, Send, Package, Info, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { MigrationParent, MigrationPlayer, MigrationStaff, MigrationResult, MigrationProgram, MigrationTeam } from "@shared/types/migration";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "programs" | "parents" | "players" | "staff" | "review";

interface MigrationWizardProps {
  organizationId: string;
  organizationName?: string;
  onComplete?: (result: MigrationResult) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let nextId = 1;
function uid() { return nextId++; }

function initials(first: string, last: string): string {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

function expiryStatus(exp: string): "ok" | "soon" | "expired" | null {
  if (!exp) return null;
  const [month, day, year] = exp.split("/").map(Number);
  if (!month || !day || !year) return null;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return null;
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "ok";
}

function ExpiryBadge({ expiry }: { expiry: string }) {
  const status = expiryStatus(expiry);
  if (!expiry) return <Badge variant="outline" className="text-xs font-normal text-muted-foreground">No date</Badge>;
  if (!status) return <Badge variant="outline" className="text-xs font-normal">{expiry}</Badge>;
  const config = {
    ok:      { class: "bg-green-50 text-green-800 border-green-200",  label: `until ${expiry}` },
    soon:    { class: "bg-amber-50 text-amber-800 border-amber-200",  label: `expires ${expiry}` },
    expired: { class: "bg-red-50 text-red-800 border-red-200",        label: `expired ${expiry}` },
  }[status];
  return <Badge variant="outline" className={`text-xs font-normal ${config.class}`}>{config.label}</Badge>;
}

function parsePaste(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n) || n.includes(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  return lines.slice(1).map((line) => {
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (i: number) => (i >= 0 ? cells[i] ?? "" : "");
    return {
      first:       get(col("first", "fname", "firstname")),
      last:        get(col("last", "lname", "lastname", "surname")),
      email:       get(col("email", "mail")),
      phone:       get(col("phone", "mobile", "cell")),
      parentEmail: get(col("parent", "guardian", "parentemail", "family")),
      expiry:      get(col("expiry", "end", "expires", "subscription", "until", "sub")),
      program:     get(col("program", "programcode", "prog")),
      team:        get(col("team", "teamname", "group")),
    };
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "programs", label: "Programs & Teams", icon: <Package size={14} /> },
  { id: "parents",  label: "Parents",          icon: <Users size={14} /> },
  { id: "players",  label: "Players",          icon: <Baby size={14} /> },
  { id: "staff",    label: "Staff",            icon: <UserCog size={14} /> },
  { id: "review",   label: "Review & send",    icon: <Send size={14} /> },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center mb-8 bg-white border border-border rounded-xl p-4 shadow-sm">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors
              ${i < idx  ? "bg-green-50 text-green-700 border-green-300"
              : i === idx ? "bg-slate-900 text-white border-slate-900"
              :             "bg-muted text-muted-foreground border-border"}`}>
              {i < idx ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === idx ? "text-foreground" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-3" />}
        </div>
      ))}
    </div>
  );
}

// ── Programs & Teams step ─────────────────────────────────────────────────────

interface ProgramsStepProps {
  organizationId: string;
  selectedTeams: MigrationTeam[];
  setSelectedTeams: React.Dispatch<React.SetStateAction<MigrationTeam[]>>;
  createdPrograms: MigrationProgram[];
  setCreatedPrograms: React.Dispatch<React.SetStateAction<MigrationProgram[]>>;
}

function ProgramsStep({ organizationId, selectedTeams, setSelectedTeams, createdPrograms, setCreatedPrograms }: ProgramsStepProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramCode, setNewProgramCode] = useState("");
  const [newTeamName, setNewTeamName] = useState<Record<string, string>>({});
  const [showNewTeamForm, setShowNewTeamForm] = useState<Record<string, boolean>>({});

  const { data: existingPrograms = [] } = useQuery<any[]>({ queryKey: ["/api/programs"] });
  const { data: existingTeams = [] } = useQuery<any[]>({ queryKey: ["/api/teams"] });

  const orgPrograms = existingPrograms.filter((p: any) => p.organizationId === organizationId && p.productCategory !== 'goods');
  const orgTeams = existingTeams.filter((t: any) => t.organizationId === organizationId);

  const addNewProgram = () => {
    if (!newProgramName.trim()) return;
    const tempId = `migration-new-${Date.now()}`;
    const newProg: MigrationProgram = { id: tempId, name: newProgramName.trim(), code: newProgramCode.trim(), isNew: true };
    setCreatedPrograms((prev) => [...prev, newProg]);
    setNewProgramName("");
    setNewProgramCode("");
    setShowNewForm(false);
  };

  const removeCreatedProgram = (id: string) => {
    setCreatedPrograms((prev) => prev.filter((p) => p.id !== id));
    setSelectedTeams((prev) => prev.filter((t) => t.programId !== id));
  };

  const addNewTeam = (progId: string) => {
    const name = newTeamName[progId]?.trim();
    if (!name) return;
    const tempId = -(Date.now());
    setSelectedTeams((prev) => [...prev, { id: tempId, name, programId: progId, isNew: true }]);
    setNewTeamName((prev) => ({ ...prev, [progId]: "" }));
    setShowNewTeamForm((prev) => ({ ...prev, [progId]: false }));
  };

  const removeTeam = (id: number) => setSelectedTeams((prev) => prev.filter((t) => t.id !== id));

  const allPrograms: { prog: MigrationProgram; source: "existing" | "new" }[] = [
    ...orgPrograms.map((p: any) => ({ prog: { id: String(p.id), name: p.name, code: p.code || "", isNew: false } as MigrationProgram, source: "existing" as const })),
    ...(createdPrograms || []).map((p) => ({ prog: p, source: "new" as const })),
  ];

  const getTeamsForProgram = (progId: string, isNewProg: boolean) => {
    const strProgId = String(progId);
    if (isNewProg) {
      return selectedTeams.filter((t) => String(t.programId) === strProgId);
    }
    const existingForProg = orgTeams
      .filter((t: any) => String(t.programId) === strProgId)
      .map((t: any) => ({ id: t.id, name: t.name, programId: strProgId, isNew: false } as MigrationTeam));
    const addedNew = selectedTeams.filter((t) => String(t.programId) === strProgId && t.isNew);
    return [...existingForProg, ...addedNew];
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        Add programs and teams which you will add migrated players to.
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Programs</div>

        <div className="space-y-3">
          {allPrograms.map(({ prog, source }) => {
            const teams = getTeamsForProgram(prog.id, prog.isNew);
            return (
              <div key={prog.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-background">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
                    <Package size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{prog.name}</div>
                    {prog.code && <div className="text-xs text-muted-foreground">{prog.code}</div>}
                  </div>
                  {source === "new" && (
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">New</Badge>
                  )}
                  {source === "new" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeCreatedProgram(prog.id); }}
                      className="text-muted-foreground hover:text-destructive p-1 rounded shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1">
                  {teams.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <Users size={12} className="text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1 truncate">{t.name}</span>
                      {t.isNew && (
                        <>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">New</Badge>
                          <button
                            type="button"
                            onClick={() => removeTeam(t.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {showNewTeamForm[prog.id] ? (
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Team name (e.g. Blue, U12 Boys)"
                        value={newTeamName[prog.id] ?? ""}
                        onChange={(e) => setNewTeamName((prev) => ({ ...prev, [prog.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addNewTeam(prog.id)}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => addNewTeam(prog.id)} disabled={!newTeamName[prog.id]?.trim()}>
                        Add
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setShowNewTeamForm((prev) => ({ ...prev, [prog.id]: false }))}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewTeamForm((prev) => ({ ...prev, [prog.id]: true }))}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      <Plus size={12} /> Add team
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {showNewForm ? (
            <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
              <Input
                placeholder="Program name (e.g. Spring 2026 Training)"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Short code (e.g. SPR26) — optional"
                value={newProgramCode}
                onChange={(e) => setNewProgramCode(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addNewProgram} disabled={!newProgramName.trim()}>
                  Add program
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowNewForm(false); setNewProgramName(""); setNewProgramCode(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Create new program
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Parents step ──────────────────────────────────────────────────────────────

function ParentsStep({
  parents, setParents,
}: {
  parents: MigrationParent[];
  setParents: React.Dispatch<React.SetStateAction<MigrationParent[]>>;
}) {
  const [pasteRaw, setPasteRaw] = useState("");

  const add = () =>
    setParents((p) => [...p, { id: uid(), firstName: "", lastName: "", email: "", phone: "" }]);

  const remove = (id: number) => setParents((p) => p.filter((x) => x.id !== id));

  const upd = (id: number, key: keyof MigrationParent, value: string) =>
    setParents((p) => p.map((x) => (x.id === id ? { ...x, [key]: value } : x)));

  const importPaste = () => {
    const rows = parsePaste(pasteRaw);
    const imported = rows
      .filter((r) => r.first || r.email)
      .map((r) => ({ id: uid(), firstName: r.first, lastName: r.last, email: r.email, phone: r.phone }));
    if (!imported.length) return;
    setParents((p) => [...p, ...imported]);
    setPasteRaw("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">BoxStat will email each parent an invite — they set up their account so they can enroll their players.</div>
      <Tabs defaultValue="manual">
        <TabsList className="mb-4">
          <TabsTrigger value="manual">Enter manually</TabsTrigger>
          <TabsTrigger value="paste">Paste from spreadsheet</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy rows from Excel or Google Sheets with a header row. Columns detected automatically — works with tabs or commas.
          </p>
          <Textarea
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            placeholder={"First Name\tLast Name\tEmail\tPhone\nSarah\tJohnson\tsarah@email.com\t520-555-0102"}
            className="font-mono text-xs min-h-[100px]"
          />
          <Button variant="default" size="sm" onClick={importPaste} disabled={!pasteRaw.trim()}>
            Import parents
          </Button>
        </TabsContent>

        <TabsContent value="manual" />
      </Tabs>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[22%]">First name *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[22%]">Last name *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[32%]">Email *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[18%]">Phone</th>
              <th className="w-[6%]" />
            </tr>
          </thead>
          <tbody>
            {parents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No parents yet — add one below or paste from a spreadsheet
                </td>
              </tr>
            ) : (
              parents.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-1 py-1"><Input value={p.firstName} onChange={(e) => upd(p.id, "firstName", e.target.value)} placeholder="First" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1"><Input value={p.lastName}  onChange={(e) => upd(p.id, "lastName",  e.target.value)} placeholder="Last"  className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1"><Input value={p.email}     onChange={(e) => upd(p.id, "email",     e.target.value)} placeholder="email@example.com" type="email" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1"><Input value={p.phone}     onChange={(e) => upd(p.id, "phone",     e.target.value)} placeholder="Optional" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1 text-center">
                    <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={add}
        className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Add parent
      </button>
    </div>
  );
}

// ── Players step ──────────────────────────────────────────────────────────────

function PlayersStep({
  parents, players, setPlayers, selectedTeams, createdPrograms, orgPrograms, orgTeams,
  noSubDateAcknowledged, setNoSubDateAcknowledged,
}: {
  parents: MigrationParent[];
  players: MigrationPlayer[];
  setPlayers: React.Dispatch<React.SetStateAction<MigrationPlayer[]>>;
  selectedTeams: MigrationTeam[];
  createdPrograms: MigrationProgram[];
  orgPrograms: any[];
  orgTeams: any[];
  noSubDateAcknowledged: boolean;
  setNoSubDateAcknowledged: (v: boolean) => void;
}) {
  const [pasteRaw, setPasteRaw] = useState("");

  const allPrograms = [
    ...orgPrograms.map((p: any) => ({ id: p.id, name: p.name, code: p.code || "", isNew: false } as MigrationProgram)),
    ...createdPrograms,
  ];

  const getTeamsForProgram = (programId: string | null): MigrationTeam[] => {
    if (!programId) return [];
    const existingForProg = orgTeams
      .filter((t: any) => String(t.programId) === String(programId))
      .map((t: any) => ({ id: t.id, name: t.name, programId: String(t.programId), isNew: false } as MigrationTeam));
    const newTeams = selectedTeams.filter((t) => String(t.programId) === String(programId) && t.isNew);
    const seen = new Set(existingForProg.map((t) => t.id));
    return [...existingForProg, ...newTeams.filter((t) => !seen.has(t.id))];
  };

  const allAvailableTeams: MigrationTeam[] = [
    ...orgTeams.map((t: any) => ({ id: t.id, name: t.name, programId: String(t.programId), isNew: false } as MigrationTeam)),
    ...selectedTeams.filter((t) => t.isNew),
  ];

  const add = () =>
    setPlayers((p) => [...p, {
      id: uid(),
      firstName: "",
      lastName: "",
      parentId: parents[0]?.id ?? null,
      subscriptionEndDate: "",
      programId: allPrograms[0]?.id ?? null,
      teamId: null,
    }]);

  const remove = (id: number) => setPlayers((p) => p.filter((x) => x.id !== id));

  const upd = (id: number, key: keyof MigrationPlayer, value: string | number | null) =>
    setPlayers((p) => p.map((x) => (x.id === id ? { ...x, [key]: value } : x)));

  const importPaste = () => {
    const rows = parsePaste(pasteRaw);
    const allPrograms = [
      ...orgPrograms.map((p: any) => ({ id: p.id, name: p.name, code: p.code || "", isNew: false } as MigrationProgram)),
      ...createdPrograms,
    ];
    const imported = rows
      .filter((r) => r.first)
      .map((r) => {
        const parent = parents.find((p) => p.email.toLowerCase() === r.parentEmail.toLowerCase());
        const matchedTeam = allAvailableTeams.find((t) => t.name.toLowerCase() === r.team?.toLowerCase());
        return {
          id: uid(),
          firstName: r.first,
          lastName: r.last,
          parentId: parent?.id ?? null,
          subscriptionEndDate: r.expiry,
          programId: allPrograms[0]?.id ?? null,
          teamId: matchedTeam?.id ?? null,
        };
      });
    if (!imported.length) return;
    setPlayers((p) => [...p, ...imported]);
    setPasteRaw("");
  };

  const hasTeams = allAvailableTeams.length > 0;
  const anyPlayerHasProgram = players.some((k) => k.programId);
  const subEndDateRequired = anyPlayerHasProgram;

  const SUB_END_DATE_TOOLTIP = "This is the date their subscription to this program ends. The customer will be enrolled in the selected program. BoxStat has a 3 month grace period before the customer must re-enrol through BoxStat. They will be reminded of this date.";

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        Link each player to their parent and enter when their current subscription ends. Boxstat honors this date — the parent won't be asked to pay again until then.
      </div>

      <Tabs defaultValue="manual">
        <TabsList className="mb-4">
          <TabsTrigger value="manual">Enter manually</TabsTrigger>
          <TabsTrigger value="paste">Paste from spreadsheet</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Include a <strong>Parent Email</strong> column to auto-link players. Subscription End{hasTeams ? " and Team" : ""} columns are detected automatically.
          </p>
          <Textarea
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            placeholder={"First Name\tLast Name\tParent Email\tSubscription End\tTeam\nAlex\tJohnson\tsarah@email.com\t08/31/2026\tBlue"}
            className="font-mono text-xs min-h-[100px]"
          />
          <Button variant="default" size="sm" onClick={importPaste} disabled={!pasteRaw.trim()}>
            Import players
          </Button>
        </TabsContent>

        <TabsContent value="manual" />
      </Tabs>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[16%]">First name *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[16%]">Last name *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[20%]">Parent *</th>
              {allPrograms.length > 0 && <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[16%]">Program</th>}
              {hasTeams && <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[14%]">Team</th>}
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[14%]">
                <span className="flex items-center gap-1">
                  Sub end date{subEndDateRequired ? " *" : ""}
                  <span title={SUB_END_DATE_TOOLTIP} className="cursor-help text-muted-foreground/70 hover:text-muted-foreground">
                    <Info size={12} />
                  </span>
                </span>
              </th>
              <th className="w-[6%]" />
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={5 + (allPrograms.length > 0 ? 1 : 0) + (hasTeams ? 1 : 0)} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No players yet — skip if parents will add their own on sign-up
                </td>
              </tr>
            ) : (
              players.map((k) => (
                <tr key={k.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-1 py-1"><Input value={k.firstName} onChange={(e) => upd(k.id, "firstName", e.target.value)} placeholder="First" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1"><Input value={k.lastName}  onChange={(e) => upd(k.id, "lastName",  e.target.value)} placeholder="Last"  className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1">
                    <Select
                      value={k.parentId?.toString() ?? ""}
                      onValueChange={(v) => upd(k.id, "parentId", v ? parseInt(v) : null)}
                    >
                      <SelectTrigger className="border-0 shadow-none h-8 text-sm px-2">
                        <SelectValue placeholder="Select parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.firstName} {p.lastName || p.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {allPrograms.length > 0 && (
                    <td className="px-1 py-1">
                      <Select
                        value={k.programId?.toString() ?? allPrograms[0]?.id ?? ""}
                        onValueChange={(v) => upd(k.id, "programId", v)}
                      >
                        <SelectTrigger className="border-0 shadow-none h-8 text-sm px-2">
                          <SelectValue placeholder="Program" />
                        </SelectTrigger>
                        <SelectContent>
                          {allPrograms.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {hasTeams && (
                    <td className="px-1 py-1">
                      <Select
                        value={k.teamId?.toString() ?? "none"}
                        onValueChange={(v) => upd(k.id, "teamId", v && v !== "none" ? parseInt(v) : null)}
                      >
                        <SelectTrigger className="border-0 shadow-none h-8 text-sm px-2">
                          <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {getTeamsForProgram(k.programId?.toString() ?? null).map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  <td className="px-1 py-1"><Input value={k.subscriptionEndDate} onChange={(e) => upd(k.id, "subscriptionEndDate", e.target.value)} placeholder="MM/DD/YYYY" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  <td className="px-1 py-1 text-center">
                    <button onClick={() => remove(k.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={add}
        className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Add player
      </button>

      {players.length > 0 && players.some((k) => !k.subscriptionEndDate?.trim()) && (
        <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
          <input
            type="checkbox"
            checked={noSubDateAcknowledged}
            onChange={(e) => setNoSubDateAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-600 shrink-0"
          />
          <span className="text-sm text-amber-900">
            I acknowledge that players without a subscription end date will need to be enrolled by their parent through the Payments tab after signing in. They cannot be enrolled by an admin. The invite email will still list any assigned program or team.
          </span>
        </label>
      )}
    </div>
  );
}

// ── Staff step ────────────────────────────────────────────────────────────────

function StaffStep({
  staff, setStaff, selectedTeams,
}: {
  staff: MigrationStaff[];
  setStaff: React.Dispatch<React.SetStateAction<MigrationStaff[]>>;
  selectedTeams: MigrationTeam[];
}) {
  const [pasteRaw, setPasteRaw] = useState("");
  const [activeRole, setActiveRole] = useState<"coach" | "admin">("coach");

  const coaches = staff.filter((s) => s.role === "coach");
  const admins = staff.filter((s) => s.role === "admin");

  const add = (role: "coach" | "admin") =>
    setStaff((prev) => [...prev, { id: uid(), firstName: "", lastName: "", email: "", role, teamIds: [] }]);

  const remove = (id: number) => setStaff((prev) => prev.filter((s) => s.id !== id));

  const upd = (id: number, key: keyof MigrationStaff, value: string | number[] | "coach" | "admin") =>
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const toggleTeam = (staffId: number, teamId: number) => {
    setStaff((prev) => prev.map((s) => {
      if (s.id !== staffId) return s;
      const teamIds = s.teamIds.includes(teamId)
        ? s.teamIds.filter((tid) => tid !== teamId)
        : [...s.teamIds, teamId];
      return { ...s, teamIds };
    }));
  };

  const importPaste = (role: "coach" | "admin") => {
    const rows = parsePaste(pasteRaw);
    const imported = rows
      .filter((r) => r.first || r.email)
      .map((r) => ({ id: uid(), firstName: r.first, lastName: r.last, email: r.email, role, teamIds: [] }));
    if (!imported.length) return;
    setStaff((prev) => [...prev, ...imported]);
    setPasteRaw("");
  };

  const renderTable = (role: "coach" | "admin") => {
    const rows = role === "coach" ? coaches : admins;
    return (
      <div className="space-y-4">
        <Tabs defaultValue="manual">
          <TabsList className="mb-4">
            <TabsTrigger value="manual">Enter manually</TabsTrigger>
            <TabsTrigger value="paste">Paste from spreadsheet</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy rows from Excel or Google Sheets with a header row. Columns detected automatically.
            </p>
            <Textarea
              value={pasteRaw}
              onChange={(e) => setPasteRaw(e.target.value)}
              placeholder={"First Name\tLast Name\tEmail\nJohn\tSmith\tjohn@email.com"}
              className="font-mono text-xs min-h-[100px]"
            />
            <Button variant="default" size="sm" onClick={() => importPaste(role)} disabled={!pasteRaw.trim()}>
              Import {role === "coach" ? "coaches" : "admins"}
            </Button>
          </TabsContent>

          <TabsContent value="manual" />
        </Tabs>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[20%]">First name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[20%]">Last name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[28%]">Email *</th>
                {role === "coach" && selectedTeams.length > 0 && (
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[28%]">Teams</th>
                )}
                <th className="w-[6%]" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={role === "coach" && selectedTeams.length > 0 ? 4 : 3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No {role === "coach" ? "coaches" : "admins"} yet — add one below or paste from a spreadsheet
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-1 py-1"><Input value={s.firstName} onChange={(e) => upd(s.id, "firstName", e.target.value)} placeholder="First" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                    <td className="px-1 py-1"><Input value={s.lastName}  onChange={(e) => upd(s.id, "lastName",  e.target.value)} placeholder="Last"  className="border-0 shadow-none h-8 text-sm px-2" /></td>
                    <td className="px-1 py-1"><Input value={s.email}     onChange={(e) => upd(s.id, "email",     e.target.value)} placeholder="email@example.com" type="email" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                    {role === "coach" && selectedTeams.length > 0 && (
                      <td className="px-1 py-1">
                        <div className="flex flex-wrap gap-1 px-2 py-1">
                          {selectedTeams.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTeam(s.id, t.id)}
                              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                s.teamIds.includes(t.id)
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-background text-muted-foreground border-border hover:border-foreground"
                              }`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-1 py-1 text-center">
                      <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => add(role)}
          className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Add {role === "coach" ? "coach" : "admin"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        Add coaches and admin staff. Coaches can be assigned to teams. Staff members do not require subscription dates.
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveRole("coach")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeRole === "coach"
              ? "border-slate-900 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Coaches {coaches.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{coaches.length}</Badge>}
        </button>
        <button
          type="button"
          onClick={() => setActiveRole("admin")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeRole === "admin"
              ? "border-slate-900 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Admins {admins.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{admins.length}</Badge>}
        </button>
      </div>

      <div className="pt-2">
        {activeRole === "coach" ? renderTable("coach") : renderTable("admin")}
      </div>
    </div>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({
  parents, players, staff, allPrograms, allTeams, onSend, isSending,
}: {
  parents: MigrationParent[];
  players: MigrationPlayer[];
  staff: MigrationStaff[];
  allPrograms: MigrationProgram[];
  allTeams: MigrationTeam[];
  onSend: () => void;
  isSending: boolean;
}) {
  const noEmail   = parents.filter((p) => !p.email.trim());
  const unlinked  = players.filter((k) => !k.parentId);
  const expired   = players.filter((k) => expiryStatus(k.subscriptionEndDate) === "expired");
  const soon      = players.filter((k) => expiryStatus(k.subscriptionEndDate) === "soon");
  const canSend   = noEmail.length === 0 && unlinked.length === 0 && parents.length > 0;
  const inviteCount = parents.filter((p) => p.email.trim()).length;

  const coaches = staff.filter((s) => s.role === "coach");
  const admins  = staff.filter((s) => s.role === "admin");

  const sample     = parents.find((p) => p.email) ?? { firstName: "Member", lastName: "", email: "member@email.com" };
  const sampleKids = players.filter((k) => k.parentId === (sample as MigrationParent).id);

  const families = parents.map((par) => ({
    par,
    kids: players.filter((k) => k.parentId === par.id),
  }));

  const programMap = Object.fromEntries(allPrograms.map((p) => [String(p.id), p]));
  const teamMap = Object.fromEntries(allTeams.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Families",        value: parents.length },
          { label: "Players",         value: players.length },
          { label: "Invites to send", value: inviteCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/50 rounded-lg p-4 text-center border border-border">
            <div className="text-2xl font-medium">{value}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Program/team summary */}
      {allPrograms.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-slate-50 border border-border rounded-lg text-sm">
          <Package size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">{allPrograms.map((p) => p.name).join(", ")}</div>
            {allTeams.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Teams: {allTeams.map((t) => t.name).join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {noEmail.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{noEmail.length} parent{noEmail.length > 1 ? "s have" : " has"} no email address — they won't receive an invite. Go back to fix.</AlertDescription>
        </Alert>
      )}
      {unlinked.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{unlinked.length} player{unlinked.length > 1 ? "s aren't" : " isn't"} linked to a parent. Go back to fix.</AlertDescription>
        </Alert>
      )}
      {expired.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{expired.length} player subscription{expired.length > 1 ? "s have" : " has"} already expired — parents will be prompted to enroll immediately.</AlertDescription>
        </Alert>
      )}
      {soon.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{soon.length} subscription{soon.length > 1 ? "s expire" : " expires"} within 30 days — renewal prompt shown on first login.</AlertDescription>
        </Alert>
      )}

      {/* Staff summary */}
      {staff.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border flex items-center gap-2">
            <UserCog size={12} /> Staff
          </div>
          <div className="divide-y divide-border">
            {coaches.length > 0 && (
              <div className="px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Coaches ({coaches.length})</div>
                <div className="space-y-1">
                  {coaches.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-medium text-emerald-700 shrink-0">
                        {initials(s.firstName, s.lastName)}
                      </div>
                      <span className="flex-1">{s.firstName} {s.lastName}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                      {s.teamIds.length > 0 && (
                        <div className="flex gap-1">
                          {s.teamIds.map((tid) => teamMap[tid] && (
                            <Badge key={tid} variant="outline" className="text-xs font-normal">{teamMap[tid]}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {admins.length > 0 && (
              <div className="px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Admins ({admins.length})</div>
                <div className="space-y-1">
                  {admins.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center text-[10px] font-medium text-violet-700 shrink-0">
                        {initials(s.firstName, s.lastName)}
                      </div>
                      <span className="flex-1">{s.firstName} {s.lastName}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Families */}
      <div className="space-y-3">
        {families.map(({ par, kids }) => (
          <div key={par.id} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-700 shrink-0">
                {initials(par.firstName, par.lastName)}
              </div>
              <div>
                <div className="text-sm font-medium">{par.firstName} {par.lastName}</div>
                <div className="text-xs text-muted-foreground">
                  {par.email || <span className="text-destructive">No email</span>}
                  {par.phone ? ` · ${par.phone}` : ""}
                </div>
              </div>
            </div>
            {kids.length > 0 ? (
              <div>
                {kids.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 px-4 py-2 border-t border-border">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-medium text-blue-700 shrink-0">
                      {initials(k.firstName, k.lastName)}
                    </div>
                    <span className="text-sm flex-1">{k.firstName} {k.lastName}</span>
                    {k.teamId && teamMap[k.teamId] && (
                      <Badge variant="outline" className="text-xs font-normal">{teamMap[k.teamId]}</Badge>
                    )}
                    {k.programId && programMap[String(k.programId)] && (
                      <Badge variant="outline" className="text-xs font-normal text-blue-700 border-blue-200 bg-blue-50">{programMap[String(k.programId)].name}</Badge>
                    )}
                    <ExpiryBadge expiry={k.subscriptionEndDate} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground italic">
                No players linked — parent will add their own on sign-up
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Email preview */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          Invite email preview
        </div>
        <div className="p-4 text-sm leading-relaxed space-y-3 bg-white">
          <div className="text-xs text-muted-foreground">
            From: Boxstat &lt;invites@boxstat.app&gt; · To: {(sample as MigrationParent).email || "member@email.com"}
          </div>
          <div className="font-medium">
            {sampleKids.length > 0
              ? "Your organization has moved to Boxstat — your players are ready"
              : "You've been invited to join your organization on Boxstat"}
          </div>
          <p className="text-muted-foreground">
            Hi {sample.firstName},{" "}
            {sampleKids.length > 0
              ? `your player${sampleKids.length > 1 ? "s" : ""} (${sampleKids.map((k) => k.firstName).join(", ")}) have been pre-registered. Their current access is honored through the existing subscription end date — you'll be prompted to renew through Boxstat when the time comes.`
              : "click below to claim your account on Boxstat and add your players."}
          </p>
          {sampleKids[0]?.programId && programMap[String(sampleKids[0].programId)] && (
            <p className="text-xs text-muted-foreground bg-slate-50 p-2 rounded">
              Program: <strong>{programMap[String(sampleKids[0].programId)].name}</strong>
              {sampleKids[0]?.teamId && teamMap[sampleKids[0].teamId] ? ` · Team: ${teamMap[sampleKids[0].teamId]}` : ""}
            </p>
          )}
          <div>
            <span className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">
              Claim my account
            </span>
          </div>
        </div>
      </div>

      {/* Send row */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-sm text-muted-foreground">
          {inviteCount} invite email{inviteCount !== 1 ? "s" : ""} will be sent
        </span>
        <Button
          onClick={onSend}
          disabled={!canSend || isSending}
          className="bg-green-700 hover:bg-green-800 text-white px-6"
        >
          {isSending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Send invites</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function MigrationWizard({ organizationId, organizationName, onComplete }: MigrationWizardProps) {
  const { toast } = useToast();
  const [step, setStep]                   = useState<Step>("programs");
  const [selectedTeams, setSelectedTeams] = useState<MigrationTeam[]>([]);
  const [createdPrograms, setCreatedPrograms] = useState<MigrationProgram[]>([]);
  const [parents, setParents]             = useState<MigrationParent[]>([]);
  const [players, setPlayers]             = useState<MigrationPlayer[]>([]);
  const [noSubDateAcknowledged, setNoSubDateAcknowledged] = useState(false);
  const [staff, setStaff]                 = useState<MigrationStaff[]>([]);
  const [isSending, setIsSending]         = useState(false);
  const [done, setDone]                   = useState(false);
  const [result, setResult]               = useState<MigrationResult | null>(null);

  const { data: existingPrograms = [] } = useQuery<any[]>({ queryKey: ["/api/programs"] });
  const { data: existingTeams = [] } = useQuery<any[]>({ queryKey: ["/api/teams"] });

  const orgPrograms = existingPrograms.filter((p: any) => p.organizationId === organizationId && p.productCategory !== 'goods');
  const orgTeams = existingTeams.filter((t: any) => t.organizationId === organizationId);

  const stepOrder: Step[] = ["programs", "parents", "players", "staff", "review"];
  const stepIdx = stepOrder.indexOf(step);

  const validateParents = useCallback(() => {
    if (parents.length === 0) {
      toast({ title: "No parents added", description: "Add at least one parent before continuing.", variant: "destructive" });
      return false;
    }
    const noEmail = parents.filter((p) => !p.email.trim());
    if (noEmail.length) {
      toast({ title: "Missing email addresses", description: `${noEmail.length} parent(s) have no email address.`, variant: "destructive" });
      return false;
    }
    return true;
  }, [parents, toast]);

  const validatePlayers = useCallback(() => {
    if (players.length === 0) return true;
    const unlinked = players.filter((k) => !k.parentId);
    if (unlinked.length) {
      toast({ title: "Unlinked players", description: `${unlinked.length} player(s) aren't linked to a parent.`, variant: "destructive" });
      return false;
    }
    const missingSubDate = players.filter((k) => !k.subscriptionEndDate?.trim());
    if (missingSubDate.length && !noSubDateAcknowledged) {
      toast({ title: "Acknowledgment required", description: `${missingSubDate.length} player(s) have no subscription end date. Please check the acknowledgment checkbox to continue.`, variant: "destructive" });
      return false;
    }
    return true;
  }, [players, noSubDateAcknowledged, toast]);

  const next = () => {
    if (step === "programs") {
      if (createdPrograms.length === 0 && orgPrograms.length === 0) {
        toast({ title: "No programs", description: "Create at least one program before continuing.", variant: "destructive" });
        return;
      }
    }
    if (step === "parents" && !validateParents()) return;
    if (step === "players" && !validatePlayers()) return;
    setStep(stepOrder[stepIdx + 1]);
  };

  const back = () => setStep(stepOrder[stepIdx - 1]);

  const allMigrationPrograms = [
    ...orgPrograms.map((p: any) => ({ id: String(p.id), name: p.name, code: p.code || "", isNew: false } as MigrationProgram)),
    ...createdPrograms,
  ];

  const allMigrationTeams: MigrationTeam[] = [
    ...orgTeams.map((t: any) => ({ id: t.id, name: t.name, programId: String(t.programId), isNew: false } as MigrationTeam)),
    ...selectedTeams.filter((t) => t.isNew),
  ];

  const send = async () => {
    setIsSending(true);
    try {
      const firstPlayerProgramId = players.find((k) => k.programId)?.programId ?? null;
      const payloadProgram = firstPlayerProgramId
        ? allMigrationPrograms.find((p) => String(p.id) === String(firstPlayerProgramId)) ?? null
        : null;

      const referencedTeamIds = new Set(players.filter((k) => k.teamId != null).map((k) => k.teamId as number));
      const referencedExistingTeams = allMigrationTeams.filter((t) => !t.isNew && referencedTeamIds.has(t.id));
      const newTeamsForProgram = selectedTeams.filter((t) => t.isNew && (
        !payloadProgram || String(t.programId) === String(payloadProgram.id)
      ));
      const allPayloadTeams: MigrationTeam[] = [
        ...referencedExistingTeams,
        ...newTeamsForProgram,
      ];

      const payload = {
        parents,
        players,
        staff,
        program: payloadProgram,
        teams: allPayloadTeams,
      };
      const data: MigrationResult = await apiRequest("POST", "/api/migration/send-invites", payload);
      setResult(data);
      setDone(true);
      onComplete?.(data);
    } catch (err) {
      toast({
        title: "Failed to send invites",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (done && result) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-medium">Invites sent</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {result.invited} invite email{result.invited !== 1 ? "s have" : " has"} been queued.
          Members will receive a link to claim their Boxstat account — their players and subscription dates are pre-loaded.
        </p>
        {result.errors.length > 0 && (
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {result.skipped} invite{result.skipped !== 1 ? "s" : ""} failed:
              <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepBar current={step} />

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-medium mb-1">
          {step === "programs" && "Programs & Teams"}
          {step === "parents" && "Parent contacts"}
          {step === "players" && "Players"}
          {step === "staff"   && "Staff"}
          {step === "review"  && "Review & send invites"}
        </h2>

        {step === "programs" && (
          <ProgramsStep
            organizationId={organizationId}
            selectedTeams={selectedTeams}
            setSelectedTeams={setSelectedTeams}
            createdPrograms={createdPrograms}
            setCreatedPrograms={setCreatedPrograms}
          />
        )}
        {step === "parents" && <ParentsStep parents={parents} setParents={setParents} />}
        {step === "players" && (
          <PlayersStep
            parents={parents}
            players={players}
            setPlayers={setPlayers}
            selectedTeams={selectedTeams}
            createdPrograms={createdPrograms}
            orgPrograms={orgPrograms}
            orgTeams={orgTeams}
            noSubDateAcknowledged={noSubDateAcknowledged}
            setNoSubDateAcknowledged={setNoSubDateAcknowledged}
          />
        )}
        {step === "staff" && (
          <StaffStep
            staff={staff}
            setStaff={setStaff}
            selectedTeams={selectedTeams}
          />
        )}
        {step === "review" && (() => {
          const usedProgramIds = new Set(players.filter((k) => k.programId).map((k) => String(k.programId)));
          const usedTeamIds = new Set(players.filter((k) => k.teamId != null).map((k) => k.teamId as number));
          const reviewPrograms = allMigrationPrograms.filter((p) => usedProgramIds.has(String(p.id)));
          const reviewTeams = allMigrationTeams.filter((t) => usedTeamIds.has(t.id));
          return (
            <ReviewStep
              parents={parents}
              players={players}
              staff={staff}
              allPrograms={reviewPrograms}
              allTeams={reviewTeams}
              onSend={send}
              isSending={isSending}
            />
          );
        })()}

        <div className="flex justify-between pt-6 mt-6 border-t border-border">
          {stepIdx > 0
            ? <Button variant="outline" onClick={back}>Back</Button>
            : <span />}
          {step !== "review" && <Button onClick={next}>Continue</Button>}
        </div>
      </div>
    </div>
  );
}

export default MigrationWizard;
