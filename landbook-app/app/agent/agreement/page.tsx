import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { AGENT_AGREEMENT_VERSION } from "@/lib/agent/agreement";

export const metadata: Metadata = {
  title: "LandBook EU Agent Services Agreement",
};

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="serif-title text-lg text-brand-charcoal">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-brand-charcoal/80">
        {children}
      </div>
    </section>
  );
}

export default function AgentAgreementPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
          <Link href="/agent">My LandBooks</Link>
          <span>/</span>
          <span className="text-brand-charcoal">Agent Agreement</span>
        </div>

        <h1 className="serif-title mt-6 text-3xl leading-tight text-brand-charcoal">
          LandBook EU Agent Services Agreement
        </h1>
        <p className="mt-3 text-[13px] text-brand-charcoal/60">
          Version: {AGENT_AGREEMENT_VERSION} | Effective Date: [DATE]
        </p>
        <div className="mt-4 space-y-1 text-[13px] text-brand-charcoal/70">
          <p>
            Contracting Entity: LandBook OÜ, [Estonian Address], Registry Code
            [XXXX], VAT EE[XXXX]
          </p>
          <p>Governing Law: Republic of Estonia</p>
          <p>Forum: Harju County Court, Tallinn</p>
          <p>Language: English (local language summary available on request)</p>
        </div>

        <Clause n="1" title="Parties & Definitions">
          <p>&ldquo;LandBook&rdquo; = LandBook OÜ, the provider of property intelligence services.</p>
          <p>&ldquo;Agent&rdquo; = The real estate professional or agency accepting these terms via the LandBook platform.</p>
          <p>&ldquo;Property&rdquo; = The specific land or real estate asset for which LandBook Services are ordered.</p>
          <p>&ldquo;Residential Transaction&rdquo; = A transaction where the buyer or seller is a natural person acting for purposes outside their trade, business, or profession.</p>
          <p>&ldquo;Sale Completion&rdquo; = The earlier of: (a) execution of the final transfer deed (e.g. notarial deed / escritura); (b) exchange of contracts where title passes; or (c) receipt of the full purchase price by the seller.</p>
          <p>&ldquo;Report Fee&rdquo; = The fee displayed at the time of report order, exclusive of VAT unless stated otherwise.</p>
          <p>&ldquo;Order&rdquo; = A request submitted via the LandBook platform and confirmed by LandBook.</p>
        </Clause>

        <Clause n="2" title="Services">
          <p>
            LandBook provides digital property intelligence reports based on public
            records, satellite data, proprietary analytics, and automated data
            aggregation. Deliverables are provided via the LandBook platform.
            Reports are informational tools only and do not constitute legal,
            surveying, engineering, or environmental advice.
          </p>
        </Clause>

        <Clause n="3" title="Agent Obligations">
          <p>By ordering a report, the Agent warrants that:</p>
          <p>3.1 Valid License. The Agent holds all licenses, registrations, and professional indemnity insurance required to practice real estate in their jurisdiction.</p>
          <p>3.2 Accurate Data. All property details, location data, and client context provided to LandBook are complete and accurate to the best of the Agent&rsquo;s knowledge.</p>
          <p>3.3 Active Listing. The Property is under an active listing agreement, exclusive mandate, or the Agent has documented seller authority to market the Property.</p>
          <p>3.4 Timely Marketing. The Agent will list the Property for sale or actively market it using the report insights within 14 days of report delivery.</p>
          <p>3.5 Lawful Data Sharing. The Agent has a lawful basis under GDPR (and any applicable local data protection law) to share any personal data of property owners, buyers, or occupants with LandBook.</p>
          <p>3.6 No Resale. The Agent will not resell, white-label, redistribute, or repurpose LandBook reports for any transaction other than the specific Property for which the report was ordered.</p>
          <p>3.7 Residential Transactions. Where the Agent uses LandBook Services in connection with a Residential Transaction, the Agent shall: (a) provide the consumer buyer/seller with a clear written disclaimer that the LandBook report is an informational tool for professional use only and does not constitute a legal, structural, or environmental guarantee; (b) not represent LandBook as a party to the transaction or as a warrantor of the Property; (c) ensure all consumer-facing materials comply with the Unfair Terms Directive (93/13/EEC) and local consumer protection law; (d) indemnify LandBook for any consumer claims arising from the Agent&rsquo;s failure to provide such disclaimers or from the Agent&rsquo;s consumer-facing representations.</p>
        </Clause>

        <Clause n="4" title="Payment Terms — Success-Fee Model">
          <p>4.1 No Sale, No Fee. LandBook Services are provided on a pure success-fee basis. The Report Fee becomes due only upon Sale Completion of the Property. If the Property does not sell, no fee is due.</p>
          <p>4.2 Payment Window. The Report Fee is due and payable within thirty (30) calendar days of Sale Completion.</p>
          <p>4.3 Duty to Notify. The Agent shall notify LandBook of Sale Completion within seven (7) days. Failure to notify does not delay the payment obligation; the 30-day period runs from the actual date of Sale Completion regardless of notification.</p>
          <p>4.4 Invoicing. LandBook may issue a pro-forma invoice upon report delivery and a final invoice upon Sale Completion. The payment obligation is triggered by Sale Completion, not by invoice issuance.</p>
          <p>4.5 Multiple Properties. Where an Order covers multiple properties, the Report Fee is calculated per Property and becomes due per Property upon its respective Sale Completion.</p>
          <p>4.6 Payment Method. Payment is due via SEPA bank transfer to the account specified on the invoice, or by such other method as agreed in writing by LandBook.</p>
        </Clause>

        <Clause n="5" title="VAT & Tax">
          <p>5.1 General. Fees are exclusive of VAT unless expressly stated otherwise. VAT is applied in accordance with EU place-of-supply rules (Article 44, VAT Directive 2006/112/EC).</p>
          <p>5.2 B2B Reverse Charge. If the Agent is an EU business and provides a valid VAT identification number registered in the VIES system, LandBook will invoice at 0% VAT under the reverse charge mechanism. The Agent is responsible for self-assessing VAT in their jurisdiction.</p>
          <p>5.3 No Valid VAT ID. If the Agent does not provide a valid EU VAT ID, or if VIES validation fails, LandBook will charge Estonian VAT at the standard rate then in force (24% as at the Effective Date).</p>
          <p>5.4 Non-EU Agents. For Agents established outside the EU, no Estonian VAT is charged. The Agent is responsible for complying with any local tax obligations.</p>
          <p>5.5 Agent Responsibility. The Agent warrants that all tax registration details provided are accurate and current. The Agent shall indemnify LandBook for any tax liabilities, penalties, or interest arising from incorrect or outdated information supplied by the Agent.</p>
          <p>5.6 Invoicing Standards. All invoices comply with EU Directive 2010/45/EU.</p>
        </Clause>

        <Clause n="6" title="Late Payment">
          <p>6.1 Statutory Interest. In the event of late payment, interest shall accrue on the outstanding amount at the rate prescribed by EU Directive 2011/7/EU on combating late payment in commercial transactions, or the statutory rate applicable under Estonian law, whichever is higher.</p>
          <p>6.2 Suspension. LandBook may suspend the Agent&rsquo;s access to new reports and platform features after fifteen (15) days of overdue payment, provided LandBook gives five (5) days prior written notice via email or platform notification.</p>
          <p>6.3 Acceleration. Upon termination for breach or after sixty (60) days of non-payment, all outstanding fees across all Orders become immediately due and payable.</p>
        </Clause>

        <Clause n="7" title="Data Protection (GDPR)">
          <p>7.1 Independent Controllers. Each party acts as an independent controller of personal data it processes in connection with this Agreement, unless a separate Data Processing Agreement (DPA) is executed.</p>
          <p>7.2 Agent Responsibility. The Agent warrants lawful basis for sharing any personal data with LandBook. The Agent will notify LandBook without undue delay and in any case within 72 hours of discovering any personal data breach affecting data shared under this Agreement.</p>
          <p>7.3 Security. Both parties implement appropriate technical and organisational measures to protect personal data.</p>
          <p>7.4 Retention. LandBook retains data per its Data Retention Policy, available upon request, and deletes or anonymises data when no longer necessary for service provision or legal compliance.</p>
        </Clause>

        <Clause n="8" title="Digital Services Act Compliance">
          <p>8.1 Scope. To the extent LandBook qualifies as a provider of intermediary services under Regulation (EU) 2022/2065 (Digital Services Act), it complies with applicable obligations for hosting services.</p>
          <p>8.2 Point of Contact. LandBook maintains a point of contact for authorities at: [dsa-authorities@landbook.com].</p>
          <p>8.3 Complaint Handling. LandBook provides an internal complaint handling system accessible via the platform or at [complaints@landbook.com]. Complaints are acknowledged within 2 business days and resolved within 30 days where possible.</p>
          <p>8.4 Transparency. LandBook publishes terms of service, content policies, and information about restrictions in this Agreement and on the platform.</p>
        </Clause>

        <Clause n="9" title="Intellectual Property">
          <p>9.1 Ownership. All intellectual property rights in the LandBook platform, algorithms, methodologies, and report templates remain the exclusive property of LandBook.</p>
          <p>9.2 License. Upon full payment of the Report Fee, the Agent is granted a non-exclusive, non-transferable, royalty-free license to use the report for: (a) the Agent&rsquo;s internal agency operations; and (b) presentation to buyers and sellers in connection with the specific Property transaction. This license does not extend to unrelated transactions or derivative works.</p>
          <p>9.3 Feedback. Any suggestions or feedback provided by the Agent may be used by LandBook without restriction or compensation.</p>
        </Clause>

        <Clause n="10" title="Liability">
          <p>10.1 Data Source Limitations. LandBook reports are based on automated aggregation of public records, satellite imagery, and third-party data sources. LandBook does not guarantee the accuracy, completeness, or currency of government cadastral data, land registry records, or satellite analysis.</p>
          <p>10.2 Liability Cap. To the fullest extent permitted by applicable law, LandBook&rsquo;s total aggregate liability arising out of or in connection with this Agreement shall not exceed the greater of: (a) the total fees paid by the Agent in the twelve (12) months preceding the claim; or (b) EUR [1,000].</p>
          <p>10.3 Excluded Losses. Neither party shall be liable for indirect, consequential, punitive, or loss-of-profit damages, except in cases of gross negligence, wilful misconduct, or fraud.</p>
          <p>10.4 Indemnity. The Agent agrees to indemnify and hold harmless LandBook from any claims, damages, or costs arising from the Agent&rsquo;s misuse of reports, breach of this Agreement, failure to obtain necessary consents, or failure to comply with consumer protection obligations in Residential Transactions.</p>
          <p>10.5 Residential Transaction Limitation. LandBook is not a party to any transaction between the Agent and a consumer buyer or seller. The Agent assumes full and exclusive liability for consumer-facing disclosures, representations, and compliance with consumer protection law. LandBook shall not be liable for any claims brought by consumers against the Agent, even if such claims arise from the content of a LandBook report.</p>
        </Clause>

        <Clause n="11" title="Term & Termination">
          <p>11.1 Term. This Agreement commences upon electronic acceptance and continues until terminated.</p>
          <p>11.2 Convenience. Either party may terminate with thirty (30) days prior written notice.</p>
          <p>11.3 Breach. Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to remedy such breach within fourteen (14) days of receiving written notice.</p>
          <p>11.4 Survival. Clauses relating to payment obligations, confidentiality, intellectual property, liability limitations, indemnity, and VAT survive termination.</p>
          <p>11.5 Force Majeure. Neither party shall be liable for failure to perform due to causes beyond its reasonable control, including but not limited to government data source outages, platform infrastructure failures, satellite imagery unavailability, or regulatory changes affecting data access.</p>
        </Clause>

        <Clause n="12" title="Governing Law & Dispute Resolution">
          <p>12.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Republic of Estonia, without regard to its conflict of laws principles.</p>
          <p>12.2 Forum. The parties submit to the exclusive jurisdiction of the Harju County Court (Tallinn) for the resolution of any disputes arising from this Agreement.</p>
          <p>12.3 EU Enforcement. The parties acknowledge that judgments of Estonian courts are enforceable throughout the European Union under Regulation (EU) No 1215/2012 (Brussels I bis). For Agents established outside the EU, the parties agree to cooperate in any enforcement proceedings in the Agent&rsquo;s jurisdiction.</p>
          <p>12.4 Alternative Forum. Notwithstanding the above, LandBook may, at its sole discretion, bring proceedings against the Agent in the courts of the Agent&rsquo;s registered jurisdiction for the purpose of debt recovery.</p>
          <p>12.5 Negotiation First. The parties agree to attempt in good faith to resolve any dispute through direct negotiation for a period of thirty (30) days before initiating formal court proceedings. Nothing in this clause prevents either party from seeking urgent injunctive relief.</p>
        </Clause>

        <Clause n="13" title="Electronic Formation & Records">
          <p>13.1 Electronic Acceptance. This Agreement is entered into by electronic means. By clicking &ldquo;I Agree&rdquo; during platform onboarding, the Agent confirms they have read, understood, and accept these terms in full.</p>
          <p>13.2 Evidence. LandBook records the Agent&rsquo;s acceptance, including: timestamp (UTC), IP address, email address, terms version number, and checkbox confirmations. This record constitutes admissible evidence of contract formation under Estonian law and the eIDAS Regulation (EU) No 910/2014 (as amended).</p>
          <p>13.3 Email Confirmation. LandBook will send an email confirmation of acceptance to the Agent&rsquo;s registered email address. The Agent should retain this for their records.</p>
          <p>13.4 Language. The Agent acknowledges that they are proficient in English or have had the opportunity to review a local language summary before accepting. This Agreement is drawn up in English.</p>
        </Clause>

        <Clause n="14" title="General">
          <p>14.1 Entire Agreement. This Agreement, together with any Order and Fee Schedule, constitutes the entire agreement between the parties and supersedes all prior negotiations.</p>
          <p>14.2 Amendment. No amendment shall be effective unless in writing (including email) and signed/confirmed by both parties. LandBook may update terms with 30 days&rsquo; notice; continued use after the notice period constitutes acceptance.</p>
          <p>14.3 Assignment. The Agent may not assign this Agreement without LandBook&rsquo;s prior written consent. LandBook may assign this Agreement to an affiliate or successor without restriction.</p>
          <p>14.4 Severability. If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
          <p>14.5 Notices. All notices shall be sent to the email addresses registered on the LandBook platform or by registered post to the addresses on record.</p>
          <p>14.6 Insurance. The Agent shall maintain professional indemnity insurance appropriate to their real estate practice and jurisdiction.</p>
        </Clause>
      </div>
    </main>
  );
}
