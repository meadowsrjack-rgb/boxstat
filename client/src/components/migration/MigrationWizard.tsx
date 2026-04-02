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
import { CheckCircle2, AlertCircle, Loader2, X, Plus, Users, Baby, Send, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { MigrationParent, MigrationPlayer, MigrationResult, MigrationProgram, MigrationTeam } from "@shared/types/migration";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "programs" | "parents" | "players" | "review";

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
  selectedProgram: MigrationProgram | null;
  setSelectedProgram: (p: MigrationProgram | null) => void;
  selectedTeams: MigrationTeam[];
  setSelectedTeams: React.Dispatch<React.SetStateAction<MigrationTeam[]>>;
}

function ProgramsStep({ organizationId, selectedProgram, setSelectedProgram, selectedTeams, setSelectedTeams }: ProgramsStepProps) {
  const [programMode, setProgramMode] = useState<"existing" | "new">("new");
  const [newProgramName, setNewProgramName] = useState(selectedProgram?.isNew ? selectedProgram.name : "");
  const [newProgramCode, setNewProgramCode] = useState(selectedProgram?.isNew ? selectedProgram.code : "");
  const [newTeamName, setNewTeamName] = useState("");

  const { data: existingPrograms = [] } = useQuery<any[]>({ queryKey: ["/api/programs"] });
  const { data: existingTeams = [] } = useQuery<any[]>({ queryKey: ["/api/teams"] });

  const orgPrograms = existingPrograms.filter((p: any) => p.organizationId === organizationId && p.productCategory !== 'goods');
  const orgTeams = existingTeams.filter((t: any) => t.organizationId === organizationId);

  const selectExistingProgram = (programId: string) => {
    const prog = orgPrograms.find((p: any) => p.id === programId);
    if (!prog) return;
    setSelectedProgram({ id: prog.id, name: prog.name, code: prog.code || "", isNew: false });
    setSelectedTeams([]);
  };

  const applyNewProgram = () => {
    if (!newProgramName.trim()) return;
    const tempId = `migration-new-${Date.now()}`;
    setSelectedProgram({ id: tempId, name: newProgramName.trim(), code: newProgramCode.trim(), isNew: true });
    setSelectedTeams([]);
  };

  const addExistingTeam = (teamId: string) => {
    const team = orgTeams.find((t: any) => t.id === parseInt(teamId));
    if (!team) return;
    if (selectedTeams.some((t) => t.id === team.id)) return;
    setSelectedTeams((prev) => [...prev, { id: team.id, name: team.name, programId: selectedProgram?.id || "", isNew: false }]);
  };

  const addNewTeam = () => {
    if (!newTeamName.trim()) return;
    const tempId = -(Date.now()); // negative id = new team placeholder
    setSelectedTeams((prev) => [...prev, { id: tempId, name: newTeamName.trim(), programId: selectedProgram?.id || "", isNew: true }]);
    setNewTeamName("");
  };

  const removeTeam = (id: number) => setSelectedTeams((prev) => prev.filter((t) => t.id !== id));

  const teamsForCurrentProgram = selectedProgram
    ? orgTeams.filter((t: any) => t.programId === selectedProgram.id && !selectedProgram.isNew)
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 text-sm text-blue-800">
        Select or create the program your migrated players belong to. You can also pre-assign teams — both will be marked incomplete for you to finish setting up later.
      </div>

      {/* Program selection */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Program</div>
        {orgPrograms.length > 0 && (
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant={programMode === "existing" ? "default" : "outline"} onClick={() => setProgramMode("existing")}>Use existing</Button>
            <Button size="sm" variant={programMode === "new" ? "default" : "outline"} onClick={() => setProgramMode("new")}>Create new</Button>
          </div>
        )}

        {(programMode === "existing" && orgPrograms.length > 0) ? (
          <Select value={selectedProgram && !selectedProgram.isNew ? selectedProgram.id : ""} onValueChange={selectExistingProgram}>
            <SelectTrigger>
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {orgPrograms.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Program name (e.g. Spring 2026 Training)"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
            />
            <Input
              placeholder="Short code (e.g. SPR26) — optional"
              value={newProgramCode}
              onChange={(e) => setNewProgramCode(e.target.value)}
            />
            <Button size="sm" onClick={applyNewProgram} disabled={!newProgramName.trim()}>
              {selectedProgram?.isNew ? "Update program" : "Set program"}
            </Button>
          </div>
        )}

        {selectedProgram && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <CheckCircle2 size={14} />
            <span>
              <strong>{selectedProgram.name}</strong>
              {selectedProgram.code ? ` · ${selectedProgram.code}` : ""}
              {selectedProgram.isNew ? " (will be created)" : ""}
            </span>
            <button onClick={() => setSelectedProgram(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Team selection — only show if program is selected */}
      {selectedProgram && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Teams <span className="text-muted-foreground font-normal">(optional)</span></div>

          {teamsForCurrentProgram.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Add from existing teams in this program:</div>
              <Select onValueChange={addExistingTeam} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Select a team to add" />
                </SelectTrigger>
                <SelectContent>
                  {teamsForCurrentProgram.map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="New team name (e.g. Blue, U12 Boys)"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNewTeam()}
            />
            <Button size="sm" variant="outline" onClick={addNewTeam} disabled={!newTeamName.trim()}>
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>

          {selectedTeams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTeams.map((t) => (
                <Badge key={t.id} variant="secondary" className="flex items-center gap-1">
                  {t.name}
                  {t.isNew && <span className="text-[10px] text-muted-foreground ml-1">(new)</span>}
                  <button onClick={() => removeTeam(t.id)} className="ml-1 hover:text-destructive">
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
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
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[22%]">First name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[22%]">Last name</th>
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
  parents, players, setPlayers, selectedProgram, selectedTeams,
}: {
  parents: MigrationParent[];
  players: MigrationPlayer[];
  setPlayers: React.Dispatch<React.SetStateAction<MigrationPlayer[]>>;
  selectedProgram: MigrationProgram | null;
  selectedTeams: MigrationTeam[];
}) {
  const [pasteRaw, setPasteRaw] = useState("");

  const add = () =>
    setPlayers((p) => [...p, {
      id: uid(),
      firstName: "",
      lastName: "",
      parentId: parents[0]?.id ?? null,
      subscriptionEndDate: "",
      programId: selectedProgram?.id ?? null,
      teamId: null,
    }]);

  const remove = (id: number) => setPlayers((p) => p.filter((x) => x.id !== id));

  const upd = (id: number, key: keyof MigrationPlayer, value: string | number | null) =>
    setPlayers((p) => p.map((x) => (x.id === id ? { ...x, [key]: value } : x)));

  const importPaste = () => {
    const rows = parsePaste(pasteRaw);
    const imported = rows
      .filter((r) => r.first)
      .map((r) => {
        const parent = parents.find((p) => p.email.toLowerCase() === r.parentEmail.toLowerCase());
        const matchedTeam = selectedTeams.find((t) => t.name.toLowerCase() === r.team?.toLowerCase());
        return {
          id: uid(),
          firstName: r.first,
          lastName: r.last,
          parentId: parent?.id ?? null,
          subscriptionEndDate: r.expiry,
          programId: selectedProgram?.id ?? null,
          teamId: matchedTeam?.id ?? null,
        };
      });
    if (!imported.length) return;
    setPlayers((p) => [...p, ...imported]);
    setPasteRaw("");
  };

  const colSpan = 2 + (selectedProgram ? 1 : 0) + (selectedTeams.length > 0 ? 1 : 0);

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
            Include a <strong>Parent Email</strong> column to auto-link players. Subscription End{selectedTeams.length > 0 ? " and Team" : ""} columns are detected automatically. All players are assigned to the program selected in step 1.
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
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[18%]">First name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[18%]">Last name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[22%]">Parent *</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[16%]">Sub end date</th>
              {selectedProgram && <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[14%]">Program</th>}
              {selectedTeams.length > 0 && <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[14%]">Team</th>}
              <th className="w-[6%]" />
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={5 + (selectedProgram ? 1 : 0) + (selectedTeams.length > 0 ? 1 : 0)} className="px-3 py-8 text-center text-sm text-muted-foreground">
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
                  <td className="px-1 py-1"><Input value={k.subscriptionEndDate} onChange={(e) => upd(k.id, "subscriptionEndDate", e.target.value)} placeholder="MM/DD/YYYY" className="border-0 shadow-none h-8 text-sm px-2" /></td>
                  {selectedProgram && (
                    <td className="px-1 py-1">
                      <Select
                        value={k.programId?.toString() ?? selectedProgram.id.toString()}
                        onValueChange={(v) => upd(k.id, "programId", v)}
                      >
                        <SelectTrigger className="border-0 shadow-none h-8 text-sm px-2">
                          <SelectValue placeholder="Program" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectedProgram.id.toString()}>{selectedProgram.name}</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {selectedTeams.length > 0 && (
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
                          {selectedTeams.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
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
    </div>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({
  parents, players, selectedProgram, selectedTeams, onSend, isSending,
}: {
  parents: MigrationParent[];
  players: MigrationPlayer[];
  selectedProgram: MigrationProgram | null;
  selectedTeams: MigrationTeam[];
  onSend: () => void;
  isSending: boolean;
}) {
  const noEmail   = parents.filter((p) => !p.email.trim());
  const unlinked  = players.filter((k) => !k.parentId);
  const expired   = players.filter((k) => expiryStatus(k.subscriptionEndDate) === "expired");
  const soon      = players.filter((k) => expiryStatus(k.subscriptionEndDate) === "soon");
  const canSend   = noEmail.length === 0 && unlinked.length === 0 && parents.length > 0;
  const inviteCount = parents.filter((p) => p.email.trim()).length;

  const sample     = parents.find((p) => p.email) ?? { firstName: "Member", lastName: "", email: "member@email.com" };
  const sampleKids = players.filter((k) => k.parentId === (sample as MigrationParent).id);

  const families = parents.map((par) => ({
    par,
    kids: players.filter((k) => k.parentId === par.id),
  }));

  const teamMap = Object.fromEntries(selectedTeams.map((t) => [t.id, t.name]));

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
      {selectedProgram && (
        <div className="flex items-start gap-3 p-3 bg-slate-50 border border-border rounded-lg text-sm">
          <Package size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">{selectedProgram.name}{selectedProgram.code ? ` · ${selectedProgram.code}` : ""}</div>
            {selectedTeams.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Teams: {selectedTeams.map((t) => t.name).join(", ")}
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
                    {selectedProgram && (
                      <Badge variant="outline" className="text-xs font-normal text-blue-700 border-blue-200 bg-blue-50">{selectedProgram.name}</Badge>
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
          {selectedProgram && (
            <p className="text-xs text-muted-foreground bg-slate-50 p-2 rounded">
              Program: <strong>{selectedProgram.name}</strong>
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
  const [selectedProgram, setSelectedProgram] = useState<MigrationProgram | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<MigrationTeam[]>([]);
  const [parents, setParents]             = useState<MigrationParent[]>([]);
  const [players, setPlayers]             = useState<MigrationPlayer[]>([]);
  const [isSending, setIsSending]         = useState(false);
  const [done, setDone]                   = useState(false);
  const [result, setResult]               = useState<MigrationResult | null>(null);

  const stepOrder: Step[] = ["programs", "parents", "players", "review"];
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
    const unlinked = players.filter((k) => !k.parentId);
    if (unlinked.length) {
      toast({ title: "Unlinked players", description: `${unlinked.length} player(s) aren't linked to a parent.`, variant: "destructive" });
      return false;
    }
    return true;
  }, [players, toast]);

  const validateProgram = useCallback(() => {
    if (!selectedProgram) {
      toast({ title: "No program selected", description: "Select or create a program before continuing.", variant: "destructive" });
      return false;
    }
    return true;
  }, [selectedProgram, toast]);

  const next = () => {
    if (step === "programs" && !validateProgram()) return;
    if (step === "parents" && !validateParents()) return;
    if (step === "players" && !validatePlayers()) return;
    setStep(stepOrder[stepIdx + 1]);
  };

  const back = () => setStep(stepOrder[stepIdx - 1]);

  const send = async () => {
    setIsSending(true);
    try {
      const payload = {
        parents,
        players,
        program: selectedProgram,
        teams: selectedTeams,
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
          {step === "review"  && "Review & send invites"}
        </h2>

        {step === "programs" && (
          <ProgramsStep
            organizationId={organizationId}
            selectedProgram={selectedProgram}
            setSelectedProgram={setSelectedProgram}
            selectedTeams={selectedTeams}
            setSelectedTeams={setSelectedTeams}
          />
        )}
        {step === "parents" && <ParentsStep parents={parents} setParents={setParents} />}
        {step === "players" && (
          <PlayersStep
            parents={parents}
            players={players}
            setPlayers={setPlayers}
            selectedProgram={selectedProgram}
            selectedTeams={selectedTeams}
          />
        )}
        {step === "review" && (
          <ReviewStep
            parents={parents}
            players={players}
            selectedProgram={selectedProgram}
            selectedTeams={selectedTeams}
            onSend={send}
            isSending={isSending}
          />
        )}

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
