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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ফাৰ্মাৰবুক", continue: "আগবাঢ়ক", back: "পিছলৈ", save: "সংৰক্ষণ কৰক", saving: "সংৰক্ষণ হৈ আছে…", cancel: "বাতিল কৰক", skip: "এতিয়া এৰি দিয়ক", finish: "সম্পূৰ্ণ কৰক", language: "ভাষা", selectLanguage: "ভাষা বাছক", beta: "বিটা", optional: "ঐচ্ছিক", other: "অন্যান্য" },
  auth: { ...englishMessages.auth,  signIn: "ছাইন ইন কৰক", signUp: "একাউণ্ট খোলক", email: "ইমেইল ঠিকনা", password: "পাছৱৰ্ড", google: "Google-ৰে আগবাঢ়ক", facebook: "Facebook-ৰে আগবাঢ়ক", forgotPassword: "পাছৱৰ্ড পাহৰিলে?", checkEmail: "একাউণ্ট সত্যাপন কৰিবলৈ ইমেইল চাওক।" },
  onboarding: { ...englishMessages.onboarding, title: "আপোনাৰ প্ৰ'ফাইল সম্পূৰ্ণ কৰক", intro: "ফাৰ্মাৰবুকে আপোনাক কেনেকৈ সহায় কৰিব পাৰে জনাওক।", progress: "পদক্ষেপ {current} / {total}", roleQuestion: "আপুনি ফাৰ্মাৰবুক কেনেকৈ ব্যৱহাৰ কৰিব?", farmer: "কৃষক", customer: "গ্ৰাহক", wholesaler: "পাইকাৰী বিক্ৰেতা", company: "কৃষি কোম্পানী", identity: "আপোনাৰ পৰিচয়", location: "স্থান আৰু সেৱা অঞ্চল", categories: "কৃষিৰ শ্ৰেণী", review: "পৰ্যালোচনা কৰি সম্পূৰ্ণ কৰক", customCategory: "নিজৰ শ্ৰেণী নিৰ্ধাৰণ কৰক", resume: "আপোনাৰ সংৰক্ষিত অগ্ৰগতি আগবঢ়াবলৈ সাজু।", autosaved: "অগ্ৰগতি সংৰক্ষিত" },
  profile: { ...englishMessages.profile, title: "প্ৰ'ফাইল আৰু ভাষা", fullName: "সম্পূৰ্ণ নাম", handle: "ৰাজহুৱা হেণ্ডেল", district: "জিলা", state: "ৰাজ্য", bio: "চমু পৰিচয়", experience: "অভিজ্ঞতাৰ বছৰ", farmingMethod: "কৃষি পদ্ধতি" },
  market: { ...englishMessages.market,  title: "বজাৰ", produce: "কৃষিজাত সামগ্ৰী", equipment: "সঁজুলি আৰু যন্ত্ৰ", inputs: "কৃষি উপকৰণ", services: "সেৱা", offers: "অফাৰ", search: "বজাৰত সন্ধান কৰক", noResults: "মিল থকা তালিকা পোৱা নগ'ল।", seller: "বিক্ৰেতা", price: "মূল্য" },
  companies: { ...englishMessages.companies, title: "কৃষি কোম্পানী", organizationName: "সংস্থাৰ নাম", companyType: "কোম্পানীৰ ধৰণ", serviceArea: "সেৱা অঞ্চল", productsServices: "পণ্য আৰু সেৱা", tractor: "ট্ৰেক্টৰ আৰু কৃষি যন্ত্ৰ", tools: "সঁজুলি আৰু উপকৰণ", irrigation: "জলসিঞ্চন আৰু পানী ব্যৱস্থা", livestock: "পশুধন আৰু হাঁহ-কুকুৰা সহায়", aquaculture: "জলজ কৃষি আৰু সামুদ্ৰিক খাদ্য সহায়" },
  errors: { ...englishMessages.errors, generic: "কিবা ভুল হ'ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।", invalidLocale: "সমৰ্থিত ভাষা বাছক।", required: "এই ক্ষেত্ৰখন আৱশ্যক।", invalidEmail: "শুদ্ধ ইমেইল ঠিকনা দিয়ক।", invalidHandle: "কেৱল সৰু ইংৰাজী আখৰ, সংখ্যা আৰু আণ্ডাৰস্ক'ৰ ব্যৱহাৰ কৰক।", network: "সংযোগ পৰীক্ষা কৰি পুনৰ চেষ্টা কৰক।", profileSave: "ইয়াত ভাষা সলনি হ'ল, কিন্তু প্ৰ'ফাইলত সংৰক্ষণ নহ'ল।", unauthorized: "এই পছন্দ প্ৰ'ফাইলত ৰাখিবলৈ ছাইন ইন কৰক।", categoryRequired: "অন্ততঃ এটা শ্ৰেণী বাছক।" },
  legal: { ...englishMessages.legal, terms: "চৰ্তসমূহ", privacy: "গোপনীয়তা জাননী", communityRules: "সমাজৰ নিয়ম", consent: "মই চৰ্ত, গোপনীয়তা জাননী আৰু সমাজৰ নিয়ম মানি লৈছোঁ।" },
} satisfies Messages;

export default messages;
