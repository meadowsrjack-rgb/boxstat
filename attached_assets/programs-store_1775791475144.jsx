import { useState } from "react";

const PROGRAMS = [
  { id: 1, name: "Youth Club", desc: "Competitive basketball club with ages ranging from 8–18. Season-long team play.", category: "Membership", price: null, action: "Enroll" },
  { id: 2, name: "Skills Academy", desc: "Focused skill development sessions for all levels. Shooting, handles, footwork.", category: "Training", price: null, action: "Enroll" },
  { id: 3, name: "Friday Night Hoops", desc: "Weekly pickup-style games every Friday. Open to all skill levels.", category: "League", price: null, action: "Enroll" },
  { id: 4, name: "Friday Night Hoops – The League", desc: "Structured league play on Friday nights. Teams, standings, playoffs.", category: "League", price: null, action: "Enroll" },
  { id: 5, name: "High School Club", desc: "Competitive club for high school athletes. Advanced training & travel games.", category: "Membership", price: null, action: "Enroll" },
  { id: 6, name: "UYP Summer Camp 2026", desc: "4-day intensive camp. Drills, scrimmages, and mentorship from coaches.", category: "Camp", price: null, action: "Enroll" },
  { id: 7, name: "UYP Private Training (Non-members)", desc: "1-on-1 or small group sessions for non-members.", category: "Training", price: null, action: "Enroll" },
  { id: 8, name: "Youth Club Tryout – Fall 2026", desc: "Tryout session for the Fall 2026 Youth Club season.", category: "Tryout", price: "$25", action: "Register" },
];

const STORE = [
  { id: 101, name: "Club \"JV\" Gear Package", desc: "Game Uniform + Practice Jersey Bundle. Everything you need for the season.", price: "$120", category: "Uniforms" },
  { id: 102, name: "Add-On Uniform (Practice)", desc: "Pink/Black reversible jersey with matching shorts.", price: "$45", category: "Uniforms" },
  { id: 103, name: "FNH Jersey", desc: "Green/Black reversible jersey with shorts. *Required for league play.", price: "$35", category: "Uniforms" },
  { id: 104, name: "UYP Shooting Shirt", desc: "Moisture-wicking warm-up tee with club logo.", price: "$28", category: "Apparel" },
  { id: 105, name: "UYP Hoodie – Black", desc: "Heavyweight cotton-poly blend hoodie. Embroidered crest.", price: "$55", category: "Apparel" },
  { id: 106, name: "UYP Backpack", desc: "Ball compartment, shoe pocket, padded laptop sleeve.", price: "$40", category: "Accessories" },
];

const PROG_CATS = ["All", ...new Set(PROGRAMS.map(p => p.category))];
const STORE_CATS = ["All", ...new Set(STORE.map(s => s.category))];

export default function ProgramsStore() {
  const [tab, setTab] = useState("programs");
  const [progFilter, setProgFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");

  const filteredProgs = progFilter === "All" ? PROGRAMS : PROGRAMS.filter(p => p.category === progFilter);
  const filteredStore = storeFilter === "All" ? STORE : STORE.filter(s => s.category === storeFilter);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8E8E8", padding: "28px 32px 0" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 800, margin: 0, color: "#1A1A1A", letterSpacing: "-0.5px" }}>
          Programs & Store
        </h1>
        <p style={{ color: "#888", fontSize: 14, margin: "4px 0 20px", fontWeight: 400 }}>
          Browse programs, tryouts, and gear for your player.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { key: "programs", label: "Programs", count: PROGRAMS.length },
            { key: "store", label: "Store", count: STORE.length },
          ].map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#C41E2A" : "#777",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2.5px solid #C41E2A" : "2.5px solid transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                  marginBottom: -1,
                }}
              >
                {t.label}
                <span style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: active ? "#C41E2A" : "#E0E0E0",
                  color: active ? "#fff" : "#666",
                  borderRadius: 10,
                  padding: "2px 7px",
                  verticalAlign: "middle",
                }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px", maxWidth: 1100 }}>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {(tab === "programs" ? PROG_CATS : STORE_CATS).map(cat => {
            const active = tab === "programs" ? progFilter === cat : storeFilter === cat;
            const count = tab === "programs"
              ? (cat === "All" ? PROGRAMS.length : PROGRAMS.filter(p => p.category === cat).length)
              : (cat === "All" ? STORE.length : STORE.filter(s => s.category === cat).length);
            return (
              <button
                key={cat}
                onClick={() => tab === "programs" ? setProgFilter(cat) : setStoreFilter(cat)}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 20,
                  border: active ? "1.5px solid #C41E2A" : "1.5px solid #DDD",
                  background: active ? "#FEF2F2" : "#fff",
                  color: active ? "#C41E2A" : "#555",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
                <span style={{ marginLeft: 5, opacity: 0.6, fontSize: 11 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {tab === "programs" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {filteredProgs.map(p => (
              <div key={p.id} style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #EBEBEB",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 180,
                transition: "box-shadow 0.15s ease",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: p.category === "Tryout" ? "#9333EA" : "#999",
                      background: p.category === "Tryout" ? "#F3E8FF" : "#F5F5F5",
                      borderRadius: 4,
                      padding: "3px 8px",
                    }}>
                      {p.category}
                    </span>
                    {p.price && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#C41E2A", marginLeft: "auto" }}>
                        {p.price}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "#1A1A1A" }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: "#777", margin: 0, lineHeight: 1.45 }}>{p.desc}</p>
                </div>
                <button style={{
                  marginTop: 16,
                  padding: "9px 0",
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  background: p.category === "Tryout" ? "#7C3AED" : "#C41E2A",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.2px",
                }}>
                  {p.action}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {filteredStore.map(s => (
              <div key={s.id} style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #EBEBEB",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 180,
              }}>
                <div>
                  {/* placeholder image area */}
                  <div style={{
                    background: "#F5F5F5",
                    borderRadius: 8,
                    height: 100,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#CCC",
                    fontSize: 28,
                  }}>
                    🏀
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#999",
                    background: "#F5F5F5",
                    borderRadius: 4,
                    padding: "3px 8px",
                  }}>
                    {s.category}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "8px 0 4px", color: "#1A1A1A" }}>{s.name}</h3>
                  <p style={{ fontSize: 13, color: "#777", margin: 0, lineHeight: 1.45 }}>{s.desc}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>{s.price}</span>
                  <button style={{
                    padding: "9px 24px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    background: "#1A1A1A",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
