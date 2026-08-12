import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
  offers: englishMessages.offers,
  profilePreview: englishMessages.profilePreview,
  incSourcing: englishMessages.incSourcing,
  navigation: englishMessages.navigation,
  home: englishMessages.home,
  publicProfile: englishMessages.publicProfile,
  settings: englishMessages.settings,
  feed: englishMessages.feed,
  outreach: englishMessages.outreach,
  agricultureCategories: englishMessages.agricultureCategories,
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ఫార్మర్‌బుక్", continue: "కొనసాగించండి", back: "వెనుకకు", save: "భద్రపరచండి", saving: "భద్రపరుస్తోంది…", cancel: "రద్దు చేయండి", skip: "ప్రస్తుతానికి వదిలేయండి", finish: "పూర్తి చేయండి", language: "భాష", selectLanguage: "భాషను ఎంచుకోండి", beta: "బీటా", optional: "ఐచ్ఛికం", other: "ఇతర" },
  auth: { ...englishMessages.auth,  signIn: "సైన్ ఇన్ చేయండి", signUp: "ఖాతా సృష్టించండి", email: "ఇమెయిల్ చిరునామా", password: "పాస్‌వర్డ్", google: "Googleతో కొనసాగించండి", facebook: "Facebookతో కొనసాగించండి", forgotPassword: "పాస్‌వర్డ్ మర్చిపోయారా?", checkEmail: "ఖాతాను ధృవీకరించడానికి మీ ఇమెయిల్ చూడండి." },
  onboarding: { ...englishMessages.onboarding, title: "మీ ప్రొఫైల్‌ను పూర్తి చేయండి", intro: "ఫార్మర్‌బుక్ మీకు ఎలా సహాయపడగలదో చెప్పండి.", progress: "దశ {current} / {total}", roleQuestion: "మీరు ఫార్మర్‌బుక్‌ను ఎలా ఉపయోగిస్తారు?", farmer: "రైతు", customer: "వినియోగదారు", wholesaler: "టోకు వ్యాపారి", company: "వ్యవసాయ సంస్థ", identity: "మీ గుర్తింపు", location: "ప్రాంతం మరియు సేవా పరిధి", categories: "వ్యవసాయ వర్గాలు", review: "సమీక్షించి పూర్తి చేయండి", customCategory: "మీ స్వంత వర్గాన్ని రాయండి", resume: "మీరు భద్రపరచిన పురోగతి కొనసాగించడానికి సిద్ధంగా ఉంది.", autosaved: "పురోగతి భద్రపడింది" },
  profile: { ...englishMessages.profile, title: "ప్రొఫైల్ మరియు భాష", fullName: "పూర్తి పేరు", handle: "బహిరంగ హ్యాండిల్", district: "జిల్లా", state: "రాష్ట్రం", bio: "చిన్న పరిచయం", experience: "అనుభవ సంవత్సరాలు", farmingMethod: "వ్యవసాయ పద్ధతి" },
  market: { ...englishMessages.market,  title: "మార్కెట్", produce: "వ్యవసాయ ఉత్పత్తి", equipment: "యంత్రాలు మరియు పనిముట్లు", inputs: "వ్యవసాయ సామగ్రి", services: "సేవలు", offers: "ఆఫర్లు", search: "మార్కెట్‌లో వెతకండి", noResults: "సరిపోలే జాబితాలు ఏవీ లభించలేదు.", seller: "విక్రేత", price: "ధర" },
  companies: { ...englishMessages.companies, title: "వ్యవసాయ సంస్థలు", organizationName: "సంస్థ పేరు", companyType: "సంస్థ రకం", serviceArea: "సేవా పరిధి", productsServices: "ఉత్పత్తులు మరియు సేవలు", tractor: "ట్రాక్టర్లు మరియు వ్యవసాయ యంత్రాలు", tools: "పనిముట్లు మరియు పరికరాలు", irrigation: "నీటిపారుదల మరియు నీటి వ్యవస్థలు", livestock: "పశుసంపద మరియు కోళ్ల పెంపకం సహాయం", aquaculture: "జలవ్యవసాయం మరియు సముద్ర ఆహార సహాయం" },
  errors: { ...englishMessages.errors, generic: "ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి.", invalidLocale: "మద్దతు ఉన్న భాషను ఎంచుకోండి.", required: "ఈ సమాచారం అవసరం.", invalidEmail: "చెల్లుబాటు అయ్యే ఇమెయిల్ చిరునామా నమోదు చేయండి.", invalidHandle: "చిన్న ఆంగ్ల అక్షరాలు, సంఖ్యలు మరియు అండర్‌స్కోర్ మాత్రమే ఉపయోగించండి.", network: "మీ కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.", profileSave: "భాష ఇక్కడ మారింది, కానీ ప్రొఫైల్‌లో భద్రపరచలేకపోయాం.", unauthorized: "ఈ ఎంపికను ప్రొఫైల్‌లో భద్రపరచడానికి సైన్ ఇన్ చేయండి.", categoryRequired: "కనీసం ఒక వర్గాన్ని ఎంచుకోండి." },
  legal: { ...englishMessages.legal, terms: "నిబంధనలు", privacy: "గోప్యతా ప్రకటన", communityRules: "సమాజ నియమాలు", consent: "నిబంధనలు, గోప్యతా ప్రకటన మరియు సమాజ నియమాలను అంగీకరిస్తున్నాను." },
} satisfies Messages;

export default messages;
