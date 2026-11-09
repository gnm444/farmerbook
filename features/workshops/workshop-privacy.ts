const english = {
  title: "Hari Babu workshop registration details",
  privacy:
    "The voluntary workshop form collects your name, mobile number, district and state, and any farm details or discussion topics you choose to share. Authorized organizers use these details only to review interest requests and coordinate the 23 December 2026 workshop. The records are removed by 24 March 2027, India time.",
  request:
    "You can request earlier removal through the data request page or by emailing ceo@farmerbook.in. A FarmerBook account is not required to make this request.",
  requestLink: "Data requests",
  deletionTitle: "Workshop registration removal",
  deletion:
    "If you submitted the Hari Babu workshop interest form, you can request removal before 24 March 2027 by emailing ceo@farmerbook.in. An organizer will verify the request before removing the private record. You do not need a FarmerBook account.",
};

const telugu = {
  title: "హరి బాబు ప్రకృతి రైతుల సమ్మేళనం నమోదు వివరాలు",
  privacy:
    "ఐచ్ఛిక సమ్మేళనం ఫారమ్‌లో మీ పేరు, మొబైల్ నంబర్, జిల్లా, రాష్ట్రం, మీరు ఇవ్వాలనుకున్న పొలం వివరాలు లేదా చర్చ అంశాలు తీసుకుంటాం. అధికారం ఉన్న నిర్వాహకులు ఈ వివరాలను ఆసక్తి అభ్యర్థనల పరిశీలనకు, 23 డిసెంబర్ 2026 సమ్మేళనం సమన్వయానికి మాత్రమే ఉపయోగిస్తారు. ఈ రికార్డులను భారత కాలమానం ప్రకారం 24 మార్చి 2027 నాటికి తొలగిస్తాం.",
  request:
    "ముందుగానే తొలగించమని డేటా అభ్యర్థన పేజీ ద్వారా లేదా ceo@farmerbook.in కు ఇమెయిల్ చేసి కోరవచ్చు. ఇందుకు FarmerBook ఖాతా అవసరం లేదు.",
  requestLink: "డేటా అభ్యర్థనలు",
  deletionTitle: "సమ్మేళనం నమోదు తొలగింపు",
  deletion:
    "హరి బాబు ప్రకృతి రైతుల సమ్మేళనం ఆసక్తి ఫారమ్‌ను పంపితే, 24 మార్చి 2027కి ముందే మీ ప్రైవేట్ రికార్డును తొలగించమని ceo@farmerbook.in కు ఇమెయిల్ చేయవచ్చు. తొలగించే ముందు నిర్వాహకులు అభ్యర్థనను ధృవీకరిస్తారు. FarmerBook ఖాతా అవసరం లేదు.",
};

const hindi = {
  title: "हरि बाबू कार्यशाला पंजीकरण विवरण",
  privacy:
    "स्वैच्छिक कार्यशाला फ़ॉर्म में आपका नाम, मोबाइल नंबर, ज़िला और राज्य, तथा आपके चुने हुए खेत के विवरण या चर्चा के विषय लिए जाते हैं। अधिकृत आयोजक इन विवरणों का उपयोग केवल रुचि अनुरोधों की समीक्षा और 23 दिसंबर 2026 की कार्यशाला के समन्वय के लिए करते हैं। ये रिकॉर्ड भारतीय समय के अनुसार 24 मार्च 2027 तक हटा दिए जाते हैं।",
  request:
    "आप डेटा अनुरोध पेज से या ceo@farmerbook.in पर ईमेल करके पहले भी इन्हें हटाने का अनुरोध कर सकते हैं। इसके लिए FarmerBook खाते की ज़रूरत नहीं है।",
  requestLink: "डेटा अनुरोध",
  deletionTitle: "कार्यशाला पंजीकरण हटाना",
  deletion:
    "अगर आपने हरि बाबू कार्यशाला में रुचि का फ़ॉर्म भेजा है, तो 24 मार्च 2027 से पहले निजी रिकॉर्ड हटाने के लिए ceo@farmerbook.in पर ईमेल कर सकते हैं। रिकॉर्ड हटाने से पहले आयोजक अनुरोध की पुष्टि करेंगे। FarmerBook खाते की ज़रूरत नहीं है।",
};

export function workshopPrivacyCopy(locale: string) {
  if (locale === "te-IN") return { locale, copy: telugu };
  if (locale === "hi-IN") return { locale, copy: hindi };
  return { locale: "en-IN", copy: english };
}
