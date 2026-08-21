# FarmerBook Facebook outreach playbook

## Approved first audience

- Farmers, customers and wholesalers in Andhra Pradesh and Telangana.
- Agricultural tool manufacturers/dealers and agriculture service businesses
  that want to register early collaboration interest.

The first publication is one post on the signed-in account's own timeline. Do
not mass-message people, add friends for outreach, scrape group members or
repeat the post across groups.

## Group-rule review

The signed-in account has no active managed Facebook Page. On 2026-08-19 the
following relevant joined-group rules were reviewed in Chrome:

- `ప్రకృతి వ్యవసాయం` prohibits personal, group and Page promotions and spam.
- `రైతు నేస్తం (For The Welfare Of Farmers)` prohibits self-promotion, spam
  and irrelevant links.

Do not publish FarmerBook promotional links in either group. A future group
post requires a visible rule allowing it or direct administrator permission.

## Reviewed bilingual timeline invitation

```text
ఆంధ్రప్రదేశ్ & తెలంగాణ రైతులు, కొనుగోలుదారులు, హోల్‌సేల్ వ్యాపారులు మరియు వ్యవసాయ పనిముట్లు/సేవల వ్యాపారులకు ఆహ్వానం 🌾

FarmerBook.in వ్యవసాయం కోసం రూపొందించిన ప్రొఫెషనల్ నెట్‌వర్క్ మరియు డైరెక్ట్ మార్కెట్‌ప్లేస్.

రైతులకు:
• మీ వ్యవసాయ అనుభవం, పంటలు మరియు ప్రాంతాన్ని చూపించే ప్రొఫెషనల్ ప్రొఫైల్
• ప్రస్తుతం అందుబాటులో ఉన్న పంట/హార్వెస్ట్ లాట్లను ప్రచురించే అవకాశం
• కొనుగోలుదారులు, కస్టమర్లు మరియు హోల్‌సేలర్ల నుంచి ప్రైవేట్ డైరెక్ట్ enquiries

కొనుగోలుదారులు & హోల్‌సేల్ వ్యాపారులకు:
• ప్రస్తుతం ఉన్న పంట లాట్లను చూడటం
• రైతు అందించిన ప్రొఫైల్ మరియు ప్రాంత వివరాలను పరిశీలించడం
• రైతుకు నేరుగా ప్రైవేట్ enquiry పంపడం

FarmerBook డైరెక్ట్ marketplace enquiriesపై platform commission వసూలు చేయదు. అమ్మకం లేదా ధరకు హామీ లేదు; ప్రతి వ్యాపార నిర్ణయాన్ని మీరు స్వతంత్రంగా పరిశీలించాలి.

రైతులు, కస్టమర్లు, హోల్‌సేలర్లు ఇక్కడ చేరడానికి అభ్యర్థించండి:
https://farmerbook.in/join

వ్యవసాయ పనిముట్ల తయారీదారులు/డీలర్లు మరియు సేవల సంస్థలు early collaboration కోసం ఇక్కడ ఆసక్తి నమోదు చేయండి (business offers ఇంకా staged rolloutలో ఉన్నాయి):
https://farmerbook.in/partner-interest

— FarmerBook.in

Invitation to Andhra Pradesh & Telangana Farmers, customers, wholesalers and agricultural tool/service businesses.

Farmers can build a professional agriculture profile, publish current harvest lots and receive private direct enquiries. Customers and wholesalers can browse current produce, review Farmer-supplied profile/location details and contact the Farmer privately. FarmerBook charges no platform commission on direct marketplace enquiries; sales, prices and outcomes are not guaranteed.

Farmers, customers and wholesalers: https://farmerbook.in/join
Tool manufacturers/dealers and agriculture service businesses can request an early collaboration here: https://farmerbook.in/partner-interest

#FarmerBook #AndhraPradeshFarmers #TelanganaFarmers #APFarmers #TSFarmers #Agriculture #FarmTools #Wholesalers
```

## Publication checks

Before publishing:

1. anonymous `/join` and `/partner-interest` must both return HTTP 200;
2. both forms must show configured Turnstile and consent controls;
3. Postmark delivery must still be paused until the owner canary passes;
4. preview the exact text and links on the timeline;
5. request action-time confirmation immediately before clicking Facebook's
   final Post button.

After publishing, record the visible post URL and time. Do not automatically
reply, comment, boost, invite group members or send Messenger DMs.
