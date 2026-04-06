import "server-only";

export type ExpenseCategory =
  | "Office Supplies"
  | "Travel & Transport"
  | "Software & Subscriptions"
  | "Marketing"
  | "Utilities"
  | "Professional Services"
  | "Rent"
  | "Salary & Wages"
  | "Equipment"
  | "Other";

export interface CategorizationResult {
  category: ExpenseCategory;
  confidence: number;
  source: "ai" | "keyword";
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  "Office Supplies",
  "Travel & Transport",
  "Software & Subscriptions",
  "Marketing",
  "Utilities",
  "Professional Services",
  "Rent",
  "Salary & Wages",
  "Equipment",
  "Other",
];

// Simple in-memory cache with TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { result: CategorizationResult; expiresAt: number }>();

const KEYWORD_MAP: Record<string, ExpenseCategory> = {
  // Office Supplies
  pen: "Office Supplies",
  paper: "Office Supplies",
  stationery: "Office Supplies",
  printer: "Office Supplies",
  ink: "Office Supplies",
  toner: "Office Supplies",
  notebook: "Office Supplies",
  folder: "Office Supplies",
  stapler: "Office Supplies",

  // Travel & Transport
  uber: "Travel & Transport",
  ola: "Travel & Transport",
  taxi: "Travel & Transport",
  flight: "Travel & Transport",
  airline: "Travel & Transport",
  hotel: "Travel & Transport",
  cab: "Travel & Transport",
  fuel: "Travel & Transport",
  petrol: "Travel & Transport",
  diesel: "Travel & Transport",
  travel: "Travel & Transport",
  toll: "Travel & Transport",
  parking: "Travel & Transport",
  train: "Travel & Transport",
  irctc: "Travel & Transport",

  // Software & Subscriptions
  aws: "Software & Subscriptions",
  azure: "Software & Subscriptions",
  google: "Software & Subscriptions",
  cloud: "Software & Subscriptions",
  saas: "Software & Subscriptions",
  software: "Software & Subscriptions",
  license: "Software & Subscriptions",
  subscription: "Software & Subscriptions",
  github: "Software & Subscriptions",
  slack: "Software & Subscriptions",
  zoom: "Software & Subscriptions",
  notion: "Software & Subscriptions",
  figma: "Software & Subscriptions",
  vercel: "Software & Subscriptions",
  domain: "Software & Subscriptions",
  hosting: "Software & Subscriptions",

  // Marketing
  advertising: "Marketing",
  ads: "Marketing",
  facebook: "Marketing",
  instagram: "Marketing",
  marketing: "Marketing",
  seo: "Marketing",
  campaign: "Marketing",
  promotion: "Marketing",
  branding: "Marketing",
  billboard: "Marketing",

  // Utilities
  electricity: "Utilities",
  water: "Utilities",
  internet: "Utilities",
  broadband: "Utilities",
  wifi: "Utilities",
  phone: "Utilities",
  mobile: "Utilities",
  gas: "Utilities",
  utility: "Utilities",
  jio: "Utilities",
  airtel: "Utilities",
  bsnl: "Utilities",

  // Professional Services
  consultant: "Professional Services",
  lawyer: "Professional Services",
  legal: "Professional Services",
  audit: "Professional Services",
  accountant: "Professional Services",
  ca: "Professional Services",
  advisory: "Professional Services",
  freelancer: "Professional Services",
  contractor: "Professional Services",

  // Rent
  rent: "Rent",
  lease: "Rent",
  office_space: "Rent",
  coworking: "Rent",
  wework: "Rent",

  // Salary & Wages
  salary: "Salary & Wages",
  wage: "Salary & Wages",
  payroll: "Salary & Wages",
  bonus: "Salary & Wages",
  stipend: "Salary & Wages",
  compensation: "Salary & Wages",

  // Equipment
  laptop: "Equipment",
  computer: "Equipment",
  monitor: "Equipment",
  keyboard: "Equipment",
  mouse: "Equipment",
  desk: "Equipment",
  chair: "Equipment",
  furniture: "Equipment",
  server: "Equipment",
  hardware: "Equipment",
  projector: "Equipment",
  ups: "Equipment",
};

/**
 * Suggest a category for an expense based on vendor name and description.
 * Uses OpenAI if available, falls back to keyword matching.
 */
export async function suggestCategory(
  vendorName: string,
  description: string,
): Promise<CategorizationResult> {
  const cacheKey = `${vendorName}||${description}`.toLowerCase();

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const result = await categorizeWithAI(apiKey, vendorName, description);
      cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL });
      return result;
    } catch (error) {
      console.error("AI categorization failed, falling back to keywords:", error);
    }
  }

  const result = categorizeWithKeywords(vendorName, description);
  cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

async function categorizeWithAI(
  apiKey: string,
  vendorName: string,
  description: string,
): Promise<CategorizationResult> {
  const prompt = `Categorize this expense into exactly one of these categories: ${ALL_CATEGORIES.join(", ")}.

Vendor: ${vendorName}
Description: ${description}

Return JSON only: {"category": "...", "confidence": 0.0-1.0}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  const category = ALL_CATEGORIES.includes(parsed.category)
    ? (parsed.category as ExpenseCategory)
    : "Other";

  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.8))),
    source: "ai",
  };
}

function categorizeWithKeywords(
  vendorName: string,
  description: string,
): CategorizationResult {
  const text = `${vendorName} ${description}`.toLowerCase();
  const words = text.split(/\s+/);

  // Count matches per category
  const scores = new Map<ExpenseCategory, number>();

  for (const word of words) {
    const category = KEYWORD_MAP[word];
    if (category) {
      scores.set(category, (scores.get(category) ?? 0) + 1);
    }
  }

  // Also check substring matches for multi-word vendor names
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(keyword)) {
      scores.set(category, (scores.get(category) ?? 0) + 1);
    }
  }

  if (scores.size === 0) {
    return { category: "Other", confidence: 0.3, source: "keyword" };
  }

  // Pick the category with the most keyword matches
  let bestCategory: ExpenseCategory = "Other";
  let bestScore = 0;

  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  const confidence = Math.min(0.9, 0.5 + bestScore * 0.1);

  return { category: bestCategory, confidence, source: "keyword" };
}
