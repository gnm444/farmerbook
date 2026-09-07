"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { useAuthenticatedMessages } from "@/components/locale-provider";
import { formatAuthenticatedMessage } from "@/lib/i18n/authenticated-messages";
import type { FarmerProfile } from "@/lib/types";
import { setFollowAction } from "./actions";
import { ProfileCard } from "./profile-card";

export function DiscoverClient({
  initialSearch = "",
  initialCrop = "",
  initialType = "",
  initialDistrict = "",
  profiles,
}: {
  initialSearch?: string;
  initialCrop?: string;
  initialType?: string;
  initialDistrict?: string;
  profiles: FarmerProfile[];
}) {
  const { discover, network } = useAuthenticatedMessages();
  const [search, setSearch] = useState(initialSearch);
  const [crop, setCrop] = useState(initialCrop);
  const [type, setType] = useState(initialType);
  const [district, setDistrict] = useState(initialDistrict);
  const [following, setFollowing] = useState(
    () => new Set(profiles.filter((profile) => profile.isFollowing).map((p) => p.id)),
  );
  const [error, setError] = useState("");
  const [pendingProfileId, setPendingProfileId] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (crop) params.set("crop", crop);
    if (type) params.set("type", type);
    if (district) params.set("district", district);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/discover?${query}` : "/discover",
    );
  }, [crop, district, search, type]);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter((profile) => profile.id !== "meera")
      .filter(
        (profile) =>
          !query ||
          profile.fullName.toLowerCase().includes(query) ||
          profile.handle.toLowerCase().includes(query),
      )
      .filter(
        (profile) =>
          !crop ||
          profile.crops.some(
            (profileCrop) => profileCrop.toLowerCase() === crop.toLowerCase(),
          ),
      )
      .filter((profile) => !type || profile.participantType === type)
      .filter((profile) => !district || profile.district === district);
  }, [crop, district, profiles, search, type]);

  function toggleFollow(profileId: string) {
    const active = !following.has(profileId);
    setError("");
    setPendingProfileId(profileId);
    startTransition(async () => {
      const result = await setFollowAction({ profileId, active });
      setPendingProfileId("");
      if (!result.ok) {
        setError(network.updateError);
        return;
      }
      setFollowing((current) => {
        const next = new Set(current);
        if (active) next.add(profileId);
        else next.delete(profileId);
        return next;
      });
    });
  }

  return (
    <>
      <section className="card filters" aria-label={discover.filters}>
        <div className="filter-search">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="farmer-search">
            {discover.searchLabel}
          </label>
          <input
            className="input"
            id="farmer-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={discover.searchPlaceholder}
            value={search}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="crop-filter">
            {discover.crop}
          </label>
          <select
            className="select"
            id="crop-filter"
            value={crop}
            onChange={(event) => setCrop(event.target.value)}
          >
            <option value="">{discover.allCrops}</option>
            <option value="Tomato">{discover.tomato}</option>
            <option value="Onion">{discover.onion}</option>
            <option value="Grapes">{discover.grapes}</option>
            <option value="Pomegranate">{discover.pomegranate}</option>
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="type-filter">
            {discover.role}
          </label>
          <select
            className="select"
            id="type-filter"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">{discover.allRoles}</option>
            <option value="farmer">{discover.farmers}</option>
            <option value="agronomist">{discover.agronomists}</option>
            <option value="fpo">{discover.fpoRepresentatives}</option>
            <option value="trainer">{discover.trainers}</option>
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="district-filter">
            {discover.district}
          </label>
          <select
            className="select"
            id="district-filter"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">{discover.allDistricts}</option>
            <option value="Nashik">Nashik</option>
            <option value="Pune">Pune</option>
            <option value="Ahmednagar">Ahmednagar</option>
          </select>
        </div>
      </section>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: ".84rem" }}>
        {results.length === 1
          ? discover.onePersonFound
          : formatAuthenticatedMessage(discover.peopleFound, {
              count: results.length,
            })}
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      {results.length ? (
        <section className="people-grid" aria-label={discover.people}>
          {results.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              following={following.has(profile.id)}
              pending={pendingProfileId === profile.id}
              onToggleFollow={toggleFollow}
            />
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <div>
            <div className="empty-state__icon">
              <Search size={26} aria-hidden="true" />
            </div>
            <h2>{discover.emptyTitle}</h2>
            <p>{discover.emptyDescription}</p>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setSearch("");
                setCrop("");
                setType("");
                setDistrict("");
              }}
            >
              {discover.clearFilters}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
