// GST Calculation Engine — pure logic, no external dependencies

export interface GSTResult {
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  gstRate: number;
  isIntraState: boolean;
}

const HSN_GST_RATES: Record<string, number> = {
  // Services (Chapter 99)
  "9983": 18, // IT & ITES
  "9984": 18, // Telecom
  "9985": 18, // Transport support services
  "9986": 18, // Rental / leasing (without operator)
  "9987": 18, // Maintenance & repair
  "9988": 18, // Manufacturing services
  "9971": 18, // Financial services
  "9972": 12, // Real estate services
  "9973": 18, // Leasing with operator
  "9991": 18, // Government services
  "9992": 18, // Education support services
  "9993": 18, // Human health services
  "9994": 18, // Sewage & waste management
  "9995": 18, // Recreation & sporting
  "9996": 18, // Hotels & accommodation (18%)
  "9997": 18, // Other professional services
  "9998": 18, // Domestic services
  "9981": 18, // Research & development
  "9982": 18, // Legal & accounting
  "9989": 18, // Packaging services

  // Electronics & IT (Chapter 84-85)
  "8471": 18, // Computers & laptops
  "8443": 18, // Printers & scanners
  "8523": 18, // Software media
  "8517": 18, // Telephones & smartphones
  "8534": 18, // Printed circuits

  // Books & Paper (Chapter 48-49)
  "4901": 0,  // Printed books (exempt)
  "4902": 5,  // Newspapers & periodicals
  "4820": 18, // Registers, notebooks
  "4907": 18, // Stamps, cheque books

  // Pharma & Health (Chapter 30)
  "3004": 12, // Medicines / medicaments
  "3006": 12, // Pharma preparations
  "3401": 18, // Soap & organic surfactants

  // Textiles (Chapter 61-63)
  "6109": 5,  // T-shirts (below ₹1000)
  "6203": 12, // Men's suits & trousers
  "6204": 12, // Women's suits & dresses
  "6301": 12, // Blankets

  // Food & Agriculture (Chapter 01-21)
  "0201": 0,  // Fresh meat (exempt)
  "0401": 5,  // Milk & cream products
  "0901": 5,  // Coffee
  "0902": 5,  // Tea
  "1001": 0,  // Wheat (exempt)
  "1006": 5,  // Rice
  "1701": 5,  // Sugar
  "0713": 0,  // Dried legumes (exempt)
  "0805": 0,  // Citrus fruits (exempt)

  // Beverages (Chapter 22)
  "2201": 18, // Bottled water
  "2202": 28, // Aerated / carbonated drinks
  "2204": 28, // Wine

  // Glass & Iron (Chapter 70-76)
  "7013": 18, // Glassware
  "7308": 18, // Iron/steel structures
  "7606": 18, // Aluminium plates & sheets

  // Appliances & Electronics (Chapter 84-85)
  "8415": 28, // Air conditioners
  "8418": 18, // Refrigerators & freezers
  "8528": 28, // TVs & monitors
  "8450": 18, // Washing machines

  // Vehicles (Chapter 87)
  "8703": 28, // Motor cars
  "8711": 28, // Motorcycles

  // Furniture (Chapter 94)
  "9401": 18, // Seating furniture
  "9403": 18, // Other furniture
  "9405": 18, // Lamps & lighting

  // Toys & Sports (Chapter 95)
  "9503": 18, // Toys
  "9506": 18, // Sports equipment
};

const HSN_DESCRIPTIONS: Record<string, string> = {
  "9983": "IT & Information Technology Services",
  "9984": "Telecommunication Services",
  "9985": "Transport Support Services",
  "9986": "Rental & Leasing (Without Operator)",
  "9987": "Maintenance & Repair Services",
  "9988": "Manufacturing Services",
  "9971": "Financial & Insurance Services",
  "9972": "Real Estate Services",
  "9973": "Leasing with Operator",
  "9991": "Government Administrative Services",
  "9992": "Education & Training Support",
  "9993": "Human Health Services",
  "9994": "Sewage & Waste Management",
  "9995": "Recreation & Sporting Services",
  "9996": "Hotel & Accommodation Services",
  "9997": "Other Professional Services",
  "9998": "Domestic & Household Services",
  "9981": "Research & Development Services",
  "9982": "Legal & Accounting Services",
  "9989": "Packaging Services",
  "8471": "Computers & Laptops",
  "8443": "Printers & Scanners",
  "8523": "Software Media / Storage",
  "8517": "Telephones & Smartphones",
  "8534": "Printed Circuit Boards",
  "4901": "Printed Books (Exempt)",
  "4902": "Newspapers & Periodicals",
  "4820": "Registers & Notebooks",
  "4907": "Stamps & Cheque Books",
  "3004": "Medicines & Medicaments",
  "3006": "Pharmaceutical Preparations",
  "3401": "Soap & Surfactants",
  "6109": "T-shirts & Singlets",
  "6203": "Men's Suits & Trousers",
  "6204": "Women's Suits & Dresses",
  "6301": "Blankets & Travelling Rugs",
  "0201": "Fresh Meat (Exempt)",
  "0401": "Milk & Cream Products",
  "0901": "Coffee",
  "0902": "Tea",
  "1001": "Wheat (Exempt)",
  "1006": "Rice",
  "1701": "Sugar",
  "0713": "Dried Legumes (Exempt)",
  "0805": "Citrus Fruits (Exempt)",
  "2201": "Bottled Water",
  "2202": "Aerated / Carbonated Drinks",
  "2204": "Wine",
  "7013": "Glassware",
  "7308": "Iron / Steel Structures",
  "7606": "Aluminium Plates & Sheets",
  "8415": "Air Conditioners",
  "8418": "Refrigerators & Freezers",
  "8528": "TVs & Monitors",
  "8450": "Washing Machines",
  "8703": "Motor Cars",
  "8711": "Motorcycles",
  "9401": "Seating Furniture",
  "9403": "Other Furniture",
  "9405": "Lamps & Lighting Fixtures",
  "9503": "Toys",
  "9506": "Sports Equipment",
};

/**
 * Calculate GST for a given HSN code, amount, and state codes.
 * Intra-state: CGST + SGST; Inter-state: IGST.
 */
export function calculateGST(params: {
  hsnCode: string;
  amount: number;
  fromState: string;
  toState: string;
}): GSTResult {
  const { hsnCode, amount, fromState, toState } = params;

  const rate = HSN_GST_RATES[hsnCode] ?? 18; // default 18% if unknown
  const isIntraState = fromState === toState;
  const gstAmount = round((amount * rate) / 100);

  if (rate === 0) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGst: 0,
      totalAmount: round(amount),
      gstRate: 0,
      isIntraState,
    };
  }

  if (isIntraState) {
    const half = round(gstAmount / 2);
    return {
      cgst: half,
      sgst: half,
      igst: 0,
      totalGst: round(half * 2),
      totalAmount: round(amount + half * 2),
      gstRate: rate,
      isIntraState: true,
    };
  }

  return {
    cgst: 0,
    sgst: 0,
    igst: gstAmount,
    totalGst: gstAmount,
    totalAmount: round(amount + gstAmount),
    gstRate: rate,
    isIntraState: false,
  };
}

/** Human-readable description for an HSN code. */
export function getHsnDescription(code: string): string {
  return HSN_DESCRIPTIONS[code] ?? `HSN ${code}`;
}

/** Search HSN codes by keyword for autocomplete. */
export function searchHsnCodes(
  query: string,
): Array<{ code: string; description: string; rate: number }> {
  const q = query.toLowerCase();
  const results: Array<{ code: string; description: string; rate: number }> =
    [];

  for (const [code, rate] of Object.entries(HSN_GST_RATES)) {
    const desc = HSN_DESCRIPTIONS[code] ?? "";
    if (code.includes(q) || desc.toLowerCase().includes(q)) {
      results.push({ code, description: desc || `HSN ${code}`, rate });
    }
  }

  return results.sort((a, b) => a.code.localeCompare(b.code));
}

/** Get all available HSN rates. */
export function getAllHsnRates(): Record<string, number> {
  return { ...HSN_GST_RATES };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
