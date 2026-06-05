export type Lang = "en" | "pt";

export interface CardCopy {
  name: string;
  description: string;
  /** Feature labels, in the same order as the icons defined in PricingSection. */
  features: string[];
  button: string;
  priceNote?: string;
  billingCycle?: string;
}

export interface AgentsCopy {
  hero: {
    eyebrow: string;
    headline: string[];
    body: string;
    complimentary: string;
    cta: string;
    /** Uses the {n} placeholder for the remaining complimentary count. */
    complimentaryLeft: string;
  };
  sampleLabel: string;
  pricing: {
    eyebrow: string;
    title: string;
    /** Bold label prefix for the guarantee line, e.g. "LandBook Guarantee". */
    guaranteeLabel: string;
    /** The LandBook Guarantee, shown under the pricing title. */
    guarantee: string;
    freeLabel: string;
    report: CardCopy;
    steward: CardCopy;
    engine: CardCopy;
  };
}

// NOTE: Portuguese (pt-PT) is an AI-drafted first pass — review before relying on it.
export const COPY: Record<Lang, AgentsCopy> = {
  en: {
    hero: {
      eyebrow: "For Rural Estate Agents",
      headline: ["Win more listings.", "Close deals faster."],
      body: "Show up to every listing pitch with a professional LandBook that instantly builds trust with sellers. Then hand buyers the same report to cut due diligence from weeks to days. One book. Two wins.",
      complimentary:
        "For a limited time, we're offering complimentary Landbooks to select agents with listings 5ha and up.",
      cta: "Get Your First Landbook Free",
      complimentaryLeft: "Only {n} complimentary reports left this month.",
    },
    sampleLabel: "Sample LandBook",
    pricing: {
      eyebrow: "LandBook Agent Pricing",
      title: "Stop Overlooking Value in Every Deal",
      guaranteeLabel: "LandBook Guarantee",
      guarantee:
        "If our report doesn't uncover at least €10,000 in additional natural capital value, you don't pay.",
      freeLabel: "Free",
      report: {
        name: "Natural Capital Report",
        description: "One property. Full intelligence. 48-hour turnaround.",
        features: [
          "Natural capital valuation (soil, water, productivity)",
          "Biodiversity assessment",
          "Risks & Resilience Analysis",
          "Future Scenarios",
        ],
        button: "Get Your First Landbook Free",
        priceNote: "First report free, then €1,500 each",
      },
      steward: {
        name: "Land Steward Partner",
        description: "For agents who steward every property fully.",
        features: [
          "Up to 5 Natural Capital Reports/month",
          "24-hour priority turnaround",
          "Direct support line",
        ],
        button: "Partner With Us",
        billingCycle: "/month",
      },
      engine: {
        name: "Agency Natural Capital Engine",
        description: "Transform your agency's rural intelligence.",
        features: [
          "Unlimited Natural Capital Reports",
          "Co-branded Landbook reports",
          "Custom agency dashboard",
          "Quarterly team training on natural capital valuation",
        ],
        button: "Contact Enterprise",
        billingCycle: "/month",
      },
    },
  },
  pt: {
    hero: {
      eyebrow: "Para Agentes Imobiliários Rurais",
      headline: ["Ganhe mais angariações.", "Feche negócios mais depressa."],
      body: "Apresente-se em cada angariação com um LandBook profissional que gera confiança imediata nos vendedores. Depois entregue o mesmo relatório aos compradores para reduzir a due diligence de semanas para dias. Um livro. Duas vitórias.",
      complimentary:
        "Por tempo limitado, oferecemos LandBooks gratuitos a agentes selecionados com angariações a partir de 5 ha.",
      cta: "Obtenha o Seu Primeiro LandBook Grátis",
      complimentaryLeft: "Restam apenas {n} relatórios gratuitos este mês.",
    },
    sampleLabel: "LandBook de exemplo",
    pricing: {
      eyebrow: "Preços LandBook para Agentes",
      title: "Deixe de Ignorar Valor em Cada Negócio",
      guaranteeLabel: "Garantia LandBook",
      guarantee:
        "Se o nosso relatório não revelar pelo menos €10.000 em valor adicional de capital natural, não paga.",
      freeLabel: "Grátis",
      report: {
        name: "Relatório de Capital Natural",
        description: "Uma propriedade. Inteligência completa. Entrega em 48 horas.",
        features: [
          "Avaliação de capital natural (solo, água, produtividade)",
          "Avaliação de biodiversidade",
          "Análise de Riscos e Resiliência",
          "Cenários Futuros",
        ],
        button: "Obtenha o Seu Primeiro LandBook Grátis",
        priceNote: "Primeiro relatório grátis, depois €1.500 cada",
      },
      steward: {
        name: "Parceiro Land Steward",
        description: "Para agentes que cuidam plenamente de cada propriedade.",
        features: [
          "Até 5 Relatórios de Capital Natural/mês",
          "Entrega prioritária em 24 horas",
          "Linha de apoio direta",
        ],
        button: "Seja Nosso Parceiro",
        billingCycle: "/mês",
      },
      engine: {
        name: "Motor de Capital Natural para Agências",
        description: "Transforme a inteligência rural da sua agência.",
        features: [
          "Relatórios de Capital Natural ilimitados",
          "Relatórios LandBook com marca conjunta",
          "Painel personalizado para a agência",
          "Formação trimestral da equipa em avaliação de capital natural",
        ],
        button: "Contactar Empresas",
        billingCycle: "/mês",
      },
    },
  },
};
