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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ଫାର୍ମରବୁକ୍", continue: "ଆଗକୁ ଯାଆନ୍ତୁ", back: "ପଛକୁ", save: "ସଞ୍ଚୟ କରନ୍ତୁ", saving: "ସଞ୍ଚୟ ହେଉଛି…", cancel: "ବାତିଲ କରନ୍ତୁ", skip: "ଏବେ ଛାଡ଼ନ୍ତୁ", finish: "ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ", language: "ଭାଷା", selectLanguage: "ଭାଷା ବାଛନ୍ତୁ", beta: "ବିଟା", optional: "ଇଚ୍ଛାଧୀନ", other: "ଅନ୍ୟ" },
  auth: { ...englishMessages.auth,  signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ", signUp: "ଖାତା ତିଆରି କରନ୍ତୁ", email: "ଇମେଲ୍ ଠିକଣା", password: "ପାସୱାର୍ଡ", google: "Google ସହ ଆଗକୁ ଯାଆନ୍ତୁ", facebook: "Facebook ସହ ଆଗକୁ ଯାଆନ୍ତୁ", forgotPassword: "ପାସୱାର୍ଡ ଭୁଲିଗଲେ?", checkEmail: "ଖାତା ଯାଞ୍ଚ ପାଇଁ ଇମେଲ୍ ଦେଖନ୍ତୁ।" },
  onboarding: { ...englishMessages.onboarding, title: "ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ", intro: "ଫାର୍ମରବୁକ୍ କିପରି ସାହାଯ୍ୟ କରିପାରିବ କୁହନ୍ତୁ।", progress: "ପଦକ୍ଷେପ {current} / {total}", roleQuestion: "ଆପଣ ଫାର୍ମରବୁକ୍ କିପରି ବ୍ୟବହାର କରିବେ?", farmer: "ଚାଷୀ", customer: "ଗ୍ରାହକ", wholesaler: "ପାଇକାରୀ ବ୍ୟବସାୟୀ", company: "କୃଷି କମ୍ପାନୀ", identity: "ଆପଣଙ୍କ ପରିଚୟ", location: "ସ୍ଥାନ ଓ ସେବା ଅଞ୍ଚଳ", categories: "ଚାଷ ବିଭାଗ", review: "ସମୀକ୍ଷା କରି ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ", customCategory: "ନିଜ ବିଭାଗ ଲେଖନ୍ତୁ", resume: "ଆପଣଙ୍କ ସଞ୍ଚିତ ପ୍ରଗତି ଆଗକୁ ନେବାକୁ ପ୍ରସ୍ତୁତ।", autosaved: "ପ୍ରଗତି ସଞ୍ଚୟ ହେଲା" },
  profile: { ...englishMessages.profile, title: "ପ୍ରୋଫାଇଲ୍ ଓ ଭାଷା", fullName: "ପୂର୍ଣ୍ଣ ନାମ", handle: "ସାର୍ବଜନୀନ ହ୍ୟାଣ୍ଡଲ୍", district: "ଜିଲ୍ଲା", state: "ରାଜ୍ୟ", bio: "ସଂକ୍ଷିପ୍ତ ପରିଚୟ", experience: "ଅଭିଜ୍ଞତାର ବର୍ଷ", farmingMethod: "ଚାଷ ପଦ୍ଧତି" },
  market: { ...englishMessages.market,  title: "ବଜାର", produce: "କୃଷି ଉତ୍ପାଦ", equipment: "ଯନ୍ତ୍ର ଓ ଉପକରଣ", inputs: "କୃଷି ସାମଗ୍ରୀ", services: "ସେବା", offers: "ଅଫର୍", search: "ବଜାରରେ ଖୋଜନ୍ତୁ", noResults: "ମେଳ ଖାଉଥିବା ତାଲିକା ମିଳିଲା ନାହିଁ।", seller: "ବିକ୍ରେତା", price: "ମୂଲ୍ୟ" },
  companies: { ...englishMessages.companies, title: "କୃଷି କମ୍ପାନୀ", organizationName: "ସଂସ୍ଥାର ନାମ", companyType: "କମ୍ପାନୀର ପ୍ରକାର", serviceArea: "ସେବା ଅଞ୍ଚଳ", productsServices: "ଉତ୍ପାଦ ଓ ସେବା", tractor: "ଟ୍ରାକ୍ଟର ଓ କୃଷି ଯନ୍ତ୍ର", tools: "ଉପକରଣ ଓ ସାଧନ", irrigation: "ଜଳସେଚନ ଓ ଜଳ ବ୍ୟବସ୍ଥା", livestock: "ପଶୁପାଳନ ଓ କୁକୁଡ଼ା ସହାୟତା", aquaculture: "ଜଳକୃଷି ଓ ସାମୁଦ୍ରିକ ଖାଦ୍ୟ ସହାୟତା" },
  errors: { ...englishMessages.errors, generic: "କିଛି ଭୁଲ୍ ହେଲା। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।", invalidLocale: "ସମର୍ଥିତ ଭାଷା ବାଛନ୍ତୁ।", required: "ଏହି ସୂଚନା ଆବଶ୍ୟକ।", invalidEmail: "ଏକ ବୈଧ ଇମେଲ୍ ଠିକଣା ଦିଅନ୍ତୁ।", invalidHandle: "କେବଳ ଛୋଟ ଇଂରାଜୀ ଅକ୍ଷର, ସଂଖ୍ୟା ଓ ଅଣ୍ଡରସ୍କୋର୍ ବ୍ୟବହାର କରନ୍ତୁ।", network: "ସଂଯୋଗ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।", profileSave: "ଭାଷା ଏଠାରେ ବଦଳିଛି, କିନ୍ତୁ ପ୍ରୋଫାଇଲ୍‌ରେ ସଞ୍ଚୟ ହୋଇପାରିଲା ନାହିଁ।", unauthorized: "ଏହି ପସନ୍ଦ ପ୍ରୋଫାଇଲ୍‌ରେ ସଞ୍ଚୟ ପାଇଁ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ।", categoryRequired: "ଅତି କମରେ ଗୋଟିଏ ବିଭାଗ ବାଛନ୍ତୁ।" },
  legal: { ...englishMessages.legal, terms: "ସର୍ତ୍ତାବଳୀ", privacy: "ଗୋପନୀୟତା ସୂଚନା", communityRules: "ସମୁଦାୟ ନିୟମ", consent: "ମୁଁ ସର୍ତ୍ତାବଳୀ, ଗୋପନୀୟତା ସୂଚନା ଓ ସମୁଦାୟ ନିୟମକୁ ସ୍ୱୀକାର କରୁଛି।" },
} satisfies Messages;

export default messages;
