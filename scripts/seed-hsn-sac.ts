import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

interface CodeEntry {
  code: string;
  description: string;
  gstRate: number;
  isService: boolean;
  chapter: string;
  section: string;
}

// ─── HSN CODES (350 goods) ────────────────────────────────────────────

const HSN_0_PERCENT: CodeEntry[] = [
  // Chapter 01 – Live animals
  { code: "0101", description: "Live horses, asses, mules and hinnies", gstRate: 0, isService: false, chapter: "01", section: "I" },
  { code: "0102", description: "Live bovine animals", gstRate: 0, isService: false, chapter: "01", section: "I" },
  { code: "0104", description: "Live sheep and goats", gstRate: 0, isService: false, chapter: "01", section: "I" },
  { code: "0105", description: "Live poultry (fowls, ducks, geese, turkeys)", gstRate: 0, isService: false, chapter: "01", section: "I" },
  { code: "0106", description: "Other live animals", gstRate: 0, isService: false, chapter: "01", section: "I" },
  // Chapter 03 – Fish
  { code: "0301", description: "Live fish", gstRate: 0, isService: false, chapter: "03", section: "I" },
  { code: "0302", description: "Fish, fresh or chilled (excluding fillets)", gstRate: 0, isService: false, chapter: "03", section: "I" },
  // Chapter 04 – Dairy
  { code: "0401", description: "Fresh milk, not concentrated or sweetened", gstRate: 0, isService: false, chapter: "04", section: "I" },
  { code: "040700", description: "Birds' eggs in shell, fresh", gstRate: 0, isService: false, chapter: "04", section: "I" },
  // Chapter 07 – Vegetables
  { code: "0701", description: "Potatoes, fresh or chilled", gstRate: 0, isService: false, chapter: "07", section: "II" },
  { code: "0702", description: "Tomatoes, fresh or chilled", gstRate: 0, isService: false, chapter: "07", section: "II" },
  { code: "0703", description: "Onions, garlic, leeks, fresh or chilled", gstRate: 0, isService: false, chapter: "07", section: "II" },
  { code: "0706", description: "Carrots, turnips, beetroot, fresh", gstRate: 0, isService: false, chapter: "07", section: "II" },
  { code: "0713", description: "Dried leguminous vegetables (pulses, lentils)", gstRate: 0, isService: false, chapter: "07", section: "II" },
  // Chapter 08 – Fruits
  { code: "0803", description: "Bananas, including plantains, fresh or dried", gstRate: 0, isService: false, chapter: "08", section: "II" },
  { code: "0804", description: "Dates, figs, pineapples, avocados, fresh", gstRate: 0, isService: false, chapter: "08", section: "II" },
  { code: "0805", description: "Citrus fruit, fresh or dried", gstRate: 0, isService: false, chapter: "08", section: "II" },
  { code: "0806", description: "Grapes, fresh or dried", gstRate: 0, isService: false, chapter: "08", section: "II" },
  { code: "0807", description: "Melons and papayas, fresh", gstRate: 0, isService: false, chapter: "08", section: "II" },
  { code: "0810", description: "Other fresh fruits (strawberries, raspberries)", gstRate: 0, isService: false, chapter: "08", section: "II" },
  // Chapter 10 – Cereals
  { code: "1001", description: "Wheat and meslin", gstRate: 0, isService: false, chapter: "10", section: "II" },
  { code: "1002", description: "Rye", gstRate: 0, isService: false, chapter: "10", section: "II" },
  { code: "1003", description: "Barley", gstRate: 0, isService: false, chapter: "10", section: "II" },
  { code: "1005", description: "Maize (corn)", gstRate: 0, isService: false, chapter: "10", section: "II" },
  { code: "1006", description: "Rice", gstRate: 0, isService: false, chapter: "10", section: "II" },
  { code: "1008", description: "Buckwheat, millet and other cereals", gstRate: 0, isService: false, chapter: "10", section: "II" },
  // Chapter 12 – Oil seeds
  { code: "1201", description: "Soya beans, whole", gstRate: 0, isService: false, chapter: "12", section: "II" },
  { code: "1202", description: "Groundnuts, not roasted", gstRate: 0, isService: false, chapter: "12", section: "II" },
  // Chapter 22 – Water
  { code: "2201", description: "Water, non-aerated, not sweetened", gstRate: 0, isService: false, chapter: "22", section: "IV" },
  // Chapter 49 – Books
  { code: "4901", description: "Printed books, newspapers, brochures", gstRate: 0, isService: false, chapter: "49", section: "X" },
];

const HSN_5_PERCENT: CodeEntry[] = [
  // Chapter 04 – Dairy processed
  { code: "0402", description: "Milk concentrates, cream, condensed milk", gstRate: 5, isService: false, chapter: "04", section: "I" },
  { code: "0403", description: "Buttermilk, curdled milk, yogurt", gstRate: 5, isService: false, chapter: "04", section: "I" },
  { code: "0404", description: "Whey, milk constituents", gstRate: 5, isService: false, chapter: "04", section: "I" },
  { code: "0405", description: "Butter and other fats derived from milk", gstRate: 5, isService: false, chapter: "04", section: "I" },
  { code: "0406", description: "Cheese and curd", gstRate: 5, isService: false, chapter: "04", section: "I" },
  // Chapter 08 – Nuts
  { code: "0801", description: "Coconuts, Brazil nuts and cashew nuts", gstRate: 5, isService: false, chapter: "08", section: "II" },
  { code: "0802", description: "Other nuts (almonds, walnuts, pistachios)", gstRate: 5, isService: false, chapter: "08", section: "II" },
  // Chapter 09 – Spices
  { code: "0901", description: "Coffee, not roasted, not decaffeinated", gstRate: 5, isService: false, chapter: "09", section: "II" },
  { code: "0902", description: "Tea (green, black), not exceeding 3 kg", gstRate: 5, isService: false, chapter: "09", section: "II" },
  { code: "0904", description: "Pepper (piper), dried or crushed", gstRate: 5, isService: false, chapter: "09", section: "II" },
  { code: "0910", description: "Ginger, saffron, turmeric, thyme, curry", gstRate: 5, isService: false, chapter: "09", section: "II" },
  // Chapter 11 – Flour
  { code: "1101", description: "Wheat or meslin flour", gstRate: 5, isService: false, chapter: "11", section: "II" },
  { code: "1102", description: "Cereal flours (maize, rice flour)", gstRate: 5, isService: false, chapter: "11", section: "II" },
  { code: "1103", description: "Cereal groats, meal and pellets", gstRate: 5, isService: false, chapter: "11", section: "II" },
  { code: "1104", description: "Cereal grains otherwise worked (rolled, flaked)", gstRate: 5, isService: false, chapter: "11", section: "II" },
  { code: "1105", description: "Flour, meal, powder of potatoes", gstRate: 5, isService: false, chapter: "11", section: "II" },
  // Chapter 15 – Edible oils
  { code: "1507", description: "Soybean oil, crude", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1508", description: "Groundnut oil, crude", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1509", description: "Olive oil, virgin", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1511", description: "Palm oil, crude", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1512", description: "Sunflower-seed or safflower oil", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1513", description: "Coconut, palm kernel oil", gstRate: 5, isService: false, chapter: "15", section: "III" },
  { code: "1515", description: "Other fixed vegetable fats and oils (linseed)", gstRate: 5, isService: false, chapter: "15", section: "III" },
  // Chapter 17 – Sugar
  { code: "1701", description: "Cane or beet sugar, solid", gstRate: 5, isService: false, chapter: "17", section: "IV" },
  { code: "1702", description: "Other sugars (lactose, maple, glucose)", gstRate: 5, isService: false, chapter: "17", section: "IV" },
  // Chapter 19 – Bakery
  { code: "1901", description: "Malt extract, food preparations of flour", gstRate: 5, isService: false, chapter: "19", section: "IV" },
  { code: "1902", description: "Pasta, couscous (uncooked)", gstRate: 5, isService: false, chapter: "19", section: "IV" },
  { code: "1903", description: "Tapioca and substitutes from starch", gstRate: 5, isService: false, chapter: "19", section: "IV" },
  { code: "1904", description: "Prepared cereals (cornflakes, puffed rice)", gstRate: 5, isService: false, chapter: "19", section: "IV" },
  { code: "1905", description: "Bread, biscuits, cakes, pastries", gstRate: 5, isService: false, chapter: "19", section: "IV" },
  // Chapter 21 – Food preparations
  { code: "2101", description: "Extracts of coffee, tea, mate", gstRate: 5, isService: false, chapter: "21", section: "IV" },
  { code: "2103", description: "Sauces, mixed condiments, mustard", gstRate: 5, isService: false, chapter: "21", section: "IV" },
  { code: "2104", description: "Soups, broths, preparations thereof", gstRate: 5, isService: false, chapter: "21", section: "IV" },
  { code: "2106", description: "Food preparations not elsewhere specified", gstRate: 5, isService: false, chapter: "21", section: "IV" },
  // Chapter 25 – Salt, minerals
  { code: "2501", description: "Salt (table salt, rock salt)", gstRate: 5, isService: false, chapter: "25", section: "V" },
  // Chapter 30 – Pharma
  { code: "3003", description: "Medicaments, unmixed, for therapeutic use", gstRate: 5, isService: false, chapter: "30", section: "VI" },
  { code: "3004", description: "Medicaments, mixed, in measured doses", gstRate: 5, isService: false, chapter: "30", section: "VI" },
  { code: "3005", description: "Wadding, gauze, bandages, medical", gstRate: 5, isService: false, chapter: "30", section: "VI" },
  { code: "3006", description: "Pharmaceutical goods (sutures, dental cements)", gstRate: 5, isService: false, chapter: "30", section: "VI" },
  // Chapter 39 – Plastics
  { code: "3926", description: "Other articles of plastics (office, school supplies)", gstRate: 5, isService: false, chapter: "39", section: "VII" },
  // Chapter 48 – Paper
  { code: "4802", description: "Uncoated paper for writing or printing", gstRate: 5, isService: false, chapter: "48", section: "X" },
  { code: "4820", description: "Registers, notebooks, diaries of paper", gstRate: 5, isService: false, chapter: "48", section: "X" },
  // Chapter 84 – Machinery
  { code: "847130", description: "Portable digital automatic data processing machines (laptops)", gstRate: 5, isService: false, chapter: "84", section: "XVI" },
  // Chapter 90 – Medical instruments
  { code: "9018", description: "Medical, surgical instruments and apparatus", gstRate: 5, isService: false, chapter: "90", section: "XVIII" },
  { code: "9021", description: "Orthopaedic appliances, hearing aids", gstRate: 5, isService: false, chapter: "90", section: "XVIII" },
  // Agro items
  { code: "0714", description: "Manioc, arrowroot, sweet potatoes, dried", gstRate: 5, isService: false, chapter: "07", section: "II" },
  { code: "1106", description: "Flour and meal of dried leguminous vegetables", gstRate: 5, isService: false, chapter: "11", section: "II" },
  { code: "0504", description: "Guts, bladders and stomachs of animals", gstRate: 5, isService: false, chapter: "05", section: "I" },
  { code: "0505", description: "Skins and parts of birds with feathers", gstRate: 5, isService: false, chapter: "05", section: "I" },
  { code: "1209", description: "Seeds, fruit and spores for sowing", gstRate: 5, isService: false, chapter: "12", section: "II" },
];

const HSN_12_PERCENT: CodeEntry[] = [
  // Chapter 16 – Prepared meat/fish
  { code: "1601", description: "Sausages and similar products of meat", gstRate: 12, isService: false, chapter: "16", section: "IV" },
  { code: "1602", description: "Other prepared or preserved meat", gstRate: 12, isService: false, chapter: "16", section: "IV" },
  { code: "1604", description: "Prepared or preserved fish, caviar", gstRate: 12, isService: false, chapter: "16", section: "IV" },
  { code: "1605", description: "Prepared crustaceans, molluscs", gstRate: 12, isService: false, chapter: "16", section: "IV" },
  // Chapter 17 – Confectionery
  { code: "1704", description: "Sugar confectionery, white chocolate", gstRate: 12, isService: false, chapter: "17", section: "IV" },
  // Chapter 20 – Preserved fruits/vegetables
  { code: "2001", description: "Vegetables, fruit, nuts preserved in vinegar", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2002", description: "Tomatoes, prepared or preserved", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2003", description: "Mushrooms and truffles, prepared", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2004", description: "Other vegetables prepared (frozen)", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2005", description: "Other vegetables prepared (not frozen)", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2006", description: "Vegetables, fruit preserved by sugar", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2007", description: "Jams, fruit jellies, marmalades", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2008", description: "Fruit, nuts, prepared or preserved", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  { code: "2009", description: "Fruit juices, vegetable juices, unfermented", gstRate: 12, isService: false, chapter: "20", section: "IV" },
  // Chapter 32 – Paints
  { code: "3208", description: "Paints and varnishes (non-aqueous medium)", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  { code: "3209", description: "Paints and varnishes (aqueous medium)", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  { code: "3210", description: "Other paints, varnishes, prepared driers", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  { code: "3212", description: "Pigments in non-aqueous media (stamping foils)", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  { code: "3213", description: "Artists' colours, modifying tints", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  { code: "3214", description: "Glaziers' putty, resin cements, caulking compounds", gstRate: 12, isService: false, chapter: "32", section: "VI" },
  // Chapter 39 – Plastics
  { code: "3923", description: "Articles for conveyance/packing of plastics", gstRate: 12, isService: false, chapter: "39", section: "VII" },
  { code: "3925", description: "Builders' ware of plastics (doors, windows)", gstRate: 12, isService: false, chapter: "39", section: "VII" },
  // Chapter 40 – Rubber
  { code: "4011", description: "New pneumatic tyres of rubber", gstRate: 12, isService: false, chapter: "40", section: "VII" },
  { code: "4013", description: "Inner tubes of rubber", gstRate: 12, isService: false, chapter: "40", section: "VII" },
  // Chapter 44 – Wood
  { code: "4410", description: "Particle board of wood", gstRate: 12, isService: false, chapter: "44", section: "IX" },
  { code: "4411", description: "Fibreboard of wood (MDF)", gstRate: 12, isService: false, chapter: "44", section: "IX" },
  { code: "4418", description: "Builders' joinery of wood (doors, windows)", gstRate: 12, isService: false, chapter: "44", section: "IX" },
  // Chapter 48 – Paper
  { code: "4819", description: "Cartons, boxes, bags of paper/paperboard", gstRate: 12, isService: false, chapter: "48", section: "X" },
  { code: "4821", description: "Paper labels of all kinds", gstRate: 12, isService: false, chapter: "48", section: "X" },
  { code: "4823", description: "Other articles of paper pulp (filter paper)", gstRate: 12, isService: false, chapter: "48", section: "X" },
  // Chapter 56 – Non-wovens
  { code: "5601", description: "Wadding of textile materials", gstRate: 12, isService: false, chapter: "56", section: "XI" },
  { code: "5607", description: "Twine, cordage, ropes of textile", gstRate: 12, isService: false, chapter: "56", section: "XI" },
  // Chapter 57 – Carpets
  { code: "5702", description: "Carpets and textile floor coverings, woven", gstRate: 12, isService: false, chapter: "57", section: "XI" },
  { code: "5703", description: "Carpets, tufted", gstRate: 12, isService: false, chapter: "57", section: "XI" },
  // Chapter 61-62 – Garments
  { code: "6101", description: "Men's overcoats, knitted (above ₹1000)", gstRate: 12, isService: false, chapter: "61", section: "XI" },
  { code: "6103", description: "Men's suits, trousers, knitted", gstRate: 12, isService: false, chapter: "61", section: "XI" },
  { code: "6104", description: "Women's suits, dresses, knitted", gstRate: 12, isService: false, chapter: "61", section: "XI" },
  { code: "6109", description: "T-shirts, singlets, knitted", gstRate: 12, isService: false, chapter: "61", section: "XI" },
  { code: "6110", description: "Jerseys, pullovers, cardigans, knitted", gstRate: 12, isService: false, chapter: "61", section: "XI" },
  { code: "6203", description: "Men's suits, jackets, trousers (woven)", gstRate: 12, isService: false, chapter: "62", section: "XI" },
  { code: "6204", description: "Women's suits, jackets, dresses (woven)", gstRate: 12, isService: false, chapter: "62", section: "XI" },
  { code: "6205", description: "Men's shirts (woven)", gstRate: 12, isService: false, chapter: "62", section: "XI" },
  { code: "6206", description: "Women's blouses, shirts (woven)", gstRate: 12, isService: false, chapter: "62", section: "XI" },
  { code: "6211", description: "Track suits, ski suits, swimwear", gstRate: 12, isService: false, chapter: "62", section: "XI" },
  // Chapter 63 – Home textiles
  { code: "6301", description: "Blankets and travelling rugs", gstRate: 12, isService: false, chapter: "63", section: "XI" },
  { code: "6302", description: "Bed linen, table linen, toilet linen", gstRate: 12, isService: false, chapter: "63", section: "XI" },
  { code: "6303", description: "Curtains, drapes, interior blinds", gstRate: 12, isService: false, chapter: "63", section: "XI" },
  // Chapter 64 – Footwear
  { code: "6403", description: "Footwear with outer soles of rubber/plastics", gstRate: 12, isService: false, chapter: "64", section: "XII" },
  { code: "6404", description: "Footwear with textile uppers", gstRate: 12, isService: false, chapter: "64", section: "XII" },
  // Chapter 69 – Ceramics
  { code: "6908", description: "Glazed ceramic flags, tiles", gstRate: 12, isService: false, chapter: "69", section: "XIII" },
  { code: "6910", description: "Ceramic sinks, washbasins, baths", gstRate: 12, isService: false, chapter: "69", section: "XIII" },
  { code: "6911", description: "Tableware, kitchenware of porcelain", gstRate: 12, isService: false, chapter: "69", section: "XIII" },
  // Chapter 73 – Steel articles
  { code: "7321", description: "Stoves, ranges, cooking appliances of iron", gstRate: 12, isService: false, chapter: "73", section: "XV" },
  // Chapter 84 – Machinery
  { code: "8415", description: "Air conditioning machines (split systems)", gstRate: 12, isService: false, chapter: "84", section: "XVI" },
  { code: "8414", description: "Air or vacuum pumps, compressors", gstRate: 12, isService: false, chapter: "84", section: "XVI" },
  { code: "8424", description: "Mechanical appliances for spraying liquids", gstRate: 12, isService: false, chapter: "84", section: "XVI" },
  // Chapter 85 – Electrical
  { code: "8539", description: "Electric filament or discharge lamps (LEDs)", gstRate: 12, isService: false, chapter: "85", section: "XVI" },
  // Chapter 96 – Misc
  { code: "9603", description: "Brooms, brushes, mops", gstRate: 12, isService: false, chapter: "96", section: "XX" },
  { code: "9606", description: "Buttons, press-fasteners, snap-fasteners", gstRate: 12, isService: false, chapter: "96", section: "XX" },
  { code: "9607", description: "Slide fasteners (zippers)", gstRate: 12, isService: false, chapter: "96", section: "XX" },
];

const HSN_18_PERCENT: CodeEntry[] = [
  // Chapter 22 – Beverages
  { code: "2202", description: "Aerated waters, flavoured or sweetened beverages", gstRate: 18, isService: false, chapter: "22", section: "IV" },
  { code: "2203", description: "Beer made from malt", gstRate: 18, isService: false, chapter: "22", section: "IV" },
  { code: "2204", description: "Wine of fresh grapes", gstRate: 18, isService: false, chapter: "22", section: "IV" },
  // Chapter 27 – Petroleum
  { code: "2710", description: "Petroleum oils, preparations thereof", gstRate: 18, isService: false, chapter: "27", section: "V" },
  { code: "2711", description: "Petroleum gases (LPG, natural gas)", gstRate: 18, isService: false, chapter: "27", section: "V" },
  { code: "2713", description: "Petroleum coke, petroleum bitumen", gstRate: 18, isService: false, chapter: "27", section: "V" },
  // Chapter 28-29 – Chemicals
  { code: "2801", description: "Fluorine, chlorine, bromine, iodine", gstRate: 18, isService: false, chapter: "28", section: "VI" },
  { code: "2811", description: "Other inorganic acids (hydrofluoric acid)", gstRate: 18, isService: false, chapter: "28", section: "VI" },
  { code: "2836", description: "Carbonates (sodium bicarbonate, baking soda)", gstRate: 18, isService: false, chapter: "28", section: "VI" },
  { code: "2917", description: "Polycarboxylic acids (citric acid)", gstRate: 18, isService: false, chapter: "29", section: "VI" },
  // Chapter 33 – Cosmetics
  { code: "3301", description: "Essential oils (lemon, peppermint)", gstRate: 18, isService: false, chapter: "33", section: "VI" },
  { code: "3302", description: "Mixtures of odoriferous substances (flavouring)", gstRate: 18, isService: false, chapter: "33", section: "VI" },
  { code: "3304", description: "Beauty, skincare, make-up preparations", gstRate: 18, isService: false, chapter: "33", section: "VI" },
  { code: "3306", description: "Preparations for oral or dental hygiene (toothpaste)", gstRate: 18, isService: false, chapter: "33", section: "VI" },
  { code: "3307", description: "Shaving preparations, deodorants, bath salts", gstRate: 18, isService: false, chapter: "33", section: "VI" },
  // Chapter 34 – Soap, detergents
  { code: "3401", description: "Soap, organic surface-active products (bars)", gstRate: 18, isService: false, chapter: "34", section: "VI" },
  { code: "3402", description: "Washing and cleaning preparations (detergent)", gstRate: 18, isService: false, chapter: "34", section: "VI" },
  { code: "3405", description: "Polishes, creams for footwear, furniture", gstRate: 18, isService: false, chapter: "34", section: "VI" },
  { code: "3406", description: "Candles, tapers and the like", gstRate: 18, isService: false, chapter: "34", section: "VI" },
  // Chapter 35 – Glues
  { code: "3506", description: "Prepared glues and adhesives", gstRate: 18, isService: false, chapter: "35", section: "VI" },
  // Chapter 38 – Chemical products
  { code: "3808", description: "Insecticides, herbicides, fungicides", gstRate: 18, isService: false, chapter: "38", section: "VI" },
  { code: "3809", description: "Finishing agents, dye carriers, mordants", gstRate: 18, isService: false, chapter: "38", section: "VI" },
  { code: "3814", description: "Organic composite solvents, thinners", gstRate: 18, isService: false, chapter: "38", section: "VI" },
  { code: "3819", description: "Hydraulic brake fluids", gstRate: 18, isService: false, chapter: "38", section: "VI" },
  { code: "3824", description: "Prepared binders for foundry moulds", gstRate: 18, isService: false, chapter: "38", section: "VI" },
  // Chapter 39 – Plastics
  { code: "3901", description: "Polymers of ethylene, in primary forms", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3902", description: "Polymers of propylene, in primary forms", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3903", description: "Polymers of styrene, in primary forms", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3904", description: "Polymers of vinyl chloride (PVC)", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3907", description: "Polyacetals, polyethers, epoxide resins", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3917", description: "Tubes, pipes, hoses of plastics", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3919", description: "Self-adhesive plates, tapes of plastics", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3920", description: "Other plates, sheets, film of plastics", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3921", description: "Other plates, sheets of plastics (cellular)", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  { code: "3924", description: "Tableware, kitchenware of plastics", gstRate: 18, isService: false, chapter: "39", section: "VII" },
  // Chapter 40 – Rubber
  { code: "4008", description: "Plates, sheets, rods of vulcanised rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4009", description: "Tubes, pipes, hoses of vulcanised rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4010", description: "Conveyor belts of vulcanised rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4014", description: "Hygienic articles of vulcanised rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4015", description: "Articles of apparel (gloves) of rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4016", description: "Other articles of vulcanised rubber", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  { code: "4017", description: "Hard rubber (ebonite) in all forms", gstRate: 18, isService: false, chapter: "40", section: "VII" },
  // Chapter 42 – Leather
  { code: "4202", description: "Trunks, suitcases, handbags of leather", gstRate: 18, isService: false, chapter: "42", section: "VIII" },
  { code: "4203", description: "Articles of apparel of leather (belts, gloves)", gstRate: 18, isService: false, chapter: "42", section: "VIII" },
  // Chapter 68 – Stone
  { code: "6802", description: "Worked monumental or building stone", gstRate: 18, isService: false, chapter: "68", section: "XIII" },
  { code: "6809", description: "Articles of plaster or compositions (boards)", gstRate: 18, isService: false, chapter: "68", section: "XIII" },
  { code: "6810", description: "Articles of cement, concrete, artificial stone", gstRate: 18, isService: false, chapter: "68", section: "XIII" },
  { code: "6811", description: "Articles of asbestos-cement, fibre-cement", gstRate: 18, isService: false, chapter: "68", section: "XIII" },
  { code: "6815", description: "Articles of stone or other mineral substances", gstRate: 18, isService: false, chapter: "68", section: "XIII" },
  // Chapter 70 – Glass
  { code: "7003", description: "Cast glass and rolled glass, sheets", gstRate: 18, isService: false, chapter: "70", section: "XIII" },
  { code: "7005", description: "Float glass and polished glass, sheets", gstRate: 18, isService: false, chapter: "70", section: "XIII" },
  { code: "7007", description: "Safety glass (toughened, laminated)", gstRate: 18, isService: false, chapter: "70", section: "XIII" },
  { code: "7010", description: "Carboys, bottles, jars of glass", gstRate: 18, isService: false, chapter: "70", section: "XIII" },
  { code: "7013", description: "Glassware for table, kitchen, toilet use", gstRate: 18, isService: false, chapter: "70", section: "XIII" },
  // Chapter 72-73 – Iron/Steel
  { code: "7204", description: "Ferrous waste and scrap, remelting ingots", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7207", description: "Semi-finished products of iron or steel", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7208", description: "Flat-rolled products of iron, hot-rolled", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7209", description: "Flat-rolled products of iron, cold-rolled", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7210", description: "Flat-rolled products of iron, plated/coated", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7213", description: "Bars and rods, hot-rolled, of iron", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7214", description: "Other bars and rods of iron (forged)", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7216", description: "Angles, shapes and sections of iron", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7217", description: "Wire of iron or non-alloy steel", gstRate: 18, isService: false, chapter: "72", section: "XV" },
  { code: "7304", description: "Tubes, pipes of iron or steel, seamless", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7306", description: "Other tubes, pipes of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7308", description: "Structures of iron or steel (bridges, towers)", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7309", description: "Reservoirs, tanks, vats of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7310", description: "Tanks, casks, drums, cans of iron", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7314", description: "Cloth, grill, netting of iron wire", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7318", description: "Screws, bolts, nuts, washers of iron", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7323", description: "Table, kitchen articles of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7324", description: "Sanitary ware of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7325", description: "Other cast articles of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  { code: "7326", description: "Other articles of iron or steel", gstRate: 18, isService: false, chapter: "73", section: "XV" },
  // Chapter 74-76 – Copper/Aluminium
  { code: "7411", description: "Copper tubes and pipes", gstRate: 18, isService: false, chapter: "74", section: "XV" },
  { code: "7412", description: "Copper tube or pipe fittings", gstRate: 18, isService: false, chapter: "74", section: "XV" },
  { code: "7604", description: "Aluminium bars, rods and profiles", gstRate: 18, isService: false, chapter: "76", section: "XV" },
  { code: "7606", description: "Aluminium plates, sheets, strip", gstRate: 18, isService: false, chapter: "76", section: "XV" },
  { code: "7607", description: "Aluminium foil", gstRate: 18, isService: false, chapter: "76", section: "XV" },
  { code: "7610", description: "Aluminium structures (doors, windows, frames)", gstRate: 18, isService: false, chapter: "76", section: "XV" },
  { code: "7615", description: "Table, kitchen articles of aluminium", gstRate: 18, isService: false, chapter: "76", section: "XV" },
  // Chapter 82-83 – Tools, hardware
  { code: "8201", description: "Hand tools (spades, shovels, picks)", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8203", description: "Files, rasps, pliers, pincers, tweezers", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8205", description: "Hand tools (hammers, screwdrivers, spanners)", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8211", description: "Knives with cutting blades", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8214", description: "Cutlery (razors, scissors, nail clippers)", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8215", description: "Spoons, forks, ladles, cake-servers", gstRate: 18, isService: false, chapter: "82", section: "XV" },
  { code: "8301", description: "Padlocks, locks, clasps with keys", gstRate: 18, isService: false, chapter: "83", section: "XV" },
  { code: "8302", description: "Base metal mountings, fittings for doors", gstRate: 18, isService: false, chapter: "83", section: "XV" },
  // Chapter 84 – Machinery
  { code: "8413", description: "Pumps for liquids (fuel, hand, submersible)", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8418", description: "Refrigerators, freezers, ice making machines", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8419", description: "Machinery for treatment of materials by heat", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8421", description: "Centrifuges, filtering machinery (water purifiers)", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8422", description: "Dish washing machines, packing machines", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8423", description: "Weighing machinery (personal, kitchen scales)", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8433", description: "Harvesting or threshing machinery", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8443", description: "Printing machinery, printers, copiers", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8450", description: "Household or laundry washing machines", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8452", description: "Sewing machines", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8471", description: "Automatic data processing machines (computers)", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8472", description: "Office machines (duplicating, addressing)", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  { code: "8473", description: "Parts and accessories for computers", gstRate: 18, isService: false, chapter: "84", section: "XVI" },
  // Chapter 85 – Electrical equipment
  { code: "8501", description: "Electric motors and generators", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8504", description: "Electrical transformers, static converters (UPS)", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8506", description: "Primary cells and batteries", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8507", description: "Electric accumulators (lithium-ion batteries)", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8516", description: "Electric water heaters, hair dryers, irons", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8517", description: "Telephone sets, smartphones, modems", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8518", description: "Microphones, loudspeakers, headphones", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8519", description: "Sound recording/reproducing apparatus", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8521", description: "Video recording/reproducing apparatus", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8523", description: "Magnetic media, optical media, semiconductor media", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8525", description: "Transmission apparatus for radio/TV, cameras", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8527", description: "Reception apparatus for radio-broadcasting", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8528", description: "Monitors, projectors, television receivers", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8529", description: "Parts for TV, radio, radar apparatus", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8531", description: "Electric sound or visual signalling apparatus", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8536", description: "Electrical apparatus for switching (switches, plugs)", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8537", description: "Boards, panels for electric control", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8538", description: "Parts for electrical switching apparatus", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8541", description: "Semiconductor devices (diodes, transistors, LEDs)", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8542", description: "Electronic integrated circuits", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  { code: "8544", description: "Insulated wire, cables, optical fibre cables", gstRate: 18, isService: false, chapter: "85", section: "XVI" },
  // Chapter 90 – Instruments
  { code: "9004", description: "Spectacles, goggles and the like", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9006", description: "Photographic cameras", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9015", description: "Surveying instruments and appliances", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9025", description: "Thermometers, pyrometers, hygrometers", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9026", description: "Instruments for measuring liquid flow", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9027", description: "Instruments for physical or chemical analysis", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9028", description: "Gas, liquid, electricity supply meters", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  { code: "9030", description: "Oscilloscopes, spectrum analysers, multimeters", gstRate: 18, isService: false, chapter: "90", section: "XVIII" },
  // Chapter 91 – Clocks
  { code: "9102", description: "Wrist-watches, pocket-watches (non-precious)", gstRate: 18, isService: false, chapter: "91", section: "XVIII" },
  { code: "9105", description: "Clocks (wall, alarm, desk)", gstRate: 18, isService: false, chapter: "91", section: "XVIII" },
  // Chapter 94 – Furniture
  { code: "9401", description: "Seats (office chairs, dentist chairs)", gstRate: 18, isService: false, chapter: "94", section: "XX" },
  { code: "9403", description: "Other furniture (desks, cabinets, shelves)", gstRate: 18, isService: false, chapter: "94", section: "XX" },
];

const HSN_28_PERCENT: CodeEntry[] = [
  // Chapter 24 – Tobacco
  { code: "2401", description: "Unmanufactured tobacco, tobacco refuse", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "2402", description: "Cigars, cheroots, cigarillos, cigarettes", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "2403", description: "Other manufactured tobacco (chewing, snuff)", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240210", description: "Cigars, cheroots and cigarillos containing tobacco", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240220", description: "Cigarettes containing tobacco", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240311", description: "Water pipe tobacco (hookah, shisha)", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240319", description: "Other smoking tobacco", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240391", description: "Homogenised or reconstituted tobacco", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  { code: "240399", description: "Tobacco extracts and essences", gstRate: 28, isService: false, chapter: "24", section: "IV" },
  // Chapter 33 – Perfumes
  { code: "3303", description: "Perfumes and toilet waters", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "3305", description: "Preparations for use on the hair (shampoo, dye)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330510", description: "Shampoos", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330520", description: "Preparations for permanent waving or straightening", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330530", description: "Hair lacquers (hair spray)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330590", description: "Other hair preparations (conditioners, serums)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330410", description: "Lip make-up preparations (lipstick)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330420", description: "Eye make-up preparations", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330491", description: "Face powders, compressed or loose", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330499", description: "Other beauty/make-up preparations (sunscreen)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  { code: "330300", description: "Perfumes and toilet waters (eau de toilette)", gstRate: 28, isService: false, chapter: "33", section: "VI" },
  // Chapter 36 – Fireworks
  { code: "3604", description: "Fireworks, signalling flares, rain rockets", gstRate: 28, isService: false, chapter: "36", section: "VI" },
  // Chapter 38 – Cement
  { code: "3816", description: "Refractory cements, mortars, concretes", gstRate: 28, isService: false, chapter: "38", section: "VI" },
  // Chapter 68 – Cement products
  { code: "6801", description: "Setts, curbstones of natural stone", gstRate: 28, isService: false, chapter: "68", section: "XIII" },
  // Chapter 71 – Jewellery
  { code: "7113", description: "Articles of jewellery of precious metal", gstRate: 28, isService: false, chapter: "71", section: "XIV" },
  { code: "7114", description: "Articles of goldsmiths' or silversmiths' wares", gstRate: 28, isService: false, chapter: "71", section: "XIV" },
  { code: "7117", description: "Imitation jewellery", gstRate: 28, isService: false, chapter: "71", section: "XIV" },
  // Chapter 84 – Household appliances (luxury)
  { code: "8422", description: "Dishwashing machines (household type, luxury)", gstRate: 28, isService: false, chapter: "84", section: "XVI" },
  { code: "847010", description: "Electronic calculators", gstRate: 28, isService: false, chapter: "84", section: "XVI" },
  // Chapter 85 – Electronics (luxury)
  { code: "851650", description: "Microwave ovens", gstRate: 28, isService: false, chapter: "85", section: "XVI" },
  { code: "851660", description: "Other ovens, cookers, hobs (electric)", gstRate: 28, isService: false, chapter: "85", section: "XVI" },
  { code: "851671", description: "Electric coffee makers", gstRate: 28, isService: false, chapter: "85", section: "XVI" },
  { code: "851672", description: "Electric toasters", gstRate: 28, isService: false, chapter: "85", section: "XVI" },
  { code: "851679", description: "Other electro-thermic appliances (grills, fryers)", gstRate: 28, isService: false, chapter: "85", section: "XVI" },
  // Chapter 87 – Vehicles
  { code: "8701", description: "Tractors (road)", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8702", description: "Motor vehicles for transport of 10+ persons", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8703", description: "Motor cars and vehicles for transport of persons", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8704", description: "Motor vehicles for transport of goods", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8706", description: "Chassis fitted with engines, for motor vehicles", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8707", description: "Bodies (including cabs) for motor vehicles", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8708", description: "Parts and accessories of motor vehicles", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "8711", description: "Motorcycles, cycles with auxiliary motor", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "871110", description: "Motorcycles with engine capacity <= 50cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "871120", description: "Motorcycles with engine capacity 50-250cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "871130", description: "Motorcycles with engine capacity 250-500cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "871140", description: "Motorcycles with engine capacity 500-800cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "871150", description: "Motorcycles with engine capacity > 800cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870310", description: "Vehicles with spark-ignition engine <= 1000cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870321", description: "Vehicles with spark-ignition engine 1000-1500cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870322", description: "Vehicles with spark-ignition engine 1500-3000cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870323", description: "Vehicles with spark-ignition engine > 3000cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870324", description: "Vehicles with compression-ignition engine <= 1500cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870331", description: "Vehicles with compression-ignition engine 1500-2500cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870332", description: "Vehicles with compression-ignition engine > 2500cc", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870340", description: "Electric vehicles for transport of persons", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  { code: "870390", description: "Other motor vehicles (hybrid, special purpose)", gstRate: 28, isService: false, chapter: "87", section: "XVII" },
  // Chapter 89 – Ships
  { code: "8901", description: "Cruise ships, excursion boats, ferry-boats", gstRate: 28, isService: false, chapter: "89", section: "XVII" },
  { code: "8902", description: "Fishing vessels, factory ships", gstRate: 28, isService: false, chapter: "89", section: "XVII" },
  { code: "8903", description: "Yachts, vessels for pleasure or sports", gstRate: 28, isService: false, chapter: "89", section: "XVII" },
  // Chapter 88 – Aircraft
  { code: "8802", description: "Helicopters and aeroplanes", gstRate: 28, isService: false, chapter: "88", section: "XVII" },
  // Chapter 93 – Arms
  { code: "9302", description: "Revolvers and pistols", gstRate: 28, isService: false, chapter: "93", section: "XIX" },
  { code: "9303", description: "Other firearms (shotguns, rifles)", gstRate: 28, isService: false, chapter: "93", section: "XIX" },
  { code: "9304", description: "Air guns, spring guns", gstRate: 28, isService: false, chapter: "93", section: "XIX" },
  // Chapter 95 – Games
  { code: "9504", description: "Video game consoles, coin-operated games", gstRate: 28, isService: false, chapter: "95", section: "XX" },
  { code: "950410", description: "Video games for use with television receivers", gstRate: 28, isService: false, chapter: "95", section: "XX" },
  { code: "950430", description: "Coin or disc-operated games (arcade)", gstRate: 28, isService: false, chapter: "95", section: "XX" },
  { code: "950440", description: "Playing cards", gstRate: 28, isService: false, chapter: "95", section: "XX" },
  { code: "950490", description: "Other games (billiards, casino equipment)", gstRate: 28, isService: false, chapter: "95", section: "XX" },
  // Chapter 96 – Luxury misc
  { code: "9613", description: "Cigarette lighters and other lighters", gstRate: 28, isService: false, chapter: "96", section: "XX" },
  { code: "9614", description: "Smoking pipes and cigar holders", gstRate: 28, isService: false, chapter: "96", section: "XX" },
  // Aerated beverages
  { code: "220210", description: "Waters with added sugar or sweetening (aerated)", gstRate: 28, isService: false, chapter: "22", section: "IV" },
  { code: "220290", description: "Other non-alcoholic beverages (energy drinks)", gstRate: 28, isService: false, chapter: "22", section: "IV" },
  // Pan masala
  { code: "2106", description: "Pan masala, gutkha preparations", gstRate: 28, isService: false, chapter: "21", section: "IV" },
  // White goods
  { code: "841510", description: "Window or wall air conditioning machines", gstRate: 28, isService: false, chapter: "84", section: "XVI" },
  { code: "841520", description: "Air conditioning machines for motor vehicles", gstRate: 28, isService: false, chapter: "84", section: "XVI" },
  { code: "841590", description: "Parts of air conditioning machines", gstRate: 28, isService: false, chapter: "84", section: "XVI" },
];

// ─── SAC CODES (150 services) ─────────────────────────────────────────

const SAC_CODES: CodeEntry[] = [
  // 9954 – Construction
  { code: "9954", description: "Construction services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "995411", description: "Construction of residential buildings", gstRate: 12, isService: true, chapter: "99", section: "S" },
  { code: "995412", description: "Construction of commercial buildings", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "995413", description: "Construction of industrial buildings", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "995414", description: "Construction of roads, railways, bridges", gstRate: 12, isService: true, chapter: "99", section: "S" },
  { code: "995415", description: "Construction of utility projects (water, sewage)", gstRate: 12, isService: true, chapter: "99", section: "S" },

  // 9961 – Financial
  { code: "9961", description: "Financial and related services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996111", description: "Central banking services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996112", description: "Deposit services (savings, current accounts)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996113", description: "Credit-granting services (loans, mortgages)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996119", description: "Other financial services (letters of credit)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9962 – Insurance
  { code: "9962", description: "Insurance and pension services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996211", description: "Life insurance services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996212", description: "Accident and health insurance", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996213", description: "Motor vehicle insurance services", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9963 – Real estate
  { code: "9963", description: "Real estate services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996311", description: "Rental of residential property", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996312", description: "Rental of commercial property", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9964 – Transport of goods
  { code: "9964", description: "Rental services of transport vehicles with operators", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996411", description: "Rental of road vehicles with operators (goods)", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9965 – Transport of passengers
  { code: "9965", description: "Passenger transport services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996511", description: "Local land transport (bus, metro, taxi)", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "996512", description: "Long-distance transport of passengers by rail", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "996513", description: "Long-distance transport by road (bus)", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "996521", description: "Coastal and transoceanic water transport", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "996531", description: "Domestic air transport of passengers", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "996532", description: "International air transport of passengers", gstRate: 12, isService: true, chapter: "99", section: "S" },
  // 9966 – Rental
  { code: "9966", description: "Rental and leasing services without operator", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996601", description: "Rental of motor vehicles without operator", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996602", description: "Rental of personal and household goods", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996603", description: "Rental of machinery and equipment", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9967 – IT services
  { code: "9967", description: "Information technology services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996711", description: "IT consulting services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996712", description: "IT design and development services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996713", description: "IT infrastructure provisioning services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996719", description: "Other IT services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9968 – Telecom
  { code: "9968", description: "Telecommunications, broadcasting, information supply", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996811", description: "Carrier services (voice, data, text)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996812", description: "Internet access services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996813", description: "Internet backbone services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996821", description: "Online content (news, books, music)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9969 – Electricity/utilities
  { code: "9969", description: "Electricity, gas, water and other distribution", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996911", description: "Electrical energy transmission and distribution", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996921", description: "Gas distribution through mains", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "996931", description: "Water distribution through mains", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9971 – Financial intermediation
  { code: "9971", description: "Financial intermediation services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997111", description: "Stock/share trading services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997113", description: "Asset management services (mutual funds)", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9972 – Real estate agent
  { code: "9972", description: "Real estate services on fee/contract basis", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997211", description: "Real estate property management", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997212", description: "Real estate brokerage/agency services", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9973 – Leasing
  { code: "9973", description: "Leasing or rental services without operator", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997311", description: "Licensing of intellectual property (patents)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997312", description: "Licensing of trademarks and franchises", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "997313", description: "Licensing of copyrights (software, media)", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9981 – Professional services
  { code: "9981", description: "Professional, technical and business services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998111", description: "Legal advisory and representation services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998112", description: "Legal documentation and certification", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998121", description: "Financial auditing services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998122", description: "Accounting and bookkeeping services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998123", description: "Tax preparation and planning services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998130", description: "Management consulting services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998131", description: "Strategic management consulting", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998132", description: "Financial management consulting", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998133", description: "Human resource management consulting", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998134", description: "Marketing management consulting", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9982 – Education
  { code: "9982", description: "Education services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998211", description: "Pre-primary education services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998212", description: "Primary education services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998221", description: "Secondary education services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998222", description: "Higher secondary education services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998231", description: "Higher education services (degree)", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998232", description: "Post-graduate education services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998241", description: "Vocational education services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998242", description: "Continuing education (professional development)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9983 – Health
  { code: "9983", description: "Health and social care services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998311", description: "Inpatient hospital services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998312", description: "Medical and dental outpatient services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998313", description: "Paramedical services (physiotherapy, speech therapy)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998314", description: "Ambulance services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "998315", description: "Residential nursing care", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998319", description: "Other human health services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9984 – Hospitality
  { code: "9984", description: "Hospitality and related services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998411", description: "Hotel accommodation (tariff < ₹1000)", gstRate: 12, isService: true, chapter: "99", section: "S" },
  { code: "998412", description: "Hotel accommodation (tariff ₹1000-₹7500)", gstRate: 12, isService: true, chapter: "99", section: "S" },
  { code: "998413", description: "Hotel accommodation (tariff > ₹7500)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998421", description: "Food/beverage serving services (restaurants)", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "998422", description: "Catering services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9985 – Support services
  { code: "9985", description: "Support services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998511", description: "Travel agency services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998512", description: "Tour operator services", gstRate: 5, isService: true, chapter: "99", section: "S" },

  { code: "998521", description: "Employment placement services (recruitment)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998522", description: "Temporary staffing services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998531", description: "Investigation and security services", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9986 – News/publishing
  { code: "9986", description: "Publishing, broadcasting and information supply", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998611", description: "News agency services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998612", description: "Library and archive services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  // 9987 – Maintenance/repair
  { code: "9987", description: "Maintenance, repair and installation services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998711", description: "Maintenance/repair of fabricated metal products", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998712", description: "Maintenance/repair of machinery and equipment", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998713", description: "Maintenance/repair of electronic equipment", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998714", description: "Maintenance/repair of transport equipment", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998715", description: "Maintenance/repair of computers/peripherals", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998719", description: "Other maintenance/repair services (HVAC, plumbing)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9988 – Manufacturing
  { code: "9988", description: "Manufacturing services on physical inputs", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998811", description: "Food and beverage manufacturing services", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "998812", description: "Textile manufacturing services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998813", description: "Leather and footwear manufacturing services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998814", description: "Wood and paper manufacturing services", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9989 – Goods transport
  { code: "9989", description: "Goods transport agency and related services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998911", description: "Goods transport by road", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "998912", description: "Goods transport by rail", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "998913", description: "Goods transport by sea/waterways", gstRate: 5, isService: true, chapter: "99", section: "S" },
  { code: "998914", description: "Goods transport by air", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998921", description: "Courier and parcel delivery services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "998931", description: "Warehousing and storage services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9991 – Government
  { code: "9991", description: "Public administration and government services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999111", description: "Administrative services of the government", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999112", description: "Public order and safety services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999113", description: "Compulsory social security services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  // 9992 – Educational institution
  { code: "9992", description: "Educational institution services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999210", description: "Services by educational institutions (up to higher secondary)", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999220", description: "Services by IIMs (approved programmes)", gstRate: 0, isService: true, chapter: "99", section: "S" },
  // 9993 – Healthcare
  { code: "9993", description: "Healthcare services by clinical establishments", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999310", description: "Services by hospitals, nursing homes, clinics", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999320", description: "Diagnostic/pathology laboratory services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  // 9994 – Recreational
  { code: "9994", description: "Recreational, cultural and sporting services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999411", description: "Motion picture production services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999412", description: "Motion picture distribution/exhibition services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999421", description: "Performing arts event production services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999431", description: "Amusement park and theme park services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999432", description: "Gambling and betting services", gstRate: 28, isService: true, chapter: "99", section: "S" },
  // 9995 – Other professional
  { code: "9995", description: "Other professional, technical services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999511", description: "Scientific research and development services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999512", description: "Architectural services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999513", description: "Engineering services (civil, mechanical, electrical)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999514", description: "Urban planning and landscape design services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999521", description: "Advertising services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999522", description: "Market research and public opinion polling", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9996 – Washing/cleaning
  { code: "9996", description: "Washing, cleaning and dyeing services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999611", description: "Laundry services (coin-operated)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999612", description: "Dry-cleaning services", gstRate: 18, isService: true, chapter: "99", section: "S" },

  // 9997 – Religious
  { code: "9997", description: "Religious, political and other community services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999711", description: "Religious services (temple, church, mosque)", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999712", description: "Services by charitable/non-profit organisations", gstRate: 0, isService: true, chapter: "99", section: "S" },
  // 9998 – Domestic
  { code: "9998", description: "Domestic services", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999811", description: "Services by domestic workers (maids, cooks)", gstRate: 0, isService: true, chapter: "99", section: "S" },
  { code: "999812", description: "Other personal services (beauty, spa, wellness)", gstRate: 18, isService: true, chapter: "99", section: "S" },
  { code: "999813", description: "Funeral, cremation and related services", gstRate: 0, isService: true, chapter: "99", section: "S" },
  // 9999 – NEC
  { code: "9999", description: "Services not elsewhere classified", gstRate: 18, isService: true, chapter: "99", section: "S" },

];

const HSN_CODES: CodeEntry[] = [
  ...HSN_0_PERCENT,
  ...HSN_5_PERCENT,
  ...HSN_12_PERCENT,
  ...HSN_18_PERCENT,
  ...HSN_28_PERCENT,
];

async function main() {
  const hsnCount = HSN_CODES.length;
  const sacCount = SAC_CODES.length;
  const allCodes = [...HSN_CODES, ...SAC_CODES];

  console.log(`🔄 Seeding HSN/SAC codes...`);
  console.log(`   HSN (goods):    ${hsnCount}`);
  console.log(`   SAC (services): ${sacCount}`);
  console.log(`   Total:          ${allCodes.length}`);

  let created = 0;
  let updated = 0;

  for (const entry of allCodes) {
    const existing = await db.hsnSacCode.findUnique({ where: { code: entry.code } });

    await db.hsnSacCode.upsert({
      where: { code: entry.code },
      create: {
        code: entry.code,
        description: entry.description,
        gstRate: entry.gstRate,
        isService: entry.isService,
        chapter: entry.chapter,
        section: entry.section,
      },
      update: {
        description: entry.description,
        gstRate: entry.gstRate,
        isService: entry.isService,
        chapter: entry.chapter,
        section: entry.section,
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`\n✅ Done: ${created} created, ${updated} updated, ${allCodes.length} total`);

  // Summary by GST rate
  const byRate = allCodes.reduce(
    (acc, c) => {
      const key = `${c.gstRate}%`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("\n📊 Distribution by GST rate:");
  for (const [rate, count] of Object.entries(byRate).sort()) {
    console.log(`   ${rate.padStart(4)}: ${count} codes`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
