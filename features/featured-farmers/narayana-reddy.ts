import type { FeaturedFarmerPublication } from "./queries";

const unsungSource = {
  id: "41000000-0000-4000-8000-000000000001",
  url: "https://www.unsung.in/unsung-volume2/narayana-reddy/",
  publisher: "Unsung",
  title: "Narayana Reddy",
  publishedAt: null,
  sourceType: "independent profile",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const indiaTodaySource = {
  id: "41000000-0000-4000-8000-000000000002",
  url: "https://www.indiatoday.in/magazine/indiascope/story/19920615-narayana-reddy-is-no-small-ordinary-farmer-766438-2013-01-06",
  publisher: "India Today",
  title: "Narayana Reddy is no small ordinary farmer",
  publishedAt: "1992-06-15",
  sourceType: "independent reporting",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const downToEarthSource = {
  id: "41000000-0000-4000-8000-000000000003",
  url: "https://www.downtoearth.org.in/environment/complementarity-begets-productivity-31792",
  publisher: "Down To Earth",
  title: "Complementarity begets productivity",
  publishedAt: "1993-12-15",
  sourceType: "independent reporting",
  quality: "independent_reporting",
  association: "professional_reference",
};

const leisaObituarySource = {
  id: "41000000-0000-4000-8000-000000000004",
  url: "https://www.leisaindia.org/obituary-shri-l-narayana-reddy/",
  publisher: "LEISA India",
  title: "Obituary — Shri L. Narayana Reddy",
  publishedAt: null,
  sourceType: "professional reference",
  quality: "institutional_reference",
  association: "professional_reference",
};

const leisaColumnSource = {
  id: "41000000-0000-4000-8000-000000000005",
  url: "https://www.leisaindia.org/the-narayana-reddy-column-biodiverse-farms-are-sustainable-farms/",
  publisher: "LEISA India",
  title: "The Narayana Reddy Column: Biodiverse farms are sustainable farms",
  publishedAt: null,
  sourceType: "first-person column",
  quality: "first_party",
  association: "professional_reference",
};

const newsMinuteSource = {
  id: "41000000-0000-4000-8000-000000000006",
  url: "https://www.thenewsminute.com/karnataka/narayana-reddy-b-luru-farmer-who-earned-global-praise-organic-farming-passes-away-94996",
  publisher: "The News Minute",
  title:
    "Narayana Reddy, Bengaluru farmer who earned global praise for organic farming, passes away",
  publishedAt: "2019-01-14",
  sourceType: "independent reporting",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const fnbSource = {
  id: "41000000-0000-4000-8000-000000000007",
  url: "https://www.fnbnews.com/Top-News/l-narayana-reddy-karnatakas-pioneer-in-organic-farming-passes-away-45586",
  publisher: "Food & Beverage News",
  title: "L. Narayana Reddy, Karnataka's pioneer in organic farming, passes away",
  publishedAt: "2019-01-16",
  sourceType: "independent reporting",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const bangaloreMirrorSource = {
  id: "41000000-0000-4000-8000-000000000008",
  url: "https://bangaloremirror.indiatimes.com/opinion/views/a-farmer-called-narayana-reddy/articleshow/59223419.cms",
  publisher: "Bangalore Mirror",
  title: "A farmer called Narayana Reddy",
  publishedAt: "2017-06-20",
  sourceType: "first-person reported profile",
  quality: "independent_reporting",
  association: "third_party_coverage",
};

const pibFilmAwardSource = {
  id: "41000000-0000-4000-8000-000000000009",
  url: "https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=192564",
  publisher: "Press Information Bureau, Government of India",
  title: "66th National Film Awards for 2018 announced",
  publishedAt: "2019-08-09",
  sourceType: "official award record",
  quality: "official_record",
  association: "professional_reference",
};

export const narayanaReddyPublication = {
  publication_id: "40000000-0000-4000-8000-000000000001",
  slug: "narayana-reddy",
  publication_revision: 1,
  fact_checked_at: "2026-08-12T23:15:00.000Z",
  published_at: "2026-08-12T15:00:00.000Z",
  snapshot: {
    fullName: "L. Narayana Reddy",
    district: "Bengaluru Rural",
    state: "Karnataka",
    locale: "en-IN",
    headline: "Karnataka's organic farming pioneer who made the soil his classroom",
    deck:
      "The life, milestones and farming ideas of L. Narayana Reddy—from award-winning chemical agriculture to biodiverse organic farms, open teaching and a National Award-winning documentary.",
    whyFeatured:
      "L. Narayana Reddy did more than replace chemicals with organic inputs. He rebuilt the economics and ecology of his farm around diversity, farm-made resources and close observation, then spent decades opening that knowledge to farmers, students, scientists and readers. His life connects a practical question—how can a farm depend less on purchased inputs?—with an equally important one: who gets to learn from the answer?",
    categorySlugs: [
      "organic-farming",
      "farm-biodiversity",
      "farmer-education",
    ],
    limitations: [
      "This is a historical editorial profile based on public archives. L. Narayana Reddy died on 14 January 2019.",
      "FarmerBook found no verified social account owned by him. The linked videos are clearly labelled third-party archival coverage.",
      "The hero displays a source-hosted preview from the official Sarala Virala documentary by Naguvana Creations, linked to YouTube with visible credit. FarmerBook has not copied the image or claimed ownership; a separately licensed original photograph can replace it later.",
      "Published accounts vary on the precise year and person associated with Reddy's first introduction to organic farming. This article identifies that uncertainty and relies on points corroborated across sources.",
      "Figures describe the farm or recognition at the dates recorded by the cited sources; they are not current operating claims.",
    ],
    editorialDisclosure:
      "FarmerBook historical editorial profile; not a member, identity-verification or endorsement claim.",
    media: null,
    sourceHostedPreview: {
      assetUrl:
        "https://i.ytimg.com/vi/tNY9jjvvtr0/maxresdefault.jpg",
      sourceUrl: "https://www.youtube.com/watch?v=tNY9jjvvtr0",
      altText:
        "L. Narayana Reddy in the official Sarala Virala documentary preview",
      credit:
        "Sarala Virala documentary preview © Naguvana Creations, via YouTube",
      creditUrl: "https://www.youtube.com/@naguvanacreations8628",
      provider: "youtube_oembed",
    },
    socialLinks: [],
    sources: [
      unsungSource,
      indiaTodaySource,
      downToEarthSource,
      leisaObituarySource,
      leisaColumnSource,
      newsMinuteSource,
      fnbSource,
      bangaloreMirrorSource,
      pibFilmAwardSource,
    ],
    claims: [
      {
        id: "42000000-0000-4000-8000-000000000008",
        key: "self-made-beginning",
        type: "significance",
        statement:
          "In a 2017 talk reported by Bangalore Mirror, Reddy described leaving home as a boy, working first as a restaurant cleaner, completing his schooling and progressing from office attendant to manager before his savings enabled him to buy farmland.",
        displayLabel: "Early turning point",
        displayValue: "12 years",
        displayContext: "Saving before buying farmland",
        sources: [bangaloreMirrorSource, unsungSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000005",
        key: "yield-economics",
        type: "significance",
        statement:
          "Reddy recalled receiving a national best-farmer award in 1976 after greatly increasing yields, yet said purchased chemical inputs left the farm losing money overall.",
        displayLabel: "Early recognition",
        displayValue: "1976",
        displayContext: "Best-farmer award recalled in 2017",
        sources: [bangaloreMirrorSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000001",
        key: "organic-transition",
        type: "significance",
        statement:
          "Independent reporting records that Reddy completed his transition to organic farming by 1979 after questioning the costs and consequences of input-heavy cultivation.",
        displayLabel: "Organic transition",
        displayValue: "1979",
        displayContext: "Recorded by Down To Earth",
        sources: [downToEarthSource, indiaTodaySource, unsungSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000002",
        key: "biodiverse-farm",
        type: "ecological_stewardship",
        statement:
          "In his LEISA column, Reddy described a farm with 30 crops and 20 varieties of trees, supported by farm-made compost, vermicompost and home-grown planting material.",
        displayLabel: "Crops on the farm",
        displayValue: "30",
        displayContext: "Reddy's LEISA account",
        sources: [leisaColumnSource, downToEarthSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000003",
        key: "public-teacher",
        type: "knowledge_sharing",
        statement:
          "LEISA records that Reddy wrote for the publication for more than a decade, while family accounts say he was still teaching at his farm during the weekend before his death.",
        displayLabel: "LEISA columnist",
        displayValue: "10+ years",
        displayContext: "Practical ecological-farming writing",
        sources: [leisaObituarySource, newsMinuteSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000004",
        key: "recognition",
        type: "award",
        statement:
          "Contemporary obituaries record that Kannada University, Hampi honoured Reddy with its Nadoja award and an honorary doctorate for his agricultural contribution.",
        displayLabel: "University recognition",
        displayValue: "Nadoja",
        displayContext: "Kannada University, Hampi",
        sources: [newsMinuteSource, fnbSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000006",
        key: "fukuoka-visit",
        type: "knowledge_sharing",
        statement:
          "Reddy told students in 2017 that Masanobu Fukuoka, whose writing had influenced his farming, visited his Varthur farm in 1988.",
        displayLabel: "Fukuoka farm visit",
        displayValue: "1988",
        displayContext: "Recorded by Bangalore Mirror",
        sources: [bangaloreMirrorSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000007",
        key: "documentary-legacy",
        type: "award",
        statement:
          "The Government of India's 66th National Film Awards named Sarala Virala, a film about Reddy's organic living and teaching, Best Educational Film for 2018.",
        displayLabel: "Sarala Virala",
        displayValue: "National Award",
        displayContext: "Best Educational Film for 2018",
        sources: [pibFilmAwardSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000009",
        key: "bus-journey",
        type: "knowledge_sharing",
        statement:
          "Bangalore Mirror reported that the 82-year-old Reddy chose a multi-bus journey to teach students in 2017, prepared by reading their selected passages and stayed to answer questions before travelling onward to another farmers' meeting.",
        displayLabel: "Teaching journey",
        displayValue: "Age 82",
        displayContext: "Bus to a student lecture in 2017",
        sources: [bangaloreMirrorSource],
      },
      {
        id: "42000000-0000-4000-8000-000000000010",
        key: "international-teaching",
        type: "knowledge_sharing",
        statement:
          "India Today reported in 1992 that visitors who had seen Reddy's farm invited him to an organic-agriculture seminar in Brussels; later reporting also records his international teaching and travel.",
        displayLabel: "International exchange",
        displayValue: "Brussels",
        displayContext: "Organic-agriculture seminar invitation",
        sources: [indiaTodaySource, newsMinuteSource],
      },
    ],
    sections: [
      {
        kind: "origin",
        heading: "The 82-year-old farmer who chose a three-hour bus ride",
        body:
          "In 2017, an Azim Premji University professor invited L. Narayana Reddy to speak with students about Masanobu Fukuoka's One-Straw Revolution. The journey from Reddy's Maralenahalli farm would take hours. When the professor offered a cab, Reddy chose the bus: one to Bengaluru's Majestic bus station and another toward the campus. Then he asked which passages the class was studying so he could read them before arriving.\n\nThat small exchange captures the man behind the reputation. At 82, Reddy was still a student before he was a speaker; public transport was not an inconvenience to be escaped; and teaching began with preparation rather than celebrity. After the lecture, he stayed for every student question—even though his next stop was a night train to another farmers' meeting. His farm philosophy and his way of moving through the world came from the same idea: use what is sufficient, waste little, and keep knowledge in circulation.",
        claimKeys: ["bus-journey"],
      },
      {
        kind: "origin",
        heading: "From restaurant cleaner to self-made farmer",
        body:
          "Reddy was born in 1935 into a large farming family near Varthur. Public profiles recount that he left home as a boy after a quarrel with his father and found work cleaning in a Bengaluru restaurant. He did not remain defined by that first job. He completed his schooling, learned typewriting, worked as an office attendant and eventually became a manager. Bangalore Mirror records that he lived frugally for twelve years until his savings were enough to buy farmland in Sorahunase, his native village.\n\nUnsung preserves a revealing detail from the restaurant: noticing that drinking glasses were merely rinsed, the young worker scrubbed them properly and was moved into the kitchen within hours. It is an anecdote, not an agricultural milestone, but it anticipates the discipline visible throughout his farming life. He watched closely, questioned routine and treated humble work as a place to learn. Long before he became a public advocate for organic farming in Karnataka, Reddy had learned to build independence one practical skill at a time.",
        claimKeys: ["self-made-beginning"],
      },
      {
        kind: "work",
        heading: "The award that exposed the weakness in his farm",
        body:
          "Reddy's first farming success followed the dominant advice of the period. He grew ragi and maize with purchased fertilisers and pesticides and recalled quadrupling his yield. In a 2017 talk, he said this performance brought him a best-farmer award in 1976. The achievement carried an uncomfortable lesson: a larger harvest was not the same as a healthier farm business. The cost of seed, fertiliser and pesticide absorbed too much of the return.\n\nThat contradiction changed the question he was asking. Instead of pursuing yield alone, Reddy began examining what remained after the crop was sold, what the soil lost during production and how much decision-making had moved outside the farm gate. His later organic practice can be read as an economic argument as much as an ecological one. A farm was stronger when it could retain seed, transform its own biomass, draw fertility from livestock and soil life, and reduce the number of essential things it had to buy every season.",
        claimKeys: ["yield-economics", "organic-transition"],
      },
      {
        kind: "impact",
        heading: "Four patient years while the soil recovered",
        body:
          "Accounts differ in some details of Reddy's introduction to organic farming: profiles name different visitors and place the beginning at slightly different points in the 1970s. They agree on the larger arc. A conversation with an American organic farmer and repeated reading of Masanobu Fukuoka changed how he understood cultivation. Reddy stopped treating fertiliser and pesticide purchases as the foundation of productivity and began testing whether biological activity could rebuild the farm from within.\n\nThe change was difficult enough that his decision was mocked. Early yields fell. His wife, Saroja, stood with him while he persisted. Unsung records Reddy's estimate that the land needed four years for microorganisms and fertility to recover; contemporary reporting places the farm's completed transition away from synthetic inputs by 1979. That interval matters. Reddy's story is sometimes compressed into a dramatic conversion, but his actual lesson was slower: ecological repair requires seasons of observation, labour and tolerance for uncertainty.",
        claimKeys: ["organic-transition"],
      },
      {
        kind: "work",
        heading: "A farm where weeds, termites and diversity had jobs",
        body:
          "Reddy did not define organic agriculture as a shopping list of substitute products. His practice connected crops, trees, livestock, mulch, compost, water and labour. Down To Earth documented simultaneous cropping, manure, plant-based pest controls and orchard floors protected by grasses. In his own LEISA writing, Reddy described 30 crops and 20 kinds of trees, supported by compost, vermicompost and planting material produced on the farm.\n\nHe also challenged the habit of calling every non-crop organism an enemy. Weeds could shade soil and conserve moisture when managed rather than erased. Termites breaking down dead plant matter could become part of nutrient cycling in the field. Livestock converted material that might otherwise be discarded into manure and secondary farm value. Diversity was therefore not ornamental: it distributed risk, kept nutrients moving and allowed one part of the farm to support another. His most durable innovation was to design relationships instead of maximizing a single crop in isolation.",
        claimKeys: ["biodiverse-farm"],
      },
      {
        kind: "community",
        heading: "When Masanobu Fukuoka arrived at the farm",
        body:
          "Fukuoka's writing had given Reddy a language for many of the questions he was already testing in the field. In 1988, during the Japanese farmer-philosopher's visit to India, a local organisation brought Fukuoka to Reddy's Varthur farm. Reddy later described the unexpected meeting as the happiest day of his life. The importance of the visit was not celebrity. It joined a book, a working Indian farm and a global conversation about agriculture without dependence on constant intervention.\n\nReddy's own circle soon widened. India Today reported in 1992 that European visitors to his farm invited him to an organic-agriculture seminar in Brussels. He went on to speak at farmer meetings and policy discussions in India and abroad. Yet the farm remained his strongest evidence. Visitors did not encounter a theory presented on slides; they could examine intercropping, soil cover, compost, livestock and farm-made pest controls operating together in a real place.",
        claimKeys: ["fukuoka-visit", "international-teaching"],
      },
      {
        kind: "lessons",
        heading: "The harvest that continued after his final season",
        body:
          "Reddy turned the farm into a public classroom. LEISA remembers a steady stream of visitors—from new farmers to scientists—and a teacher able to communicate across languages. He wrote practical columns for more than a decade, including advice drawn from his own fields. His son later recalled that Reddy sometimes continued classes even during family celebrations. The News Minute reported that he was teaching at Marenahalli on the weekend immediately before his death on 14 January 2019.\n\nHis recognition included the Nadoja honour from Kannada University, Hampi. A different kind of memorial followed through cinema: Sarala Virala, a Kannada documentary centred on Reddy's organic living and teaching, was named Best Educational Film at India's 66th National Film Awards. The award citation emphasized the value of his simplicity, philosophy and knowledge for younger people. Reddy's deepest legacy, however, is a set of useful questions: What can the farm make for itself? What does diversity protect? What work is the soil already doing? And who else can learn from what happens here?",
        claimKeys: [
          "public-teacher",
          "recognition",
          "documentary-legacy",
        ],
      },
    ],
    milestones: [
      {
        year: "1935",
        title: "Born near Varthur, Karnataka",
        description:
          "Born into a large agrarian family, Reddy later left home, educated himself while working and saved toward farmland.",
        sourceUrls: [unsungSource.url, bangaloreMirrorSource.url],
      },
      {
        year: "1976",
        title: "Award-winning yields reveal a deeper problem",
        description:
          "Reddy recalled a best-farmer award after greatly increasing yields, while high purchased-input costs left the farm financially weak.",
        sourceUrls: [bangaloreMirrorSource.url],
      },
      {
        year: "1979",
        title: "Organic transition completed",
        description:
          "Independent reporting records the farm's move away from synthetic fertilisers and pesticides by 1979.",
        sourceUrls: [downToEarthSource.url, indiaTodaySource.url],
      },
      {
        year: "1988",
        title: "Masanobu Fukuoka visits the Varthur farm",
        description:
          "The writer and natural-farming pioneer whose ideas influenced Reddy visited his working farm during an India trip.",
        sourceUrls: [bangaloreMirrorSource.url],
      },
      {
        year: "1992",
        title: "Invited to speak in Brussels",
        description:
          "European visitors who had seen the farm invited Reddy to an organic-agriculture seminar in Belgium.",
        sourceUrls: [indiaTodaySource.url, newsMinuteSource.url],
      },
      {
        year: "2000s–2010s",
        title: "The farm becomes a continuing classroom",
        description:
          "Reddy hosted farmers, students and scientists, travelled for public discussions and wrote practical ecological-farming columns for more than a decade.",
        sourceUrls: [leisaObituarySource.url, newsMinuteSource.url],
      },
      {
        year: "2018–2019",
        title: "His life is preserved in an award-winning film",
        description:
          "Sarala Virala, a documentary about Reddy, received the National Film Award for Best Educational Film for 2018; the award was announced in 2019.",
        sourceUrls: [pibFilmAwardSource.url],
      },
      {
        year: "14 Jan 2019",
        title: "A teacher to the final weekend",
        description:
          "Reddy died at his Marenahalli farm after continuing to hold organic-farming classes during the preceding weekend.",
        sourceUrls: [newsMinuteSource.url, leisaObituarySource.url],
      },
    ],
    questions: [
      {
        question: "Who was L. Narayana Reddy?",
        answer:
          "L. Narayana Reddy (1935–2019) was a Karnataka farmer, writer and teacher known for moving from chemical-intensive cultivation to diversified organic farming and for openly sharing what he learned.",
        sourceUrls: [leisaObituarySource.url, bangaloreMirrorSource.url],
      },
      {
        question: "Why did Narayana Reddy switch to organic farming?",
        answer:
          "Although chemical farming increased his yields, Reddy said purchased fertilisers, pesticides and seed consumed too much of the return. That economic pressure, together with ideas associated with Masanobu Fukuoka, led him to rebuild the farm around soil life and farm-made resources.",
        sourceUrls: [bangaloreMirrorSource.url, indiaTodaySource.url],
      },
      {
        question: "What did Narayana Reddy grow on his organic farm?",
        answer:
          "In a LEISA column, Reddy described 30 crops and 20 kinds of trees. Other reporting documented grains, orchard crops, livestock, composting, intercropping and plant-based pest management working as one farm system.",
        sourceUrls: [leisaColumnSource.url, downToEarthSource.url],
      },
      {
        question: "Did Masanobu Fukuoka visit Narayana Reddy's farm?",
        answer:
          "Yes. Reddy told students that Fukuoka visited his Varthur farm in 1988 during a trip to India, a meeting he remembered as a defining personal moment.",
        sourceUrls: [bangaloreMirrorSource.url],
      },
      {
        question: "Where was Narayana Reddy's farm?",
        answer:
          "His early farm was at Sorahunase near Varthur, Bengaluru. He later farmed and taught at Marenahalli in Doddaballapura taluk, Bengaluru Rural district.",
        sourceUrls: [bangaloreMirrorSource.url, newsMinuteSource.url],
      },
      {
        question: "What is Sarala Virala?",
        answer:
          "Sarala Virala is a Kannada documentary about Reddy's organic farming, teaching and simple way of life. It won India's National Film Award for Best Educational Film for 2018.",
        sourceUrls: [pibFilmAwardSource.url],
      },
    ],
    seo: {
      title:
        "L. Narayana Reddy: Karnataka Organic Farming Pioneer | FarmerBook",
      description:
        "Read the sourced life story of L. Narayana Reddy—Karnataka organic farming pioneer, teacher, Fukuoka practitioner and subject of Sarala Virala.",
      keywords: [
        "L Narayana Reddy",
        "Narayana Reddy organic farmer",
        "Karnataka organic farming pioneer",
        "Varthur Narayana Reddy",
        "Masanobu Fukuoka India",
        "Sarala Virala documentary",
        "organic farming Karnataka",
        "natural farming India",
      ],
    },
    coverage: [
      {
        url: "https://www.youtube.com/watch?v=tNY9jjvvtr0",
        publisher: "Naguvana Creations",
        title:
          "Sarala Virala — Life of L. Narayana Reddy (full documentary)",
        sourceType: "award-winning documentary — third party",
      },
      {
        url: "https://www.youtube.com/watch?v=Y2ALVEgJWNA",
        publisher: "Native Circle",
        title: "Varthur Narayana Reddy on organic farming",
        sourceType: "archival YouTube interview — third party",
      },
      {
        url: "https://www.youtube.com/watch?v=z1Kmng5DCLc",
        publisher: "Native Circle",
        title: "Scientific composting technique with Varthur Narayana Reddy",
        sourceType: "archival YouTube demonstration — third party",
      },
      {
        url: unsungSource.url,
        publisher: unsungSource.publisher,
        title: "Narayana Reddy — an Unsung photo essay",
        sourceType: "long-form profile",
      },
    ],
  },
} satisfies FeaturedFarmerPublication;
