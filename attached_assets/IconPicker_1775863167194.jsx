import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Search, Target, Tent, Users, Trophy, Calendar, Star, Award, Crown, Shield, Layers, Ticket, Zap, Flag, Heart, Dumbbell } from "lucide-react";

const ICONS = [
  { name: "Target", icon: Target },
  { name: "Tent", icon: Tent },
  { name: "Users", icon: Users },
  { name: "Trophy", icon: Trophy },
  { name: "Calendar", icon: Calendar },
  { name: "Star", icon: Star },
  { name: "Award", icon: Award },
  { name: "Crown", icon: Crown },
  { name: "Shield", icon: Shield },
  { name: "Layers", icon: Layers },
  { name: "Ticket", icon: Ticket },
  { name: "Zap", icon: Zap },
  { name: "Flag", icon: Flag },
  { name: "Heart", icon: Heart },
  { name: "Dumbbell", icon: Dumbbell },
];

export default function IconPicker() {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = ICONS.filter((i) =>
    i.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const SelectedIcon = selected ? ICONS.find((i) => i.name === selected)?.icon : null;

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
        background: "#f8f8f7",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={{ width: 340 }} ref={containerRef}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#888",
            marginBottom: 6,
          }}
        >
          Icon
        </label>

        {/* Trigger */}
        <div
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            height: 40,
            borderRadius: 8,
            border: open ? "1.5px solid #e04040" : "1.5px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            boxShadow: open ? "0 0 0 3px rgba(224,64,64,0.1)" : "none",
            transition: "all 0.15s ease",
            padding: "0 10px 0 12px",
            gap: 8,
          }}
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon size={16} strokeWidth={2} color="#333" />
              <span style={{ flex: 1, fontSize: 13.5, color: "#1a1a1a" }}>
                {selected}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 2,
                  color: "#ccc",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e04040")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 13.5, color: "#aaa" }}>
                Select icon
              </span>
            </>
          )}
          <ChevronDown
            size={15}
            style={{
              color: "#aaa",
              transform: open ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              marginTop: 4,
              borderRadius: 10,
              border: "1px solid #e8e8e8",
              background: "#fff",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Search size={14} color="#bbb" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons…"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "#1a1a1a",
                  fontFamily: "inherit",
                  background: "transparent",
                }}
              />
            </div>

            {/* Icon grid */}
            <div
              style={{
                padding: 6,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {filtered.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 2,
                  }}
                >
                  {filtered.map(({ name, icon: Icon }) => {
                    const isActive = selected === name;
                    return (
                      <button
                        key={name}
                        title={name}
                        onClick={() => {
                          setSelected(name);
                          setOpen(false);
                          setQuery("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          aspectRatio: "1",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          background: isActive
                            ? "rgba(224,64,64,0.1)"
                            : "transparent",
                          color: isActive ? "#e04040" : "#666",
                          transition: "all 0.1s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isActive
                            ? "rgba(224,64,64,0.1)"
                            : "transparent";
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "16px 10px",
                    fontSize: 13,
                    color: "#aaa",
                    textAlign: "center",
                  }}
                >
                  No icons match "{query.trim()}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
