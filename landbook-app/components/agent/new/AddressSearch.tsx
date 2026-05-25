"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/agent/primitives";

export interface AddressSuggestion {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

interface MapboxResponse {
  features: MapboxFeature[];
}

export function AddressSearch({
  value,
  onChange,
  onSelect,
  token,
}: {
  value: string;
  onChange: (next: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  token: string | undefined;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedRef = useRef<string>("");

  useEffect(() => {
    if (!token) return;
    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // If the user just selected an item, the input was set to its place_name;
    // don't immediately re-query for the same text.
    if (value === lastSelectedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json`
        );
        url.searchParams.set("access_token", token);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("limit", "6");
        const res = await fetch(url.toString());
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as MapboxResponse;
        setSuggestions(
          data.features.map((f) => ({
            id: f.id,
            placeName: f.place_name,
            center: f.center,
          }))
        );
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, token]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal focus-within:border-brand-charcoal">
        <span className="text-brand-charcoal/40">
          <Icon.MapPin />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          placeholder={token ? "Start typing an address…" : "Mapbox token missing"}
          disabled={!token}
          className="w-full bg-transparent outline-none placeholder:text-brand-charcoal/35 disabled:cursor-not-allowed"
        />
        {loading && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/40">
            …
          </span>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-brand-sage/40 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  lastSelectedRef.current = s.placeName;
                  onChange(s.placeName);
                  onSelect(s);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-brand-charcoal hover:bg-brand-sage/10"
              >
                {s.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
