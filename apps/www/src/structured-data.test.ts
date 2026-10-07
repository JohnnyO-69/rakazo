import { describe, expect, it } from "vitest";
import { homeStructuredData } from "./structured-data";

const data = homeStructuredData({
  pageUrl: "https://rakazo.com/",
  title: "Rakazo",
  description: "Page description",
  siteDescription: "Site description",
  inLanguage: "en",
  defaultInLanguage: "en",
  availableLanguages: ["English"],
});

type JsonNode = {
  "@type": string;
  name?: string;
  legalName?: string;
  alternateName?: string;
  codeRepository?: string;
  operatingSystem?: string;
  isAccessibleForFree?: boolean;
  offers?: { price?: string; priceCurrency?: string };
  mainEntity?: Array<{
    "@type": string;
    name: string;
    acceptedAnswer: { "@type": string; text: string };
  }>;
};

describe("homepage structured data", () => {
  const graph = data["@graph"] as readonly JsonNode[];
  const organization = graph.find((node) => node["@type"] === "Organization");
  const website = graph.find((node) => node["@type"] === "WebSite");
  const software = graph.find((node) => node["@type"] === "SoftwareApplication");

  it("names the organization and website Rakazo and keeps the legal entity", () => {
    expect(organization?.name).toBe("Rakazo");
    expect(organization?.legalName).toBe("Inbox Zero Inc.");
    expect(organization).not.toHaveProperty("alternateName");
    expect(website?.name).toBe("Rakazo");
  });

  it("publishes homepage FAQ entries when they are passed", () => {
    const withFaq = homeStructuredData({
      pageUrl: "https://rakazo.com/",
      title: "Rakazo",
      description: "Page description",
      siteDescription: "Site description",
      inLanguage: "en",
      defaultInLanguage: "en",
      availableLanguages: ["English"],
      faq: [{ question: "Can I sign in?", answer: "Yes." }],
    });
    const faqPage = (withFaq["@graph"] as readonly JsonNode[]).find(
      (node) => node["@type"] === "FAQPage",
    );
    expect(faqPage).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I sign in?",
          acceptedAnswer: { "@type": "Answer", text: "Yes." },
        },
      ],
    });
  });

  it("describes Rakazo as the free multi-platform application", () => {
    expect(software).toMatchObject({
      name: "Rakazo",
      codeRepository: "https://github.com/elie222/rakazo",
      operatingSystem: "Web, macOS, Linux, iOS, Android",
      isAccessibleForFree: true,
      offers: { price: "0", priceCurrency: "USD" },
    });
  });
});
