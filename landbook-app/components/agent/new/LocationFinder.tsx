"use client";

import { useState } from "react";
import { Icon } from "@/components/agent/primitives";

export interface LocationResult {
  placeName: string;
  center: [number, number]; // [lng, lat]
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
}

/**
 * Postcode / place locator matching the landlibrary.co/create UX: a single
 * "Find" search plus "Use my location". Both fly the map (via onSelect) and
 * fill the address field (via onChange). Drawing the boundary is unchanged.
 */
export function LocationFinder({
  value,
  onChange,
  onSelect,
  token,
}: {
  value: string;
  onChange: (next: string) => void;
  onSelect: (result: LocationResult) => void;
  token: string | undefined;
}) {
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function choose(f: MapboxFeature) {
    onChange(f.place_name);
    onSelect({ placeName: f.place_name, center: f.center });
    setResults([]);
    setMessage(null);
  }

  async function find() {
    const query = value.trim();
    if (!token) {
      setMessage("Mapbox token is not configured.");
      return;
    }
    if (query.length < 3) {
      setMessage("Enter a postcode or place to search.");
      return;
    }
    setMessage(null);
    setResults([]);
    setLoading(true);
    try {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("limit", "5");
      url.searchParams.set("types", "postcode,place,locality");
      const res = await fetch(url.toString());
      if (!res.ok) {
        setMessage("Search failed. Try again.");
        return;
      }
      const data = (await res.json()) as { features?: MapboxFeature[] };
      const features = data.features ?? [];
      if (features.length === 0) {
        setMessage("No matches found.");
      } else if (features.length === 1) {
        choose(features[0]!);
      } else {
        setResults(features);
      }
    } catch {
      setMessage("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation isn't available in this browser.");
      return;
    }
    setMessage(null);
    setResults([]);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        // Fly the map straightaway; resolve a postcode label best-effort.
        onSelect({ placeName: value, center: [longitude, latitude] });
        if (token) {
          try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=postcode&limit=1`;
            const res = await fetch(url);
            if (res.ok) {
              const data = (await res.json()) as { features?: MapboxFeature[] };
              const label = data.features?.[0]?.text ?? data.features?.[0]?.place_name;
              if (label) onChange(label);
            }
          } catch {
            // Keep the map move; the label is a nicety, not required.
          }
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage("Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal focus-within:border-brand-charcoal">
          <span className="text-brand-charcoal/40">
            <Icon.MapPin />
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void find();
              }
            }}
            placeholder={token ? "Enter postcode or place…" : "Mapbox token missing"}
            disabled={!token}
            className="w-full bg-transparent outline-none placeholder:text-brand-charcoal/35 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          onClick={() => void find()}
          disabled={!token || loading}
          className="shrink-0 border border-brand-charcoal bg-brand-charcoal px-5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "…" : "Find"}
        </button>
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-charcoal/70 underline-offset-2 transition hover:text-brand-charcoal hover:underline disabled:opacity-50"
      >
        <Icon.MapPin />
        {locating ? "Locating…" : "Use my location"}
      </button>

      {results.length > 1 && (
        <ul className="mt-2 max-h-60 overflow-y-auto border border-brand-sage/40 bg-white shadow-lg">
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => choose(f)}
                className="block w-full px-4 py-2.5 text-left text-sm text-brand-charcoal hover:bg-brand-sage/10"
              >
                {f.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="mt-2 text-xs text-brand-charcoal/55">{message}</p>}
    </div>
  );
}
