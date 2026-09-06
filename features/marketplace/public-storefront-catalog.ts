export type PublicStorefrontProduct = {
  name: string;
  category: "Dairy" | "Fruits" | "Jaggery" | "Oils" | "Poultry" | "Vegetables";
  description: string;
  priceLabel?: string;
};

type PublicStorefrontCatalog = {
  eyebrow: string;
  title: string;
  intro: string;
  sourceUrl: string;
  recipientEmail: string;
  engagementSlug: string;
  products: PublicStorefrontProduct[];
  note: string;
};

const catalogs: Record<string, PublicStorefrontCatalog> = {
  user_05605c17f44: {
    eyebrow: "Profile-described supply",
    title: "Avani Van Farms catalogue",
    intro:
      "These products are shown on the Avani Van Farms customer page linked from Sandeep Reddy’s public profile. Ask him to confirm current stock, pack sizes, pricing and delivery before ordering.",
    sourceUrl: "https://avanivan.azurewebsites.net/customer/home",
    recipientEmail: "avanivanfarms@gmail.com",
    engagementSlug: "sandeep-dasari-avani-van-farms",
    products: [
      {
        name: "Cold Pressed Safflower Oil (1000 ml)",
        category: "Oils",
        description: "Cold-pressed safflower oil in a 1000 ml pack.",
        priceLabel: "₹450 / litre",
      },
      {
        name: "Cold Pressed Coconut Oil (200ml)",
        category: "Oils",
        description: "Cold-pressed coconut oil in a 200 ml pack.",
        priceLabel: "₹110 / piece",
      },
      {
        name: "Cold Pressed Groundnut Oil (1000ml)",
        category: "Oils",
        description: "Cold-pressed groundnut oil in a 1000 ml pack.",
        priceLabel: "₹400 / bottle",
      },
      {
        name: "Cold Pressed Sesame Oil (1000ml)",
        category: "Oils",
        description: "Cold-pressed sesame oil in a 1000 ml pack.",
        priceLabel: "₹450 / bottle",
      },
      {
        name: "Cold Pressed Mustard Oil (1000ml)",
        category: "Oils",
        description: "Cold-pressed mustard oil in a 1000 ml pack.",
        priceLabel: "₹500 / bottle",
      },
      {
        name: "Country Chicken Natu Kodi (1 kg)",
        category: "Poultry",
        description: "Country chicken (Natu Kodi) in a 1 kg pack.",
        priceLabel: "₹750 / kg",
      },
      {
        name: "Country Chicken Natu kodi (500g)",
        category: "Poultry",
        description: "Country chicken (Natu Kodi) in a 500 g pack.",
        priceLabel: "₹375 / packet",
      },
      {
        name: "Organic Natu Kodi Pachadi",
        category: "Poultry",
        description: "Organic Natu Kodi pachadi listed in the poultry range.",
        priceLabel: "₹1,500 / kg",
      },
      {
        name: "Organic Natu Kodi Pachadi - Skinless",
        category: "Poultry",
        description: "Skinless organic Natu Kodi pachadi.",
        priceLabel: "₹1,500 / kg",
      },
      {
        name: "Country Eggs (15 pack)",
        category: "Poultry",
        description: "Country eggs in a 15-egg pack.",
        priceLabel: "₹250 / packet",
      },
      {
        name: "Country Eggs (30 pack)",
        category: "Poultry",
        description: "Country eggs in a 30-egg pack.",
        priceLabel: "₹500 / packet",
      },
      {
        name: "Jaggery",
        category: "Jaggery",
        description: "Jaggery listed in the Avani Van Farms catalogue.",
        priceLabel: "₹175 / piece",
      },
      {
        name: "Jaggery Powder - 500 gm",
        category: "Jaggery",
        description: "Jaggery powder in a 500 g pack.",
        priceLabel: "₹85 / g",
      },
      {
        name: "Junnu (Colostrum milk)",
        category: "Dairy",
        description: "Junnu (colostrum milk) listed in the dairy range.",
        priceLabel: "₹150 / litre",
      },
      {
        name: "Fresh Paneer (250gm Packet)",
        category: "Dairy",
        description: "Fresh paneer in a 250 g packet.",
        priceLabel: "₹200 / packet",
      },
      {
        name: "Gir Cow Bilona Ghee (500ml Jar)",
        category: "Dairy",
        description: "Gir cow Bilona ghee in a 500 ml jar.",
        priceLabel: "₹1,400 / piece",
      },
      {
        name: "Organic A2 Gir Cow Milk (500ml)",
        category: "Dairy",
        description: "Organic A2 Gir cow milk in a 500 ml packet.",
        priceLabel: "₹60 / packet",
      },
      {
        name: "Organic A2 Gir Cow Milk (1 Litre)",
        category: "Dairy",
        description: "Organic A2 Gir cow milk in a 1 litre packet.",
        priceLabel: "₹120 / packet",
      },
      {
        name: "Organic Buffalo Milk (500ml)",
        category: "Dairy",
        description: "Organic buffalo milk in a 500 ml packet.",
        priceLabel: "₹60 / packet",
      },
      {
        name: "Organic Buffalo Milk (1 Litre)",
        category: "Dairy",
        description: "Organic buffalo milk in a 1 litre packet.",
        priceLabel: "₹120 / packet",
      },
      {
        name: "Fresh Mulberries (250g)",
        category: "Fruits",
        description: "Fresh mulberries also appear in the customer subscription information.",
      },
      {
        name: "Papaya",
        category: "Fruits",
        description: "Papaya named among the fruits in the public FarmerBook profile.",
      },
      {
        name: "Dates",
        category: "Fruits",
        description: "Dates named among the fruits in the public FarmerBook profile.",
      },
      {
        name: "Leafy vegetables",
        category: "Vegetables",
        description: "Leafy vegetables named in the public FarmerBook profile.",
      },
      {
        name: "Lemons",
        category: "Vegetables",
        description: "Lemons named in the public FarmerBook profile.",
      },
    ],
    note:
      "Prices and pack sizes above are a snapshot of the Avani Van Farms customer page reviewed on 31 August 2026. This catalogue is not a live inventory, FarmerBook certification or payment page. No product is marked available until the farmer publishes an active marketplace lot.",
  },
};

export function getPublicStorefrontCatalog(handle: string) {
  return catalogs[handle] ?? null;
}
