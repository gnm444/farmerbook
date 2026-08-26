# FarmerBook collaboration templates

These templates are for recipients who have opted in, or for a genuinely
solicited partnership process. They are not approved for harvested-address
bulk email. Replace every merge field before delivery.

Required fields: `{{channel_or_group_name}}`, `{{recent_topic}}`,
`{{sender_name}}`, `{{reply_email}}`, `{{business_phone}}`, and
`{{postal_address}}`. International delivery remains blocked until a valid
business postal address and country-specific review are recorded.

## Canonical sender configuration

- Display identity: `FarmerBook CEO <ceo@farmerbook.in>`.
- Reply routing: `ceo@farmerbook.in` is active and forwards to the product
  owner's Gmail.
- Outbound status: receive-only. Do not use it in `From` until Postmark has
  verified `farmerbook.in` and SPF/DKIM/Return-Path/DMARC alignment is complete.
- Never imitate this address through Gmail or another unverified sender.
- Keep `{{sender_name}}` as `FarmerBook CEO` and `{{reply_email}}` as
  `ceo@farmerbook.in` only after the provider-readiness gate passes.

## Telugu creator

**Subject:** FarmerBook.in తో రైతుల కోసం కంటెంట్ భాగస్వామ్య ప్రతిపాదన

నమస్కారం {{channel_or_group_name}} టీమ్,

మీరు ఇటీవల పంచుకున్న **{{recent_topic}}** కంటెంట్ రైతులకు ఉపయోగకరంగా ఉంది.
అందుకే మీకు సరిపడే ఒక భాగస్వామ్య ఆలోచనతో సంప్రదిస్తున్నాను.

FarmerBook.in రైతులు మరియు వ్యవసాయ వ్యాపారాలు తమ ప్రొఫైల్‌ను నిర్మించుకోవడానికి,
పంటలు లేదా సేవల వివరాలను పంచుకోవడానికి, సంబంధిత కొనుగోలుదారులు మరియు హోల్‌సేలర్లను
నేరుగా కనుగొనడానికి రూపొందించిన వ్యవసాయ నెట్‌వర్క్.

మీ ఆసక్తిని బట్టి మనం ఒక ప్లాట్‌ఫామ్ పరిచయ వీడియో, రైతు కథల ప్రచారం లేదా చిన్న
లైవ్ ప్రశ్నోత్తర కార్యక్రమం గురించి మాట్లాడవచ్చు. ఇది మీ ప్రేక్షకులకు సరిపోతుందనిపిస్తే,
మీ సహకార విధానం లేదా మీడియా కిట్‌ను పంపగలరా?

ధన్యవాదాలు,

{{sender_name}}<br>
FarmerBook.in<br>
{{reply_email}} · {{business_phone}}

ఇది ఒక్కసారి పంపిన భాగస్వామ్య విచారణ మాత్రమే. ఆసక్తి లేకపోతే “వద్దు” అని
ప్రత్యుత్తరం ఇవ్వండి; మేము మళ్లీ సంప్రదించము.

{{postal_address}}

## Hindi creator

**Subject:** FarmerBook.in के साथ किसानों के लिए सहयोग का प्रस्ताव

नमस्ते {{channel_or_group_name}} टीम,

आपका हाल का **{{recent_topic}}** विषय पर काम किसानों के लिए उपयोगी लगा, इसलिए
आपके लिए एक प्रासंगिक सहयोग का प्रस्ताव साझा कर रहा हूँ।

FarmerBook.in एक कृषि नेटवर्क है जहाँ किसान और कृषि व्यवसाय अपनी प्रोफ़ाइल बना
सकते हैं, उपज या सेवाओं की जानकारी साझा कर सकते हैं और संबंधित खरीदारों व
थोक व्यापारियों से सीधे जुड़ सकते हैं।

आपकी रुचि के अनुसार हम प्लेटफ़ॉर्म परिचय वीडियो, किसान कहानी अभियान या एक छोटा
लाइव प्रश्नोत्तर सत्र कर सकते हैं। यदि यह आपके दर्शकों के लिए उपयोगी लगता है,
तो कृपया अपनी सहयोग प्रक्रिया या मीडिया किट साझा करें।

धन्यवाद,

{{sender_name}}<br>
FarmerBook.in<br>
{{reply_email}} · {{business_phone}}

यह केवल एक बार भेजा गया सहयोग अनुरोध है। रुचि न हो तो “नहीं” लिखकर उत्तर दें;
हम दोबारा संपर्क नहीं करेंगे।

{{postal_address}}

## International creator or farmer group

**Subject:** Partnership idea for {{channel_or_group_name}} and FarmerBook.in

Hello {{channel_or_group_name}} team,

Your recent work on **{{recent_topic}}** stood out as practical and relevant to
farming communities. I am reaching out with a focused collaboration idea.

FarmerBook.in is an agriculture network currently built around Indian farmers
and agri-businesses. It helps members build professional profiles, share
produce or services, and discover relevant buyers and wholesalers. We would
like to explore a knowledge-exchange feature, farmer-story collaboration, or
short educational session with your community. We will not represent your
organization as endorsing FarmerBook without written approval.

If this fits your partnership remit, could you share the appropriate process
or media/partnership information?

Regards,

{{sender_name}}<br>
FarmerBook.in<br>
{{reply_email}} · {{business_phone}}

This is a one-time partnership enquiry. If it is not relevant, reply “No” and
we will not contact you again.

{{postal_address}}

## Delivery rules

- Personalize `{{recent_topic}}` from the cited evidence; never invent a fact.
- Prioritize people who self-declare natural, organic, regenerative or
  agroecological farming on FarmerBook's consent form; never infer this label
  from discovery data.
- Use one initial message and no more than one follow-up after consent.
- Suppress opt-outs, complaints, bounces, wrong contacts, and prior recipients.
- Do not use WhatsApp unless the recipient initiated the conversation or gave
  explicit WhatsApp opt-in.
- Keep international groups separate until the intake path supports their
  country and the required sender identity details are complete.
