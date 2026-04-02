import { useState, useEffect, useRef } from "react";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const PROGRAMS = [
  { id: 1, name: "Junior Development", color: "#3B82F6", season: "2025" },
  { id: 2, name: "Senior Comp", color: "#EF4444", season: "2025" },
  { id: 3, name: "Summer League", color: "#F59E0B", season: "2025" },
];

const INITIAL_TEAMS = [
  { id: 1, name: "U10 Red", programId: 1, division: "U10", season: "Fall 2025", location: "Court 1", color: "#DC2626", players: [1, 2, 3], coaches: [{ userId: 5, role: "HC" }], notes: "" },
  { id: 2, name: "U10 Blue", programId: 1, division: "U10", season: "Fall 2025", location: "Court 2", color: "#2563EB", players: [4, 5], coaches: [{ userId: 6, role: "AC" }], notes: "" },
  { id: 3, name: "U12 Thunder", programId: 1, division: "U12", season: "Fall 2025", location: "Court 1", color: "#7C3AED", players: [6, 7, 8, 9], coaches: [{ userId: 5, role: "HC" }, { userId: 6, role: "AC" }], notes: "Tournament team" },
  { id: 4, name: "Open A", programId: 2, division: "Open", season: "2025", location: "Main Court", color: "#DC2626", players: [10, 11, 12, 13, 14], coaches: [{ userId: 7, role: "HC" }], notes: "" },
  { id: 5, name: "Open B", programId: 2, division: "Open", season: "2025", location: "Main Court", color: "#1D4ED8", players: [15, 16], coaches: [], notes: "Needs coach" },
];

const USERS = [
  { id: 1, name: "Liam Chen", email: "liam@test.com", type: "player" },
  { id: 2, name: "Noah Park", email: "noah@test.com", type: "player" },
  { id: 3, name: "Emma Wilson", email: "emma@test.com", type: "player" },
  { id: 4, name: "Ava Smith", email: "ava@test.com", type: "player" },
  { id: 5, name: "James Taylor", email: "james@test.com", type: "player" },
  { id: 6, name: "Mia Johnson", email: "mia@test.com", type: "player" },
  { id: 7, name: "Lucas Brown", email: "lucas@test.com", type: "player" },
  { id: 8, name: "Sophie Davis", email: "sophie@test.com", type: "player" },
  { id: 9, name: "Oliver Lee", email: "oliver@test.com", type: "player" },
  { id: 10, name: "Ella Martin", email: "ella@test.com", type: "player" },
  { id: 11, name: "Will Garcia", email: "will@test.com", type: "player" },
  { id: 12, name: "Zoe White", email: "zoe@test.com", type: "player" },
  { id: 13, name: "Ethan Hall", email: "ethan@test.com", type: "player" },
  { id: 14, name: "Chloe King", email: "chloe@test.com", type: "player" },
  { id: 15, name: "Aiden Wright", email: "aiden@test.com", type: "player" },
  { id: 16, name: "Grace Lopez", email: "grace@test.com", type: "player" },
];

const STAFF = [
  { id: 5, name: "Coach Marcus", email: "marcus@staff.com" },
  { id: 6, name: "Coach Rivera", email: "rivera@staff.com" },
  { id: 7, name: "Coach Daniels", email: "daniels@staff.com" },
  { id: 8, name: "Coach Kim", email: "kim@staff.com" },
];

const COACH_ROLES = ["HC", "AC", "TM", "SC"];
const ROLE_LABELS = { HC: "Head Coach", AC: "Assistant Coach", TM: "Team Manager", SC: "Strength Coach" };

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, className = "" }) => {
  const s = { width: size, height: size };
  const props = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className, style: s };
  const icons = {
    plus: <svg {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    users: <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    layers: <svg {...props}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>,
    chevronDown: <svg {...props}><path d="m6 9 6 6 6-6"/></svg>,
    chevronRight: <svg {...props}><path d="m9 18 6-6-6-6"/></svg>,
    x: <svg {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    edit: <svg {...props}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>,
    trash: <svg {...props}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    search: <svg {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    check: <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>,
    clipboard: <svg {...props}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
    shield: <svg {...props}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
    mapPin: <svg {...props}><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>,
    calendar: <svg {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>,
    copy: <svg {...props}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
    userPlus: <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>,
    palette: <svg {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  };
  return icons[name] || null;
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function TeamCard({ team, onEdit, onDelete, users, staff }) {
  const playerNames = team.players.map(pid => users.find(u => u.id === pid)?.name || "Unknown").slice(0, 4);
  const coachNames = team.coaches.map(c => {
    const s = staff.find(st => st.id === c.userId);
    return s ? `${c.role}: ${s.name}` : null;
  }).filter(Boolean);

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-200/80 p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(team)}
      style={{ borderLeft: `4px solid ${team.color || '#9CA3AF'}` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color || '#9CA3AF' }} />
          <h4 className="font-semibold text-gray-900 text-sm">{team.name}</h4>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(team); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Icon name="edit" size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {team.division && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
            {team.division}
          </span>
        )}
        {team.season && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
            {team.season}
          </span>
        )}
        {team.location && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600">
            <Icon name="mapPin" size={9} /> {team.location}
          </span>
        )}
      </div>

      {coachNames.length > 0 && (
        <div className="mb-2">
          {coachNames.map((cn, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 mr-1 mb-1">
              {cn}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Icon name="users" size={12} />
          <span>{team.players.length} player{team.players.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex -space-x-1.5">
          {playerNames.slice(0, 3).map((name, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600 uppercase" title={name}>
              {name.split(' ').map(n => n[0]).join('')}
            </div>
          ))}
          {team.players.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600">
              +{team.players.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgramSection({ program, teams, onEditTeam, onDeleteTeam, onAddTeam, users, staff }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: program.color }} />
          <Icon name="layers" size={16} className="text-gray-400" />
          <span className="font-semibold text-gray-900 text-sm">{program.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddTeam(program.id); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs font-medium transition-colors"
          >
            <Icon name="plus" size={12} /> Add
          </button>
          <div className={`transition-transform duration-200 text-gray-400 ${expanded ? 'rotate-0' : '-rotate-90'}`}>
            <Icon name="chevronDown" size={16} />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 sm:pl-2">
          {teams.map(t => (
            <TeamCard key={t.id} team={t} onEdit={onEditTeam} onDelete={onDeleteTeam} users={users} staff={staff} />
          ))}
          {teams.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400 text-sm">
              No teams yet.{' '}
              <button onClick={() => onAddTeam(program.id)} className="text-red-500 hover:underline font-medium">Create one</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Editor Modal ──────────────────────────────────────────────────────

function TeamEditorModal({ team, programs, users, staff, onSave, onClose }) {
  const isNew = !team?.id;
  const [form, setForm] = useState({
    name: team?.name || '',
    programId: team?.programId || programs[0]?.id || '',
    division: team?.division || '',
    season: team?.season || '',
    location: team?.location || '',
    color: team?.color || '#DC2626',
    notes: team?.notes || '',
    players: team?.players || [],
    coaches: team?.coaches || [],
  });
  const [activeTab, setActiveTab] = useState('details');
  const [playerSearch, setPlayerSearch] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const overlayRef = useRef(null);

  const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#7C3AED', '#F59E0B', '#EC4899', '#0891B2', '#1D4ED8', '#4F46E5', '#059669'];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlayer = (id) => {
    set('players', form.players.includes(id) ? form.players.filter(p => p !== id) : [...form.players, id]);
  };

  const addCoach = (userId) => {
    if (!form.coaches.find(c => c.userId === userId)) {
      set('coaches', [...form.coaches, { userId, role: 'AC' }]);
    }
  };

  const removeCoach = (userId) => {
    set('coaches', form.coaches.filter(c => c.userId !== userId));
  };

  const setCoachRole = (userId, role) => {
    set('coaches', form.coaches.map(c => c.userId === userId ? { ...c, role } : c));
  };

  const filteredPlayers = users.filter(u =>
    u.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredStaff = staff.filter(s =>
    !form.coaches.find(c => c.userId === s.id) &&
    (s.name.toLowerCase().includes(coachSearch.toLowerCase()) || s.email.toLowerCase().includes(coachSearch.toLowerCase()))
  );

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...team, ...form, id: team?.id || Date.now() });
  };

  const tabs = [
    { key: 'details', label: 'Details', icon: 'clipboard' },
    { key: 'roster', label: `Roster (${form.players.length})`, icon: 'users' },
    { key: 'coaches', label: `Coaches (${form.coaches.length})`, icon: 'shield' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === overlayRef.current && onClose()}>
      <div ref={overlayRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ animation: 'modalIn .25s ease-out' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isNew ? 'Create New Team' : `Edit Team — ${team.name}`}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isNew ? 'Set up a new team under a program' : 'Update team details, roster & coaching staff'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Name + Program row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Team Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. U10 Red"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Program</label>
                  <select
                    value={form.programId}
                    onChange={e => set('programId', Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-white transition-shadow"
                  >
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Division + Season + Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Division</label>
                  <input value={form.division} onChange={e => set('division', e.target.value)} placeholder="e.g. U10, U12" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Season</label>
                  <input value={form.season} onChange={e => set('season', e.target.value)} placeholder="e.g. Fall 2025" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Main Court" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow" />
                </div>
              </div>

              {/* Team Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Team Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set('color', c)}
                      className="w-7 h-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? '#111' : 'transparent',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {form.color === c && <Icon name="check" size={12} className="text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                    className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer overflow-hidden p-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional info about this team..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none transition-shadow"
                />
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Current roster summary */}
              {form.players.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2">Current Roster — {form.players.length} player{form.players.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.players.map(pid => {
                      const u = users.find(u => u.id === pid);
                      return u ? (
                        <span key={pid} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          {u.name}
                          <button onClick={() => togglePlayer(pid)} className="hover:text-red-600 transition-colors ml-0.5">
                            <Icon name="x" size={10} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  placeholder="Search players by name or email..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow"
                />
              </div>

              {/* Player list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {filteredPlayers.map(u => {
                  const isOn = form.players.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => togglePlayer(u.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left border-b last:border-b-0 transition-colors ${isOn ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isOn ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                          {isOn && <Icon name="check" size={10} className="text-white" />}
                        </div>
                        <div>
                          <p className={`text-sm ${isOn ? 'font-semibold text-green-700' : 'text-gray-900'}`}>{u.name}</p>
                          <p className="text-[11px] text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      {isOn && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">On Roster</span>
                      )}
                    </button>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No players match your search</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'coaches' && (
            <div className="space-y-4">
              {/* Current coaches */}
              {form.coaches.length > 0 ? (
                <div className="space-y-2">
                  {form.coaches.map(c => {
                    const s = staff.find(st => st.id === c.userId);
                    return s ? (
                      <div key={c.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 uppercase">
                            {s.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            <p className="text-[11px] text-gray-400">{s.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={c.role}
                            onChange={e => setCoachRole(c.userId, e.target.value)}
                            className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            {COACH_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                          <button onClick={() => removeCoach(c.userId)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Icon name="shield" size={24} className="mx-auto mb-2 text-gray-300" />
                  No coaches assigned yet
                </div>
              )}

              {/* Add coach */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Add Coaching Staff</p>
                <div className="relative mb-2">
                  <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={coachSearch}
                    onChange={e => setCoachSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow"
                  />
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredStaff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => addCoach(s.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{s.name}</p>
                          <p className="text-[11px] text-gray-400">{s.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <Icon name="plus" size={12} /> Add
                      </span>
                    </button>
                  ))}
                  {filteredStaff.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      {staff.length === form.coaches.length ? 'All staff assigned' : 'No results'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-400">
            {form.players.length} players · {form.coaches.length} coaches
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isNew ? 'Create Team' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Confirm Delete Modal ───────────────────────────────────────────────────

function ConfirmDeleteModal({ teamName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" style={{ animation: 'modalIn .2s ease-out' }}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Team</h3>
        <p className="text-sm text-gray-500 mb-5">
          Are you sure you want to delete <strong className="text-gray-900">{teamName}</strong>? This will remove all roster assignments. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TeamsManager() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [editingTeam, setEditingTeam] = useState(null); // team object or { programId } for new
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalTeams = teams.length;
  const totalPlayers = new Set(teams.flatMap(t => t.players)).size;

  const handleSave = (team) => {
    setTeams(prev => {
      const exists = prev.find(t => t.id === team.id);
      if (exists) return prev.map(t => t.id === team.id ? team : t);
      return [...prev, team];
    });
    setEditingTeam(null);
  };

  const handleDelete = () => {
    setTeams(prev => prev.filter(t => t.id !== deletingTeam.id));
    setDeletingTeam(null);
  };

  const filteredTeams = searchQuery
    ? teams.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.division?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : teams;

  // Group filtered teams by program
  const groupedByProgram = PROGRAMS.map(p => ({
    program: p,
    teams: filteredTeams.filter(t => t.programId === p.id),
  })).filter(g => g.teams.length > 0 || !searchQuery);

  // Unassigned teams
  const unassigned = filteredTeams.filter(t => !PROGRAMS.find(p => p.id === t.programId));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teams</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalTeams} team{totalTeams !== 1 ? 's' : ''} · {totalPlayers} unique players across all rosters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-shadow"
            />
          </div>
          <button
            onClick={() => setEditingTeam({ programId: PROGRAMS[0]?.id })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Icon name="plus" size={14} className="text-white/80" />
            Add Team
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Teams', value: totalTeams, color: 'text-gray-900' },
          { label: 'Programs', value: PROGRAMS.length, color: 'text-blue-600' },
          { label: 'Players Assigned', value: totalPlayers, color: 'text-green-600' },
          { label: 'Avg Roster', value: totalTeams ? Math.round(teams.reduce((s, t) => s + t.players.length, 0) / totalTeams) : 0, color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Program sections */}
      <div>
        {groupedByProgram.map(({ program, teams: pTeams }) => (
          <ProgramSection
            key={program.id}
            program={program}
            teams={pTeams}
            onEditTeam={(t) => setEditingTeam(t)}
            onDeleteTeam={(id) => setDeletingTeam(teams.find(t => t.id === id))}
            onAddTeam={(programId) => setEditingTeam({ programId })}
            users={USERS}
            staff={STAFF}
          />
        ))}
        {unassigned.length > 0 && (
          <ProgramSection
            program={{ id: 0, name: 'Unassigned', color: '#9CA3AF' }}
            teams={unassigned}
            onEditTeam={(t) => setEditingTeam(t)}
            onDeleteTeam={(id) => setDeletingTeam(teams.find(t => t.id === id))}
            onAddTeam={() => setEditingTeam({})}
            users={USERS}
            staff={STAFF}
          />
        )}
      </div>

      {/* Modals */}
      {editingTeam && (
        <TeamEditorModal
          team={editingTeam}
          programs={PROGRAMS}
          users={USERS}
          staff={STAFF}
          onSave={handleSave}
          onClose={() => setEditingTeam(null)}
        />
      )}

      {deletingTeam && (
        <ConfirmDeleteModal
          teamName={deletingTeam.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTeam(null)}
        />
      )}
    </div>
  );
}
