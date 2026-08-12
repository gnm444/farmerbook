export type AgricultureCategoryKind = "group" | "activity" | "commodity";

export type AgricultureCategoryDomain =
  | "farming_activity"
  | "commodity"
  | "business_sector"
  | "offer_category";

export type AgricultureSelectionContext =
  | "profile"
  | "produce"
  | "sourcing";

export type AgricultureCategory = {
  slug: string;
  name: string;
  kind: AgricultureCategoryKind;
  domain: Extract<AgricultureCategoryDomain, "farming_activity" | "commodity">;
  translationKey: `agricultureCategories.${string}`;
  aliases: readonly string[];
  contexts: readonly AgricultureSelectionContext[];
  selectable: boolean;
  sortOrder: number;
  parentSlug?: string;
};

type AgricultureCategoryDefinition = Omit<
  AgricultureCategory,
  "domain" | "translationKey" | "aliases" | "contexts" | "sortOrder"
> & {
  aliases?: readonly string[];
  contexts?: readonly AgricultureSelectionContext[];
};

const AGRICULTURE_CATEGORY_DEFINITIONS = [
  { slug: "crop-cultivation", name: "Crop cultivation", kind: "group", selectable: false },
  { slug: "cereals-grains", name: "Cereals and grains", kind: "activity", selectable: true, parentSlug: "crop-cultivation" },
  { slug: "rice", name: "Rice", aliases: ["paddy", "dhan", "chawal"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "wheat", name: "Wheat", aliases: ["gehun", "atta wheat"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "maize", name: "Maize", aliases: ["corn", "makka", "makai"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "barley", name: "Barley", aliases: ["jau"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "oats", name: "Oats", kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "rye", name: "Rye", kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "sorghum-jowar", name: "Sorghum (jowar)", aliases: ["jowar", "great millet"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "pearl-millet-bajra", name: "Pearl millet (bajra)", aliases: ["bajra"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "finger-millet-ragi", name: "Finger millet (ragi)", aliases: ["ragi", "nachni", "mandua"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "foxtail-millet", name: "Foxtail millet", aliases: ["kangni", "kakun"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "kodo-millet", name: "Kodo millet", aliases: ["kodra"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "little-millet", name: "Little millet", aliases: ["kutki", "samai"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "proso-millet", name: "Proso millet", aliases: ["cheena", "barri"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "barnyard-millet", name: "Barnyard millet", aliases: ["sanwa", "jhangora"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "browntop-millet", name: "Browntop millet", kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "buckwheat", name: "Buckwheat", aliases: ["kuttu"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "grain-amaranth", name: "Grain amaranth", aliases: ["rajgira", "ramdana"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "quinoa", name: "Quinoa", kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "other-millets", name: "Other millets", aliases: ["millets", "small millets"], kind: "commodity", selectable: true, parentSlug: "cereals-grains" },
  { slug: "pulses-legumes", name: "Pulses and legumes", kind: "activity", selectable: true, parentSlug: "crop-cultivation" },
  { slug: "chickpea-gram", name: "Chickpea (gram)", aliases: ["chana", "bengal gram"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "pigeon-pea-tur", name: "Pigeon pea (tur)", aliases: ["tur", "toor", "arhar"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "lentil", name: "Lentil", aliases: ["masur", "masoor"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "mung-bean", name: "Mung bean", aliases: ["moong", "green gram"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "urad-bean", name: "Urad bean", aliases: ["black gram", "udad"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "field-pea", name: "Field pea", aliases: ["dry pea", "matar"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "cowpea", name: "Cowpea", aliases: ["lobia", "black-eyed pea"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "kidney-bean-rajma", name: "Kidney bean (rajma)", aliases: ["rajma"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "moth-bean", name: "Moth bean", aliases: ["matki"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "horse-gram", name: "Horse gram", aliases: ["kulthi"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "lablab-bean", name: "Lablab bean", aliases: ["hyacinth bean", "sem"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "broad-bean", name: "Broad bean", aliases: ["fava bean"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "cluster-bean-guar", name: "Cluster bean (guar)", aliases: ["guar", "guvar"], kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "other-dry-beans", name: "Other dry beans", kind: "commodity", selectable: true, parentSlug: "pulses-legumes" },
  { slug: "oilseeds", name: "Oilseeds", kind: "activity", selectable: true, parentSlug: "crop-cultivation" },
  { slug: "groundnut", name: "Groundnut", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "mustard-rapeseed", name: "Mustard and rapeseed", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "soybean", name: "Soybean", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "sesame", name: "Sesame", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "sunflower", name: "Sunflower", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "safflower", name: "Safflower", aliases: ["kardi", "kusum"], kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "linseed-flaxseed", name: "Linseed (flaxseed)", aliases: ["alsi"], kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "castor-seed", name: "Castor seed", aliases: ["arandi"], kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "niger-seed", name: "Niger seed", aliases: ["ramtil"], kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "oil-palm", name: "Oil palm", kind: "commodity", selectable: true, parentSlug: "oilseeds" },
  { slug: "commercial-field-crops", name: "Commercial and field crops", kind: "activity", selectable: true, parentSlug: "crop-cultivation" },
  { slug: "cotton", name: "Cotton", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "jute", name: "Jute", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "sugarcane", name: "Sugarcane", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "sugar-beet", name: "Sugar beet", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "tobacco", name: "Tobacco", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "mesta", name: "Mesta", aliases: ["kenaf"], kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "sisal-fibre", name: "Sisal fibre", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "flax-fibre", name: "Flax fibre", kind: "commodity", selectable: true, parentSlug: "commercial-field-crops" },
  { slug: "fodder-forage", name: "Fodder and forage crops", kind: "activity", selectable: true, parentSlug: "crop-cultivation" },
  { slug: "berseem-fodder", name: "Berseem fodder", aliases: ["egyptian clover"], kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "lucerne-alfalfa", name: "Lucerne (alfalfa)", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "napier-grass", name: "Napier grass", aliases: ["elephant grass"], kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "fodder-maize", name: "Fodder maize", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "fodder-sorghum", name: "Fodder sorghum", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "pasture-grasses", name: "Pasture grasses", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "silage", name: "Silage", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },
  { slug: "hay", name: "Hay", kind: "commodity", selectable: true, parentSlug: "fodder-forage" },

  { slug: "horticulture", name: "Horticulture", kind: "group", selectable: false },
  { slug: "fruit-orchards", name: "Fruit and orchard farming", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "mango", name: "Mango", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "banana", name: "Banana", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "grapes", name: "Grapes", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "pomegranate", name: "Pomegranate", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "citrus", name: "Citrus", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "apple-temperate-fruit", name: "Apple and temperate fruit", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "guava", name: "Guava", aliases: ["amrud", "peru"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "papaya", name: "Papaya", aliases: ["papita"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "pineapple", name: "Pineapple", aliases: ["ananas"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "litchi", name: "Litchi", aliases: ["lychee"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "sapota", name: "Sapota (chikoo)", aliases: ["chikoo", "chiku"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "jackfruit", name: "Jackfruit", aliases: ["kathal", "phanus"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "aonla", name: "Aonla (Indian gooseberry)", aliases: ["amla"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "ber-jujube", name: "Ber (Indian jujube)", aliases: ["bor", "jujube"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "custard-apple", name: "Custard apple", aliases: ["sitaphal", "sugar apple"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "watermelon", name: "Watermelon", aliases: ["tarbooz"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "muskmelon", name: "Muskmelon", aliases: ["kharbuja", "cantaloupe"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "pear", name: "Pear", aliases: ["nashpati"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "peach", name: "Peach", aliases: ["aadu"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "plum", name: "Plum", aliases: ["aloo bukhara"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "apricot", name: "Apricot", aliases: ["khubani"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "cherry", name: "Cherry", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "kiwi", name: "Kiwi", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "strawberry", name: "Strawberry", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "fig", name: "Fig", aliases: ["anjeer"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "date-palm", name: "Dates", aliases: ["date palm", "khajur"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "dragon-fruit", name: "Dragon fruit", aliases: ["kamalam"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "passion-fruit", name: "Passion fruit", kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "avocado", name: "Avocado", aliases: ["butter fruit"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "bael", name: "Bael", aliases: ["wood apple"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "jamun", name: "Jamun", aliases: ["java plum"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "mulberry", name: "Mulberry", aliases: ["shahtoot"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "tamarind", name: "Tamarind", aliases: ["imli", "chinch"], kind: "commodity", selectable: true, parentSlug: "fruit-orchards" },
  { slug: "vegetables", name: "Vegetable farming", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "tomato", name: "Tomato", aliases: ["tamatar"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "onion", name: "Onion", aliases: ["pyaz", "kanda"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "potato-root-tubers", name: "Potato, roots and tubers", aliases: ["potato", "aloo"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "okra", name: "Okra", aliases: ["ladyfinger", "lady's finger", "bhindi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "leafy-vegetables", name: "Leafy vegetables", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "brinjal-eggplant", name: "Brinjal (eggplant)", aliases: ["eggplant", "aubergine", "baingan", "vangi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "cabbage", name: "Cabbage", aliases: ["patta gobhi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "cauliflower", name: "Cauliflower", aliases: ["phool gobhi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "broccoli", name: "Broccoli", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "capsicum", name: "Capsicum", aliases: ["bell pepper", "sweet pepper", "shimla mirch"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "green-chilli", name: "Green chilli", aliases: ["green chili", "hari mirch"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "cucumber", name: "Cucumber", aliases: ["kheera", "kakdi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "gherkin", name: "Gherkin", aliases: ["pickling cucumber"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "carrot", name: "Carrot", aliases: ["gajar"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "radish", name: "Radish", aliases: ["mooli"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "beetroot", name: "Beetroot", aliases: ["beet"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "turnip", name: "Turnip", aliases: ["shalgam"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "green-peas", name: "Green peas", aliases: ["peas", "matar"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "green-beans", name: "Green beans", aliases: ["snap beans"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "french-beans", name: "French beans", aliases: ["common beans"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "bitter-gourd", name: "Bitter gourd", aliases: ["karela", "bitter melon"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "bottle-gourd", name: "Bottle gourd", aliases: ["lauki", "dudhi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "ridge-gourd", name: "Ridge gourd", aliases: ["turai", "dodka"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "sponge-gourd", name: "Sponge gourd", aliases: ["gilki"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "snake-gourd", name: "Snake gourd", aliases: ["padwal"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "ash-gourd", name: "Ash gourd", aliases: ["winter melon", "petha"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "pointed-gourd", name: "Pointed gourd", aliases: ["parwal", "potol"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "pumpkin-squash", name: "Pumpkin and squash", aliases: ["kaddu", "sitaphal vegetable"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "sweet-potato", name: "Sweet potato", aliases: ["shakarkand", "ratale"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "cassava-tapioca", name: "Cassava (tapioca)", aliases: ["cassava", "tapioca"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "elephant-foot-yam", name: "Elephant foot yam", aliases: ["suran", "jimikand"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "yam", name: "Yam", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "colocasia-taro", name: "Colocasia (taro)", aliases: ["arbi", "alu"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "garlic", name: "Garlic", aliases: ["lahsun"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "drumstick-moringa", name: "Drumstick (moringa)", aliases: ["moringa", "sahjan", "shevga"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "spinach", name: "Spinach", aliases: ["palak"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "amaranth-greens", name: "Amaranth greens", aliases: ["chaulai", "math"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "fenugreek-leaves", name: "Fenugreek leaves", aliases: ["methi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "mustard-greens", name: "Mustard greens", aliases: ["sarson saag"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "lettuce", name: "Lettuce", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "celery", name: "Celery", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "asparagus", name: "Asparagus", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "sweet-corn", name: "Sweet corn", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "baby-corn", name: "Baby corn", kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "zucchini", name: "Zucchini", aliases: ["courgette"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "knol-khol", name: "Knol-khol", aliases: ["kohlrabi", "ganth gobhi"], kind: "commodity", selectable: true, parentSlug: "vegetables" },
  { slug: "spices-condiments", name: "Spices and condiments", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "black-pepper", name: "Black pepper", aliases: ["peppercorn", "kali mirch"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "dry-chilli", name: "Dry chilli", aliases: ["red chilli", "red chili", "lal mirch"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "turmeric", name: "Turmeric", aliases: ["haldi"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "ginger", name: "Ginger", aliases: ["adrak"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "coriander", name: "Coriander", aliases: ["dhania", "cilantro seed"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "cumin", name: "Cumin", aliases: ["jeera"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "fennel", name: "Fennel", aliases: ["saunf"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "fenugreek-seed", name: "Fenugreek seed", aliases: ["methi seed"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "cardamom", name: "Cardamom", aliases: ["elaichi"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "clove", name: "Clove", aliases: ["laung"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "cinnamon-cassia", name: "Cinnamon and cassia", aliases: ["dalchini"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "nutmeg-mace", name: "Nutmeg and mace", aliases: ["jaiphal", "javitri"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "ajwain", name: "Ajwain", aliases: ["carom seed"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "dill", name: "Dill", aliases: ["suva", "shepu"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "saffron", name: "Saffron", aliases: ["kesar"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "kokum", name: "Kokum", kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "asafoetida", name: "Asafoetida", aliases: ["hing"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "curry-leaf", name: "Curry leaf", aliases: ["kadi patta"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "mint", name: "Mint", aliases: ["pudina"], kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "lemongrass", name: "Lemongrass", kind: "commodity", selectable: true, parentSlug: "spices-condiments" },
  { slug: "flowers-floriculture", name: "Flowers and floriculture", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "rose", name: "Rose", aliases: ["gulab"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "marigold", name: "Marigold", aliases: ["genda", "zendu"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "jasmine", name: "Jasmine", aliases: ["mogra"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "chrysanthemum", name: "Chrysanthemum", aliases: ["shevanti"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "tuberose", name: "Tuberose", aliases: ["rajnigandha"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "gladiolus", name: "Gladiolus", kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "orchids", name: "Orchids", kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "gerbera", name: "Gerbera", kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "lotus", name: "Lotus", aliases: ["kamal"], kind: "commodity", selectable: true, parentSlug: "flowers-floriculture" },
  { slug: "medicinal-aromatic-plants", name: "Medicinal and aromatic plants", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "aloe-vera", name: "Aloe vera", kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "tulsi", name: "Tulsi", aliases: ["holy basil"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "ashwagandha", name: "Ashwagandha", aliases: ["winter cherry"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "isabgol", name: "Isabgol", aliases: ["psyllium"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "senna", name: "Senna", kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "stevia", name: "Stevia", kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "vetiver", name: "Vetiver", aliases: ["khus"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "citronella", name: "Citronella", kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "mentha", name: "Mentha", aliases: ["menthol mint"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "safed-musli", name: "Safed musli", kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "kalmegh", name: "Kalmegh", aliases: ["andrographis"], kind: "commodity", selectable: true, parentSlug: "medicinal-aromatic-plants" },
  { slug: "plantation-crops", name: "Plantation crops", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "tea", name: "Tea", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "coffee", name: "Coffee", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "coconut", name: "Coconut", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "rubber", name: "Rubber", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "arecanut", name: "Arecanut", aliases: ["betel nut", "supari"], kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "cashew", name: "Cashew", aliases: ["kaju"], kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "cocoa", name: "Cocoa", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "vanilla", name: "Vanilla", kind: "commodity", selectable: true, parentSlug: "plantation-crops" },
  { slug: "nursery-seed-production", name: "Nursery and seed production", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "protected-cultivation", name: "Protected cultivation", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "hydroponics", name: "Hydroponics", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "aquaponics", name: "Aquaponics", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "vertical-urban-farming", name: "Vertical and urban farming", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "mushroom-cultivation", name: "Mushroom cultivation", kind: "activity", selectable: true, parentSlug: "horticulture" },
  { slug: "button-mushroom", name: "Button mushroom", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },
  { slug: "oyster-mushroom", name: "Oyster mushroom", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },
  { slug: "milky-mushroom", name: "Milky mushroom", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },
  { slug: "paddy-straw-mushroom", name: "Paddy straw mushroom", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },
  { slug: "shiitake-mushroom", name: "Shiitake mushroom", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },
  { slug: "other-edible-mushrooms", name: "Other edible mushrooms", kind: "commodity", selectable: true, parentSlug: "mushroom-cultivation" },

  { slug: "livestock", name: "Livestock farming", kind: "group", selectable: false },
  { slug: "dairy-cattle", name: "Dairy cattle", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "buffalo-farming", name: "Buffalo farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "goat-farming", name: "Goat farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "sheep-farming", name: "Sheep farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "pig-farming", name: "Pig farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "rabbit-farming", name: "Rabbit farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "cattle-rearing", name: "Cattle rearing", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "yak-farming", name: "Yak farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "mithun-farming", name: "Mithun farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "camel-farming", name: "Camel farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "equine-farming", name: "Horse, pony and donkey farming", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "other-livestock", name: "Other livestock", kind: "activity", selectable: true, parentSlug: "livestock" },
  { slug: "milk", name: "Milk", aliases: ["raw milk", "fresh milk", "doodh"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "cow-milk", name: "Cow milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "buffalo-milk", name: "Buffalo milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "goat-milk", name: "Goat milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "sheep-milk", name: "Sheep milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "camel-milk", name: "Camel milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "yak-milk", name: "Yak milk", kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "farm-dairy-products", name: "Farm dairy products", aliases: ["dairy produce"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "curd-yogurt", name: "Curd and yogurt", aliases: ["dahi"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "paneer", name: "Paneer", aliases: ["cottage cheese"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "ghee", name: "Ghee", aliases: ["clarified butter"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "meat", name: "Meat", aliases: ["livestock meat"], contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "buffalo-meat", name: "Buffalo meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "goat-meat", name: "Goat meat", aliases: ["chevon"], contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "sheep-meat-mutton", name: "Sheep meat (mutton)", aliases: ["mutton"], contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "pork", name: "Pork", aliases: ["pig meat"], contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "rabbit-meat", name: "Rabbit meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "wool", name: "Wool", aliases: ["raw wool"], kind: "commodity", selectable: true, parentSlug: "livestock" },
  { slug: "animal-manure", name: "Animal manure", aliases: ["farmyard manure", "fym"], kind: "commodity", selectable: true, parentSlug: "livestock" },

  { slug: "poultry", name: "Poultry farming", kind: "group", selectable: false },
  { slug: "broiler-chicken", name: "Broiler chicken", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "layer-egg-production", name: "Layer and egg production", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "backyard-native-poultry", name: "Backyard and native poultry", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "duck-farming", name: "Duck farming", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "turkey-farming", name: "Turkey farming", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "quail-farming", name: "Quail farming", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "poultry-hatchery", name: "Poultry hatchery and chicks", kind: "activity", selectable: true, parentSlug: "poultry" },
  { slug: "eggs", name: "Eggs", aliases: ["farm eggs"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "chicken-eggs", name: "Chicken eggs", aliases: ["hen eggs"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "duck-eggs", name: "Duck eggs", kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "quail-eggs", name: "Quail eggs", kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "poultry-meat", name: "Poultry meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "chicken-meat", name: "Chicken meat", aliases: ["broiler meat"], contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "duck-meat", name: "Duck meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "turkey-meat", name: "Turkey meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "poultry" },
  { slug: "quail-meat", name: "Quail meat", contexts: ["profile", "sourcing"], kind: "commodity", selectable: true, parentSlug: "poultry" },

  { slug: "fisheries-aquaculture", name: "Fisheries, aquaculture and seafood", kind: "group", selectable: false },
  { slug: "freshwater-aquaculture", name: "Freshwater aquaculture", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "brackish-water-aquaculture", name: "Brackish-water aquaculture", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "marine-aquaculture", name: "Marine aquaculture", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "inland-capture-fisheries", name: "Inland capture fisheries", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "marine-capture-fisheries", name: "Marine capture fisheries", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "shrimp-prawn", name: "Shrimp and prawn", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "crab-lobster", name: "Crab and lobster", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "molluscs-shellfish", name: "Molluscs and shellfish", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "pearl-culture", name: "Pearl culture", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "seaweed-farming", name: "Seaweed farming", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "ornamental-fish", name: "Ornamental fish", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "fish-hatchery-seed", name: "Fish hatchery and seed", kind: "activity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "rohu", name: "Rohu", aliases: ["rui"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "catla", name: "Catla", aliases: ["katla"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "mrigal", name: "Mrigal", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "common-carp", name: "Common carp", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "grass-carp", name: "Grass carp", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "silver-carp", name: "Silver carp", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "tilapia", name: "Tilapia", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "pangasius", name: "Pangasius", aliases: ["pangas"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "magur-singhi-catfish", name: "Magur, singhi and catfish", aliases: ["catfish", "magur", "singhi"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "murrel-snakehead", name: "Murrel (snakehead)", aliases: ["snakehead fish"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "trout-coldwater-fish", name: "Trout and cold-water fish", aliases: ["trout"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "seabass", name: "Seabass", aliases: ["barramundi"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "milkfish", name: "Milkfish", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "cobia", name: "Cobia", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "pompano", name: "Pompano", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "grouper-mullet", name: "Grouper and mullet", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "freshwater-prawn", name: "Freshwater prawn", aliases: ["scampi"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "vannamei-shrimp", name: "Vannamei shrimp", aliases: ["whiteleg shrimp"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "tiger-prawn", name: "Tiger prawn", aliases: ["black tiger shrimp"], kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "oyster", name: "Oyster", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "mussel", name: "Mussel", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "clam", name: "Clam", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "squid-octopus", name: "Squid and octopus", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },
  { slug: "dried-fish", name: "Dried fish", kind: "commodity", selectable: true, parentSlug: "fisheries-aquaculture" },

  { slug: "allied-activities", name: "Allied agricultural activities", kind: "group", selectable: false },
  { slug: "beekeeping-apiculture", name: "Beekeeping and apiculture", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "sericulture", name: "Sericulture", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "lac-cultivation", name: "Lac cultivation", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "agroforestry", name: "Agroforestry", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "vermicompost-compost", name: "Vermicompost and compost", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "on-farm-processing", name: "On-farm processing and value addition", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "integrated-farming", name: "Integrated farming systems", kind: "activity", selectable: true, parentSlug: "allied-activities" },
  { slug: "honey", name: "Honey", aliases: ["natural honey"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "beeswax", name: "Beeswax", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "silk-cocoons", name: "Silk cocoons", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "lac-resin", name: "Lac resin", aliases: ["shellac"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "compost", name: "Compost", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "vermicompost", name: "Vermicompost", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "farm-seed", name: "Farm seed", aliases: ["saved seed", "seed produce"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "planting-material", name: "Planting material", aliases: ["cuttings", "rootstock"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "nursery-saplings", name: "Nursery plants and saplings", aliases: ["saplings", "seedlings"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "jaggery", name: "Jaggery", aliases: ["gur", "gul"], kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "agroforestry-produce", name: "Agroforestry produce", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
  { slug: "bamboo-cane", name: "Bamboo and cane", kind: "commodity", selectable: true, parentSlug: "allied-activities" },
] as const satisfies readonly AgricultureCategoryDefinition[];

const nextSortOrderByParent = new Map<string, number>();

export const AGRICULTURE_CATEGORIES = AGRICULTURE_CATEGORY_DEFINITIONS.map(
  (category) => {
    const parentKey = "parentSlug" in category ? category.parentSlug : "__root__";
    const sortOrder = (nextSortOrderByParent.get(parentKey) ?? 0) + 10;
    nextSortOrderByParent.set(parentKey, sortOrder);

    return {
      ...category,
      domain: category.kind === "commodity" ? "commodity" : "farming_activity",
      translationKey: `agricultureCategories.${category.slug}`,
      aliases: "aliases" in category ? category.aliases : [],
      contexts:
        "contexts" in category
          ? category.contexts
          : category.kind === "commodity"
            ? (["profile", "produce", "sourcing"] as const)
            : (["profile"] as const),
      selectable: category.selectable,
      sortOrder,
    };
  },
) satisfies readonly AgricultureCategory[];

export type AgricultureCategorySlug =
  (typeof AGRICULTURE_CATEGORY_DEFINITIONS)[number]["slug"];

export const SELECTABLE_AGRICULTURE_CATEGORIES = AGRICULTURE_CATEGORIES.filter(
  (category) => category.selectable,
);

export const AGRICULTURE_CATEGORY_ENGLISH_LABELS = Object.fromEntries(
  AGRICULTURE_CATEGORIES.map((category) => [category.slug, category.name]),
) as Record<AgricultureCategorySlug, string>;

export function agricultureCategoryBySlug(
  slug: string,
): AgricultureCategory | undefined {
  return (AGRICULTURE_CATEGORIES as readonly AgricultureCategory[]).find(
    (category) => category.slug === slug,
  );
}

export function agricultureCategoriesForContext(
  context: AgricultureSelectionContext,
) {
  return SELECTABLE_AGRICULTURE_CATEGORIES.filter((category) =>
    (category.contexts as readonly AgricultureSelectionContext[]).includes(
      context,
    ),
  );
}

function categorySearchKey(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

export function agricultureCategoryByLabel(value: string) {
  const key = categorySearchKey(value);
  if (!key) return undefined;
  return SELECTABLE_AGRICULTURE_CATEGORIES.find(
    (category) =>
      categorySearchKey(category.name) === key ||
      category.aliases.some((alias) => categorySearchKey(alias) === key),
  );
}

export function agricultureSelectionFromLabels(
  labels: readonly string[],
  context: AgricultureSelectionContext = "profile",
) {
  const selectedSlugs: string[] = [];
  const customLabels: string[] = [];
  for (const label of labels) {
    const category = agricultureCategoryByLabel(label);
    if (
      category &&
      (category.contexts as readonly AgricultureSelectionContext[]).includes(
        context,
      )
    ) {
      if (!selectedSlugs.includes(category.slug)) {
        selectedSlugs.push(category.slug);
      }
    } else if (!customLabels.some((item) => categorySearchKey(item) === categorySearchKey(label))) {
      customLabels.push(label);
    }
  }
  return { selectedSlugs, customLabels };
}

export function agricultureCategoryMatches(
  category: AgricultureCategory,
  query: string,
  localizedLabel = category.name,
) {
  const key = categorySearchKey(query);
  if (!key) return true;
  return [localizedLabel, category.name, ...category.aliases].some((value) =>
    categorySearchKey(value).includes(key),
  );
}
