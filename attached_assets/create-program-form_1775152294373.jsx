import { useState, useCallback } from "react";
import {
  Layers, DollarSign, ChevronDown, ChevronRight,
  Plus, Trash2, ImageIcon, CreditCard, RefreshCw, Package,
  Users, User, Building, Shield, Calendar, Clock,
  FileText, Ticket, ShoppingBag, Eye, EyeOff, Globe,
  MessageCircle, BellOff, Mic, Star, Trophy, Crown,
  Target, Tent, Award, X, Copy, Settings, Hash, Percent,
  Tag, MapPin, Info
} from "lucide-react";

/* ─── Collapsible Section ─── */
function Section({ title, icon: Icon, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-5 py-4 space-y-5">{children}</div>}
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, hint, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

/* ─── Segmented control ─── */
function SegControl({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            value === o.value
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {o.Icon && <o.Icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Chip select (single) ─── */
function ChipSel({ options, value, onChange, cols }) {
  return (
    <div className={cols ? `grid gap-2` : "flex flex-wrap gap-2"} style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 border ${
              on
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {o.Icon && <o.Icon size={14} className={on ? "text-red-500" : "text-gray-400"} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Toggle row ─── */
function TogRow({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {desc && <div className="text-xs text-gray-400 mt-0.5">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-red-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ─── Checkbox item ─── */
function ChkItem({ checked, onChange, label, extra }) {
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
      checked ? "bg-red-50/60" : "hover:bg-gray-50"
    }`}>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
          checked ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      {extra && <span className="text-xs text-gray-400 font-medium">{extra}</span>}
    </label>
  );
}

/* ─── Pricing Option Card ─── */
function PricingCard({ option, index, onUpdate, onRemove, basePrice }) {
  const [open, setOpen] = useState(true);
  const inst = Number(option.installments) || 3;
  const disc = Number(option.payInFullDiscount) || 0;
  const price = parseFloat(option.price) || 0;
  const perI = price > 0 ? (price / inst).toFixed(2) : null;
  const pif = price > 0 && disc > 0 ? (price * (1 - disc / 100)).toFixed(2) : null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-sm font-medium text-gray-800 truncate">
            {option.name || `Option ${index + 1}`}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold flex-shrink-0">
            {option.type === "credit_pack" ? "Pack" : option.type === "subscription" ? "Sub" : "One-Time"}
          </span>
          {option.price && (
            <span className="text-xs text-gray-400 flex-shrink-0">${option.price}</span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select
                value={option.type}
                onChange={(e) => onUpdate({ ...option, type: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-gray-400"
              >
                <option value="one_time">One-Time Payment</option>
                <option value="credit_pack">Credit Pack</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Name</label>
              <input
                value={option.name}
                onChange={(e) => onUpdate({ ...option, name: e.target.value })}
                placeholder="3 Months"
                className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Price ($)</label>
              <input
                value={option.price}
                onChange={(e) => onUpdate({ ...option, price: e.target.value })}
                placeholder="195.00"
                inputMode="decimal"
                className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Duration (days)</label>
              <input
                type="number"
                value={option.duration}
                onChange={(e) => onUpdate({ ...option, duration: e.target.value })}
                placeholder="90"
                className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Savings Note</label>
              <input
                value={option.savings || ""}
                onChange={(e) => onUpdate({ ...option, savings: e.target.value })}
                placeholder="Save $30!"
                className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Installments within option */}
          <div className="border-t border-gray-100 pt-3">
            <ChkItem
              checked={option.allowInstallments || false}
              onChange={(v) => onUpdate({ ...option, allowInstallments: v })}
              label="Allow Installment Payments"
            />
            {option.allowInstallments && (
              <div className="mt-2 border border-amber-200 rounded-lg p-3 bg-amber-50/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Number of Installments</label>
                    <input
                      type="number"
                      value={option.installments || "3"}
                      min="2"
                      max="12"
                      onChange={(e) => onUpdate({ ...option, installments: e.target.value })}
                      className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Pay-in-Full Discount (%)</label>
                    <input
                      type="number"
                      value={option.payInFullDiscount || "0"}
                      min="0"
                      max="50"
                      onChange={(e) => onUpdate({ ...option, payInFullDiscount: e.target.value })}
                      className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
                <div className="bg-white/60 rounded-md p-2.5 space-y-1">
                  {perI ? (
                    <>
                      <p className="text-xs text-amber-800 font-medium">
                        {inst}× payments of <strong className="text-gray-900">${perI}</strong>
                        {" "}= ${price.toFixed(2)}
                      </p>
                      {pif && (
                        <p className="text-xs text-green-700">
                          Pay in full: <strong>${pif}</strong> (save {disc}%)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-amber-700">Set the option price above to see installment breakdown</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stripe */}
          <div className="border-t border-gray-100 pt-3">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              Stripe Price ID
              <span className="text-gray-300 font-normal">(paste existing or leave blank to auto-create)</span>
            </label>
            <div className="flex gap-2 mt-1">
              <input
                value={option.stripePriceId || ""}
                onChange={(e) => onUpdate({ ...option, stripePriceId: e.target.value })}
                placeholder="price_xxx..."
                className="flex-1 h-9 px-3 rounded-md border border-gray-200 text-sm font-mono outline-none focus:border-gray-400"
              />
              <button
                type="button"
                disabled={!option.stripePriceId}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
              >
                Fetch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Time Window ─── */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TimeWindow({ tw, index, onUpdate, onRemove }) {
  const toggleDay = (d) => {
    const ds = tw.days || [];
    onUpdate({ ...tw, days: ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d] });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Window {index + 1}</span>
        <button type="button" onClick={onRemove} className="p-1 hover:bg-red-50 rounded">
          <X size={14} className="text-red-400" />
        </button>
      </div>
      <div className="flex gap-1">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDay(d)}
            className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors ${
              (tw.days || []).includes(d)
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-400 hover:border-gray-300"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Start</label>
          <input
            type="time"
            value={tw.start || ""}
            onChange={(e) => onUpdate({ ...tw, start: e.target.value })}
            className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">End</label>
          <input
            type="time"
            value={tw.end || ""}
            onChange={(e) => onUpdate({ ...tw, end: e.target.value })}
            className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Constants ─── */
const PRODUCT_TYPES = [
  { value: "Subscription", label: "Subscription", Icon: RefreshCw },
  { value: "One-Time", label: "One-Time", Icon: CreditCard },
  { value: "Pack", label: "Credit Pack", Icon: Package },
];

const CATEGORIES = [
  { value: "general", label: "General", Icon: Layers },
  { value: "basketball", label: "Basketball", Icon: Target },
  { value: "training", label: "Training", Icon: Target },
  { value: "camps", label: "Camps", Icon: Tent },
  { value: "clinics", label: "Clinics", Icon: Shield },
  { value: "league", label: "League", Icon: Trophy },
  { value: "tournament", label: "Tournament", Icon: Award },
  { value: "membership", label: "Membership", Icon: Ticket },
];

const ICONS_LIST = [
  { value: "basketball", label: "Basketball", Icon: Target },
  { value: "tent", label: "Camps", Icon: Tent },
  { value: "users", label: "Team", Icon: Users },
  { value: "trophy", label: "Trophy", Icon: Trophy },
  { value: "calendar", label: "Calendar", Icon: Calendar },
  { value: "star", label: "Star", Icon: Star },
  { value: "medal", label: "Medal", Icon: Award },
  { value: "crown", label: "Crown", Icon: Crown },
];

const BILLING_MODELS = [
  { value: "Per Player", label: "Per Player", Icon: User },
  { value: "Per Family", label: "Per Family", Icon: Users },
  { value: "Organization-Wide", label: "Org-Wide", Icon: Building },
];

const ACCESS_TYPES = [
  { value: "club_member", label: "Club Member", Icon: Shield },
  { value: "pack_holder", label: "Pack Holder", Icon: Package },
  { value: "none", label: "No Access", Icon: X },
];

const ROSTER_OPTS = [
  { value: "public", label: "Public", Icon: Globe },
  { value: "members", label: "Members Only", Icon: Eye },
  { value: "hidden", label: "Hidden", Icon: EyeOff },
];

const CHAT_OPTS = [
  { value: "two_way", label: "Two-Way", Icon: MessageCircle },
  { value: "announcements", label: "Announce Only", Icon: Mic },
  { value: "disabled", label: "Disabled", Icon: BellOff },
];

const SUBGROUP_OPTS = [
  { value: "Team", label: "Team" },
  { value: "Level", label: "Level" },
  { value: "Group", label: "Group" },
];

const SESSION_OPTS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

const WAIVERS = [
  { id: "aau", label: "AAU Membership" },
  { id: "club_agreement", label: "Club Agreement" },
  { id: "concussion", label: "Concussion Waiver" },
];

const ADDONS = [
  { id: "gear", label: "Complete Gear Package", price: 259 },
  { id: "uniform", label: "Add-On Uniform", price: 105 },
  { id: "uniform_jersey", label: "Uniform + Practice Jersey", price: 156 },
];

/* ─── Main Component ─── */
export default function CreateProgramForm() {
  const [form, setForm] = useState({
    name: "", description: "", category: "general", icon: "",
    productType: "Subscription", price: "", billingInterval: "30",
    billingModel: "Per Player", accessType: "club_member",
    subscriptionDisclosure: "",
    allowInstallments: false, installmentCount: "3", payInFullDiscount: "0",
    pricingOptions: [], addons: [], waivers: [],
    scheduleRequest: false, sessionLength: 60, timeWindows: [],
    active: true, hasSubgroups: true, subgroupLabel: "Team",
    rosterVisibility: "members", chatMode: "two_way",
  });

  const set = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);

  // Auto-disclosure
  const price = parseFloat(form.price) || 0;
  const intv = Number(form.billingInterval) || 30;
  const inst = Number(form.installmentCount) || 3;
  const disc = Number(form.payInFullDiscount) || 0;
  const billingLabel = intv === 7 ? "weekly" : intv === 14 ? "bi-weekly" : intv === 30 ? "monthly" : intv === 90 ? "quarterly" : intv === 365 ? "annually" : `every ${intv} days`;
  const perInst = price > 0 ? (price / inst).toFixed(2) : "0.00";
  const pifPrice = price > 0 && disc > 0 ? (price * (1 - disc / 100)).toFixed(2) : null;

  const autoDisclosure = price > 0
    ? `You will be charged $${price.toFixed(2)} ${billingLabel}. Your subscription renews automatically until canceled. Cancel anytime from your account.${
        form.allowInstallments ? ` Installment option: ${inst} payments of $${perInst}.` : ""
      }${pifPrice ? ` Pay in full and save ${disc}% ($${pifPrice}).` : ""}`
    : "";

  return (
    <div className="min-h-screen bg-gray-100/80 flex items-start justify-center p-4 sm:p-8">
      {/* Modal container */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create New Program</h2>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── BASICS ── */}
          <Section title="Program Details" icon={Layers} defaultOpen={true}>
            <Field label="Program Name">
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="High School Club"
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Competitive basketball program for high school players"
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-y min-h-[60px]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <ChipSel options={CATEGORIES} value={form.category} onChange={(v) => set({ category: v })} />
              </Field>
              <Field label="Icon">
                <ChipSel options={ICONS_LIST} value={form.icon} onChange={(v) => set({ icon: v })} />
              </Field>
            </div>

            <Field label="Cover Image" hint="Recommended: 16:9 aspect ratio (1280×720 or similar)">
              <label className="flex flex-col items-center justify-center py-6 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                <ImageIcon size={24} className="text-gray-300 mb-1" />
                <span className="text-sm text-gray-500 font-medium">Click to upload</span>
                <span className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </Field>
          </Section>

          {/* ── PRICING & BILLING ── */}
          <Section title="Pricing & Billing" icon={DollarSign} defaultOpen={true} badge="Required">

            {/* Product type */}
            <Field label="Product Type">
              <SegControl options={PRODUCT_TYPES} value={form.productType} onChange={(v) => set({ productType: v })} />
            </Field>

            {/* Price row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price ($)">
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => set({ price: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-10 pl-8 pr-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </div>
              </Field>
              <Field label="Billing Model">
                <ChipSel options={BILLING_MODELS} value={form.billingModel} onChange={(v) => set({ billingModel: v })} />
              </Field>
            </div>

            {/* Subscription-specific */}
            {form.productType === "Subscription" && (
              <>
                <Field label="Billing Interval (days)" hint={`Charges ${billingLabel}`}>
                  <input
                    type="number"
                    min="1"
                    value={form.billingInterval}
                    onChange={(e) => set({ billingInterval: e.target.value })}
                    placeholder="30"
                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  />
                </Field>

                {/* Installments at base level */}
                <div className="border-t border-gray-100 pt-4">
                  <ChkItem
                    checked={form.allowInstallments}
                    onChange={(v) => set({ allowInstallments: v })}
                    label="Allow Installment Payments"
                  />
                  {form.allowInstallments && (
                    <div className="mt-3 border border-amber-200 rounded-lg p-4 bg-amber-50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Number of Installments">
                          <input
                            type="number"
                            value={form.installmentCount}
                            min="2"
                            max="12"
                            onChange={(e) => set({ installmentCount: e.target.value })}
                            placeholder="3"
                            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-gray-400"
                          />
                        </Field>
                        <Field label="Pay-in-Full Discount (%)">
                          <input
                            type="number"
                            value={form.payInFullDiscount}
                            min="0"
                            max="50"
                            onChange={(e) => set({ payInFullDiscount: e.target.value })}
                            placeholder="0"
                            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-gray-400"
                          />
                        </Field>
                      </div>
                      <div className="bg-white/60 rounded-md p-3 space-y-1">
                        {price > 0 ? (
                          <>
                            <p className="text-xs text-amber-800 font-medium">
                              {inst}× payments of <strong className="text-gray-900">${perInst}</strong> = ${price.toFixed(2)}
                            </p>
                            {pifPrice && (
                              <p className="text-xs text-green-700 font-medium">
                                Pay in full: <strong>${pifPrice}</strong> (save {disc}%)
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-amber-700">Set the option price above to see installment breakdown</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscription Disclosure */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Disclosure
                    </label>
                    {autoDisclosure && (
                      <button
                        type="button"
                        onClick={() => set({ subscriptionDisclosure: autoDisclosure })}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Copy size={11} /> Auto-fill from fields
                      </button>
                    )}
                  </div>
                  <textarea
                    value={form.subscriptionDisclosure}
                    onChange={(e) => set({ subscriptionDisclosure: e.target.value })}
                    placeholder="You will be charged $X every [cycle]. Your subscription renews automatically until canceled."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-y min-h-[70px]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Displayed before checkout. Explain billing, auto-renewal, cancellation.</p>
                </div>
              </>
            )}

            {/* Access Type */}
            <div className="border-t border-gray-100 pt-4">
              <Field label="Access Type" hint="Determines user's status after purchase">
                <ChipSel options={ACCESS_TYPES} value={form.accessType} onChange={(v) => set({ accessType: v })} cols={3} />
              </Field>
            </div>

            {/* Pricing Options / Tiers */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Pricing Options</h4>
                  <p className="text-xs text-gray-400">Add pricing tiers: one-time bundles, credit packs, or subscriptions</p>
                </div>
                <button
                  type="button"
                  onClick={() => set({
                    pricingOptions: [...form.pricingOptions, {
                      type: "one_time", name: "", price: "", duration: "90",
                      savings: "", allowInstallments: false, installments: "3",
                      payInFullDiscount: "0", stripePriceId: "",
                    }],
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>
              <div className="space-y-2">
                {form.pricingOptions.map((opt, i) => (
                  <PricingCard
                    key={i}
                    option={opt}
                    index={i}
                    basePrice={price}
                    onUpdate={(u) => {
                      const arr = [...form.pricingOptions];
                      arr[i] = u;
                      set({ pricingOptions: arr });
                    }}
                    onRemove={() => set({ pricingOptions: form.pricingOptions.filter((_, j) => j !== i) })}
                  />
                ))}
                {form.pricingOptions.length === 0 && (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No pricing options yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coupons */}
            <div className="border-t border-gray-100 pt-4">
              <div className="border border-purple-100 rounded-lg p-3 bg-purple-50/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <Ticket size={14} className="text-purple-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Coupons</h4>
                </div>
                <p className="text-xs text-gray-400 mb-3">Generate discount coupons. Coupons expire 24 hours after creation.</p>
                <div className="text-center py-3 bg-white/60 rounded border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Save the program first to create coupons.</p>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div className="border-t border-gray-100 pt-4">
              <Field label="Suggested Add-ons" hint="These products will be suggested as add-ons during checkout">
                <div className="space-y-1 border border-gray-200 rounded-lg p-1 max-h-36 overflow-y-auto">
                  {ADDONS.map((a) => (
                    <ChkItem
                      key={a.id}
                      checked={(form.addons || []).includes(a.id)}
                      onChange={(c) => {
                        const arr = form.addons || [];
                        set({ addons: c ? [...arr, a.id] : arr.filter((x) => x !== a.id) });
                      }}
                      label={a.label}
                      extra={`$${a.price.toFixed(2)}`}
                    />
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          {/* ── REQUIREMENTS & SCHEDULE ── */}
          <Section title="Requirements & Schedule" icon={FileText} defaultOpen={false}>
            <Field label="Required Waivers" hint="Users must sign these waivers before enrolling">
              <div className="space-y-1 border border-gray-200 rounded-lg p-1">
                {WAIVERS.map((w) => (
                  <ChkItem
                    key={w.id}
                    checked={(form.waivers || []).includes(w.id)}
                    onChange={(c) => {
                      const arr = form.waivers || [];
                      set({ waivers: c ? [...arr, w.id] : arr.filter((x) => x !== w.id) });
                    }}
                    label={w.label}
                  />
                ))}
              </div>
            </Field>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <TogRow
                checked={form.scheduleRequest}
                onChange={(v) => set({ scheduleRequest: v })}
                label="Enable Schedule Request"
                desc="Allow parents to book sessions after payment"
              />

              {form.scheduleRequest && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                  <Field label="Session Length" hint="How long each booked session will last">
                    <div className="flex gap-1.5">
                      {SESSION_OPTS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => set({ sessionLength: s.value })}
                          className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
                            form.sessionLength === s.value
                              ? "bg-red-600 text-white"
                              : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Available Time Windows</h5>
                        <p className="text-xs text-gray-400 mt-0.5">Define recurring weekly time slots</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(form.timeWindows || []).map((tw, i) => (
                        <TimeWindow
                          key={i}
                          tw={tw}
                          index={i}
                          onUpdate={(u) => {
                            const arr = [...(form.timeWindows || [])];
                            arr[i] = u;
                            set({ timeWindows: arr });
                          }}
                          onRemove={() => set({ timeWindows: (form.timeWindows || []).filter((_, j) => j !== i) })}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => set({ timeWindows: [...(form.timeWindows || []), { days: [], start: "", end: "" }] })}
                      className="w-full py-2.5 mt-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Add Time Slot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── SOCIAL & ACCESS ── */}
          <Section title="Social Settings" icon={Users} defaultOpen={false}>
            <TogRow
              checked={form.hasSubgroups}
              onChange={(v) => set({ hasSubgroups: v })}
              label="Has Teams/Groups"
              desc="Enable if this program has subgroups like teams or levels"
            />

            {form.hasSubgroups && (
              <Field label="Subgroup Label">
                <SegControl
                  options={SUBGROUP_OPTS.map((o) => ({ ...o, Icon: undefined }))}
                  value={form.subgroupLabel}
                  onChange={(v) => set({ subgroupLabel: v })}
                />
              </Field>
            )}

            <div className="border-t border-gray-100 pt-4">
              <Field label="Roster Visibility">
                <ChipSel options={ROSTER_OPTS} value={form.rosterVisibility} onChange={(v) => set({ rosterVisibility: v })} cols={3} />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <Field label="Chat Mode">
                <ChipSel options={CHAT_OPTS} value={form.chatMode} onChange={(v) => set({ chatMode: v })} cols={3} />
              </Field>
            </div>
          </Section>

          {/* Active toggle */}
          <div className="flex items-center justify-between px-5 py-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2.5">
              <Globe size={16} className="text-gray-400" />
              <div>
                <div className="text-sm font-semibold text-gray-700">Active Program</div>
                <div className="text-xs text-gray-400">Visible and open for enrollment when active</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => set({ active: !form.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.active ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                form.active ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {!form.name && !form.price
              ? "Missing: title, price"
              : !form.name
              ? "Missing: title"
              : !form.price
              ? "Missing: price"
              : "Ready to create"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 px-4 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name || !form.price}
              className="h-10 px-5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Program
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
