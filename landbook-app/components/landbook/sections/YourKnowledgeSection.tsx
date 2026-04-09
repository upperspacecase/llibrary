import { SectionTitle, SubsectionHeader, PlaceholderBox, Hairline } from "@/components/river";

export function YourKnowledgeSection() {
  return (
    <section id="your-knowledge">
      <SectionTitle title="Your Knowledge" />

      <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
        This section is designed for your own data, memories, and observations to become
        part of the trusted document layer. All subsections below are user-contributed.
      </p>

      {/* 13.1 Document Vault */}
      <SubsectionHeader id="13.1" title="Document Vault" sources={["User"]} />
      <PlaceholderBox
        id="13.1"
        title="Deeds, surveys, plans, permits, photos, letters, management notes"
        status="ENTIRELY NEW — USER UPLOAD INTERFACE NEEDED"
      />

      <Hairline />

      {/* 13.2 Photo Documentation */}
      <SubsectionHeader id="13.2" title="Photo Documentation" sources={["User"]} />
      <PlaceholderBox
        id="13.2"
        title="Seasonal galleries, change-over-time visuals, event documentation"
        status="ENTIRELY NEW — PHOTO GALLERY COMPONENT NEEDED"
      />

      <Hairline />

      {/* 13.3 Field Observations */}
      <SubsectionHeader id="13.3" title="Field Observations" sources={["User"]} />
      <PlaceholderBox
        id="13.3"
        title="iNaturalist records, species sightings, phenology, behavior notes"
        status="ENTIRELY NEW — iNATURALIST INTEGRATION EXISTS IN PIPELINE BUT NO USER INPUT UI"
      />

      <Hairline />

      {/* 13.4 Monitoring Data */}
      <SubsectionHeader id="13.4" title="Monitoring Data" sources={["User"]} />
      <PlaceholderBox
        id="13.4"
        title="Weather station, spring flow, soil moisture, tree growth, yield logs"
        status="ENTIRELY NEW — USER DATA INPUT INTERFACE NEEDED"
      />

      <Hairline />

      {/* 13.5 Local Knowledge */}
      <SubsectionHeader id="13.5" title="Local Knowledge" sources={["User"]} />
      <PlaceholderBox
        id="13.5"
        title="Traditional practices, community stories, place names, oral history"
        status="ENTIRELY NEW — TEXT INPUT INTERFACE NEEDED"
      />

      <Hairline />

      {/* 13.6 Management Log */}
      <SubsectionHeader id="13.6" title="Management Log" sources={["User"]} />
      <PlaceholderBox
        id="13.6"
        title="Interventions, dates, outcomes, reflections"
        status="ENTIRELY NEW — LOG ENTRY INTERFACE NEEDED"
      />

      <Hairline />

      {/* 13.7 Collaborative Notes */}
      <SubsectionHeader id="13.7" title="Collaborative Notes" sources={["User"]} />
      <PlaceholderBox
        id="13.7"
        title="Shared inputs from neighbours, researchers, consultants"
        status="ENTIRELY NEW — MULTI-USER INPUT NEEDED"
      />

      <Hairline />

      {/* 13.8 Data Contribution */}
      <SubsectionHeader id="13.8" title="Data Contribution" sources={["User"]} />
      <PlaceholderBox
        id="13.8"
        title="Flags on synthetic data, corrections, quality ratings"
        status="ENTIRELY NEW — DATA CORRECTION INTERFACE NEEDED"
      />
    </section>
  );
}
