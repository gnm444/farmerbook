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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ஃபார்மர்புக்", continue: "தொடர்க", back: "பின்செல்க", save: "சேமிக்கவும்", saving: "சேமிக்கப்படுகிறது…", cancel: "ரத்துசெய்க", skip: "இப்போது தவிர்க்கவும்", finish: "முடிக்கவும்", language: "மொழி", selectLanguage: "மொழியைத் தேர்ந்தெடுக்கவும்", beta: "சோதனை", optional: "விருப்பத்திற்குரியது", other: "மற்றவை" },
  auth: { ...englishMessages.auth,  signIn: "உள்நுழைக", signUp: "கணக்கை உருவாக்குக", email: "மின்னஞ்சல் முகவரி", password: "கடவுச்சொல்", google: "Google மூலம் தொடர்க", facebook: "Facebook மூலம் தொடர்க", forgotPassword: "கடவுச்சொல் மறந்துவிட்டதா?", checkEmail: "கணக்கைச் சரிபார்க்க மின்னஞ்சலைப் பார்க்கவும்." },
  onboarding: { ...englishMessages.onboarding, title: "உங்கள் சுயவிவரத்தை நிறைவுசெய்க", intro: "ஃபார்மர்புக் உங்களுக்கு எவ்வாறு உதவலாம் என்று கூறுங்கள்.", progress: "படி {current} / {total}", roleQuestion: "ஃபார்மர்புக்கை எவ்வாறு பயன்படுத்துவீர்கள்?", farmer: "விவசாயி", customer: "வாடிக்கையாளர்", wholesaler: "மொத்த விற்பனையாளர்", company: "வேளாண் நிறுவனம்", identity: "உங்கள் அடையாளம்", location: "இடம் மற்றும் சேவைப் பகுதி", categories: "விவசாயப் பிரிவுகள்", review: "சரிபார்த்து முடிக்கவும்", customCategory: "உங்கள் சொந்தப் பிரிவை எழுதவும்", resume: "சேமிக்கப்பட்ட முன்னேற்றத்தைத் தொடரத் தயாராக உள்ளது.", autosaved: "முன்னேற்றம் சேமிக்கப்பட்டது" },
  profile: { ...englishMessages.profile, title: "சுயவிவரம் மற்றும் மொழி", fullName: "முழுப் பெயர்", handle: "பொது அடையாளப் பெயர்", district: "மாவட்டம்", state: "மாநிலம்", bio: "சுருக்கமான அறிமுகம்", experience: "அனுபவ ஆண்டுகள்", farmingMethod: "விவசாய முறை" },
  market: { ...englishMessages.market,  title: "சந்தை", produce: "வேளாண் விளைபொருள்", equipment: "இயந்திரங்கள் மற்றும் கருவிகள்", inputs: "வேளாண் இடுபொருட்கள்", services: "சேவைகள்", offers: "சலுகைகள்", search: "சந்தையில் தேடுக", noResults: "பொருந்தும் பட்டியல் எதுவும் கிடைக்கவில்லை.", seller: "விற்பனையாளர்", price: "விலை" },
  companies: { ...englishMessages.companies, title: "வேளாண் நிறுவனங்கள்", organizationName: "நிறுவனத்தின் பெயர்", companyType: "நிறுவன வகை", serviceArea: "சேவைப் பகுதி", productsServices: "தயாரிப்புகள் மற்றும் சேவைகள்", tractor: "டிராக்டர்கள் மற்றும் வேளாண் இயந்திரங்கள்", tools: "கருவிகள் மற்றும் சாதனங்கள்", irrigation: "பாசனம் மற்றும் நீர் அமைப்புகள்", livestock: "கால்நடை மற்றும் கோழிப்பண்ணை ஆதரவு", aquaculture: "நீர்வளர்ப்பு மற்றும் கடலுணவு ஆதரவு" },
  errors: { ...englishMessages.errors, generic: "ஏதோ தவறு ஏற்பட்டது. மீண்டும் முயலவும்.", invalidLocale: "ஆதரிக்கப்படும் மொழியைத் தேர்ந்தெடுக்கவும்.", required: "இந்தத் தகவல் அவசியம்.", invalidEmail: "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.", invalidHandle: "சிறிய ஆங்கில எழுத்துகள், எண்கள் மற்றும் அடிக்கோடு மட்டும் பயன்படுத்தவும்.", network: "இணைப்பைச் சரிபார்த்து மீண்டும் முயலவும்.", profileSave: "மொழி இங்கே மாற்றப்பட்டது, ஆனால் சுயவிவரத்தில் சேமிக்க முடியவில்லை.", unauthorized: "இந்தத் தேர்வைச் சுயவிவரத்தில் சேமிக்க உள்நுழைக.", categoryRequired: "குறைந்தது ஒரு பிரிவைத் தேர்ந்தெடுக்கவும்." },
  legal: { ...englishMessages.legal, terms: "விதிமுறைகள்", privacy: "தனியுரிமை அறிவிப்பு", communityRules: "சமூக விதிகள்", consent: "விதிமுறைகள், தனியுரிமை அறிவிப்பு மற்றும் சமூக விதிகளை ஏற்கிறேன்." },
} satisfies Messages;

export default messages;
