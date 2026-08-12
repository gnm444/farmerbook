"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Filter,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { ProduceListing } from "@/lib/types";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n/format";
import { ListingCard } from "./listing-card";

type SortOption = "freshest" | "price-low" | "quantity" | "popular";

export function MarketBrowser({
  listings,
  embedded = false,
  historyPath,
  readOnly = false,
}: {
  listings: ProduceListing[];
  embedded?: boolean;
  historyPath?: string;
  readOnly?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("market");
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("");
  const [district, setDistrict] = useState("");
  const [orderSize, setOrderSize] = useState("");
  const [sellerType, setSellerType] = useState("");
  const [farmingMethod, setFarmingMethod] = useState("");
  const [sort, setSort] = useState<SortOption>("freshest");
  const [saved, setSaved] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (crop) params.set("crop", crop);
    if (district) params.set("district", district);
    if (sellerType) params.set("seller", sellerType);
    if (farmingMethod) params.set("method", farmingMethod);
    const query = params.toString();
    const path = historyPath ?? (embedded ? "/market" : "/marketplace");
    window.history.replaceState(null, "", query ? `${path}?${query}` : path);
  }, [crop, district, embedded, farmingMethod, historyPath, search, sellerType]);

  const crops = useMemo(
    () => [...new Set(listings.map((listing) => listing.crop))].sort(),
    [listings],
  );
  const districts = useMemo(
    () =>
      [
        ...new Set(
          listings
            .map((listing) => listing.seller?.district)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [listings],
  );

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = listings
      .filter(
        (listing) =>
          !query ||
          listing.title.toLowerCase().includes(query) ||
          listing.crop.toLowerCase().includes(query) ||
          listing.variety.toLowerCase().includes(query) ||
          listing.seller?.fullName.toLowerCase().includes(query),
      )
      .filter((listing) => !crop || listing.crop === crop)
      .filter(
        (listing) => !district || listing.seller?.district === district,
      )
      .filter(
        (listing) =>
          !sellerType || listing.seller?.accountRole === sellerType,
      )
      .filter(
        (listing) =>
          !farmingMethod ||
          listing.seller?.farmingMethod === farmingMethod,
      )
      .filter((listing) => {
        if (!orderSize) return true;
        const kilos =
          listing.unit === "tonne"
            ? listing.quantity * 1000
            : listing.unit === "quintal"
              ? listing.quantity * 100
              : listing.quantity;
        if (orderSize === "small") return listing.minOrder <= 50;
        if (orderSize === "medium") return kilos >= 100 && kilos <= 2000;
        return kilos >= 1000;
      });

    return filtered.toSorted((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "quantity") return b.quantity - a.quantity;
      if (sort === "popular") return b.viewCount - a.viewCount;
      return 0;
    });
  }, [
    crop,
    district,
    farmingMethod,
    listings,
    orderSize,
    search,
    sellerType,
    sort,
  ]);

  function clearFilters() {
    setSearch("");
    setCrop("");
    setDistrict("");
    setOrderSize("");
    setSellerType("");
    setFarmingMethod("");
  }

  return (
    <>
      {!embedded ? (
        <section className="market-proof" aria-label={t("trustAria")}>
          <div>
            <ShieldCheck size={22} aria-hidden="true" />
            <span>
              <strong>{t("sellerProfiles")}</strong>
              {t("sellerProfilesHelp")}
            </span>
          </div>
          <div>
            <BadgeIndianRupee size={22} aria-hidden="true" />
            <span>
              <strong>{t("directConversation")}</strong>
              {t("directConversationHelp")}
            </span>
          </div>
          <div>
            <Store size={22} aria-hidden="true" />
            <span>
              <strong>{t("repeatSupply")}</strong>
              {t("repeatSupplyHelp")}
            </span>
          </div>
        </section>
      ) : null}

      <section className="card market-filters" aria-label={t("filtersAria")}>
        <div className="market-search">
          <Search size={19} aria-hidden="true" />
          <label className="sr-only" htmlFor="market-search">
            {t("searchLabel")}
          </label>
          <input
            className="input"
            id="market-search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="field">
          <span className="sr-only">{t("sellerType")}</span>
          <select
            className="select"
            value={sellerType}
            onChange={(event) => setSellerType(event.target.value)}
          >
            <option value="">{t("allSellers")}</option>
            <option value="farmer">{t("farmers")}</option>
            <option value="wholesaler">{t("wholesalers")}</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">{t("farmingMethod")}</span>
          <select
            className="select"
            value={farmingMethod}
            onChange={(event) => setFarmingMethod(event.target.value)}
          >
            <option value="">{t("allMethods")}</option>
            <option value="organic">{t("organic")}</option>
            <option value="natural">{t("natural")}</option>
            <option value="conventional">{t("conventional")}</option>
            <option value="mixed">{t("mixed")}</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">{t("crop")}</span>
          <select
            className="select"
            value={crop}
            onChange={(event) => setCrop(event.target.value)}
          >
            <option value="">{t("allCrops")}</option>
            {crops.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">{t("district")}</span>
          <select
            className="select"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">{t("allDistricts")}</option>
            {districts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">{t("orderSize")}</span>
          <select
            className="select"
            value={orderSize}
            onChange={(event) => setOrderSize(event.target.value)}
          >
            <option value="">{t("anyOrderSize")}</option>
            <option value="small">{t("smallOrders")}</option>
            <option value="medium">{t("mediumOrders")}</option>
            <option value="large">{t("largeOrders")}</option>
          </select>
        </label>
      </section>

      <div className="market-results-head">
        <p>{t("results", {
          count: formatNumber(results.length, locale),
          listings: results.length === 1 ? t("listing") : t("listings"),
        })}</p>
        <label className="market-sort">
          <span>{t("sort")}</span>
          <select
            className="select"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
          >
            <option value="freshest">{t("newest")}</option>
            <option value="popular">{t("mostViewed")}</option>
            <option value="price-low">{t("lowestPrice")}</option>
            <option value="quantity">{t("mostAvailable")}</option>
          </select>
        </label>
      </div>

      {results.length ? (
        <section className="market-grid" aria-label={t("availableProduce")}>
          {results.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              hrefPrefix="/marketplace"
              readOnly={readOnly}
              saved={saved.has(listing.id)}
              onSave={
                readOnly
                  ? undefined
                  : (listingId) =>
                      setSaved((current) => {
                        const next = new Set(current);
                        if (next.has(listingId)) next.delete(listingId);
                        else next.add(listingId);
                        return next;
                      })
              }
            />
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <div>
            <div className="empty-state__icon">
              <Filter size={26} aria-hidden="true" />
            </div>
            <h2>{t("noMatchTitle")}</h2>
            <p>{t("noMatchBody")}</p>
            <button
              className="button button--secondary"
              type="button"
              onClick={clearFilters}
            >
              {t("clearFilters")}
            </button>
          </div>
        </section>
      )}

      {!embedded && !readOnly ? (
        <section className="market-seller-cta">
          <div>
            <p className="eyebrow">{t("sellDirectly")}</p>
            <h2>{t("sellerCtaTitle")}</h2>
            <p>{t("sellerCtaBody")}</p>
          </div>
          <Link className="button" href="/signup">
            {t("createSellerProfile")}
          </Link>
        </section>
      ) : null}
    </>
  );
}
