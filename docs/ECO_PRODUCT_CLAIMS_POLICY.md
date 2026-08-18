---
title: Eco-product evidence and anti-greenwashing policy
status: Implemented for public intake; trusted moderation persistence pending
last_reviewed: 2026-08-18
---

# Eco-product evidence and anti-greenwashing policy

## Purpose

FarmerBook may let a seller choose an eco-product discovery category, but a
category choice is not a certification. Public environmental claims must be
specific, scoped, and supported by accepted evidence for the exact finished
product. The reusable assessment is implemented in
`features/eco-products/claims-policy.ts` and is intentionally independent from
organization onboarding forms and the company-sector taxonomy.

The CCPA's 2024 greenwashing guidelines require environmental claims to be
truthful, specific, adequately disclosed, and substantiated with credible
certification or reliable scientific evidence. Claims should say whether they
cover the whole product, a component, manufacturing, packaging, use, or
disposal. Generic words such as “eco-friendly,” “green,” “natural,” or
“sustainable” do not establish the claimed benefit by themselves.

## Three public evidence states

| State | Fixed label | May raw claim text be published? |
|---|---|---|
| `seller_declared` | `Seller-declared environmental claim — not independently verified` | No; show only the fixed disclosure and neutral product facts |
| `evidence_submitted` | `Environmental evidence submitted — review pending` | No; evidence existence is not evidence acceptance |
| `verified` | `Environmental claim verified — evidence scope reviewed` | Yes, but only the reviewed wording and scope |

Evidence status is independent from product eligibility. A prohibited or
suspected prohibited item stays ineligible even if a seller uploads documents.
Only a trusted moderation workflow may mark evidence `accepted`; browser input
must never be allowed to set that state.

## Universal evidence rules

Every accepted record needs an identifier, issuer, reference, exact
product/claim scope, review result, and applicable validity. Expired,
incomplete, rejected, company-generic, raw-material-only, or mismatched-SKU
documents cannot support a verified finished-product claim.

- Do not display a blanket `Certified eco-friendly` badge.
- Do not turn an organization badge into product or environmental verification.
- Do not infer claims from the seller name, category, photo, public website, or
  an AI-generated description.
- Do not publish absolute phrases such as `100% eco-friendly`, `zero
  environmental impact`, `environmentally safe`, or `chemical-free`.
- `Recycled`, residue/by-product, and similar content claims must state a
  verified percentage and what the percentage measures.
- Carbon-neutral/net-zero/negative claims need a defined boundary, method,
  data period, footprint assessment, and independent verification.
- A certification claim must name the scheme, issuer, reference, validity, and
  exact product scope.

## Conventional and compostable plastic tableware

The Plastic Waste Management Amendment Rules, 2021 prohibit the manufacture,
import, stocking, distribution, sale, and use of identified single-use plastic
items from 1 July 2022. The list includes plastic plates, cups, glasses, forks,
spoons, knives, straws, trays, and stirrers. FarmerBook therefore hard-blocks
explicit conventional or merely biodegradable single-use plastic tableware and
conservatively blocks unclassified plastic tableware from eco presentation.

Central rule 4(3) creates an exception for commodities made of compostable
plastic. That exception is not a seller declaration. CPCB's Rule 4(h)
certification process requires product/manufacturer or seller certification,
IS/ISO 17088 testing for the manufactured product, prescribed marking, a CPCB
certificate number, and QR traceability. FarmerBook must verify the CPCB record
and exact product/manufacturer/seller scope before the product can enter the
eco claim path.

Some states and Union Territories have stricter plastic restrictions, including
rules that may reach compostable plastic. A current destination-state/local-law
check is therefore mandatory before sale. A CPCB certificate is not a promise
that an item is lawful in every Indian jurisdiction.

Non-plastic fibre products such as bagasse tableware are not treated as plastic
merely because the description says `plastic-free`. Their compostable claim
still needs a finished-product test covering coatings, binders, receiving
conditions, and disposal instructions.

## Reusable tableware

`Reusable` is a use-phase claim, not a synonym for eco-friendly. Require an
accepted durability/use-cycle test plus cleaning, care, safe reuse, repair, and
end-of-life instructions. Generic plastic tableware remains blocked until
trusted review proves it is durable reusable ware rather than prohibited
single-use plastic.

## Clothing and textiles

- A recycled-fibre claim needs the finished product's fibre composition,
  traceable recycled-input chain of custody, and a stated percentage.
- An organic cotton/textile claim needs a current product-scoped certificate
  from a recognized organic system, material composition, and chain of custody
  through processing. APEDA's NPOP operates certification and traceability for
  organic cotton/textiles and publishes designated organic-cotton certification
  bodies.
- A raw-cotton farm certificate alone does not automatically prove that a
  finished garment is wholly organic.
- Bamboo viscose/rayon or regenerated cellulose must be described as such; it
  must not be presented as raw, pure, or unprocessed natural bamboo fibre.
- `Natural`, `ethical`, and `sustainable clothing` need a specific measurable
  qualifier; the category name is not evidence.

## Bamboo products and food contact

A bamboo-content claim needs the exact bamboo percentage and disclosure of
binders, coatings, plastics, adhesives, other fibres, or regenerated cellulose.
A `responsibly sourced` claim additionally needs a named sourcing standard and
chain-of-custody records.

FSSAI's bamboo food-contact guidance says the items should be made from edible
bamboo varieties, not combined with another material in that pure-bamboo path,
manufactured and handled hygienically, free of relevant contamination, and
durable and reusable with good shelf life. FarmerBook requires product-specific
composition, bamboo-guidance compliance, food-contact safety, and durability
evidence. A bamboo-plastic or bamboo-melamine composite may be described with
accurate neutral composition facts, but it cannot use FarmerBook's pure-bamboo
food-contact environmental verification path.

Where a product is packaging that contacts food, the FSSAI Packaging
Regulations require the applicable food-contact material to meet the prescribed
requirements; food business operators must obtain the required conformity
evidence from an NABL-accredited laboratory. Environmental evidence never
replaces food-safety compliance.

## Farm-produce and value-added products

For organic food, FSSAI recognizes NPOP and PGS-India certification systems.
FarmerBook requires a current product-scoped recognized organic certificate and
the applicable FSSAI food-business registration/licence. A Farmer's organic
farm certificate does not automatically cover a separate processor, recipe,
packaged product, or seller.

Words such as `natural`, `pure`, `farm fresh`, `traditional`, or `chemical-free`
must not be used to imply certified organic production. Food compliance,
environmental claim verification, and Farmer identity verification remain
separate states.

## Agricultural-residue and by-product products

A claim such as `made from rice husk`, `bagasse packaging`, `crop-residue
board`, or `upcycled farm waste` needs:

- the finished product's residue percentage;
- source invoices/records and a mass balance from residue intake to output;
- a material-composition report disclosing plastics, resins, binders, coatings,
  adhesives, and other inputs; and
- any separate test needed for a compostable, biodegradable, recyclable,
  food-contact, or carbon claim.

A small residue fraction does not justify describing the whole product as an
agricultural-residue product. A plastic-residue composite tableware item is
still subject to the single-use plastic classifier and cannot hide plastic
content behind a crop-residue headline.

## Integration contract

Call `assessEcoProductClaim` with readonly category slugs, the seller's exact
claim text, a claim scope, trusted evidence records, and a deterministic review
date. A public surface must:

1. reject the eco category when `categoryEligible` is false;
2. always show `statusLabel`;
3. publish claim text only when `claimTextPublishable` is true, using
   `verifiedClaimText` exactly;
4. display missing evidence to the seller/admin, never as a public credential;
5. keep document files private; and
6. re-assess when evidence expires, a certificate is withdrawn, the product
   formulation/SKU changes, or relevant law changes.

The module is deliberately conservative. An administrator may reject a claim
that passes these minimum deterministic rules, but must not force a claim to
`verified` when the module reports a product or verification block.

## Official Indian sources

- [CCPA Guidelines for Prevention and Regulation of Greenwashing or Misleading Environmental Claims, 2024](https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/Greenwashing_Guidelines.pdf)
  and the [official Government release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2064963&lang=2&reg=48).
- [Plastic Waste Management Amendment Rules, 2021 — G.S.R. 571(E)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2021/aug/doc202181311.pdf)
  and the [Government's prohibited-item summary](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1942104&lang=2&reg=48).
- [CPCB SOP for certification of compostable-plastic manufacturers and sellers](https://cpcb.nic.in/uploads/plasticwaste/SOP-IssueCert-CompostablePlasticManufacturers.pdf)
  and [CPCB certified manufacturer/seller information](https://cpcb.nic.in/uploads/plasticwaste/Certified_Manufacturers_%26_sellers.pdf).
- [FSSAI bamboo food-contact advisory](https://www.fssai.gov.in/upload/advisories/2019/09/5d6e4cd671207Letter_Bamboo_Food_Material_03_09_2019.pdf)
  and [FSSAI sustainable-packaging resource](https://eastregion.fssai.gov.in/Sustainable-Packaging.php).
- [FSSAI Packaging Regulations resource](https://fssai.gov.in/cms/food-safety-and-standards-regulations.php)
  and the [official packaging compendium](https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Packaging_Labelling_Regulations_28_01_2022.pdf).
- [FSSAI organic-food standards](https://fssai.gov.in/cms/standards-organic-food.php)
  and [FSSAI Organic Foods Regulations resource](https://fssai.gov.in/cms/food-safety-and-standards-regulations.php).
- [APEDA NPOP, Eighth Edition](https://npop.apeda.gov.in/sites/default/files/2024-10/NPOP_Eight_Edition_2024.pdf),
  [NPOP certification-body/operator directory](https://npop.apeda.gov.in/Certification-Body-Operator-Details),
  and [designated organic-cotton certification bodies](https://npop.apeda.gov.in/sites/default/files/announcements/Rev_Designated_zones_CBs_organic_cotton.pdf).
- [BIS Know Your Standard](https://www.bis.gov.in/know-your-standard/?lang=en)
  for checking current Indian Standards, amendments, licences, and recognized
  laboratories rather than trusting a standard number typed by a seller.

This engineering policy does not replace product-specific legal advice or a
current central, state, local, food-safety, textile, consumer-protection, or
pollution-control review.
