import type { Messages } from "../messages";
import englishMessages from "./en-IN";

const messages = {
  ecoSuppliers: englishMessages.ecoSuppliers,
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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ફાર્મરબુક", continue: "આગળ વધો", back: "પાછળ", save: "સાચવો", saving: "સાચવી રહ્યાં છીએ…", cancel: "રદ કરો", skip: "હમણાં છોડો", finish: "પૂર્ણ કરો", language: "ભાષા", selectLanguage: "ભાષા પસંદ કરો", beta: "બીટા", optional: "વૈકલ્પિક", other: "અન્ય" },
  auth: { ...englishMessages.auth,  signIn: "સાઇન ઇન કરો", signUp: "ખાતું બનાવો", email: "ઇમેઇલ સરનામું", password: "પાસવર્ડ", google: "Google સાથે આગળ વધો", facebook: "Facebook સાથે આગળ વધો", forgotPassword: "પાસવર્ડ ભૂલી ગયા?", checkEmail: "ખાતું ચકાસવા માટે તમારો ઇમેઇલ જુઓ." },
  onboarding: { ...englishMessages.onboarding, title: "તમારી પ્રોફાઇલ પૂર્ણ કરો", intro: "ફાર્મરબુક તમને કેવી રીતે મદદ કરી શકે તે જણાવો.", progress: "પગલું {current} / {total}", roleQuestion: "તમે ફાર્મરબુકનો ઉપયોગ કેવી રીતે કરશો?", farmer: "ખેડૂત", customer: "ગ્રાહક", wholesaler: "જથ્થાબંધ વેપારી", company: "કૃષિ કંપની", identity: "તમારી ઓળખ", location: "સ્થાન અને સેવા વિસ્તાર", categories: "ખેતીની શ્રેણીઓ", review: "સમીક્ષા કરી પૂર્ણ કરો", customCategory: "તમારી પોતાની શ્રેણી લખો", resume: "તમારી સાચવેલી પ્રગતિ આગળ વધારવા માટે તૈયાર છે.", autosaved: "પ્રગતિ સાચવાઈ" },
  profile: { ...englishMessages.profile, title: "પ્રોફાઇલ અને ભાષા", fullName: "પૂરું નામ", handle: "જાહેર હેન્ડલ", district: "જિલ્લો", state: "રાજ્ય", bio: "ટૂંકો પરિચય", experience: "અનુભવના વર્ષ", farmingMethod: "ખેતી પદ્ધતિ" },
  market: { ...englishMessages.market,  title: "બજાર", produce: "ખેતપેદાશ", equipment: "સાધનો અને ઓજારો", inputs: "કૃષિ સામગ્રી", services: "સેવાઓ", offers: "ઓફરો", search: "બજારમાં શોધો", noResults: "મેળ ખાતી કોઈ યાદી મળી નથી.", seller: "વિક્રેતા", price: "કિંમત" },
  companies: { ...englishMessages.companies, title: "કૃષિ કંપનીઓ", organizationName: "સંસ્થાનું નામ", companyType: "કંપનીનો પ્રકાર", serviceArea: "સેવા વિસ્તાર", productsServices: "ઉત્પાદનો અને સેવાઓ", tractor: "ટ્રેક્ટર અને કૃષિ મશીનરી", tools: "ઓજારો અને ઉપકરણો", irrigation: "સિંચાઈ અને પાણી પ્રણાલીઓ", livestock: "પશુપાલન અને મરઘાં સહાય", aquaculture: "જળકૃષિ અને સમુદ્રી ખોરાક સહાય" },
  errors: { ...englishMessages.errors, generic: "કંઈક ખોટું થયું. ફરી પ્રયાસ કરો.", invalidLocale: "સમર્થિત ભાષા પસંદ કરો.", required: "આ માહિતી જરૂરી છે.", invalidEmail: "માન્ય ઇમેઇલ સરનામું દાખલ કરો.", invalidHandle: "ફક્ત નાના અંગ્રેજી અક્ષરો, અંકો અને અન્ડરસ્કોર વાપરો.", network: "કનેક્શન તપાસી ફરી પ્રયાસ કરો.", profileSave: "ભાષા અહીં બદલાઈ છે, પરંતુ પ્રોફાઇલમાં સાચવી શકાઈ નથી.", unauthorized: "આ પસંદગી પ્રોફાઇલમાં સાચવવા સાઇન ઇન કરો.", categoryRequired: "ઓછામાં ઓછી એક શ્રેણી પસંદ કરો." },
  legal: { ...englishMessages.legal, terms: "શરતો", privacy: "ગોપનીયતા સૂચના", communityRules: "સમુદાયના નિયમો", consent: "હું શરતો, ગોપનીયતા સૂચના અને સમુદાયના નિયમો સાથે સંમત છું." },
} satisfies Messages;

export default messages;
