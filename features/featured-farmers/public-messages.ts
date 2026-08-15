import type { SupportedLocale } from "@/lib/i18n/locales";

const english = {
  collectionEyebrow: "FarmerBook editorial",
  collectionTitle: "Featured Farmers",
  collectionBody:
    "Evidence-backed stories about farmers whose work, ideas, leadership, or community contribution deserves careful public recognition.",
  noStories: "The first farmer stories are being fact-checked.",
  noStoriesBody:
    "Published profiles will appear here after their evidence, social ownership, citations, and media rights pass editorial review.",
  readStory: "Read the story",
  archivalRecord: "Historical profile · archival video",
  whyFeatured: "Why FarmerBook is featuring this work",
  atGlance: "At a glance",
  focus: "Agriculture focus",
  connect: "Farmer-owned social accounts",
  coverage: "Watch and read more",
  sources: "Sources and fact-check record",
  limitations: "What this profile does not claim",
  disclosure:
    "This is a FarmerBook editorial profile based on cited public information. It is not a FarmerBook member account, identity verification, endorsement, invitation, or marketplace listing.",
  lastChecked: "Fact-checked",
  published: "Published",
  editorialByline: "By FarmerBook Editorial",
  reviewedSources: "reviewed sources",
  correction: "Request a correction",
  photoPending: "Original photograph pending rights clearance",
  source: "Source",
};

const hindi = {
  collectionEyebrow: "फार्मरबुक संपादकीय",
  collectionTitle: "विशिष्ट किसान",
  collectionBody:
    "उन किसानों की प्रमाण-आधारित कहानियाँ जिनका काम, विचार, नेतृत्व या सामुदायिक योगदान सावधानीपूर्वक सार्वजनिक पहचान का हकदार है।",
  noStories: "पहली किसान कहानियों की तथ्य-जाँच चल रही है।",
  noStoriesBody:
    "साक्ष्य, सोशल अकाउंट स्वामित्व, संदर्भ और चित्र अधिकार संपादकीय समीक्षा से गुजरने के बाद प्रकाशित प्रोफ़ाइल यहाँ दिखेंगी।",
  readStory: "कहानी पढ़ें",
  archivalRecord: "ऐतिहासिक प्रोफ़ाइल · अभिलेखीय वीडियो",
  whyFeatured: "फार्मरबुक इस काम को क्यों प्रस्तुत कर रहा है",
  atGlance: "एक नज़र में",
  focus: "कृषि क्षेत्र",
  connect: "किसान के अपने सोशल अकाउंट",
  coverage: "और देखें व पढ़ें",
  sources: "स्रोत और तथ्य-जाँच रिकॉर्ड",
  limitations: "यह प्रोफ़ाइल क्या दावा नहीं करती",
  disclosure:
    "यह उद्धृत सार्वजनिक जानकारी पर आधारित फार्मरबुक संपादकीय प्रोफ़ाइल है। यह फार्मरबुक सदस्य खाता, पहचान सत्यापन, समर्थन, निमंत्रण या बाज़ार सूची नहीं है।",
  lastChecked: "तथ्य-जाँच",
  published: "प्रकाशित",
  editorialByline: "फार्मरबुक संपादकीय द्वारा",
  reviewedSources: "समीक्षित स्रोत",
  correction: "सुधार का अनुरोध करें",
  photoPending: "मूल तस्वीर के पुनर्प्रकाशन अधिकार की पुष्टि लंबित है",
  source: "स्रोत",
};

const marathi = {
  collectionEyebrow: "फार्मरबुक संपादकीय",
  collectionTitle: "वैशिष्ट्यपूर्ण शेतकरी",
  collectionBody:
    "ज्या शेतकऱ्यांचे काम, कल्पना, नेतृत्व किंवा सामुदायिक योगदान काळजीपूर्वक सार्वजनिक मान्यतेस पात्र आहे त्यांच्या पुराव्यांवर आधारित कथा.",
  noStories: "पहिल्या शेतकरी कथांची तथ्यतपासणी सुरू आहे.",
  noStoriesBody:
    "पुरावे, सोशल खाते मालकी, संदर्भ आणि चित्र हक्क संपादकीय तपासणीतून गेल्यानंतर प्रकाशित प्रोफाइल येथे दिसतील.",
  readStory: "कथा वाचा",
  archivalRecord: "ऐतिहासिक प्रोफाइल · संग्रहित व्हिडिओ",
  whyFeatured: "फार्मरबुक हे काम का सादर करत आहे",
  atGlance: "एका नजरेत",
  focus: "शेतीचे क्षेत्र",
  connect: "शेतकऱ्याची स्वतःची सोशल खाती",
  coverage: "आणखी पाहा आणि वाचा",
  sources: "स्रोत आणि तथ्यतपासणी नोंद",
  limitations: "हे प्रोफाइल कोणता दावा करत नाही",
  disclosure:
    "हे संदर्भित सार्वजनिक माहितीवर आधारित फार्मरबुक संपादकीय प्रोफाइल आहे. हे फार्मरबुक सदस्य खाते, ओळख पडताळणी, समर्थन, निमंत्रण किंवा बाजारपेठ सूची नाही.",
  lastChecked: "तथ्यतपासणी",
  published: "प्रकाशित",
  editorialByline: "फार्मरबुक संपादकीय",
  reviewedSources: "तपासलेले स्रोत",
  correction: "दुरुस्तीची विनंती करा",
  photoPending: "मूळ छायाचित्राच्या पुनर्प्रकाशन हक्कांची पुष्टी बाकी आहे",
  source: "स्रोत",
};

export function featuredFarmerPublicMessages(locale: SupportedLocale) {
  if (locale === "hi-IN") return hindi;
  if (locale === "mr-IN") return marathi;
  return english;
}
