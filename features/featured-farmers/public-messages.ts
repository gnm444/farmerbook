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
  reportedProducts: "Reported farm products",
  reportedProductsDisclosure:
    "These products were supplied by the FarmerBook operator and have not been confirmed for current stock, price, delivery, certification or food-business registration. This editorial catalog is not an order page.",
  sources: "Sources and fact-check record",
  limitations: "What this profile does not claim",
  disclosure:
    "This is a FarmerBook editorial profile based on cited public information. It is not a FarmerBook member account, identity verification, endorsement, invitation, or marketplace listing.",
  lastChecked: "Fact-checked",
  published: "Published",
  editorialPreview: "Editorial preview",
  reviewPending: "Content review pending",
  editorialByline: "By FarmerBook Editorial",
  reviewedSources: "reviewed sources",
  correction: "Request a correction",
  photoPending: "Original photograph pending rights clearance",
  source: "Source",
  farmContact: "Farm contact",
  emailFarm: "Email Avani Van Farms",
  profileViews: "Profile views",
  approximateViews:
    "Approximate total, counted at most once per browser each UTC day. No IP address or fingerprint is stored.",
  privateQuestions: "Ask Avani Van Farms",
  privateQuestionsBody:
    "Send Sandeep a private question or comment. It will go to the farm email and will not appear publicly.",
  yourName: "Your name",
  replyEmail: "Reply email",
  messageType: "Message type",
  question: "Question",
  comment: "Comment",
  yourMessage: "Your message",
  questionConsent:
    "I agree that FarmerBook may send my name, reply email and message to Avani Van Farms for a direct response.",
  spamProtection: "Spam protection",
  sendPrivately: "Send privately",
  sending: "Sending…",
  questionSent: "Your private message was sent to Avani Van Farms.",
  questionPrivate:
    "Private delivery only. Your message is not a public recommendation.",
  recommendations: "Customer recommendations",
  recommendationsBody:
    "Existing customers can describe their experience in a LinkedIn-style recommendation.",
  relationshipContext: "What did you buy or experience?",
  recommendationText: "Your recommendation",
  recommendationConsent:
    "I agree to display my FarmerBook name and this recommendation publicly after moderation.",
  submitRecommendation: "Submit for review",
  updateRecommendation: "Update recommendation",
  recommendationPending:
    "Your recommendation is awaiting FarmerBook moderation and is not public yet.",
  recommendationApproved: "Your recommendation is published.",
  recommendationHidden: "Your recommendation is not currently public.",
  withdrawRecommendation: "Withdraw recommendation",
  recommendationTrust:
    "Relationship self-declared · reviewed for publication · not a verified FarmerBook transaction.",
  noRecommendations: "No customer recommendations have been published yet.",
  signInToRecommend: "Sign in with a Customer account to write a recommendation.",
  website: "Website",
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
  reportedProducts: "रिपोर्ट किए गए कृषि उत्पाद",
  reportedProductsDisclosure:
    "इन उत्पादों की जानकारी फार्मरबुक ऑपरेटर ने दी है। मौजूदा स्टॉक, कीमत, डिलीवरी, प्रमाणन या खाद्य-व्यवसाय पंजीकरण की पुष्टि नहीं हुई है। यह संपादकीय सूची ऑर्डर पेज नहीं है।",
  sources: "स्रोत और तथ्य-जाँच रिकॉर्ड",
  limitations: "यह प्रोफ़ाइल क्या दावा नहीं करती",
  disclosure:
    "यह उद्धृत सार्वजनिक जानकारी पर आधारित फार्मरबुक संपादकीय प्रोफ़ाइल है। यह फार्मरबुक सदस्य खाता, पहचान सत्यापन, समर्थन, निमंत्रण या बाज़ार सूची नहीं है।",
  lastChecked: "तथ्य-जाँच",
  published: "प्रकाशित",
  editorialPreview: "संपादकीय पूर्वावलोकन",
  reviewPending: "सामग्री समीक्षा लंबित",
  editorialByline: "फार्मरबुक संपादकीय द्वारा",
  reviewedSources: "समीक्षित स्रोत",
  correction: "सुधार का अनुरोध करें",
  photoPending: "मूल तस्वीर के पुनर्प्रकाशन अधिकार की पुष्टि लंबित है",
  source: "स्रोत",
  farmContact: "फार्म संपर्क",
  emailFarm: "अवनि वन फार्म्स को ईमेल करें",
  profileViews: "प्रोफ़ाइल व्यू",
  approximateViews:
    "अनुमानित कुल; हर UTC दिन एक ब्राउज़र से अधिकतम एक बार गिना जाता है। IP पता या फिंगरप्रिंट संग्रहित नहीं होता।",
  privateQuestions: "अवनि वन फार्म्स से पूछें",
  privateQuestionsBody:
    "संदीप को निजी प्रश्न या टिप्पणी भेजें। यह फार्म ईमेल पर जाएगी और सार्वजनिक नहीं होगी।",
  yourName: "आपका नाम",
  replyEmail: "जवाब के लिए ईमेल",
  messageType: "संदेश प्रकार",
  question: "प्रश्न",
  comment: "टिप्पणी",
  yourMessage: "आपका संदेश",
  questionConsent:
    "मैं सहमत हूँ कि FarmerBook मेरा नाम, जवाब ईमेल और संदेश सीधे उत्तर के लिए अवनि वन फार्म्स को भेज सकता है।",
  spamProtection: "स्पैम सुरक्षा",
  sendPrivately: "निजी रूप से भेजें",
  sending: "भेजा जा रहा है…",
  questionSent: "आपका निजी संदेश अवनि वन फार्म्स को भेज दिया गया है।",
  questionPrivate: "केवल निजी डिलीवरी। आपका संदेश सार्वजनिक अनुशंसा नहीं है।",
  recommendations: "ग्राहक अनुशंसाएँ",
  recommendationsBody:
    "मौजूदा ग्राहक LinkedIn शैली की अनुशंसा में अपना अनुभव बता सकते हैं।",
  relationshipContext: "आपने क्या खरीदा या अनुभव किया?",
  recommendationText: "आपकी अनुशंसा",
  recommendationConsent:
    "मैं मॉडरेशन के बाद अपना FarmerBook नाम और यह अनुशंसा सार्वजनिक दिखाने के लिए सहमत हूँ।",
  submitRecommendation: "समीक्षा के लिए भेजें",
  updateRecommendation: "अनुशंसा अपडेट करें",
  recommendationPending:
    "आपकी अनुशंसा FarmerBook मॉडरेशन की प्रतीक्षा में है और अभी सार्वजनिक नहीं है।",
  recommendationApproved: "आपकी अनुशंसा प्रकाशित है।",
  recommendationHidden: "आपकी अनुशंसा अभी सार्वजनिक नहीं है।",
  withdrawRecommendation: "अनुशंसा वापस लें",
  recommendationTrust:
    "संबंध स्वयं घोषित · प्रकाशन के लिए समीक्षित · सत्यापित FarmerBook लेनदेन नहीं।",
  noRecommendations: "अभी कोई ग्राहक अनुशंसा प्रकाशित नहीं हुई है।",
  signInToRecommend: "अनुशंसा लिखने के लिए ग्राहक खाते से साइन इन करें।",
  website: "वेबसाइट",
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
  reportedProducts: "नोंदवलेली शेतमाल उत्पादने",
  reportedProductsDisclosure:
    "ही उत्पादने फार्मरबुक ऑपरेटरने सांगितली आहेत. सध्याचा साठा, किंमत, वितरण, प्रमाणपत्र किंवा अन्न-व्यवसाय नोंदणी यांची पुष्टी झालेली नाही. ही संपादकीय सूची ऑर्डर पृष्ठ नाही.",
  sources: "स्रोत आणि तथ्यतपासणी नोंद",
  limitations: "हे प्रोफाइल कोणता दावा करत नाही",
  disclosure:
    "हे संदर्भित सार्वजनिक माहितीवर आधारित फार्मरबुक संपादकीय प्रोफाइल आहे. हे फार्मरबुक सदस्य खाते, ओळख पडताळणी, समर्थन, निमंत्रण किंवा बाजारपेठ सूची नाही.",
  lastChecked: "तथ्यतपासणी",
  published: "प्रकाशित",
  editorialPreview: "संपादकीय पूर्वावलोकन",
  reviewPending: "मजकूर समीक्षा बाकी",
  editorialByline: "फार्मरबुक संपादकीय",
  reviewedSources: "तपासलेले स्रोत",
  correction: "दुरुस्तीची विनंती करा",
  photoPending: "मूळ छायाचित्राच्या पुनर्प्रकाशन हक्कांची पुष्टी बाकी आहे",
  source: "स्रोत",
  farmContact: "फार्म संपर्क",
  emailFarm: "अवनी वन फार्म्सला ईमेल करा",
  profileViews: "प्रोफाइल दृश्ये",
  approximateViews:
    "अंदाजे एकूण; प्रत्येक UTC दिवशी एका ब्राउझरमधून जास्तीत जास्त एकदा मोजले जाते. IP पत्ता किंवा फिंगरप्रिंट साठवला जात नाही.",
  privateQuestions: "अवनी वन फार्म्सला विचारा",
  privateQuestionsBody:
    "संदीप यांना खासगी प्रश्न किंवा टिप्पणी पाठवा. ती फार्मच्या ईमेलवर जाईल आणि सार्वजनिक दिसणार नाही.",
  yourName: "तुमचे नाव",
  replyEmail: "उत्तरासाठी ईमेल",
  messageType: "संदेश प्रकार",
  question: "प्रश्न",
  comment: "टिप्पणी",
  yourMessage: "तुमचा संदेश",
  questionConsent:
    "थेट उत्तरासाठी FarmerBook माझे नाव, ईमेल आणि संदेश अवनी वन फार्म्सला पाठवू शकते यास मी सहमत आहे.",
  spamProtection: "स्पॅम संरक्षण",
  sendPrivately: "खासगी पाठवा",
  sending: "पाठवत आहे…",
  questionSent: "तुमचा खासगी संदेश अवनी वन फार्म्सला पाठवला आहे.",
  questionPrivate: "फक्त खासगी वितरण. हा संदेश सार्वजनिक शिफारस नाही.",
  recommendations: "ग्राहक शिफारसी",
  recommendationsBody:
    "विद्यमान ग्राहक LinkedIn-शैलीतील शिफारसीत आपला अनुभव सांगू शकतात.",
  relationshipContext: "तुम्ही काय खरेदी केले किंवा अनुभवले?",
  recommendationText: "तुमची शिफारस",
  recommendationConsent:
    "मॉडरेशननंतर माझे FarmerBook नाव आणि ही शिफारस सार्वजनिक दाखवण्यास मी सहमत आहे.",
  submitRecommendation: "पुनरावलोकनासाठी पाठवा",
  updateRecommendation: "शिफारस अद्ययावत करा",
  recommendationPending:
    "तुमची शिफारस FarmerBook मॉडरेशनच्या प्रतीक्षेत आहे आणि अजून सार्वजनिक नाही.",
  recommendationApproved: "तुमची शिफारस प्रकाशित आहे.",
  recommendationHidden: "तुमची शिफारस सध्या सार्वजनिक नाही.",
  withdrawRecommendation: "शिफारस मागे घ्या",
  recommendationTrust:
    "संबंध स्वयंघोषित · प्रकाशनासाठी पुनरावलोकित · सत्यापित FarmerBook व्यवहार नाही.",
  noRecommendations: "अजून कोणतीही ग्राहक शिफारस प्रकाशित झालेली नाही.",
  signInToRecommend: "शिफारस लिहिण्यासाठी ग्राहक खात्याने साइन इन करा.",
  website: "वेबसाइट",
};

export function featuredFarmerPublicMessages(locale: SupportedLocale) {
  if (locale === "hi-IN") return hindi;
  if (locale === "mr-IN") return marathi;
  return english;
}
