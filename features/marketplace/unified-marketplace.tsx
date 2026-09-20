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
  resultCount: string;
  sellerCount: string;
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
};

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

export function UnifiedMarketplace({ items, labels, id = "unified-marketplace", compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [groupBySeller, setGroupBySeller] = useState(true);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((left, right) => left.localeCompare(right)),
    [items],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => {
      const matchesQuery = !normalizedQuery || item.searchText.includes(normalizedQuery);
      const matchesCategory = !category || item.category === category;
      return matchesQuery && matchesCategory;
    }),
    [category, items, normalizedQuery],
  );
  const sellerGroups = useMemo(() => {
    const groups = new Map<string, UnifiedMarketplaceItem[]>();
    filteredItems.forEach((item) => groups.set(item.sellerName, [...(groups.get(item.sellerName) ?? []), item]));
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [filteredItems]);

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
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{labels.allCategories}</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="unified-marketplace__view-toggle" aria-label="Marketplace grouping">
            <button type="button" className={groupBySeller ? "is-active" : ""} aria-pressed={groupBySeller} onClick={() => setGroupBySeller(true)}>{labels.bySeller}</button>
            <button type="button" className={!groupBySeller ? "is-active" : ""} aria-pressed={!groupBySeller} onClick={() => setGroupBySeller(false)}>{labels.byProduct}</button>
          </div>
        </div>

        <p className="unified-marketplace__results" role="status" aria-live="polite" aria-atomic="true">
          {groupBySeller ? labels.sellerCount.replace("{count}", String(sellerGroups.length)) : labels.resultCount.replace("{count}", String(filteredItems.length))}
        </p>

        {filteredItems.length ? groupBySeller ? (
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
        ) : (
          <div className="unified-marketplace__grid">
            {filteredItems.map((item) => <MarketplaceTile key={item.id} item={item} labels={labels} />)}
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
    </section>
  );
}
