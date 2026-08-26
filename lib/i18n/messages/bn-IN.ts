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
  common: { demoBanner: englishMessages.common.demoBanner,  brand: "ফার্মারবুক", continue: "এগিয়ে যান", back: "ফিরে যান", save: "সংরক্ষণ করুন", saving: "সংরক্ষণ হচ্ছে…", cancel: "বাতিল করুন", skip: "এখন বাদ দিন", finish: "সম্পূর্ণ করুন", language: "ভাষা", selectLanguage: "ভাষা বেছে নিন", beta: "বিটা", optional: "ঐচ্ছিক", other: "অন্যান্য" },
  auth: { ...englishMessages.auth,  signIn: "সাইন ইন করুন", signUp: "অ্যাকাউন্ট তৈরি করুন", email: "ইমেইল ঠিকানা", password: "পাসওয়ার্ড", google: "Google দিয়ে এগিয়ে যান", facebook: "Facebook দিয়ে এগিয়ে যান", forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?", checkEmail: "অ্যাকাউন্ট যাচাই করতে ইমেইল দেখুন।" },
  onboarding: { ...englishMessages.onboarding, title: "আপনার প্রোফাইল সম্পূর্ণ করুন", intro: "ফার্মারবুক কীভাবে সাহায্য করতে পারে তা জানান।", progress: "ধাপ {current} / {total}", roleQuestion: "আপনি ফার্মারবুক কীভাবে ব্যবহার করবেন?", farmer: "কৃষক", customer: "ক্রেতা", wholesaler: "পাইকার", company: "কৃষি সংস্থা", identity: "আপনার পরিচয়", location: "অবস্থান ও পরিষেবা এলাকা", categories: "কৃষির বিভাগ", review: "পর্যালোচনা করে সম্পূর্ণ করুন", customCategory: "নিজের বিভাগ লিখুন", resume: "আপনার সংরক্ষিত অগ্রগতি চালিয়ে যাওয়ার জন্য প্রস্তুত।", autosaved: "অগ্রগতি সংরক্ষিত" },
  profile: { ...englishMessages.profile, title: "প্রোফাইল ও ভাষা", fullName: "পুরো নাম", handle: "প্রকাশ্য হ্যান্ডেল", district: "জেলা", state: "রাজ্য", bio: "সংক্ষিপ্ত পরিচিতি", experience: "অভিজ্ঞতার বছর", farmingMethod: "চাষের পদ্ধতি" },
  market: { ...englishMessages.market,  title: "বাজার", produce: "কৃষিপণ্য", equipment: "যন্ত্রপাতি ও সরঞ্জাম", inputs: "কৃষি উপকরণ", services: "পরিষেবা", offers: "অফার", search: "বাজারে খুঁজুন", noResults: "মিল থাকা কোনো তালিকা পাওয়া যায়নি।", seller: "বিক্রেতা", price: "দাম" },
  companies: { ...englishMessages.companies, title: "কৃষি সংস্থা", organizationName: "সংস্থার নাম", companyType: "সংস্থার ধরন", serviceArea: "পরিষেবা এলাকা", productsServices: "পণ্য ও পরিষেবা", tractor: "ট্র্যাক্টর ও কৃষিযন্ত্র", tools: "সরঞ্জাম ও কৃষি উপকরণ", irrigation: "সেচ ও জলব্যবস্থা", livestock: "পশুপালন ও হাঁস-মুরগি সহায়তা", aquaculture: "জলচাষ ও সামুদ্রিক খাদ্য সহায়তা" },
  errors: { ...englishMessages.errors, generic: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।", invalidLocale: "সমর্থিত ভাষা বেছে নিন।", required: "এই ঘরটি আবশ্যক।", invalidEmail: "সঠিক ইমেইল ঠিকানা লিখুন।", invalidHandle: "শুধু ছোট ইংরেজি অক্ষর, সংখ্যা ও আন্ডারস্কোর ব্যবহার করুন।", network: "সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।", profileSave: "এখানে ভাষা বদলেছে, কিন্তু প্রোফাইলে সংরক্ষণ করা যায়নি।", unauthorized: "এই পছন্দ প্রোফাইলে রাখতে সাইন ইন করুন।", categoryRequired: "অন্তত একটি বিভাগ বেছে নিন।" },
  legal: { ...englishMessages.legal, terms: "শর্তাবলি", privacy: "গোপনীয়তা বিজ্ঞপ্তি", communityRules: "সম্প্রদায়ের নিয়ম", consent: "আমি শর্তাবলি, গোপনীয়তা বিজ্ঞপ্তি ও সম্প্রদায়ের নিয়মে সম্মত।" },
} satisfies Messages;

export default messages;
