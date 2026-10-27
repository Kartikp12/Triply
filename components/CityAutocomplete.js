
import { useEffect, useState } from "react";

export default function CityAutocomplete({
  label,
  icon,
  value,
  onChange,
  placeholder,
  maxLength = 160,
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2 || !open) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/cities?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("City search request failed.");
        }

        const data = await response.json();

        if (!cancelled) {
          setSuggestions(data.cities || []);
        }
      } catch (error) {
        if (error.name !== "AbortError" && !cancelled) {
          console.error("Unable to fetch city suggestions:", error);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, open]);

  return (
    <div
      className="planner-field"
      style={{ position: "relative" }}
    >
      <label>
        <span className="field-label">
          {icon} {label}
        </span>

        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          required={required}
          aria-autocomplete="list"
        />
      </label>

      {open && value.trim().length >= 2 && (
        <div
          role="listbox"
          aria-label={`${label} suggestions`}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1px solid #deded5",
            borderRadius: 12,
            marginTop: 5,
            padding: 5,
            boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {suggestions.map((city) => (
            <button
              key={`${city.countryCode}-${city.stateCode}-${city.name}`}
              type="button"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(city.label);
                setOpen(false);
                setSuggestions([]);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "11px 12px",
                border: 0,
                borderRadius: 8,
                background: "#fff",
                color: "#252820",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
              }}
            >
              {city.label}
            </button>
          ))}

          {loading && (
            <p style={{ padding: "8px 12px", margin: 0 }}>
              Searching cities...
            </p>
          )}

          {!loading &&
            suggestions.length === 0 && (
              <p style={{ padding: "8px 12px", margin: 0 }}>
                No matching cities found.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
