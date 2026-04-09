"use client";

import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { id: "overview", icon: "description", label: "Overview" },
  { id: "region-ecosystem", icon: "location_on", label: "Region & Ecosystem" },
  { id: "maps-layers", icon: "map", label: "Maps & Layers" },
  { id: "land-water", icon: "terrain", label: "Land & Water" },
  { id: "biodiversity-habitat", icon: "forest", label: "Biodiversity & Habitat" },
  { id: "climate-seasons", icon: "thermostat", label: "Climate & Seasons" },
  { id: "value-benefits", icon: "eco", label: "Value & Benefits" },
  { id: "land-use", icon: "agriculture", label: "Land Use" },
  { id: "history-trends", icon: "trending_up", label: "History & Trends" },
  { id: "risks-resilience", icon: "shield", label: "Risks & Resilience" },
  { id: "future-scenarios", icon: "lightbulb", label: "Future Scenarios" },
  { id: "recommendations", icon: "checklist", label: "Recommendations" },
  { id: "your-knowledge", icon: "school", label: "Your Knowledge" },
  { id: "sources-methodology", icon: "science", label: "Sources & Methodology" },
];

export function SideNav({ propertyName }: { propertyName: string }) {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        // Pick the first visible section in document order
        for (const item of NAV_ITEMS) {
          if (visibleSections.has(item.id)) {
            setActiveId(item.id);
            break;
          }
        }
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="no-print hidden md:flex flex-col w-72 bg-[#E9E9E9] text-brand-forest text-sm font-medium border-r-[0.5px] border-brand-sage/40 shrink-0">
      <div className="fixed top-0 left-0 w-72 h-full flex flex-col py-8 overflow-y-auto">
        {/* Branding */}
        <div className="px-6 mb-8">
          <img
            src="/landbook-logo.png"
            alt="LandBook"
            className="h-8 mb-2"
          />
          <h2 className="text-xs font-bold tracking-widest text-brand-sage uppercase">
            {propertyName}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center w-full text-left px-6 py-2.5 transition-transform duration-200 hover:translate-x-1 ${
                  isActive
                    ? "bg-white text-brand-forest font-bold border-l-4 border-brand-forest"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-lg">
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
