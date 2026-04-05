export interface PassportPreset {
  id: string;
  country: string;
  documentType: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  maxFileSizeKb?: number;
  notes?: string;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: "uk-passport",
    country: "United Kingdom",
    documentType: "Passport",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: "us-passport",
    country: "United States",
    documentType: "Passport",
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
  },
  {
    id: "eu-passport",
    country: "European Union",
    documentType: "Passport",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: "india-passport",
    country: "India",
    documentType: "Passport",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: "uae-passport",
    country: "UAE",
    documentType: "Passport",
    widthMm: 40,
    heightMm: 60,
    widthPx: 472,
    heightPx: 709,
  },
  {
    id: "saudi-passport",
    country: "Saudi Arabia",
    documentType: "Passport",
    widthMm: 40,
    heightMm: 60,
    widthPx: 472,
    heightPx: 709,
  },
  {
    id: "pakistan-passport",
    country: "Pakistan",
    documentType: "Passport",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: "china-passport",
    country: "China",
    documentType: "Passport",
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
  },
  {
    id: "us-visa",
    country: "United States",
    documentType: "Visa",
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
  },
  {
    id: "uk-driving",
    country: "United Kingdom",
    documentType: "Driving Licence",
    widthMm: 45,
    heightMm: 35,
    widthPx: 531,
    heightPx: 413,
  },
  {
    id: "india-aadhaar",
    country: "India",
    documentType: "Aadhaar Card",
    widthMm: 35,
    heightMm: 35,
    widthPx: 413,
    heightPx: 413,
  },
  {
    id: "generic-35x45",
    country: "Generic",
    documentType: "35×45 mm",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: "generic-2x2",
    country: "Generic",
    documentType: "2×2 inch",
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
  },
];
