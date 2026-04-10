import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Plus, Check } from "lucide-react";

const INITIAL_OPTIONS = ["Memberships", "General", "Personal Training", "Group Classes", "Nutrition", "Recovery"];

export default function CreatableSelect() {
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [selected, setSelected] = useState(["Memberships", "General"]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const trimmed = query.trim();
  const filtered = options.filter(
    (o) => o.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;

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

  const toggle = (value) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const create = (value) => {
    setOptions((prev) => [...prev, value]);
    setSelected((prev) => [...prev, value]);
    setQuery("");
  };

  const deleteOption = (value, e) => {
    e.stopPropagation();
    setOptions((prev) => prev.filter((v) => v !== value));
    setSelected((prev) => prev.filter((v) => v !== value));
  };

  const displayValue = open
    ? query
    : selected.length > 0
      ? selected.join(", ")
      : "";

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
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

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
          Category
        </label>

        <div
          onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            height: 40,
            borderRadius: 8,
            border: open ? "1.5px solid #e04040" : "1.5px solid #ddd",
            background: "#fff",
            cursor: "text",
            boxShadow: open ? "0 0 0 3px rgba(224,64,64,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <input
            ref={inputRef}
            value={displayValue}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); setQuery(""); }}
            placeholder="Select or create category…"
            style={{
              flex: 1,
              height: "100%",
              padding: "0 10px 0 12px",
              border: "none",
              outline: "none",
              fontSize: 13.5,
              background: "transparent",
              color: "#1a1a1a",
              fontFamily: "inherit",
            }}
          />
          <ChevronDown
            size={15}
            style={{
              marginRight: 10,
              color: "#aaa",
              transform: open ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          />
        </div>

        {open && (
          <div
            style={{
              marginTop: 4,
              borderRadius: 10,
              border: "1px solid #e8e8e8",
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
              maxHeight: 220,
              overflowY: "auto",
              padding: "4px",
            }}
          >
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => toggle(opt)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 6px 8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13.5,
                    color: isSelected ? "#e04040" : "#333",
                    fontWeight: isSelected ? 500 : 400,
                    background: isSelected ? "rgba(224,64,64,0.06)" : "transparent",
                    transition: "background 0.1s",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? "rgba(224,64,64,0.06)" : "transparent";
                  }}
                >
                  <span style={{ flex: 1 }}>{opt}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {isSelected && <Check size={14} strokeWidth={2.5} color="#e04040" />}
                    <button
                      onClick={(e) => deleteOption(opt, e)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 4,
                        color: "#ccc",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#e04040")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: "10px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
                No categories found
              </div>
            )}

            {showCreate && (
              <>
                {filtered.length > 0 && (
                  <div style={{ height: 1, background: "#eee", margin: "4px 8px" }} />
                )}
                <div
                  onClick={() => create(trimmed)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13.5,
                    color: "#e04040",
                    fontWeight: 500,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(224,64,64,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Create "{trimmed}"</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
