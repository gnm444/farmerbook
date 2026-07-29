"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { profiles } from "@/lib/demo-data";
import { ProfileCard } from "./profile-card";

export function DiscoverClient({
  initialSearch = "",
  initialCrop = "",
  initialType = "",
  initialDistrict = "",
}: {
  initialSearch?: string;
  initialCrop?: string;
  initialType?: string;
  initialDistrict?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [crop, setCrop] = useState(initialCrop);
  const [type, setType] = useState(initialType);
  const [district, setDistrict] = useState(initialDistrict);
  const [following, setFollowing] = useState(
    () => new Set(profiles.filter((profile) => profile.isFollowing).map((p) => p.id)),
  );

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
  }, [crop, district, search, type]);

  function toggleFollow(profileId: string) {
    setFollowing((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
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
      {results.length ? (
        <section className="people-grid" aria-label="People">
          {results.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              following={following.has(profile.id)}
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
