"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
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
        setError(result.message ?? "Follow could not be updated.");
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
      <section className="card filters" aria-label="Discover filters">
        <div className="filter-search">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="farmer-search">
            Search by name or handle
          </label>
          <input
            className="input"
            id="farmer-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or handle"
            value={search}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="crop-filter">
            Crop
          </label>
          <select
            className="select"
            id="crop-filter"
            value={crop}
            onChange={(event) => setCrop(event.target.value)}
          >
            <option value="">All crops</option>
            <option value="Tomato">Tomato</option>
            <option value="Onion">Onion</option>
            <option value="Grapes">Grapes</option>
            <option value="Pomegranate">Pomegranate</option>
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="type-filter">
            Participant type
          </label>
          <select
            className="select"
            id="type-filter"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All roles</option>
            <option value="farmer">Farmers</option>
            <option value="agronomist">Agronomists</option>
            <option value="fpo">FPO representatives</option>
            <option value="trainer">Trainers</option>
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="district-filter">
            District
          </label>
          <select
            className="select"
            id="district-filter"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">All districts</option>
            <option value="Nashik">Nashik</option>
            <option value="Pune">Pune</option>
            <option value="Ahmednagar">Ahmednagar</option>
          </select>
        </div>
      </section>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: ".84rem" }}>
        {results.length} {results.length === 1 ? "person" : "people"} found
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      {results.length ? (
        <section className="people-grid" aria-label="People">
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
            <h2>No people match these filters</h2>
            <p>
              Try removing one filter or searching a broader name, crop or
              district.
            </p>
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
              Clear filters
            </button>
          </div>
        </section>
      )}
    </>
  );
}
