"use client";

import Link from "next/link";
import { ArrowUpRight, ExternalLink, Search, ShoppingBag, Store, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import type { UnifiedMarketplaceItem } from "./unified-catalog";

export type UnifiedMarketplaceLabels = {
  eyebrow: string;
  title: string;
  description: string;
  searchLabel: string;
  searchPlaceholder: string;
  categoryLabel: string;
  allCategories: string;
  byProduct: string;
  bySeller: string;
  byCategory: string;
  resultCount: string;
  sellerCount: string;
  categoryCount: string;
  noResultsTitle: string;
  noResultsBody: string;
  browse: string;
  orderEnquiry: string;
  priceOnRequest: string;
  externalStore: string;
  reportedCatalogue: string;
  liveListing: string;
  liveOffer: string;
  farmerBookStore: string;
  partnerStore: string;
  editorialCatalogue: string;
  disclosure: string;
};

type Props = {
  items: readonly UnifiedMarketplaceItem[];
  labels: UnifiedMarketplaceLabels;
  id?: string;
  compact?: boolean;
  plateAwareness?: Readonly<{
    eyebrow: string;
    title: string;
    body: string;
    note: string;
    cta: string;
    evidence: string;
    evidenceHref: string;
    guidance: string;
    guidanceHref: string;
    imageAlt: string;
  }>;
};

type MarketplaceView = "seller" | "category" | "product";

const foodCategoryOrder = [
  "Natural tableware",
  "Dairy & ghee",
  "Vegetables & herbs",
  "Fruits",
  "Grains & millets",
  "Oils & oilseeds",
  "Poultry & eggs",
  "Jaggery & sweeteners",
  "Farm services",
  "Other food & farm products",
] as const;

function foodCategoryFor(item: UnifiedMarketplaceItem) {
  if (item.sellerName === "Vistaraku") return "Natural tableware";

  const itemText = `${item.name} ${item.category} ${item.categorySlug}`
    .replace(/[-_]+/g, " ")
    .toLocaleLowerCase("en-IN");
  if (/\b(tableware|plates?|bowls?|cutlery|straws?|takeaway|thali)\b|\bstitched leaf\b/.test(itemText)) return "Natural tableware";
  if (/\b(dairy|milk|paneer|ghee)\b/.test(itemText)) return "Dairy & ghee";
  if (/\b(poultry|chickens?|eggs?)\b/.test(itemText)) return "Poultry & eggs";
  if (/\b(jaggery|sweeteners?|ladd?u|ladoo)\b/.test(itemText)) return "Jaggery & sweeteners";
  if (/\b(oils?|oilseeds?|groundnut|niger|safflower|sesame|mustard|castor|linseed|flaxseed)\b/.test(itemText)) return "Oils & oilseeds";
  if (/\b(rice|wheat|millets?|ragi|sorghum|jowar|bajra)\b/.test(itemText)) return "Grains & millets";
  if (/\b(fruits?|banana|citrus|coconut|guava|mango|mulberry|muskmelon|papaya|pomegranate|sapota|watermelon)\b/.test(itemText)) return "Fruits";
  if (/\b(vegetables?|gourds?|beetroot|brinjal|eggplant|beans?|cabbage|capsicum|carrot|colocasia|taro|coriander|cucumber|curry leaf|drumstick|moringa|garlic|ginger|chilli|mint|okra|onion|potato|pumpkin|squash|radish|tomato|turmeric|sweet corn)\b/.test(itemText)) return "Vegetables & herbs";
  if (/\b(services?|rental|finance|insurance|advisory|training|support)\b/.test(itemText)) return "Farm services";
  return "Other food & farm products";
}

function compareSellerNames(left: string, right: string) {
  const leftPriority = left === "Vistaraku" ? 0 : 1;
  const rightPriority = right === "Vistaraku" ? 0 : 1;
  return leftPriority - rightPriority || left.localeCompare(right);
}

const sourceIcon = {
  live_listing: Tag,
  live_offer: Store,
  farmerbook_store: ShoppingBag,
  partner_store: ShoppingBag,
  editorial_catalogue: ExternalLink,
} as const;

function sourceLabel(item: UnifiedMarketplaceItem, labels: UnifiedMarketplaceLabels) {
  if (item.availability === "reported") return labels.reportedCatalogue;
  if (item.availability === "external") return labels.externalStore;
  if (item.source === "editorial_catalogue") return labels.editorialCatalogue;
  if (item.source === "partner_store") return labels.partnerStore;
  if (item.source === "farmerbook_store") return labels.farmerBookStore;
  if (item.source === "live_offer") return labels.liveOffer;
  return labels.liveListing;
}

function callToAction(item: UnifiedMarketplaceItem, labels: UnifiedMarketplaceLabels) {
  if (item.availability === "reported") return labels.browse;
  if (item.availability === "external") return labels.externalStore;
  if (item.availability === "enquiry") return labels.orderEnquiry;
  return labels.browse;
}

function MarketplaceLink({
  item,
  children,
  className,
}: {
  item: UnifiedMarketplaceItem;
  children: React.ReactNode;
  className?: string;
}) {
  if (item.external) {
    return (
      <a className={className} href={item.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <Link className={className} href={item.href}>{children}</Link>;
}

function MarketplaceTile({ item, labels }: { item: UnifiedMarketplaceItem; labels: UnifiedMarketplaceLabels }) {
  const Icon = sourceIcon[item.source];
  return (
    <article className="unified-marketplace__tile">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="unified-marketplace__image" src={item.image} alt="" loading="lazy" />
      ) : (
        <div className="unified-marketplace__image unified-marketplace__image--placeholder" aria-hidden="true">
          <Icon size={25} />
        </div>
      )}
      <div className="unified-marketplace__tile-body">
        <div className="unified-marketplace__tile-meta">
          <span className="badge badge--green">{item.category}</span>
          <span className="unified-marketplace__source"><Icon size={13} aria-hidden="true" /> {sourceLabel(item, labels)}</span>
        </div>
        <h3 dir="auto">{item.name}</h3>
        <p className="unified-marketplace__seller" dir="auto">{item.sellerName}</p>
        {item.description ? <p className="unified-marketplace__description" dir="auto">{item.description}</p> : null}
        <div className="unified-marketplace__tile-footer">
          <strong>{item.priceLabel ?? (item.source === "editorial_catalogue" ? labels.editorialCatalogue : labels.priceOnRequest)}</strong>
          <MarketplaceLink item={item} className="unified-marketplace__link">
            {callToAction(item, labels)} <ArrowUpRight size={15} aria-hidden="true" />
          </MarketplaceLink>
        </div>
      </div>
    </article>
  );
}

export function UnifiedMarketplace({ items, labels, id = "unified-marketplace", compact = false, plateAwareness }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [foodCategory, setFoodCategory] = useState("");
  const [view, setView] = useState<MarketplaceView>("seller");

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((left, right) => left.localeCompare(right)),
    [items],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => {
      const matchesQuery = !normalizedQuery || item.searchText.includes(normalizedQuery);
      const matchesCategory = !category || item.category === category;
      const matchesFoodCategory = !foodCategory || foodCategoryFor(item) === foodCategory;
      return matchesQuery && matchesCategory && matchesFoodCategory;
    }),
    [category, foodCategory, items, normalizedQuery],
  );
  const sellerGroups = useMemo(() => {
    const groups = new Map<string, UnifiedMarketplaceItem[]>();
    filteredItems.forEach((item) => groups.set(item.sellerName, [...(groups.get(item.sellerName) ?? []), item]));
    return [...groups.entries()].sort(([left], [right]) => compareSellerNames(left, right));
  }, [filteredItems]);
  const productItems = useMemo(
    () => [...filteredItems].sort((left, right) => compareSellerNames(left.sellerName, right.sellerName)),
    [filteredItems],
  );
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, UnifiedMarketplaceItem[]>();
    filteredItems.forEach((item) => {
      const group = foodCategoryFor(item);
      groups.set(group, [...(groups.get(group) ?? []), item]);
    });
    return [...groups.entries()].sort(([left], [right]) =>
      foodCategoryOrder.indexOf(left as (typeof foodCategoryOrder)[number])
      - foodCategoryOrder.indexOf(right as (typeof foodCategoryOrder)[number]),
    );
  }, [filteredItems]);

  const openCategory = (categoryName: string) => {
    setCategory("");
    setFoodCategory(categoryName);
    setView("product");
  };

  return (
    <section className={`section unified-marketplace${compact ? " unified-marketplace--compact" : ""}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="container">
        <div className="section-heading unified-marketplace__heading">
          <div>
            <p className="eyebrow">{labels.eyebrow}</p>
            <h2 id={`${id}-title`}>{labels.title}</h2>
          </div>
          <p>{labels.description}</p>
        </div>

        <div className="unified-marketplace__controls" role="search" aria-label={labels.searchLabel}>
          <label className="unified-marketplace__search">
            <span className="sr-only">{labels.searchLabel}</span>
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              type="search"
              aria-label={labels.searchLabel}
            />
          </label>
          <label className="unified-marketplace__category">
            <span>{labels.categoryLabel}</span>
            <select value={category} onChange={(event) => {
              setCategory(event.target.value);
              setFoodCategory("");
            }}>
              <option value="">{labels.allCategories}</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="unified-marketplace__view-toggle" aria-label="Marketplace grouping">
            <button type="button" className={view === "seller" ? "is-active" : ""} aria-pressed={view === "seller"} onClick={() => {
              setFoodCategory("");
              setView("seller");
            }}>{labels.bySeller}</button>
            <button type="button" className={view === "category" ? "is-active" : ""} aria-pressed={view === "category"} onClick={() => {
              setCategory("");
              setFoodCategory("");
              setView("category");
            }}>{labels.byCategory}</button>
            <button type="button" className={view === "product" ? "is-active" : ""} aria-pressed={view === "product"} onClick={() => setView("product")}>{labels.byProduct}</button>
          </div>
        </div>

        <div className={plateAwareness ? "unified-marketplace__body-layout" : undefined}>
          {plateAwareness ? (
            <aside className="unified-marketplace__plate-awareness" aria-labelledby={`${id}-plate-awareness-title`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/vistaraku/plate-round.png" alt={plateAwareness.imageAlt} loading="lazy" />
              <div>
                <p className="eyebrow">{plateAwareness.eyebrow}</p>
                <h3 id={`${id}-plate-awareness-title`}>{plateAwareness.title}</h3>
                <p>{plateAwareness.body}</p>
                <small>{plateAwareness.note}</small>
                <div className="unified-marketplace__plate-actions">
                  <Link href="/companies/vistaraku#shop">{plateAwareness.cta} <ArrowUpRight size={14} aria-hidden="true" /></Link>
                  <a href={plateAwareness.evidenceHref} target="_blank" rel="noreferrer">{plateAwareness.evidence} <ExternalLink size={13} aria-hidden="true" /></a>
                  <a href={plateAwareness.guidanceHref} target="_blank" rel="noreferrer">{plateAwareness.guidance} <ExternalLink size={13} aria-hidden="true" /></a>
                </div>
              </div>
            </aside>
          ) : null}

          <div className={plateAwareness ? "unified-marketplace__results-column" : undefined}>
            <p className="unified-marketplace__results" role="status" aria-live="polite" aria-atomic="true">
              {view === "seller"
                ? labels.sellerCount.replace("{count}", String(sellerGroups.length))
                : view === "category"
                  ? labels.categoryCount.replace("{count}", String(categoryGroups.length))
                  : labels.resultCount.replace("{count}", String(filteredItems.length))}
            </p>

            {view === "product" && foodCategory ? (
              <div className="unified-marketplace__active-category">
                <strong>{foodCategory}</strong>
                <button type="button" onClick={() => setFoodCategory("")}>{labels.allCategories}</button>
              </div>
            ) : null}

            {filteredItems.length ? view === "seller" ? (
              <div className="unified-marketplace__seller-grid">
                {sellerGroups.map(([seller, sellerItems]) => {
                  const firstItem = sellerItems[0];
                  const categoriesForSeller = [...new Set(sellerItems.map((item) => item.category))].slice(0, 4);
                  return (
                    <article className="unified-marketplace__seller-card" key={seller}>
                      <div className="unified-marketplace__seller-icon" aria-hidden="true"><Store size={22} /></div>
                      <div>
                        <p className="eyebrow">{labels.resultCount.replace("{count}", String(sellerItems.length))}</p>
                        <h3 dir="auto">{seller}</h3>
                        <p dir="auto">{categoriesForSeller.join(" · ")}</p>
                        {firstItem.seller.href ? (
                          firstItem.seller.href.startsWith("/") ? (
                            <Link className="button button--secondary" href={firstItem.seller.href}>
                              {callToAction(firstItem, labels)} <ArrowUpRight size={15} aria-hidden="true" />
                            </Link>
                          ) : (
                            <a className="button button--secondary" href={firstItem.seller.href} target="_blank" rel="noreferrer">
                              {callToAction(firstItem, labels)} <ArrowUpRight size={15} aria-hidden="true" />
                            </a>
                          )
                        ) : <MarketplaceLink item={firstItem} className="button button--secondary">
                          {callToAction(firstItem, labels)} <ArrowUpRight size={15} aria-hidden="true" />
                        </MarketplaceLink>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : view === "category" ? (
              <div className="unified-marketplace__category-grid">
                {categoryGroups.map(([categoryName, categoryItems]) => {
                  const sellers = [...new Set(categoryItems.map((item) => item.sellerName))]
                    .sort((left, right) => {
                      const leftPriority = left === "Vistaraku" ? 0 : 1;
                      const rightPriority = right === "Vistaraku" ? 0 : 1;
                      return leftPriority - rightPriority || left.localeCompare(right);
                    })
                    .slice(0, 4);
                  return (
                    <article className="unified-marketplace__category-card" key={categoryName}>
                      <div className="unified-marketplace__seller-icon" aria-hidden="true"><Tag size={22} /></div>
                      <div>
                        <p className="eyebrow">{labels.resultCount.replace("{count}", String(categoryItems.length))}</p>
                        <h3 dir="auto">{categoryName}</h3>
                        <p dir="auto">{sellers.join(" · ")}</p>
                        <button
                          type="button"
                          className="button button--secondary"
                          aria-label={`${labels.browse} ${categoryName}`}
                          onClick={() => openCategory(categoryName)}
                        >
                          {labels.browse} <ArrowUpRight size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="unified-marketplace__grid">
                {productItems.map((item) => <MarketplaceTile key={item.id} item={item} labels={labels} />)}
              </div>
            ) : (
              <div className="card unified-marketplace__empty">
                <Search size={25} aria-hidden="true" />
                <h3>{labels.noResultsTitle}</h3>
                <p>{labels.noResultsBody}</p>
              </div>
            )}

            <p className="unified-marketplace__disclosure">{labels.disclosure}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
