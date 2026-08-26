import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
  ecoSuppliers: englishMessages.ecoSuppliers,
  offers: englishMessages.offers,
  profilePreview: englishMessages.profilePreview,
  incSourcing: englishMessages.incSourcing,
  farmVisits: englishMessages.farmVisits,
  navigation: englishMessages.navigation,
  home: englishMessages.home,
  publicProfile: englishMessages.publicProfile,
  settings: englishMessages.settings,
  feed: englishMessages.feed,
  outreach: englishMessages.outreach,
  agricultureCategories: englishMessages.agricultureCategories,
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ಫಾರ್ಮರ್‌ಬುಕ್", continue: "ಮುಂದುವರಿಸಿ", back: "ಹಿಂದೆ", save: "ಉಳಿಸಿ", saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…", cancel: "ರದ್ದುಮಾಡಿ", skip: "ಈಗ ಬಿಟ್ಟುಬಿಡಿ", finish: "ಪೂರ್ಣಗೊಳಿಸಿ", language: "ಭಾಷೆ", selectLanguage: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ", beta: "ಬೀಟಾ", optional: "ಐಚ್ಛಿಕ", other: "ಇತರೆ" },
  auth: { ...englishMessages.auth,  signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ", signUp: "ಖಾತೆ ರಚಿಸಿ", email: "ಇಮೇಲ್ ವಿಳಾಸ", password: "ಪಾಸ್‌ವರ್ಡ್", google: "Google ಮೂಲಕ ಮುಂದುವರಿಸಿ", facebook: "Facebook ಮೂಲಕ ಮುಂದುವರಿಸಿ", forgotPassword: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?", checkEmail: "ಖಾತೆ ಪರಿಶೀಲಿಸಲು ನಿಮ್ಮ ಇಮೇಲ್ ನೋಡಿ." },
  onboarding: { ...englishMessages.onboarding, title: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ", intro: "ಫಾರ್ಮರ್‌ಬುಕ್ ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು ಎಂದು ತಿಳಿಸಿ.", progress: "ಹಂತ {current} / {total}", roleQuestion: "ನೀವು ಫಾರ್ಮರ್‌ಬುಕ್ ಅನ್ನು ಹೇಗೆ ಬಳಸುತ್ತೀರಿ?", farmer: "ರೈತ", customer: "ಗ್ರಾಹಕ", wholesaler: "ಸಗಟು ವ್ಯಾಪಾರಿ", company: "ಕೃಷಿ ಕಂಪನಿ", identity: "ನಿಮ್ಮ ಗುರುತು", location: "ಸ್ಥಳ ಮತ್ತು ಸೇವಾ ಪ್ರದೇಶ", categories: "ಕೃಷಿ ವರ್ಗಗಳು", review: "ಪರಿಶೀಲಿಸಿ ಪೂರ್ಣಗೊಳಿಸಿ", customCategory: "ನಿಮ್ಮದೇ ವರ್ಗವನ್ನು ಬರೆಯಿರಿ", resume: "ನಿಮ್ಮ ಉಳಿಸಿದ ಪ್ರಗತಿ ಮುಂದುವರಿಸಲು ಸಿದ್ಧವಾಗಿದೆ.", autosaved: "ಪ್ರಗತಿ ಉಳಿಸಲಾಗಿದೆ" },
  profile: { ...englishMessages.profile, title: "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಭಾಷೆ", fullName: "ಪೂರ್ಣ ಹೆಸರು", handle: "ಸಾರ್ವಜನಿಕ ಹ್ಯಾಂಡಲ್", district: "ಜಿಲ್ಲೆ", state: "ರಾಜ್ಯ", bio: "ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯ", experience: "ಅನುಭವದ ವರ್ಷಗಳು", farmingMethod: "ಕೃಷಿ ವಿಧಾನ" },
  market: { ...englishMessages.market,  title: "ಮಾರುಕಟ್ಟೆ", produce: "ಕೃಷಿ ಉತ್ಪನ್ನ", equipment: "ಉಪಕರಣಗಳು ಮತ್ತು ಸಾಧನಗಳು", inputs: "ಕೃಷಿ ಪರಿಕರಗಳು", services: "ಸೇವೆಗಳು", offers: "ಕೊಡುಗೆಗಳು", search: "ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಹುಡುಕಿ", noResults: "ಹೊಂದುವ ಯಾವುದೇ ಪಟ್ಟಿ ಕಂಡುಬಂದಿಲ್ಲ.", seller: "ಮಾರಾಟಗಾರ", price: "ಬೆಲೆ" },
  companies: { ...englishMessages.companies, title: "ಕೃಷಿ ಕಂಪನಿಗಳು", organizationName: "ಸಂಸ್ಥೆಯ ಹೆಸರು", companyType: "ಕಂಪನಿಯ ಪ್ರಕಾರ", serviceArea: "ಸೇವಾ ಪ್ರದೇಶ", productsServices: "ಉತ್ಪನ್ನಗಳು ಮತ್ತು ಸೇವೆಗಳು", tractor: "ಟ್ರ್ಯಾಕ್ಟರ್ ಮತ್ತು ಕೃಷಿ ಯಂತ್ರೋಪಕರಣ", tools: "ಸಾಧನಗಳು ಮತ್ತು ಕೃಷಿ ಉಪಕರಣ", irrigation: "ನೀರಾವರಿ ಮತ್ತು ಜಲ ವ್ಯವಸ್ಥೆಗಳು", livestock: "ಪಶುಸಂಗೋಪನೆ ಮತ್ತು ಕೋಳಿ ಬೆಂಬಲ", aquaculture: "ಜಲಕೃಷಿ ಮತ್ತು ಸಮುದ್ರ ಆಹಾರ ಬೆಂಬಲ" },
  errors: { ...englishMessages.errors, generic: "ಏನೋ ತಪ್ಪಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", invalidLocale: "ಬೆಂಬಲಿತ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.", required: "ಈ ಮಾಹಿತಿ ಅಗತ್ಯವಿದೆ.", invalidEmail: "ಮಾನ್ಯ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.", invalidHandle: "ಸಣ್ಣ ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳು, ಸಂಖ್ಯೆಗಳು ಮತ್ತು ಅಂಡರ್‌ಸ್ಕೋರ್ ಮಾತ್ರ ಬಳಸಿ.", network: "ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", profileSave: "ಭಾಷೆ ಇಲ್ಲಿ ಬದಲಾಗಿದೆ, ಆದರೆ ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಲಿಲ್ಲ.", unauthorized: "ಈ ಆಯ್ಕೆಯನ್ನು ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಉಳಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.", categoryRequired: "ಕನಿಷ್ಠ ಒಂದು ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ." },
  legal: { ...englishMessages.legal, terms: "ನಿಯಮಗಳು", privacy: "ಗೌಪ್ಯತಾ ಸೂಚನೆ", communityRules: "ಸಮುದಾಯ ನಿಯಮಗಳು", consent: "ನಾನು ನಿಯಮಗಳು, ಗೌಪ್ಯತಾ ಸೂಚನೆ ಮತ್ತು ಸಮುದಾಯ ನಿಯಮಗಳಿಗೆ ಒಪ್ಪುತ್ತೇನೆ." },
} satisfies Messages;

export default messages;
