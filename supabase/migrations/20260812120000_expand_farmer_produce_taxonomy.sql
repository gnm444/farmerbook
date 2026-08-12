-- Expand the canonical farmer taxonomy to the comprehensive application catalogue.
-- This migration is additive: existing slugs and affinities are retained, while
-- legacy profile crop labels are matched through curated names and aliases.

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order
) values
  ('crop-cultivation', null, 'farming_activity', 'agricultureCategories.crop-cultivation', false, 10),
  ('cereals-grains', 'crop-cultivation', 'farming_activity', 'agricultureCategories.cereals-grains', true, 10),
  ('rice', 'cereals-grains', 'commodity', 'agricultureCategories.rice', true, 10),
  ('wheat', 'cereals-grains', 'commodity', 'agricultureCategories.wheat', true, 20),
  ('maize', 'cereals-grains', 'commodity', 'agricultureCategories.maize', true, 30),
  ('barley', 'cereals-grains', 'commodity', 'agricultureCategories.barley', true, 40),
  ('oats', 'cereals-grains', 'commodity', 'agricultureCategories.oats', true, 50),
  ('rye', 'cereals-grains', 'commodity', 'agricultureCategories.rye', true, 60),
  ('sorghum-jowar', 'cereals-grains', 'commodity', 'agricultureCategories.sorghum-jowar', true, 70),
  ('pearl-millet-bajra', 'cereals-grains', 'commodity', 'agricultureCategories.pearl-millet-bajra', true, 80),
  ('finger-millet-ragi', 'cereals-grains', 'commodity', 'agricultureCategories.finger-millet-ragi', true, 90),
  ('foxtail-millet', 'cereals-grains', 'commodity', 'agricultureCategories.foxtail-millet', true, 100),
  ('kodo-millet', 'cereals-grains', 'commodity', 'agricultureCategories.kodo-millet', true, 110),
  ('little-millet', 'cereals-grains', 'commodity', 'agricultureCategories.little-millet', true, 120),
  ('proso-millet', 'cereals-grains', 'commodity', 'agricultureCategories.proso-millet', true, 130),
  ('barnyard-millet', 'cereals-grains', 'commodity', 'agricultureCategories.barnyard-millet', true, 140),
  ('browntop-millet', 'cereals-grains', 'commodity', 'agricultureCategories.browntop-millet', true, 150),
  ('buckwheat', 'cereals-grains', 'commodity', 'agricultureCategories.buckwheat', true, 160),
  ('grain-amaranth', 'cereals-grains', 'commodity', 'agricultureCategories.grain-amaranth', true, 170),
  ('quinoa', 'cereals-grains', 'commodity', 'agricultureCategories.quinoa', true, 180),
  ('other-millets', 'cereals-grains', 'commodity', 'agricultureCategories.other-millets', true, 190),
  ('pulses-legumes', 'crop-cultivation', 'farming_activity', 'agricultureCategories.pulses-legumes', true, 20),
  ('chickpea-gram', 'pulses-legumes', 'commodity', 'agricultureCategories.chickpea-gram', true, 10),
  ('pigeon-pea-tur', 'pulses-legumes', 'commodity', 'agricultureCategories.pigeon-pea-tur', true, 20),
  ('lentil', 'pulses-legumes', 'commodity', 'agricultureCategories.lentil', true, 30),
  ('mung-bean', 'pulses-legumes', 'commodity', 'agricultureCategories.mung-bean', true, 40),
  ('urad-bean', 'pulses-legumes', 'commodity', 'agricultureCategories.urad-bean', true, 50),
  ('field-pea', 'pulses-legumes', 'commodity', 'agricultureCategories.field-pea', true, 60),
  ('cowpea', 'pulses-legumes', 'commodity', 'agricultureCategories.cowpea', true, 70),
  ('kidney-bean-rajma', 'pulses-legumes', 'commodity', 'agricultureCategories.kidney-bean-rajma', true, 80),
  ('moth-bean', 'pulses-legumes', 'commodity', 'agricultureCategories.moth-bean', true, 90),
  ('horse-gram', 'pulses-legumes', 'commodity', 'agricultureCategories.horse-gram', true, 100),
  ('lablab-bean', 'pulses-legumes', 'commodity', 'agricultureCategories.lablab-bean', true, 110),
  ('broad-bean', 'pulses-legumes', 'commodity', 'agricultureCategories.broad-bean', true, 120),
  ('cluster-bean-guar', 'pulses-legumes', 'commodity', 'agricultureCategories.cluster-bean-guar', true, 130),
  ('other-dry-beans', 'pulses-legumes', 'commodity', 'agricultureCategories.other-dry-beans', true, 140),
  ('oilseeds', 'crop-cultivation', 'farming_activity', 'agricultureCategories.oilseeds', true, 30),
  ('groundnut', 'oilseeds', 'commodity', 'agricultureCategories.groundnut', true, 10),
  ('mustard-rapeseed', 'oilseeds', 'commodity', 'agricultureCategories.mustard-rapeseed', true, 20),
  ('soybean', 'oilseeds', 'commodity', 'agricultureCategories.soybean', true, 30),
  ('sesame', 'oilseeds', 'commodity', 'agricultureCategories.sesame', true, 40),
  ('sunflower', 'oilseeds', 'commodity', 'agricultureCategories.sunflower', true, 50),
  ('safflower', 'oilseeds', 'commodity', 'agricultureCategories.safflower', true, 60),
  ('linseed-flaxseed', 'oilseeds', 'commodity', 'agricultureCategories.linseed-flaxseed', true, 70),
  ('castor-seed', 'oilseeds', 'commodity', 'agricultureCategories.castor-seed', true, 80),
  ('niger-seed', 'oilseeds', 'commodity', 'agricultureCategories.niger-seed', true, 90),
  ('oil-palm', 'oilseeds', 'commodity', 'agricultureCategories.oil-palm', true, 100),
  ('commercial-field-crops', 'crop-cultivation', 'farming_activity', 'agricultureCategories.commercial-field-crops', true, 40),
  ('cotton', 'commercial-field-crops', 'commodity', 'agricultureCategories.cotton', true, 10),
  ('jute', 'commercial-field-crops', 'commodity', 'agricultureCategories.jute', true, 20),
  ('sugarcane', 'commercial-field-crops', 'commodity', 'agricultureCategories.sugarcane', true, 30),
  ('sugar-beet', 'commercial-field-crops', 'commodity', 'agricultureCategories.sugar-beet', true, 40),
  ('tobacco', 'commercial-field-crops', 'commodity', 'agricultureCategories.tobacco', true, 50),
  ('mesta', 'commercial-field-crops', 'commodity', 'agricultureCategories.mesta', true, 60),
  ('sisal-fibre', 'commercial-field-crops', 'commodity', 'agricultureCategories.sisal-fibre', true, 70),
  ('flax-fibre', 'commercial-field-crops', 'commodity', 'agricultureCategories.flax-fibre', true, 80),
  ('fodder-forage', 'crop-cultivation', 'farming_activity', 'agricultureCategories.fodder-forage', true, 50),
  ('berseem-fodder', 'fodder-forage', 'commodity', 'agricultureCategories.berseem-fodder', true, 10),
  ('lucerne-alfalfa', 'fodder-forage', 'commodity', 'agricultureCategories.lucerne-alfalfa', true, 20),
  ('napier-grass', 'fodder-forage', 'commodity', 'agricultureCategories.napier-grass', true, 30),
  ('fodder-maize', 'fodder-forage', 'commodity', 'agricultureCategories.fodder-maize', true, 40),
  ('fodder-sorghum', 'fodder-forage', 'commodity', 'agricultureCategories.fodder-sorghum', true, 50),
  ('pasture-grasses', 'fodder-forage', 'commodity', 'agricultureCategories.pasture-grasses', true, 60),
  ('silage', 'fodder-forage', 'commodity', 'agricultureCategories.silage', true, 70),
  ('hay', 'fodder-forage', 'commodity', 'agricultureCategories.hay', true, 80),
  ('horticulture', null, 'farming_activity', 'agricultureCategories.horticulture', false, 20),
  ('fruit-orchards', 'horticulture', 'farming_activity', 'agricultureCategories.fruit-orchards', true, 10),
  ('mango', 'fruit-orchards', 'commodity', 'agricultureCategories.mango', true, 10),
  ('banana', 'fruit-orchards', 'commodity', 'agricultureCategories.banana', true, 20),
  ('grapes', 'fruit-orchards', 'commodity', 'agricultureCategories.grapes', true, 30),
  ('pomegranate', 'fruit-orchards', 'commodity', 'agricultureCategories.pomegranate', true, 40),
  ('citrus', 'fruit-orchards', 'commodity', 'agricultureCategories.citrus', true, 50),
  ('apple-temperate-fruit', 'fruit-orchards', 'commodity', 'agricultureCategories.apple-temperate-fruit', true, 60),
  ('guava', 'fruit-orchards', 'commodity', 'agricultureCategories.guava', true, 70),
  ('papaya', 'fruit-orchards', 'commodity', 'agricultureCategories.papaya', true, 80),
  ('pineapple', 'fruit-orchards', 'commodity', 'agricultureCategories.pineapple', true, 90),
  ('litchi', 'fruit-orchards', 'commodity', 'agricultureCategories.litchi', true, 100),
  ('sapota', 'fruit-orchards', 'commodity', 'agricultureCategories.sapota', true, 110),
  ('jackfruit', 'fruit-orchards', 'commodity', 'agricultureCategories.jackfruit', true, 120),
  ('aonla', 'fruit-orchards', 'commodity', 'agricultureCategories.aonla', true, 130),
  ('ber-jujube', 'fruit-orchards', 'commodity', 'agricultureCategories.ber-jujube', true, 140),
  ('custard-apple', 'fruit-orchards', 'commodity', 'agricultureCategories.custard-apple', true, 150),
  ('watermelon', 'fruit-orchards', 'commodity', 'agricultureCategories.watermelon', true, 160),
  ('muskmelon', 'fruit-orchards', 'commodity', 'agricultureCategories.muskmelon', true, 170),
  ('pear', 'fruit-orchards', 'commodity', 'agricultureCategories.pear', true, 180),
  ('peach', 'fruit-orchards', 'commodity', 'agricultureCategories.peach', true, 190),
  ('plum', 'fruit-orchards', 'commodity', 'agricultureCategories.plum', true, 200),
  ('apricot', 'fruit-orchards', 'commodity', 'agricultureCategories.apricot', true, 210),
  ('cherry', 'fruit-orchards', 'commodity', 'agricultureCategories.cherry', true, 220),
  ('kiwi', 'fruit-orchards', 'commodity', 'agricultureCategories.kiwi', true, 230),
  ('strawberry', 'fruit-orchards', 'commodity', 'agricultureCategories.strawberry', true, 240),
  ('fig', 'fruit-orchards', 'commodity', 'agricultureCategories.fig', true, 250),
  ('date-palm', 'fruit-orchards', 'commodity', 'agricultureCategories.date-palm', true, 260),
  ('dragon-fruit', 'fruit-orchards', 'commodity', 'agricultureCategories.dragon-fruit', true, 270),
  ('passion-fruit', 'fruit-orchards', 'commodity', 'agricultureCategories.passion-fruit', true, 280),
  ('avocado', 'fruit-orchards', 'commodity', 'agricultureCategories.avocado', true, 290),
  ('bael', 'fruit-orchards', 'commodity', 'agricultureCategories.bael', true, 300),
  ('jamun', 'fruit-orchards', 'commodity', 'agricultureCategories.jamun', true, 310),
  ('mulberry', 'fruit-orchards', 'commodity', 'agricultureCategories.mulberry', true, 320),
  ('tamarind', 'fruit-orchards', 'commodity', 'agricultureCategories.tamarind', true, 330),
  ('vegetables', 'horticulture', 'farming_activity', 'agricultureCategories.vegetables', true, 20),
  ('tomato', 'vegetables', 'commodity', 'agricultureCategories.tomato', true, 10),
  ('onion', 'vegetables', 'commodity', 'agricultureCategories.onion', true, 20),
  ('potato-root-tubers', 'vegetables', 'commodity', 'agricultureCategories.potato-root-tubers', true, 30),
  ('okra', 'vegetables', 'commodity', 'agricultureCategories.okra', true, 40),
  ('leafy-vegetables', 'vegetables', 'commodity', 'agricultureCategories.leafy-vegetables', true, 50),
  ('brinjal-eggplant', 'vegetables', 'commodity', 'agricultureCategories.brinjal-eggplant', true, 60),
  ('cabbage', 'vegetables', 'commodity', 'agricultureCategories.cabbage', true, 70),
  ('cauliflower', 'vegetables', 'commodity', 'agricultureCategories.cauliflower', true, 80),
  ('broccoli', 'vegetables', 'commodity', 'agricultureCategories.broccoli', true, 90),
  ('capsicum', 'vegetables', 'commodity', 'agricultureCategories.capsicum', true, 100),
  ('green-chilli', 'vegetables', 'commodity', 'agricultureCategories.green-chilli', true, 110),
  ('cucumber', 'vegetables', 'commodity', 'agricultureCategories.cucumber', true, 120),
  ('gherkin', 'vegetables', 'commodity', 'agricultureCategories.gherkin', true, 130),
  ('carrot', 'vegetables', 'commodity', 'agricultureCategories.carrot', true, 140),
  ('radish', 'vegetables', 'commodity', 'agricultureCategories.radish', true, 150),
  ('beetroot', 'vegetables', 'commodity', 'agricultureCategories.beetroot', true, 160),
  ('turnip', 'vegetables', 'commodity', 'agricultureCategories.turnip', true, 170),
  ('green-peas', 'vegetables', 'commodity', 'agricultureCategories.green-peas', true, 180),
  ('green-beans', 'vegetables', 'commodity', 'agricultureCategories.green-beans', true, 190),
  ('french-beans', 'vegetables', 'commodity', 'agricultureCategories.french-beans', true, 200),
  ('bitter-gourd', 'vegetables', 'commodity', 'agricultureCategories.bitter-gourd', true, 210),
  ('bottle-gourd', 'vegetables', 'commodity', 'agricultureCategories.bottle-gourd', true, 220),
  ('ridge-gourd', 'vegetables', 'commodity', 'agricultureCategories.ridge-gourd', true, 230),
  ('sponge-gourd', 'vegetables', 'commodity', 'agricultureCategories.sponge-gourd', true, 240),
  ('snake-gourd', 'vegetables', 'commodity', 'agricultureCategories.snake-gourd', true, 250),
  ('ash-gourd', 'vegetables', 'commodity', 'agricultureCategories.ash-gourd', true, 260),
  ('pointed-gourd', 'vegetables', 'commodity', 'agricultureCategories.pointed-gourd', true, 270),
  ('pumpkin-squash', 'vegetables', 'commodity', 'agricultureCategories.pumpkin-squash', true, 280),
  ('sweet-potato', 'vegetables', 'commodity', 'agricultureCategories.sweet-potato', true, 290),
  ('cassava-tapioca', 'vegetables', 'commodity', 'agricultureCategories.cassava-tapioca', true, 300),
  ('elephant-foot-yam', 'vegetables', 'commodity', 'agricultureCategories.elephant-foot-yam', true, 310),
  ('yam', 'vegetables', 'commodity', 'agricultureCategories.yam', true, 320),
  ('colocasia-taro', 'vegetables', 'commodity', 'agricultureCategories.colocasia-taro', true, 330),
  ('garlic', 'vegetables', 'commodity', 'agricultureCategories.garlic', true, 340),
  ('drumstick-moringa', 'vegetables', 'commodity', 'agricultureCategories.drumstick-moringa', true, 350),
  ('spinach', 'vegetables', 'commodity', 'agricultureCategories.spinach', true, 360),
  ('amaranth-greens', 'vegetables', 'commodity', 'agricultureCategories.amaranth-greens', true, 370),
  ('fenugreek-leaves', 'vegetables', 'commodity', 'agricultureCategories.fenugreek-leaves', true, 380),
  ('mustard-greens', 'vegetables', 'commodity', 'agricultureCategories.mustard-greens', true, 390),
  ('lettuce', 'vegetables', 'commodity', 'agricultureCategories.lettuce', true, 400),
  ('celery', 'vegetables', 'commodity', 'agricultureCategories.celery', true, 410),
  ('asparagus', 'vegetables', 'commodity', 'agricultureCategories.asparagus', true, 420),
  ('sweet-corn', 'vegetables', 'commodity', 'agricultureCategories.sweet-corn', true, 430),
  ('baby-corn', 'vegetables', 'commodity', 'agricultureCategories.baby-corn', true, 440),
  ('zucchini', 'vegetables', 'commodity', 'agricultureCategories.zucchini', true, 450),
  ('knol-khol', 'vegetables', 'commodity', 'agricultureCategories.knol-khol', true, 460),
  ('spices-condiments', 'horticulture', 'farming_activity', 'agricultureCategories.spices-condiments', true, 30),
  ('black-pepper', 'spices-condiments', 'commodity', 'agricultureCategories.black-pepper', true, 10),
  ('dry-chilli', 'spices-condiments', 'commodity', 'agricultureCategories.dry-chilli', true, 20),
  ('turmeric', 'spices-condiments', 'commodity', 'agricultureCategories.turmeric', true, 30),
  ('ginger', 'spices-condiments', 'commodity', 'agricultureCategories.ginger', true, 40),
  ('coriander', 'spices-condiments', 'commodity', 'agricultureCategories.coriander', true, 50),
  ('cumin', 'spices-condiments', 'commodity', 'agricultureCategories.cumin', true, 60),
  ('fennel', 'spices-condiments', 'commodity', 'agricultureCategories.fennel', true, 70),
  ('fenugreek-seed', 'spices-condiments', 'commodity', 'agricultureCategories.fenugreek-seed', true, 80),
  ('cardamom', 'spices-condiments', 'commodity', 'agricultureCategories.cardamom', true, 90),
  ('clove', 'spices-condiments', 'commodity', 'agricultureCategories.clove', true, 100),
  ('cinnamon-cassia', 'spices-condiments', 'commodity', 'agricultureCategories.cinnamon-cassia', true, 110),
  ('nutmeg-mace', 'spices-condiments', 'commodity', 'agricultureCategories.nutmeg-mace', true, 120),
  ('ajwain', 'spices-condiments', 'commodity', 'agricultureCategories.ajwain', true, 130),
  ('dill', 'spices-condiments', 'commodity', 'agricultureCategories.dill', true, 140),
  ('saffron', 'spices-condiments', 'commodity', 'agricultureCategories.saffron', true, 150),
  ('kokum', 'spices-condiments', 'commodity', 'agricultureCategories.kokum', true, 160),
  ('asafoetida', 'spices-condiments', 'commodity', 'agricultureCategories.asafoetida', true, 170),
  ('curry-leaf', 'spices-condiments', 'commodity', 'agricultureCategories.curry-leaf', true, 180),
  ('mint', 'spices-condiments', 'commodity', 'agricultureCategories.mint', true, 190),
  ('lemongrass', 'spices-condiments', 'commodity', 'agricultureCategories.lemongrass', true, 200),
  ('flowers-floriculture', 'horticulture', 'farming_activity', 'agricultureCategories.flowers-floriculture', true, 40),
  ('rose', 'flowers-floriculture', 'commodity', 'agricultureCategories.rose', true, 10),
  ('marigold', 'flowers-floriculture', 'commodity', 'agricultureCategories.marigold', true, 20),
  ('jasmine', 'flowers-floriculture', 'commodity', 'agricultureCategories.jasmine', true, 30),
  ('chrysanthemum', 'flowers-floriculture', 'commodity', 'agricultureCategories.chrysanthemum', true, 40),
  ('tuberose', 'flowers-floriculture', 'commodity', 'agricultureCategories.tuberose', true, 50),
  ('gladiolus', 'flowers-floriculture', 'commodity', 'agricultureCategories.gladiolus', true, 60),
  ('orchids', 'flowers-floriculture', 'commodity', 'agricultureCategories.orchids', true, 70),
  ('gerbera', 'flowers-floriculture', 'commodity', 'agricultureCategories.gerbera', true, 80),
  ('lotus', 'flowers-floriculture', 'commodity', 'agricultureCategories.lotus', true, 90),
  ('medicinal-aromatic-plants', 'horticulture', 'farming_activity', 'agricultureCategories.medicinal-aromatic-plants', true, 50),
  ('aloe-vera', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.aloe-vera', true, 10),
  ('tulsi', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.tulsi', true, 20),
  ('ashwagandha', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.ashwagandha', true, 30),
  ('isabgol', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.isabgol', true, 40),
  ('senna', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.senna', true, 50),
  ('stevia', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.stevia', true, 60),
  ('vetiver', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.vetiver', true, 70),
  ('citronella', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.citronella', true, 80),
  ('mentha', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.mentha', true, 90),
  ('safed-musli', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.safed-musli', true, 100),
  ('kalmegh', 'medicinal-aromatic-plants', 'commodity', 'agricultureCategories.kalmegh', true, 110),
  ('plantation-crops', 'horticulture', 'farming_activity', 'agricultureCategories.plantation-crops', true, 60),
  ('tea', 'plantation-crops', 'commodity', 'agricultureCategories.tea', true, 10),
  ('coffee', 'plantation-crops', 'commodity', 'agricultureCategories.coffee', true, 20),
  ('coconut', 'plantation-crops', 'commodity', 'agricultureCategories.coconut', true, 30),
  ('rubber', 'plantation-crops', 'commodity', 'agricultureCategories.rubber', true, 40),
  ('arecanut', 'plantation-crops', 'commodity', 'agricultureCategories.arecanut', true, 50),
  ('cashew', 'plantation-crops', 'commodity', 'agricultureCategories.cashew', true, 60),
  ('cocoa', 'plantation-crops', 'commodity', 'agricultureCategories.cocoa', true, 70),
  ('vanilla', 'plantation-crops', 'commodity', 'agricultureCategories.vanilla', true, 80),
  ('nursery-seed-production', 'horticulture', 'farming_activity', 'agricultureCategories.nursery-seed-production', true, 70),
  ('protected-cultivation', 'horticulture', 'farming_activity', 'agricultureCategories.protected-cultivation', true, 80),
  ('hydroponics', 'horticulture', 'farming_activity', 'agricultureCategories.hydroponics', true, 90),
  ('aquaponics', 'horticulture', 'farming_activity', 'agricultureCategories.aquaponics', true, 100),
  ('vertical-urban-farming', 'horticulture', 'farming_activity', 'agricultureCategories.vertical-urban-farming', true, 110),
  ('mushroom-cultivation', 'horticulture', 'farming_activity', 'agricultureCategories.mushroom-cultivation', true, 120),
  ('button-mushroom', 'mushroom-cultivation', 'commodity', 'agricultureCategories.button-mushroom', true, 10),
  ('oyster-mushroom', 'mushroom-cultivation', 'commodity', 'agricultureCategories.oyster-mushroom', true, 20),
  ('milky-mushroom', 'mushroom-cultivation', 'commodity', 'agricultureCategories.milky-mushroom', true, 30),
  ('paddy-straw-mushroom', 'mushroom-cultivation', 'commodity', 'agricultureCategories.paddy-straw-mushroom', true, 40),
  ('shiitake-mushroom', 'mushroom-cultivation', 'commodity', 'agricultureCategories.shiitake-mushroom', true, 50),
  ('other-edible-mushrooms', 'mushroom-cultivation', 'commodity', 'agricultureCategories.other-edible-mushrooms', true, 60),
  ('livestock', null, 'farming_activity', 'agricultureCategories.livestock', false, 30),
  ('dairy-cattle', 'livestock', 'farming_activity', 'agricultureCategories.dairy-cattle', true, 10),
  ('buffalo-farming', 'livestock', 'farming_activity', 'agricultureCategories.buffalo-farming', true, 20),
  ('goat-farming', 'livestock', 'farming_activity', 'agricultureCategories.goat-farming', true, 30),
  ('sheep-farming', 'livestock', 'farming_activity', 'agricultureCategories.sheep-farming', true, 40),
  ('pig-farming', 'livestock', 'farming_activity', 'agricultureCategories.pig-farming', true, 50),
  ('rabbit-farming', 'livestock', 'farming_activity', 'agricultureCategories.rabbit-farming', true, 60),
  ('cattle-rearing', 'livestock', 'farming_activity', 'agricultureCategories.cattle-rearing', true, 70),
  ('yak-farming', 'livestock', 'farming_activity', 'agricultureCategories.yak-farming', true, 80),
  ('mithun-farming', 'livestock', 'farming_activity', 'agricultureCategories.mithun-farming', true, 90),
  ('camel-farming', 'livestock', 'farming_activity', 'agricultureCategories.camel-farming', true, 100),
  ('equine-farming', 'livestock', 'farming_activity', 'agricultureCategories.equine-farming', true, 110),
  ('other-livestock', 'livestock', 'farming_activity', 'agricultureCategories.other-livestock', true, 120),
  ('milk', 'livestock', 'commodity', 'agricultureCategories.milk', true, 130),
  ('cow-milk', 'livestock', 'commodity', 'agricultureCategories.cow-milk', true, 140),
  ('buffalo-milk', 'livestock', 'commodity', 'agricultureCategories.buffalo-milk', true, 150),
  ('goat-milk', 'livestock', 'commodity', 'agricultureCategories.goat-milk', true, 160),
  ('sheep-milk', 'livestock', 'commodity', 'agricultureCategories.sheep-milk', true, 170),
  ('camel-milk', 'livestock', 'commodity', 'agricultureCategories.camel-milk', true, 180),
  ('yak-milk', 'livestock', 'commodity', 'agricultureCategories.yak-milk', true, 190),
  ('farm-dairy-products', 'livestock', 'commodity', 'agricultureCategories.farm-dairy-products', true, 200),
  ('curd-yogurt', 'livestock', 'commodity', 'agricultureCategories.curd-yogurt', true, 210),
  ('paneer', 'livestock', 'commodity', 'agricultureCategories.paneer', true, 220),
  ('ghee', 'livestock', 'commodity', 'agricultureCategories.ghee', true, 230),
  ('meat', 'livestock', 'commodity', 'agricultureCategories.meat', true, 240),
  ('buffalo-meat', 'livestock', 'commodity', 'agricultureCategories.buffalo-meat', true, 250),
  ('goat-meat', 'livestock', 'commodity', 'agricultureCategories.goat-meat', true, 260),
  ('sheep-meat-mutton', 'livestock', 'commodity', 'agricultureCategories.sheep-meat-mutton', true, 270),
  ('pork', 'livestock', 'commodity', 'agricultureCategories.pork', true, 280),
  ('rabbit-meat', 'livestock', 'commodity', 'agricultureCategories.rabbit-meat', true, 290),
  ('wool', 'livestock', 'commodity', 'agricultureCategories.wool', true, 300),
  ('animal-manure', 'livestock', 'commodity', 'agricultureCategories.animal-manure', true, 310),
  ('poultry', null, 'farming_activity', 'agricultureCategories.poultry', false, 40),
  ('broiler-chicken', 'poultry', 'farming_activity', 'agricultureCategories.broiler-chicken', true, 10),
  ('layer-egg-production', 'poultry', 'farming_activity', 'agricultureCategories.layer-egg-production', true, 20),
  ('backyard-native-poultry', 'poultry', 'farming_activity', 'agricultureCategories.backyard-native-poultry', true, 30),
  ('duck-farming', 'poultry', 'farming_activity', 'agricultureCategories.duck-farming', true, 40),
  ('turkey-farming', 'poultry', 'farming_activity', 'agricultureCategories.turkey-farming', true, 50),
  ('quail-farming', 'poultry', 'farming_activity', 'agricultureCategories.quail-farming', true, 60),
  ('poultry-hatchery', 'poultry', 'farming_activity', 'agricultureCategories.poultry-hatchery', true, 70),
  ('eggs', 'poultry', 'commodity', 'agricultureCategories.eggs', true, 80),
  ('chicken-eggs', 'poultry', 'commodity', 'agricultureCategories.chicken-eggs', true, 90),
  ('duck-eggs', 'poultry', 'commodity', 'agricultureCategories.duck-eggs', true, 100),
  ('quail-eggs', 'poultry', 'commodity', 'agricultureCategories.quail-eggs', true, 110),
  ('poultry-meat', 'poultry', 'commodity', 'agricultureCategories.poultry-meat', true, 120),
  ('chicken-meat', 'poultry', 'commodity', 'agricultureCategories.chicken-meat', true, 130),
  ('duck-meat', 'poultry', 'commodity', 'agricultureCategories.duck-meat', true, 140),
  ('turkey-meat', 'poultry', 'commodity', 'agricultureCategories.turkey-meat', true, 150),
  ('quail-meat', 'poultry', 'commodity', 'agricultureCategories.quail-meat', true, 160),
  ('fisheries-aquaculture', null, 'farming_activity', 'agricultureCategories.fisheries-aquaculture', false, 50),
  ('freshwater-aquaculture', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.freshwater-aquaculture', true, 10),
  ('brackish-water-aquaculture', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.brackish-water-aquaculture', true, 20),
  ('marine-aquaculture', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.marine-aquaculture', true, 30),
  ('inland-capture-fisheries', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.inland-capture-fisheries', true, 40),
  ('marine-capture-fisheries', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.marine-capture-fisheries', true, 50),
  ('shrimp-prawn', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.shrimp-prawn', true, 60),
  ('crab-lobster', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.crab-lobster', true, 70),
  ('molluscs-shellfish', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.molluscs-shellfish', true, 80),
  ('pearl-culture', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.pearl-culture', true, 90),
  ('seaweed-farming', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.seaweed-farming', true, 100),
  ('ornamental-fish', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.ornamental-fish', true, 110),
  ('fish-hatchery-seed', 'fisheries-aquaculture', 'farming_activity', 'agricultureCategories.fish-hatchery-seed', true, 120),
  ('rohu', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.rohu', true, 130),
  ('catla', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.catla', true, 140),
  ('mrigal', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.mrigal', true, 150),
  ('common-carp', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.common-carp', true, 160),
  ('grass-carp', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.grass-carp', true, 170),
  ('silver-carp', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.silver-carp', true, 180),
  ('tilapia', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.tilapia', true, 190),
  ('pangasius', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.pangasius', true, 200),
  ('magur-singhi-catfish', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.magur-singhi-catfish', true, 210),
  ('murrel-snakehead', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.murrel-snakehead', true, 220),
  ('trout-coldwater-fish', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.trout-coldwater-fish', true, 230),
  ('seabass', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.seabass', true, 240),
  ('milkfish', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.milkfish', true, 250),
  ('cobia', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.cobia', true, 260),
  ('pompano', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.pompano', true, 270),
  ('grouper-mullet', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.grouper-mullet', true, 280),
  ('freshwater-prawn', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.freshwater-prawn', true, 290),
  ('vannamei-shrimp', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.vannamei-shrimp', true, 300),
  ('tiger-prawn', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.tiger-prawn', true, 310),
  ('oyster', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.oyster', true, 320),
  ('mussel', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.mussel', true, 330),
  ('clam', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.clam', true, 340),
  ('squid-octopus', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.squid-octopus', true, 350),
  ('dried-fish', 'fisheries-aquaculture', 'commodity', 'agricultureCategories.dried-fish', true, 360),
  ('allied-activities', null, 'farming_activity', 'agricultureCategories.allied-activities', false, 60),
  ('beekeeping-apiculture', 'allied-activities', 'farming_activity', 'agricultureCategories.beekeeping-apiculture', true, 10),
  ('sericulture', 'allied-activities', 'farming_activity', 'agricultureCategories.sericulture', true, 20),
  ('lac-cultivation', 'allied-activities', 'farming_activity', 'agricultureCategories.lac-cultivation', true, 30),
  ('agroforestry', 'allied-activities', 'farming_activity', 'agricultureCategories.agroforestry', true, 40),
  ('vermicompost-compost', 'allied-activities', 'farming_activity', 'agricultureCategories.vermicompost-compost', true, 50),
  ('on-farm-processing', 'allied-activities', 'farming_activity', 'agricultureCategories.on-farm-processing', true, 60),
  ('integrated-farming', 'allied-activities', 'farming_activity', 'agricultureCategories.integrated-farming', true, 70),
  ('honey', 'allied-activities', 'commodity', 'agricultureCategories.honey', true, 80),
  ('beeswax', 'allied-activities', 'commodity', 'agricultureCategories.beeswax', true, 90),
  ('silk-cocoons', 'allied-activities', 'commodity', 'agricultureCategories.silk-cocoons', true, 100),
  ('lac-resin', 'allied-activities', 'commodity', 'agricultureCategories.lac-resin', true, 110),
  ('compost', 'allied-activities', 'commodity', 'agricultureCategories.compost', true, 120),
  ('vermicompost', 'allied-activities', 'commodity', 'agricultureCategories.vermicompost', true, 130),
  ('farm-seed', 'allied-activities', 'commodity', 'agricultureCategories.farm-seed', true, 140),
  ('planting-material', 'allied-activities', 'commodity', 'agricultureCategories.planting-material', true, 150),
  ('nursery-saplings', 'allied-activities', 'commodity', 'agricultureCategories.nursery-saplings', true, 160),
  ('jaggery', 'allied-activities', 'commodity', 'agricultureCategories.jaggery', true, 170),
  ('agroforestry-produce', 'allied-activities', 'commodity', 'agricultureCategories.agroforestry-produce', true, 180),
  ('bamboo-cane', 'allied-activities', 'commodity', 'agricultureCategories.bamboo-cane', true, 190)
on conflict (slug) do update set
  parent_slug = excluded.parent_slug,
  domain = excluded.domain,
  translation_key = excluded.translation_key,
  selectable = excluded.selectable,
  sort_order = excluded.sort_order;

-- Map the legacy profiles.crops array to canonical affinities. Varieties and
-- breeds remain profile/listing attributes rather than taxonomy categories.
with category_labels(category_slug, label) as (
values
  ('crop-cultivation', 'Crop cultivation'),
  ('cereals-grains', 'Cereals and grains'),
  ('rice', 'Rice'),
  ('rice', 'paddy'),
  ('rice', 'dhan'),
  ('rice', 'chawal'),
  ('wheat', 'Wheat'),
  ('wheat', 'gehun'),
  ('wheat', 'atta wheat'),
  ('maize', 'Maize'),
  ('maize', 'corn'),
  ('maize', 'makka'),
  ('maize', 'makai'),
  ('barley', 'Barley'),
  ('barley', 'jau'),
  ('oats', 'Oats'),
  ('rye', 'Rye'),
  ('sorghum-jowar', 'Sorghum (jowar)'),
  ('sorghum-jowar', 'jowar'),
  ('sorghum-jowar', 'great millet'),
  ('pearl-millet-bajra', 'Pearl millet (bajra)'),
  ('pearl-millet-bajra', 'bajra'),
  ('finger-millet-ragi', 'Finger millet (ragi)'),
  ('finger-millet-ragi', 'ragi'),
  ('finger-millet-ragi', 'nachni'),
  ('finger-millet-ragi', 'mandua'),
  ('foxtail-millet', 'Foxtail millet'),
  ('foxtail-millet', 'kangni'),
  ('foxtail-millet', 'kakun'),
  ('kodo-millet', 'Kodo millet'),
  ('kodo-millet', 'kodra'),
  ('little-millet', 'Little millet'),
  ('little-millet', 'kutki'),
  ('little-millet', 'samai'),
  ('proso-millet', 'Proso millet'),
  ('proso-millet', 'cheena'),
  ('proso-millet', 'barri'),
  ('barnyard-millet', 'Barnyard millet'),
  ('barnyard-millet', 'sanwa'),
  ('barnyard-millet', 'jhangora'),
  ('browntop-millet', 'Browntop millet'),
  ('buckwheat', 'Buckwheat'),
  ('buckwheat', 'kuttu'),
  ('grain-amaranth', 'Grain amaranth'),
  ('grain-amaranth', 'rajgira'),
  ('grain-amaranth', 'ramdana'),
  ('quinoa', 'Quinoa'),
  ('other-millets', 'Other millets'),
  ('other-millets', 'millets'),
  ('other-millets', 'small millets'),
  ('pulses-legumes', 'Pulses and legumes'),
  ('chickpea-gram', 'Chickpea (gram)'),
  ('chickpea-gram', 'chana'),
  ('chickpea-gram', 'bengal gram'),
  ('pigeon-pea-tur', 'Pigeon pea (tur)'),
  ('pigeon-pea-tur', 'tur'),
  ('pigeon-pea-tur', 'toor'),
  ('pigeon-pea-tur', 'arhar'),
  ('lentil', 'Lentil'),
  ('lentil', 'masur'),
  ('lentil', 'masoor'),
  ('mung-bean', 'Mung bean'),
  ('mung-bean', 'moong'),
  ('mung-bean', 'green gram'),
  ('urad-bean', 'Urad bean'),
  ('urad-bean', 'black gram'),
  ('urad-bean', 'udad'),
  ('field-pea', 'Field pea'),
  ('field-pea', 'dry pea'),
  ('field-pea', 'matar'),
  ('cowpea', 'Cowpea'),
  ('cowpea', 'lobia'),
  ('cowpea', 'black-eyed pea'),
  ('kidney-bean-rajma', 'Kidney bean (rajma)'),
  ('kidney-bean-rajma', 'rajma'),
  ('moth-bean', 'Moth bean'),
  ('moth-bean', 'matki'),
  ('horse-gram', 'Horse gram'),
  ('horse-gram', 'kulthi'),
  ('lablab-bean', 'Lablab bean'),
  ('lablab-bean', 'hyacinth bean'),
  ('lablab-bean', 'sem'),
  ('broad-bean', 'Broad bean'),
  ('broad-bean', 'fava bean'),
  ('cluster-bean-guar', 'Cluster bean (guar)'),
  ('cluster-bean-guar', 'guar'),
  ('cluster-bean-guar', 'guvar'),
  ('other-dry-beans', 'Other dry beans'),
  ('oilseeds', 'Oilseeds'),
  ('groundnut', 'Groundnut'),
  ('mustard-rapeseed', 'Mustard and rapeseed'),
  ('soybean', 'Soybean'),
  ('sesame', 'Sesame'),
  ('sunflower', 'Sunflower'),
  ('safflower', 'Safflower'),
  ('safflower', 'kardi'),
  ('safflower', 'kusum'),
  ('linseed-flaxseed', 'Linseed (flaxseed)'),
  ('linseed-flaxseed', 'alsi'),
  ('castor-seed', 'Castor seed'),
  ('castor-seed', 'arandi'),
  ('niger-seed', 'Niger seed'),
  ('niger-seed', 'ramtil'),
  ('oil-palm', 'Oil palm'),
  ('commercial-field-crops', 'Commercial and field crops'),
  ('cotton', 'Cotton'),
  ('jute', 'Jute'),
  ('sugarcane', 'Sugarcane'),
  ('sugar-beet', 'Sugar beet'),
  ('tobacco', 'Tobacco'),
  ('mesta', 'Mesta'),
  ('mesta', 'kenaf'),
  ('sisal-fibre', 'Sisal fibre'),
  ('flax-fibre', 'Flax fibre'),
  ('fodder-forage', 'Fodder and forage crops'),
  ('berseem-fodder', 'Berseem fodder'),
  ('berseem-fodder', 'egyptian clover'),
  ('lucerne-alfalfa', 'Lucerne (alfalfa)'),
  ('napier-grass', 'Napier grass'),
  ('napier-grass', 'elephant grass'),
  ('fodder-maize', 'Fodder maize'),
  ('fodder-sorghum', 'Fodder sorghum'),
  ('pasture-grasses', 'Pasture grasses'),
  ('silage', 'Silage'),
  ('hay', 'Hay'),
  ('horticulture', 'Horticulture'),
  ('fruit-orchards', 'Fruit and orchard farming'),
  ('mango', 'Mango'),
  ('banana', 'Banana'),
  ('grapes', 'Grapes'),
  ('pomegranate', 'Pomegranate'),
  ('citrus', 'Citrus'),
  ('apple-temperate-fruit', 'Apple and temperate fruit'),
  ('guava', 'Guava'),
  ('guava', 'amrud'),
  ('guava', 'peru'),
  ('papaya', 'Papaya'),
  ('papaya', 'papita'),
  ('pineapple', 'Pineapple'),
  ('pineapple', 'ananas'),
  ('litchi', 'Litchi'),
  ('litchi', 'lychee'),
  ('sapota', 'Sapota (chikoo)'),
  ('sapota', 'chikoo'),
  ('sapota', 'chiku'),
  ('jackfruit', 'Jackfruit'),
  ('jackfruit', 'kathal'),
  ('jackfruit', 'phanus'),
  ('aonla', 'Aonla (Indian gooseberry)'),
  ('aonla', 'amla'),
  ('ber-jujube', 'Ber (Indian jujube)'),
  ('ber-jujube', 'bor'),
  ('ber-jujube', 'jujube'),
  ('custard-apple', 'Custard apple'),
  ('custard-apple', 'sitaphal'),
  ('custard-apple', 'sugar apple'),
  ('watermelon', 'Watermelon'),
  ('watermelon', 'tarbooz'),
  ('muskmelon', 'Muskmelon'),
  ('muskmelon', 'kharbuja'),
  ('muskmelon', 'cantaloupe'),
  ('pear', 'Pear'),
  ('pear', 'nashpati'),
  ('peach', 'Peach'),
  ('peach', 'aadu'),
  ('plum', 'Plum'),
  ('plum', 'aloo bukhara'),
  ('apricot', 'Apricot'),
  ('apricot', 'khubani'),
  ('cherry', 'Cherry'),
  ('kiwi', 'Kiwi'),
  ('strawberry', 'Strawberry'),
  ('fig', 'Fig'),
  ('fig', 'anjeer'),
  ('date-palm', 'Dates'),
  ('date-palm', 'date palm'),
  ('date-palm', 'khajur'),
  ('dragon-fruit', 'Dragon fruit'),
  ('dragon-fruit', 'kamalam'),
  ('passion-fruit', 'Passion fruit'),
  ('avocado', 'Avocado'),
  ('avocado', 'butter fruit'),
  ('bael', 'Bael'),
  ('bael', 'wood apple'),
  ('jamun', 'Jamun'),
  ('jamun', 'java plum'),
  ('mulberry', 'Mulberry'),
  ('mulberry', 'shahtoot'),
  ('tamarind', 'Tamarind'),
  ('tamarind', 'imli'),
  ('tamarind', 'chinch'),
  ('vegetables', 'Vegetable farming'),
  ('tomato', 'Tomato'),
  ('tomato', 'tamatar'),
  ('onion', 'Onion'),
  ('onion', 'pyaz'),
  ('onion', 'kanda'),
  ('potato-root-tubers', 'Potato, roots and tubers'),
  ('potato-root-tubers', 'potato'),
  ('potato-root-tubers', 'aloo'),
  ('okra', 'Okra'),
  ('okra', 'ladyfinger'),
  ('okra', 'lady''s finger'),
  ('okra', 'bhindi'),
  ('leafy-vegetables', 'Leafy vegetables'),
  ('brinjal-eggplant', 'Brinjal (eggplant)'),
  ('brinjal-eggplant', 'eggplant'),
  ('brinjal-eggplant', 'aubergine'),
  ('brinjal-eggplant', 'baingan'),
  ('brinjal-eggplant', 'vangi'),
  ('cabbage', 'Cabbage'),
  ('cabbage', 'patta gobhi'),
  ('cauliflower', 'Cauliflower'),
  ('cauliflower', 'phool gobhi'),
  ('broccoli', 'Broccoli'),
  ('capsicum', 'Capsicum'),
  ('capsicum', 'bell pepper'),
  ('capsicum', 'sweet pepper'),
  ('capsicum', 'shimla mirch'),
  ('green-chilli', 'Green chilli'),
  ('green-chilli', 'green chili'),
  ('green-chilli', 'hari mirch'),
  ('cucumber', 'Cucumber'),
  ('cucumber', 'kheera'),
  ('cucumber', 'kakdi'),
  ('gherkin', 'Gherkin'),
  ('gherkin', 'pickling cucumber'),
  ('carrot', 'Carrot'),
  ('carrot', 'gajar'),
  ('radish', 'Radish'),
  ('radish', 'mooli'),
  ('beetroot', 'Beetroot'),
  ('beetroot', 'beet'),
  ('turnip', 'Turnip'),
  ('turnip', 'shalgam'),
  ('green-peas', 'Green peas'),
  ('green-peas', 'peas'),
  ('green-peas', 'matar'),
  ('green-beans', 'Green beans'),
  ('green-beans', 'snap beans'),
  ('french-beans', 'French beans'),
  ('french-beans', 'common beans'),
  ('bitter-gourd', 'Bitter gourd'),
  ('bitter-gourd', 'karela'),
  ('bitter-gourd', 'bitter melon'),
  ('bottle-gourd', 'Bottle gourd'),
  ('bottle-gourd', 'lauki'),
  ('bottle-gourd', 'dudhi'),
  ('ridge-gourd', 'Ridge gourd'),
  ('ridge-gourd', 'turai'),
  ('ridge-gourd', 'dodka'),
  ('sponge-gourd', 'Sponge gourd'),
  ('sponge-gourd', 'gilki'),
  ('snake-gourd', 'Snake gourd'),
  ('snake-gourd', 'padwal'),
  ('ash-gourd', 'Ash gourd'),
  ('ash-gourd', 'winter melon'),
  ('ash-gourd', 'petha'),
  ('pointed-gourd', 'Pointed gourd'),
  ('pointed-gourd', 'parwal'),
  ('pointed-gourd', 'potol'),
  ('pumpkin-squash', 'Pumpkin and squash'),
  ('pumpkin-squash', 'kaddu'),
  ('pumpkin-squash', 'sitaphal vegetable'),
  ('sweet-potato', 'Sweet potato'),
  ('sweet-potato', 'shakarkand'),
  ('sweet-potato', 'ratale'),
  ('cassava-tapioca', 'Cassava (tapioca)'),
  ('cassava-tapioca', 'cassava'),
  ('cassava-tapioca', 'tapioca'),
  ('elephant-foot-yam', 'Elephant foot yam'),
  ('elephant-foot-yam', 'suran'),
  ('elephant-foot-yam', 'jimikand'),
  ('yam', 'Yam'),
  ('colocasia-taro', 'Colocasia (taro)'),
  ('colocasia-taro', 'arbi'),
  ('colocasia-taro', 'alu'),
  ('garlic', 'Garlic'),
  ('garlic', 'lahsun'),
  ('drumstick-moringa', 'Drumstick (moringa)'),
  ('drumstick-moringa', 'moringa'),
  ('drumstick-moringa', 'sahjan'),
  ('drumstick-moringa', 'shevga'),
  ('spinach', 'Spinach'),
  ('spinach', 'palak'),
  ('amaranth-greens', 'Amaranth greens'),
  ('amaranth-greens', 'chaulai'),
  ('amaranth-greens', 'math'),
  ('fenugreek-leaves', 'Fenugreek leaves'),
  ('fenugreek-leaves', 'methi'),
  ('mustard-greens', 'Mustard greens'),
  ('mustard-greens', 'sarson saag'),
  ('lettuce', 'Lettuce'),
  ('celery', 'Celery'),
  ('asparagus', 'Asparagus'),
  ('sweet-corn', 'Sweet corn'),
  ('baby-corn', 'Baby corn'),
  ('zucchini', 'Zucchini'),
  ('zucchini', 'courgette'),
  ('knol-khol', 'Knol-khol'),
  ('knol-khol', 'kohlrabi'),
  ('knol-khol', 'ganth gobhi'),
  ('spices-condiments', 'Spices and condiments'),
  ('black-pepper', 'Black pepper'),
  ('black-pepper', 'peppercorn'),
  ('black-pepper', 'kali mirch'),
  ('dry-chilli', 'Dry chilli'),
  ('dry-chilli', 'red chilli'),
  ('dry-chilli', 'red chili'),
  ('dry-chilli', 'lal mirch'),
  ('turmeric', 'Turmeric'),
  ('turmeric', 'haldi'),
  ('ginger', 'Ginger'),
  ('ginger', 'adrak'),
  ('coriander', 'Coriander'),
  ('coriander', 'dhania'),
  ('coriander', 'cilantro seed'),
  ('cumin', 'Cumin'),
  ('cumin', 'jeera'),
  ('fennel', 'Fennel'),
  ('fennel', 'saunf'),
  ('fenugreek-seed', 'Fenugreek seed'),
  ('fenugreek-seed', 'methi seed'),
  ('cardamom', 'Cardamom'),
  ('cardamom', 'elaichi'),
  ('clove', 'Clove'),
  ('clove', 'laung'),
  ('cinnamon-cassia', 'Cinnamon and cassia'),
  ('cinnamon-cassia', 'dalchini'),
  ('nutmeg-mace', 'Nutmeg and mace'),
  ('nutmeg-mace', 'jaiphal'),
  ('nutmeg-mace', 'javitri'),
  ('ajwain', 'Ajwain'),
  ('ajwain', 'carom seed'),
  ('dill', 'Dill'),
  ('dill', 'suva'),
  ('dill', 'shepu'),
  ('saffron', 'Saffron'),
  ('saffron', 'kesar'),
  ('kokum', 'Kokum'),
  ('asafoetida', 'Asafoetida'),
  ('asafoetida', 'hing'),
  ('curry-leaf', 'Curry leaf'),
  ('curry-leaf', 'kadi patta'),
  ('mint', 'Mint'),
  ('mint', 'pudina'),
  ('lemongrass', 'Lemongrass'),
  ('flowers-floriculture', 'Flowers and floriculture'),
  ('rose', 'Rose'),
  ('rose', 'gulab'),
  ('marigold', 'Marigold'),
  ('marigold', 'genda'),
  ('marigold', 'zendu'),
  ('jasmine', 'Jasmine'),
  ('jasmine', 'mogra'),
  ('chrysanthemum', 'Chrysanthemum'),
  ('chrysanthemum', 'shevanti'),
  ('tuberose', 'Tuberose'),
  ('tuberose', 'rajnigandha'),
  ('gladiolus', 'Gladiolus'),
  ('orchids', 'Orchids'),
  ('gerbera', 'Gerbera'),
  ('lotus', 'Lotus'),
  ('lotus', 'kamal'),
  ('medicinal-aromatic-plants', 'Medicinal and aromatic plants'),
  ('aloe-vera', 'Aloe vera'),
  ('tulsi', 'Tulsi'),
  ('tulsi', 'holy basil'),
  ('ashwagandha', 'Ashwagandha'),
  ('ashwagandha', 'winter cherry'),
  ('isabgol', 'Isabgol'),
  ('isabgol', 'psyllium'),
  ('senna', 'Senna'),
  ('stevia', 'Stevia'),
  ('vetiver', 'Vetiver'),
  ('vetiver', 'khus'),
  ('citronella', 'Citronella'),
  ('mentha', 'Mentha'),
  ('mentha', 'menthol mint'),
  ('safed-musli', 'Safed musli'),
  ('kalmegh', 'Kalmegh'),
  ('kalmegh', 'andrographis'),
  ('plantation-crops', 'Plantation crops'),
  ('tea', 'Tea'),
  ('coffee', 'Coffee'),
  ('coconut', 'Coconut'),
  ('rubber', 'Rubber'),
  ('arecanut', 'Arecanut'),
  ('arecanut', 'betel nut'),
  ('arecanut', 'supari'),
  ('cashew', 'Cashew'),
  ('cashew', 'kaju'),
  ('cocoa', 'Cocoa'),
  ('vanilla', 'Vanilla'),
  ('nursery-seed-production', 'Nursery and seed production'),
  ('protected-cultivation', 'Protected cultivation'),
  ('hydroponics', 'Hydroponics'),
  ('aquaponics', 'Aquaponics'),
  ('vertical-urban-farming', 'Vertical and urban farming'),
  ('mushroom-cultivation', 'Mushroom cultivation'),
  ('button-mushroom', 'Button mushroom'),
  ('oyster-mushroom', 'Oyster mushroom'),
  ('milky-mushroom', 'Milky mushroom'),
  ('paddy-straw-mushroom', 'Paddy straw mushroom'),
  ('shiitake-mushroom', 'Shiitake mushroom'),
  ('other-edible-mushrooms', 'Other edible mushrooms'),
  ('livestock', 'Livestock farming'),
  ('dairy-cattle', 'Dairy cattle'),
  ('buffalo-farming', 'Buffalo farming'),
  ('goat-farming', 'Goat farming'),
  ('sheep-farming', 'Sheep farming'),
  ('pig-farming', 'Pig farming'),
  ('rabbit-farming', 'Rabbit farming'),
  ('cattle-rearing', 'Cattle rearing'),
  ('yak-farming', 'Yak farming'),
  ('mithun-farming', 'Mithun farming'),
  ('camel-farming', 'Camel farming'),
  ('equine-farming', 'Horse, pony and donkey farming'),
  ('other-livestock', 'Other livestock'),
  ('milk', 'Milk'),
  ('milk', 'raw milk'),
  ('milk', 'fresh milk'),
  ('milk', 'doodh'),
  ('cow-milk', 'Cow milk'),
  ('buffalo-milk', 'Buffalo milk'),
  ('goat-milk', 'Goat milk'),
  ('sheep-milk', 'Sheep milk'),
  ('camel-milk', 'Camel milk'),
  ('yak-milk', 'Yak milk'),
  ('farm-dairy-products', 'Farm dairy products'),
  ('farm-dairy-products', 'dairy produce'),
  ('curd-yogurt', 'Curd and yogurt'),
  ('curd-yogurt', 'dahi'),
  ('paneer', 'Paneer'),
  ('paneer', 'cottage cheese'),
  ('ghee', 'Ghee'),
  ('ghee', 'clarified butter'),
  ('meat', 'Meat'),
  ('meat', 'livestock meat'),
  ('buffalo-meat', 'Buffalo meat'),
  ('goat-meat', 'Goat meat'),
  ('goat-meat', 'chevon'),
  ('sheep-meat-mutton', 'Sheep meat (mutton)'),
  ('sheep-meat-mutton', 'mutton'),
  ('pork', 'Pork'),
  ('pork', 'pig meat'),
  ('rabbit-meat', 'Rabbit meat'),
  ('wool', 'Wool'),
  ('wool', 'raw wool'),
  ('animal-manure', 'Animal manure'),
  ('animal-manure', 'farmyard manure'),
  ('animal-manure', 'fym'),
  ('poultry', 'Poultry farming'),
  ('broiler-chicken', 'Broiler chicken'),
  ('layer-egg-production', 'Layer and egg production'),
  ('backyard-native-poultry', 'Backyard and native poultry'),
  ('duck-farming', 'Duck farming'),
  ('turkey-farming', 'Turkey farming'),
  ('quail-farming', 'Quail farming'),
  ('poultry-hatchery', 'Poultry hatchery and chicks'),
  ('eggs', 'Eggs'),
  ('eggs', 'farm eggs'),
  ('chicken-eggs', 'Chicken eggs'),
  ('chicken-eggs', 'hen eggs'),
  ('duck-eggs', 'Duck eggs'),
  ('quail-eggs', 'Quail eggs'),
  ('poultry-meat', 'Poultry meat'),
  ('chicken-meat', 'Chicken meat'),
  ('chicken-meat', 'broiler meat'),
  ('duck-meat', 'Duck meat'),
  ('turkey-meat', 'Turkey meat'),
  ('quail-meat', 'Quail meat'),
  ('fisheries-aquaculture', 'Fisheries, aquaculture and seafood'),
  ('freshwater-aquaculture', 'Freshwater aquaculture'),
  ('brackish-water-aquaculture', 'Brackish-water aquaculture'),
  ('marine-aquaculture', 'Marine aquaculture'),
  ('inland-capture-fisheries', 'Inland capture fisheries'),
  ('marine-capture-fisheries', 'Marine capture fisheries'),
  ('shrimp-prawn', 'Shrimp and prawn'),
  ('crab-lobster', 'Crab and lobster'),
  ('molluscs-shellfish', 'Molluscs and shellfish'),
  ('pearl-culture', 'Pearl culture'),
  ('seaweed-farming', 'Seaweed farming'),
  ('ornamental-fish', 'Ornamental fish'),
  ('fish-hatchery-seed', 'Fish hatchery and seed'),
  ('rohu', 'Rohu'),
  ('rohu', 'rui'),
  ('catla', 'Catla'),
  ('catla', 'katla'),
  ('mrigal', 'Mrigal'),
  ('common-carp', 'Common carp'),
  ('grass-carp', 'Grass carp'),
  ('silver-carp', 'Silver carp'),
  ('tilapia', 'Tilapia'),
  ('pangasius', 'Pangasius'),
  ('pangasius', 'pangas'),
  ('magur-singhi-catfish', 'Magur, singhi and catfish'),
  ('magur-singhi-catfish', 'catfish'),
  ('magur-singhi-catfish', 'magur'),
  ('magur-singhi-catfish', 'singhi'),
  ('murrel-snakehead', 'Murrel (snakehead)'),
  ('murrel-snakehead', 'snakehead fish'),
  ('trout-coldwater-fish', 'Trout and cold-water fish'),
  ('trout-coldwater-fish', 'trout'),
  ('seabass', 'Seabass'),
  ('seabass', 'barramundi'),
  ('milkfish', 'Milkfish'),
  ('cobia', 'Cobia'),
  ('pompano', 'Pompano'),
  ('grouper-mullet', 'Grouper and mullet'),
  ('freshwater-prawn', 'Freshwater prawn'),
  ('freshwater-prawn', 'scampi'),
  ('vannamei-shrimp', 'Vannamei shrimp'),
  ('vannamei-shrimp', 'whiteleg shrimp'),
  ('tiger-prawn', 'Tiger prawn'),
  ('tiger-prawn', 'black tiger shrimp'),
  ('oyster', 'Oyster'),
  ('mussel', 'Mussel'),
  ('clam', 'Clam'),
  ('squid-octopus', 'Squid and octopus'),
  ('dried-fish', 'Dried fish'),
  ('allied-activities', 'Allied agricultural activities'),
  ('beekeeping-apiculture', 'Beekeeping and apiculture'),
  ('sericulture', 'Sericulture'),
  ('lac-cultivation', 'Lac cultivation'),
  ('agroforestry', 'Agroforestry'),
  ('vermicompost-compost', 'Vermicompost and compost'),
  ('on-farm-processing', 'On-farm processing and value addition'),
  ('integrated-farming', 'Integrated farming systems'),
  ('honey', 'Honey'),
  ('honey', 'natural honey'),
  ('beeswax', 'Beeswax'),
  ('silk-cocoons', 'Silk cocoons'),
  ('lac-resin', 'Lac resin'),
  ('lac-resin', 'shellac'),
  ('compost', 'Compost'),
  ('vermicompost', 'Vermicompost'),
  ('farm-seed', 'Farm seed'),
  ('farm-seed', 'saved seed'),
  ('farm-seed', 'seed produce'),
  ('planting-material', 'Planting material'),
  ('planting-material', 'cuttings'),
  ('planting-material', 'rootstock'),
  ('nursery-saplings', 'Nursery plants and saplings'),
  ('nursery-saplings', 'saplings'),
  ('nursery-saplings', 'seedlings'),
  ('jaggery', 'Jaggery'),
  ('jaggery', 'gur'),
  ('jaggery', 'gul'),
  ('agroforestry-produce', 'Agroforestry produce'),
  ('bamboo-cane', 'Bamboo and cane')
), normalized_labels as (
  select distinct category_slug,
    lower(regexp_replace(btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g')) as normalized_label
  from category_labels
), legacy_matches as (
  select distinct profiles.id as profile_id, labels.category_slug,
    case profiles.account_role
      when 'farmer' then 'grows'
      when 'wholesaler' then 'supplies'
      when 'customer' then 'interested_in'
      else 'services'
    end as relationship
  from public.profiles
  cross join lateral unnest(coalesce(profiles.crops, '{}'::text[])) as crop(label)
  join normalized_labels labels
    on labels.normalized_label = lower(regexp_replace(btrim(normalize(crop.label, NFKC)), '[[:space:]]+', ' ', 'g'))
)
insert into public.profile_category_affinities (
  profile_id, category_slug, relationship, is_primary
)
select profile_id, category_slug, relationship, false
from legacy_matches
on conflict do nothing;

-- Preserve safe, unmatched legacy values as private moderation requests so
-- a farmer-defined food or produce category is not discarded.
with category_labels(label) as (
values
  ('Crop cultivation'),
  ('Cereals and grains'),
  ('Rice'),
  ('paddy'),
  ('dhan'),
  ('chawal'),
  ('Wheat'),
  ('gehun'),
  ('atta wheat'),
  ('Maize'),
  ('corn'),
  ('makka'),
  ('makai'),
  ('Barley'),
  ('jau'),
  ('Oats'),
  ('Rye'),
  ('Sorghum (jowar)'),
  ('jowar'),
  ('great millet'),
  ('Pearl millet (bajra)'),
  ('bajra'),
  ('Finger millet (ragi)'),
  ('ragi'),
  ('nachni'),
  ('mandua'),
  ('Foxtail millet'),
  ('kangni'),
  ('kakun'),
  ('Kodo millet'),
  ('kodra'),
  ('Little millet'),
  ('kutki'),
  ('samai'),
  ('Proso millet'),
  ('cheena'),
  ('barri'),
  ('Barnyard millet'),
  ('sanwa'),
  ('jhangora'),
  ('Browntop millet'),
  ('Buckwheat'),
  ('kuttu'),
  ('Grain amaranth'),
  ('rajgira'),
  ('ramdana'),
  ('Quinoa'),
  ('Other millets'),
  ('millets'),
  ('small millets'),
  ('Pulses and legumes'),
  ('Chickpea (gram)'),
  ('chana'),
  ('bengal gram'),
  ('Pigeon pea (tur)'),
  ('tur'),
  ('toor'),
  ('arhar'),
  ('Lentil'),
  ('masur'),
  ('masoor'),
  ('Mung bean'),
  ('moong'),
  ('green gram'),
  ('Urad bean'),
  ('black gram'),
  ('udad'),
  ('Field pea'),
  ('dry pea'),
  ('matar'),
  ('Cowpea'),
  ('lobia'),
  ('black-eyed pea'),
  ('Kidney bean (rajma)'),
  ('rajma'),
  ('Moth bean'),
  ('matki'),
  ('Horse gram'),
  ('kulthi'),
  ('Lablab bean'),
  ('hyacinth bean'),
  ('sem'),
  ('Broad bean'),
  ('fava bean'),
  ('Cluster bean (guar)'),
  ('guar'),
  ('guvar'),
  ('Other dry beans'),
  ('Oilseeds'),
  ('Groundnut'),
  ('Mustard and rapeseed'),
  ('Soybean'),
  ('Sesame'),
  ('Sunflower'),
  ('Safflower'),
  ('kardi'),
  ('kusum'),
  ('Linseed (flaxseed)'),
  ('alsi'),
  ('Castor seed'),
  ('arandi'),
  ('Niger seed'),
  ('ramtil'),
  ('Oil palm'),
  ('Commercial and field crops'),
  ('Cotton'),
  ('Jute'),
  ('Sugarcane'),
  ('Sugar beet'),
  ('Tobacco'),
  ('Mesta'),
  ('kenaf'),
  ('Sisal fibre'),
  ('Flax fibre'),
  ('Fodder and forage crops'),
  ('Berseem fodder'),
  ('egyptian clover'),
  ('Lucerne (alfalfa)'),
  ('Napier grass'),
  ('elephant grass'),
  ('Fodder maize'),
  ('Fodder sorghum'),
  ('Pasture grasses'),
  ('Silage'),
  ('Hay'),
  ('Horticulture'),
  ('Fruit and orchard farming'),
  ('Mango'),
  ('Banana'),
  ('Grapes'),
  ('Pomegranate'),
  ('Citrus'),
  ('Apple and temperate fruit'),
  ('Guava'),
  ('amrud'),
  ('peru'),
  ('Papaya'),
  ('papita'),
  ('Pineapple'),
  ('ananas'),
  ('Litchi'),
  ('lychee'),
  ('Sapota (chikoo)'),
  ('chikoo'),
  ('chiku'),
  ('Jackfruit'),
  ('kathal'),
  ('phanus'),
  ('Aonla (Indian gooseberry)'),
  ('amla'),
  ('Ber (Indian jujube)'),
  ('bor'),
  ('jujube'),
  ('Custard apple'),
  ('sitaphal'),
  ('sugar apple'),
  ('Watermelon'),
  ('tarbooz'),
  ('Muskmelon'),
  ('kharbuja'),
  ('cantaloupe'),
  ('Pear'),
  ('nashpati'),
  ('Peach'),
  ('aadu'),
  ('Plum'),
  ('aloo bukhara'),
  ('Apricot'),
  ('khubani'),
  ('Cherry'),
  ('Kiwi'),
  ('Strawberry'),
  ('Fig'),
  ('anjeer'),
  ('Dates'),
  ('date palm'),
  ('khajur'),
  ('Dragon fruit'),
  ('kamalam'),
  ('Passion fruit'),
  ('Avocado'),
  ('butter fruit'),
  ('Bael'),
  ('wood apple'),
  ('Jamun'),
  ('java plum'),
  ('Mulberry'),
  ('shahtoot'),
  ('Tamarind'),
  ('imli'),
  ('chinch'),
  ('Vegetable farming'),
  ('Tomato'),
  ('tamatar'),
  ('Onion'),
  ('pyaz'),
  ('kanda'),
  ('Potato, roots and tubers'),
  ('potato'),
  ('aloo'),
  ('Okra'),
  ('ladyfinger'),
  ('lady''s finger'),
  ('bhindi'),
  ('Leafy vegetables'),
  ('Brinjal (eggplant)'),
  ('eggplant'),
  ('aubergine'),
  ('baingan'),
  ('vangi'),
  ('Cabbage'),
  ('patta gobhi'),
  ('Cauliflower'),
  ('phool gobhi'),
  ('Broccoli'),
  ('Capsicum'),
  ('bell pepper'),
  ('sweet pepper'),
  ('shimla mirch'),
  ('Green chilli'),
  ('green chili'),
  ('hari mirch'),
  ('Cucumber'),
  ('kheera'),
  ('kakdi'),
  ('Gherkin'),
  ('pickling cucumber'),
  ('Carrot'),
  ('gajar'),
  ('Radish'),
  ('mooli'),
  ('Beetroot'),
  ('beet'),
  ('Turnip'),
  ('shalgam'),
  ('Green peas'),
  ('peas'),
  ('Green beans'),
  ('snap beans'),
  ('French beans'),
  ('common beans'),
  ('Bitter gourd'),
  ('karela'),
  ('bitter melon'),
  ('Bottle gourd'),
  ('lauki'),
  ('dudhi'),
  ('Ridge gourd'),
  ('turai'),
  ('dodka'),
  ('Sponge gourd'),
  ('gilki'),
  ('Snake gourd'),
  ('padwal'),
  ('Ash gourd'),
  ('winter melon'),
  ('petha'),
  ('Pointed gourd'),
  ('parwal'),
  ('potol'),
  ('Pumpkin and squash'),
  ('kaddu'),
  ('sitaphal vegetable'),
  ('Sweet potato'),
  ('shakarkand'),
  ('ratale'),
  ('Cassava (tapioca)'),
  ('cassava'),
  ('tapioca'),
  ('Elephant foot yam'),
  ('suran'),
  ('jimikand'),
  ('Yam'),
  ('Colocasia (taro)'),
  ('arbi'),
  ('alu'),
  ('Garlic'),
  ('lahsun'),
  ('Drumstick (moringa)'),
  ('moringa'),
  ('sahjan'),
  ('shevga'),
  ('Spinach'),
  ('palak'),
  ('Amaranth greens'),
  ('chaulai'),
  ('math'),
  ('Fenugreek leaves'),
  ('methi'),
  ('Mustard greens'),
  ('sarson saag'),
  ('Lettuce'),
  ('Celery'),
  ('Asparagus'),
  ('Sweet corn'),
  ('Baby corn'),
  ('Zucchini'),
  ('courgette'),
  ('Knol-khol'),
  ('kohlrabi'),
  ('ganth gobhi'),
  ('Spices and condiments'),
  ('Black pepper'),
  ('peppercorn'),
  ('kali mirch'),
  ('Dry chilli'),
  ('red chilli'),
  ('red chili'),
  ('lal mirch'),
  ('Turmeric'),
  ('haldi'),
  ('Ginger'),
  ('adrak'),
  ('Coriander'),
  ('dhania'),
  ('cilantro seed'),
  ('Cumin'),
  ('jeera'),
  ('Fennel'),
  ('saunf'),
  ('Fenugreek seed'),
  ('methi seed'),
  ('Cardamom'),
  ('elaichi'),
  ('Clove'),
  ('laung'),
  ('Cinnamon and cassia'),
  ('dalchini'),
  ('Nutmeg and mace'),
  ('jaiphal'),
  ('javitri'),
  ('Ajwain'),
  ('carom seed'),
  ('Dill'),
  ('suva'),
  ('shepu'),
  ('Saffron'),
  ('kesar'),
  ('Kokum'),
  ('Asafoetida'),
  ('hing'),
  ('Curry leaf'),
  ('kadi patta'),
  ('Mint'),
  ('pudina'),
  ('Lemongrass'),
  ('Flowers and floriculture'),
  ('Rose'),
  ('gulab'),
  ('Marigold'),
  ('genda'),
  ('zendu'),
  ('Jasmine'),
  ('mogra'),
  ('Chrysanthemum'),
  ('shevanti'),
  ('Tuberose'),
  ('rajnigandha'),
  ('Gladiolus'),
  ('Orchids'),
  ('Gerbera'),
  ('Lotus'),
  ('kamal'),
  ('Medicinal and aromatic plants'),
  ('Aloe vera'),
  ('Tulsi'),
  ('holy basil'),
  ('Ashwagandha'),
  ('winter cherry'),
  ('Isabgol'),
  ('psyllium'),
  ('Senna'),
  ('Stevia'),
  ('Vetiver'),
  ('khus'),
  ('Citronella'),
  ('Mentha'),
  ('menthol mint'),
  ('Safed musli'),
  ('Kalmegh'),
  ('andrographis'),
  ('Plantation crops'),
  ('Tea'),
  ('Coffee'),
  ('Coconut'),
  ('Rubber'),
  ('Arecanut'),
  ('betel nut'),
  ('supari'),
  ('Cashew'),
  ('kaju'),
  ('Cocoa'),
  ('Vanilla'),
  ('Nursery and seed production'),
  ('Protected cultivation'),
  ('Hydroponics'),
  ('Aquaponics'),
  ('Vertical and urban farming'),
  ('Mushroom cultivation'),
  ('Button mushroom'),
  ('Oyster mushroom'),
  ('Milky mushroom'),
  ('Paddy straw mushroom'),
  ('Shiitake mushroom'),
  ('Other edible mushrooms'),
  ('Livestock farming'),
  ('Dairy cattle'),
  ('Buffalo farming'),
  ('Goat farming'),
  ('Sheep farming'),
  ('Pig farming'),
  ('Rabbit farming'),
  ('Cattle rearing'),
  ('Yak farming'),
  ('Mithun farming'),
  ('Camel farming'),
  ('Horse, pony and donkey farming'),
  ('Other livestock'),
  ('Milk'),
  ('raw milk'),
  ('fresh milk'),
  ('doodh'),
  ('Cow milk'),
  ('Buffalo milk'),
  ('Goat milk'),
  ('Sheep milk'),
  ('Camel milk'),
  ('Yak milk'),
  ('Farm dairy products'),
  ('dairy produce'),
  ('Curd and yogurt'),
  ('dahi'),
  ('Paneer'),
  ('cottage cheese'),
  ('Ghee'),
  ('clarified butter'),
  ('Meat'),
  ('livestock meat'),
  ('Buffalo meat'),
  ('Goat meat'),
  ('chevon'),
  ('Sheep meat (mutton)'),
  ('mutton'),
  ('Pork'),
  ('pig meat'),
  ('Rabbit meat'),
  ('Wool'),
  ('raw wool'),
  ('Animal manure'),
  ('farmyard manure'),
  ('fym'),
  ('Poultry farming'),
  ('Broiler chicken'),
  ('Layer and egg production'),
  ('Backyard and native poultry'),
  ('Duck farming'),
  ('Turkey farming'),
  ('Quail farming'),
  ('Poultry hatchery and chicks'),
  ('Eggs'),
  ('farm eggs'),
  ('Chicken eggs'),
  ('hen eggs'),
  ('Duck eggs'),
  ('Quail eggs'),
  ('Poultry meat'),
  ('Chicken meat'),
  ('broiler meat'),
  ('Duck meat'),
  ('Turkey meat'),
  ('Quail meat'),
  ('Fisheries, aquaculture and seafood'),
  ('Freshwater aquaculture'),
  ('Brackish-water aquaculture'),
  ('Marine aquaculture'),
  ('Inland capture fisheries'),
  ('Marine capture fisheries'),
  ('Shrimp and prawn'),
  ('Crab and lobster'),
  ('Molluscs and shellfish'),
  ('Pearl culture'),
  ('Seaweed farming'),
  ('Ornamental fish'),
  ('Fish hatchery and seed'),
  ('Rohu'),
  ('rui'),
  ('Catla'),
  ('katla'),
  ('Mrigal'),
  ('Common carp'),
  ('Grass carp'),
  ('Silver carp'),
  ('Tilapia'),
  ('Pangasius'),
  ('pangas'),
  ('Magur, singhi and catfish'),
  ('catfish'),
  ('magur'),
  ('singhi'),
  ('Murrel (snakehead)'),
  ('snakehead fish'),
  ('Trout and cold-water fish'),
  ('trout'),
  ('Seabass'),
  ('barramundi'),
  ('Milkfish'),
  ('Cobia'),
  ('Pompano'),
  ('Grouper and mullet'),
  ('Freshwater prawn'),
  ('scampi'),
  ('Vannamei shrimp'),
  ('whiteleg shrimp'),
  ('Tiger prawn'),
  ('black tiger shrimp'),
  ('Oyster'),
  ('Mussel'),
  ('Clam'),
  ('Squid and octopus'),
  ('Dried fish'),
  ('Allied agricultural activities'),
  ('Beekeeping and apiculture'),
  ('Sericulture'),
  ('Lac cultivation'),
  ('Agroforestry'),
  ('Vermicompost and compost'),
  ('On-farm processing and value addition'),
  ('Integrated farming systems'),
  ('Honey'),
  ('natural honey'),
  ('Beeswax'),
  ('Silk cocoons'),
  ('Lac resin'),
  ('shellac'),
  ('Compost'),
  ('Vermicompost'),
  ('Farm seed'),
  ('saved seed'),
  ('seed produce'),
  ('Planting material'),
  ('cuttings'),
  ('rootstock'),
  ('Nursery plants and saplings'),
  ('saplings'),
  ('seedlings'),
  ('Jaggery'),
  ('gur'),
  ('gul'),
  ('Agroforestry produce'),
  ('Bamboo and cane')
), normalized_labels as (
  select distinct lower(regexp_replace(btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g')) as normalized_label
  from category_labels
), candidates as (
  select distinct on (profiles.id, normalized.normalized_label)
    profiles.id as profile_id, crop.label as original_label,
    normalized.normalized_label,
    case profiles.account_role
      when 'farmer' then 'grows'
      when 'wholesaler' then 'supplies'
      when 'customer' then 'interested_in'
      else 'services'
    end as relationship
  from public.profiles
  cross join lateral unnest(coalesce(profiles.crops, '{}'::text[])) as crop(label)
  cross join lateral (
    select lower(regexp_replace(btrim(normalize(crop.label, NFKC)), '[[:space:]]+', ' ', 'g')) as normalized_label
  ) normalized
  where char_length(btrim(crop.label)) between 2 and 80
    and crop.label !~ '[[:cntrl:]]'
    and translate(
      crop.label,
      chr(8203) || chr(8234) || chr(8235) || chr(8236) || chr(8237) ||
      chr(8238) || chr(8288) || chr(8294) || chr(8295) || chr(8296) ||
      chr(8297) || chr(65279),
      ''
    ) = crop.label
    and crop.label !~ '@'
    and crop.label !~ '[+]?[0-9][0-9 ().-]{6,}[0-9]'
    and crop.label !~* '(https?://|www[.]|[[:alnum:]-]+[.](com|in|org|net|co|io)([^[:alnum:]]|$))'
    and crop.label !~* '(buy[[:space:]]+now|call[[:space:]]+now|contact[[:space:]]+us|best[[:space:]]+price|limited[[:space:]]+time|discount|sale|offer|whats?app|[0-9]+[[:space:]]*%[[:space:]]*off)'
    and not exists (
      select 1 from normalized_labels labels
      where labels.normalized_label = normalized.normalized_label
    )
  order by profiles.id, normalized.normalized_label, crop.label
)
insert into public.custom_category_requests (
  requested_by, source, domain, relationship, original_label, locale_tag
)
select candidate.profile_id, 'legacy_import', 'commodity',
  candidate.relationship, candidate.original_label,
  coalesce(profiles.preferred_locale, 'en-IN')
from candidates candidate
join public.profiles on profiles.id = candidate.profile_id
where not exists (
  select 1 from public.custom_category_requests request
  where request.requested_by = candidate.profile_id
    and request.normalized_label = candidate.normalized_label
);

insert into public.profile_custom_category_affinities (
  profile_id, custom_category_request_id, relationship, is_primary
)
select request.requested_by, request.id, request.relationship, false
from public.custom_category_requests request
where request.source = 'legacy_import'
on conflict do nothing;

-- The shared picker now asks for a missing food, produce or farm product.
-- Store those canonical-onboarding custom values in the commodity review
-- domain while retaining the existing bounded, idempotent finalize contract.
create or replace function public.finalize_onboarding(
  expected_revision_input integer,
  idempotency_key_input uuid
)
returns table(code text, revision integer, organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  progress_value public.onboarding_progress%rowtype;
  profile_value public.profiles%rowtype;
  draft_value jsonb;
  identity_value jsonb;
  role_details_value jsonb;
  organization_value jsonb;
  category_values jsonb;
  custom_values jsonb;
  category_slugs_value text[] := '{}'::text[];
  custom_labels_value text[] := '{}'::text[];
  company_sector_slugs_value text[] := '{}'::text[];
  account_role_value text;
  participant_type_value text;
  locale_value text;
  relationship_value text;
  farming_method_value text;
  experience_years_value integer;
  profile_visibility_value text;
  organization_result jsonb;
  organization_id_value uuid;
  organization_service_areas jsonb;
  fingerprint_value text;
  next_revision integer;
begin
  if not public.is_ecosystem_release_enabled('resumable_onboarding') then
    raise exception 'Resumable onboarding is not released'
      using errcode = '55000', detail = 'RESUMABLE_ONBOARDING_DISABLED';
  end if;
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501', detail = 'UNAUTHENTICATED';
  end if;
  if idempotency_key_input is null then
    raise exception 'Idempotency key is required'
      using errcode = '22023', detail = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into progress_value
  from public.onboarding_progress
  where profile_id = actor_id
  for update;

  if progress_value.profile_id is null then
    raise exception 'Onboarding draft not found'
      using errcode = 'P0002', detail = 'ONBOARDING_DRAFT_NOT_FOUND';
  end if;

  fingerprint_value := public.sha256_hex(
    'finalize:' || expected_revision_input::text
  );

  if progress_value.last_idempotency_key = idempotency_key_input
     and progress_value.last_idempotency_fingerprint is distinct from fingerprint_value
  then
    return query select
      'IDEMPOTENCY_CONFLICT'::text,
      progress_value.revision,
      null::uuid;
    return;
  end if;

  if progress_value.status = 'complete' then
    if progress_value.last_idempotency_key = idempotency_key_input
       and progress_value.last_idempotency_fingerprint = fingerprint_value
    then
      select membership.organization_id into organization_id_value
      from public.organization_memberships membership
      where membership.profile_id = actor_id
        and membership.role = 'owner'
        and membership.status = 'active'
      order by membership.created_at
      limit 1;
      return query select
        'IDEMPOTENT_REPLAY'::text,
        progress_value.revision,
        organization_id_value;
    else
      return query select
        'ALREADY_COMPLETED'::text,
        progress_value.revision,
        null::uuid;
    end if;
    return;
  end if;

  if progress_value.revision <> expected_revision_input then
    return query select
      'REVISION_CONFLICT'::text,
      progress_value.revision,
      null::uuid;
    return;
  end if;

  select * into profile_value
  from public.profiles
  where id = actor_id
  for update;
  if profile_value.id is null then
    raise exception 'Profile not found'
      using errcode = 'P0002', detail = 'PROFILE_NOT_FOUND';
  end if;
  if profile_value.status <> 'active' then
    raise exception 'An active profile is required'
      using errcode = '42501', detail = 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if profile_value.onboarding_complete then
    raise exception 'Onboarding is already complete'
      using errcode = '55000', detail = 'ONBOARDING_ALREADY_COMPLETE';
  end if;

  if progress_value.flow_version <> 1
     or cardinality(progress_value.completed_steps) <> 6
     or not progress_value.completed_steps @> array[
       'language', 'role', 'identity_location', 'agriculture', 'role_details',
       'review_visibility'
     ]::text[]
  then
    raise exception 'All six onboarding steps must be complete'
      using errcode = '22023', detail = 'INCOMPLETE_ONBOARDING_DRAFT';
  end if;

  draft_value := progress_value.draft_data;
  account_role_value := progress_value.account_role;
  locale_value := draft_value ->> 'locale';
  identity_value := draft_value -> 'identity';
  role_details_value := draft_value -> 'roleDetails';
  category_values := draft_value -> 'selectedCategorySlugs';
  custom_values := draft_value -> 'customCategoryLabels';
  profile_visibility_value := draft_value #>> '{reviewVisibility,profileVisibility}';

  if account_role_value is null
     or account_role_value not in ('farmer', 'customer', 'wholesaler', 'agri_business')
     or draft_value ->> 'accountRole' is distinct from account_role_value
     or jsonb_typeof(identity_value) <> 'object'
     or jsonb_typeof(role_details_value) <> 'object'
     or role_details_value ->> 'accountRole' is distinct from account_role_value
     or jsonb_typeof(category_values) <> 'array'
     or jsonb_array_length(category_values) > 20
     or jsonb_typeof(custom_values) <> 'array'
     or jsonb_array_length(custom_values) > 3
     or profile_visibility_value is null
     or profile_visibility_value not in ('members', 'public')
     or jsonb_typeof(draft_value #> '{reviewVisibility,termsAccepted}') <> 'boolean'
     or draft_value #> '{reviewVisibility,termsAccepted}' <> 'true'::jsonb
  then
    raise exception 'Onboarding draft structure is invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_DRAFT';
  end if;

  if exists (
    select 1 from jsonb_array_elements(category_values) item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(custom_values) item
    where jsonb_typeof(item) <> 'string'
  ) then
    raise exception 'Onboarding category values must be strings'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_CATEGORIES';
  end if;

  select coalesce(array_agg(value order by ordinal), '{}'::text[])
  into category_slugs_value
  from jsonb_array_elements_text(category_values) with ordinality item(value, ordinal);
  select coalesce(array_agg(value order by ordinal), '{}'::text[])
  into custom_labels_value
  from jsonb_array_elements_text(custom_values) with ordinality item(value, ordinal);

  if cardinality(category_slugs_value) + cardinality(custom_labels_value) < 1
     or cardinality(category_slugs_value) <> (
       select count(distinct slug) from unnest(category_slugs_value) slug
     )
     or cardinality(custom_labels_value) <> (
       select count(distinct lower(regexp_replace(
         btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g'
       ))) from unnest(custom_labels_value) label
     )
     or exists (
       select 1
       from unnest(category_slugs_value) requested_slug
       left join public.agriculture_categories category
         on category.slug = requested_slug
       where category.slug is null
         or category.domain not in ('farming_activity', 'commodity')
         or category.status <> 'active'
         or not category.selectable
     )
     or exists (
       select 1
       from unnest(custom_labels_value) custom_label
       join public.agriculture_categories category
         on category.domain in ('farming_activity', 'commodity')
        and category.status = 'active'
        and (
          lower(regexp_replace(
            btrim(normalize(custom_label, NFKC)), '[[:space:]]+', ' ', 'g'
          )) = replace(category.slug, '-', ' ')
          or regexp_replace(
            lower(normalize(custom_label, NFKC)), '[^[:alnum:]]', '', 'g'
          ) = regexp_replace(category.slug, '[^[:alnum:]]', '', 'g')
        )
     )
  then
    raise exception 'Onboarding categories are invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_CATEGORIES';
  end if;

  if not exists (
    select 1 from public.supported_locales
    where locale_tag = locale_value and enabled
  ) then
    raise exception 'Onboarding locale is invalid'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_LOCALE';
  end if;
  if locale_value not in ('en-IN', 'hi-IN', 'mr-IN')
     and not public.is_ecosystem_release_enabled('extended_locales')
  then
    raise exception 'Extended locales are not released'
      using errcode = '55000', detail = 'EXTENDED_LOCALES_DISABLED';
  end if;

  if identity_value ->> 'fullName' is null
     or identity_value ->> 'handle' is null
     or identity_value ->> 'state' is null
     or identity_value ->> 'district' is null
     or char_length(btrim(identity_value ->> 'fullName')) not between 2 and 80
     or (identity_value ->> 'handle') !~ '^[a-z0-9_]{3,30}$'
     or not public.is_india_state_or_union_territory(identity_value ->> 'state')
     or char_length(btrim(identity_value ->> 'district')) not between 2 and 80
     or char_length(coalesce(identity_value ->> 'bio', '')) > 500
  then
    raise exception 'Identity and location are invalid'
      using errcode = '22023', detail = 'INVALID_IDENTITY_LOCATION';
  end if;

  if exists (
    select 1 from public.profiles
    where handle = identity_value ->> 'handle' and id <> actor_id
  ) then
    raise exception 'Handle is already in use'
      using errcode = '23505', detail = 'HANDLE_CONFLICT';
  end if;

  if role_details_value ? 'experienceYears' then
    if jsonb_typeof(role_details_value -> 'experienceYears') <> 'number'
       or (role_details_value ->> 'experienceYears') !~ '^[0-9]+$'
       or (role_details_value ->> 'experienceYears')::numeric not between 0 and 80
    then
      raise exception 'Experience years are invalid'
        using errcode = '22023', detail = 'INVALID_ROLE_DETAILS';
    end if;
    experience_years_value := (role_details_value ->> 'experienceYears')::integer;
  end if;

  if account_role_value = 'farmer' then
    farming_method_value := role_details_value ->> 'farmingMethod';
    if farming_method_value not in ('organic', 'natural', 'conventional', 'mixed')
       or experience_years_value is null
    then
      raise exception 'Farmer details are invalid'
        using errcode = '22023', detail = 'INVALID_ROLE_DETAILS';
    end if;
    participant_type_value := 'farmer';
    relationship_value := 'farms';
  elsif account_role_value = 'customer' then
    participant_type_value := 'buyer';
    relationship_value := 'interested_in';
  elsif account_role_value = 'wholesaler' then
    participant_type_value := 'fpo';
    relationship_value := 'buys';
  else
    participant_type_value := 'agri_business';
    relationship_value := 'services';
  end if;

  if account_role_value in ('customer', 'agri_business')
     and profile_visibility_value <> 'members'
  then
    raise exception 'This role uses member-only representative visibility'
      using errcode = '22023', detail = 'INVALID_PROFILE_VISIBILITY';
  end if;

  update public.profiles
  set full_name = btrim(identity_value ->> 'fullName'),
      handle = identity_value ->> 'handle',
      state = btrim(identity_value ->> 'state'),
      district = btrim(identity_value ->> 'district'),
      bio = coalesce(identity_value ->> 'bio', ''),
      account_role = account_role_value,
      participant_type = participant_type_value,
      farming_method = farming_method_value,
      experience_years = experience_years_value,
      preferred_locale = locale_value,
      preferred_language = case
        when locale_value = 'hi-IN' then 'hi'
        when locale_value = 'mr-IN' then 'mr'
        else 'en'
      end,
      public_profile_enabled = (
        account_role_value in ('farmer', 'wholesaler')
        and profile_visibility_value = 'public'
      ),
      onboarding_complete = true
  where id = actor_id;

  delete from public.profile_category_affinities where profile_id = actor_id;
  insert into public.profile_category_affinities (
    profile_id, category_slug, relationship, is_primary
  )
  select actor_id, category_slug, relationship_value, ordinal = 1
  from unnest(category_slugs_value) with ordinality category(category_slug, ordinal);

  delete from public.profile_custom_category_affinities where profile_id = actor_id;
  insert into public.custom_category_requests (
    requested_by, source, domain, relationship, original_label, locale_tag
  )
  select
    actor_id, 'onboarding_submission', 'commodity', relationship_value,
    original_label, locale_value
  from unnest(custom_labels_value) original_label
  on conflict (requested_by, domain, normalized_label)
    where status in ('pending', 'approved', 'merged')
  do nothing;

  insert into public.profile_custom_category_affinities (
    profile_id, custom_category_request_id, relationship, is_primary
  )
  select
    actor_id,
    request.id,
    request.relationship,
    row_number() over (order by request.created_at, request.id) = 1
  from public.custom_category_requests request
  where request.requested_by = actor_id
    and request.domain = 'commodity'
    and request.status in ('pending', 'approved', 'merged')
    and request.normalized_label in (
      select lower(regexp_replace(
        btrim(normalize(label, NFKC)), '[[:space:]]+', ' ', 'g'
      ))
      from unnest(custom_labels_value) label
    )
  on conflict do nothing;

  if account_role_value = 'agri_business' then
    if not public.is_ecosystem_release_enabled('agri_businesses') then
      raise exception 'Agricultural businesses are not released'
        using errcode = '55000', detail = 'AGRI_BUSINESSES_DISABLED';
    end if;
    organization_value := role_details_value -> 'organization';
    if jsonb_typeof(organization_value) <> 'object'
       or jsonb_typeof(organization_value -> 'serviceStates') <> 'array'
       or jsonb_array_length(organization_value -> 'serviceStates') not between 1 and 36
       or jsonb_typeof(organization_value -> 'companySectorSlugs') <> 'array'
       or jsonb_array_length(organization_value -> 'companySectorSlugs') not between 1 and 12
       or jsonb_typeof(draft_value -> 'companySectorSlugs') <> 'array'
       or draft_value -> 'companySectorSlugs'
         is distinct from organization_value -> 'companySectorSlugs'
       or exists (
         select 1 from jsonb_array_elements(organization_value -> 'serviceStates') item
         where jsonb_typeof(item) <> 'string'
       )
       or exists (
         select 1 from jsonb_array_elements(organization_value -> 'companySectorSlugs') item
         where jsonb_typeof(item) <> 'string'
       )
    then
      raise exception 'Organization onboarding details are invalid'
        using errcode = '22023', detail = 'INVALID_ORGANIZATION_DRAFT';
    end if;

    select coalesce(array_agg(value order by ordinal), '{}'::text[])
    into company_sector_slugs_value
    from jsonb_array_elements_text(draft_value -> 'companySectorSlugs')
      with ordinality item(value, ordinal);
    select jsonb_agg(jsonb_build_object(
      'state', value,
      'district', null,
      'service_radius_km', null
    ) order by ordinal)
    into organization_service_areas
    from jsonb_array_elements_text(organization_value -> 'serviceStates')
      with ordinality item(value, ordinal);

    organization_result := public.create_organization_with_owner(
      organization_value ->> 'organizationSlug',
      organization_value ->> 'organizationName',
      organization_value ->> 'organizationType',
      organization_value ->> 'description',
      identity_value ->> 'state',
      identity_value ->> 'district',
      organization_value ->> 'websiteUrl',
      company_sector_slugs_value,
      organization_service_areas
    );
    organization_id_value := (organization_result ->> 'organization_id')::uuid;
  end if;

  insert into public.product_events (user_id, event_name)
  select actor_id, 'profile_completed'
  where not exists (
    select 1 from public.product_events
    where user_id = actor_id and event_name = 'profile_completed'
  );

  next_revision := progress_value.revision + 1;
  update public.onboarding_progress
  set status = 'complete',
      revision = next_revision,
      last_idempotency_key = idempotency_key_input,
      last_idempotency_fingerprint = fingerprint_value
  where profile_id = actor_id;

  return query select 'COMPLETED'::text, next_revision, organization_id_value;
exception
  when check_violation then
    raise exception 'Final onboarding values failed validation'
      using errcode = '22023', detail = 'INVALID_ONBOARDING_DRAFT';
end;
$$;
