"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Bot, MapPin, Truck } from "lucide-react";
import type { MarketplaceMatchResponse } from "./matching-contracts";

export function MarketplaceMatchAgent() {
  const [question, setQuestion] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [result, setResult] = useState<MarketplaceMatchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/marketplace-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, deliveryLocation }),
      });
      if (!response.ok) throw new Error("MATCHING_UNAVAILABLE");
      setResult(await response.json() as MarketplaceMatchResponse);
    } catch {
      setResult(null);
      setError("The matching assistant is temporarily unavailable. Please use the marketplace filters or contact the seller through a listing.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card marketplace-match-agent" aria-labelledby="marketplace-match-title">
      <div className="marketplace-match-agent__heading">
        <span className="marketplace-match-agent__icon" aria-hidden="true"><Bot size={21} /></span>
        <div>
          <p className="eyebrow">Grounded marketplace assistant</p>
          <h2 id="marketplace-match-title">Who can supply what you need?</h2>
          <p>Describe the product and destination. FarmerBook compares active public listings with farmer profile locations and delivery terms.</p>
        </div>
      </div>
      <form className="marketplace-match-agent__form" onSubmit={submit}>
        <label className="field">
          <span>Product need</span>
          <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: 20 kg natural tomatoes" minLength={3} maxLength={500} required />
        </label>
        <label className="field">
          <span>Delivery location <small>(district, state)</small></span>
          <input className="input" value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)} placeholder="Example: Guntur, Andhra Pradesh" maxLength={120} />
        </label>
        <button className="button" type="submit" disabled={pending}>{pending ? "Checking active listings…" : "Find possible suppliers"}</button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {result ? (
        <div className="marketplace-match-agent__result" aria-live="polite">
          <p className="marketplace-match-agent__answer">{result.answer}</p>
          {result.matches.length ? (
            <div className="marketplace-match-agent__matches">
              {result.matches.map((match) => (
                <article className="marketplace-match-agent__match" key={match.listingId}>
                  <div>
                    <span className="badge badge--amber">{match.confidence === "strong" ? "Location + delivery match" : "Product match to confirm"}</span>
                    <h3><Link href={match.listingHref}>{match.listingTitle}</Link></h3>
                    <p><strong>{match.farmerName}</strong> · <MapPin size={14} aria-hidden="true" /> {match.location}</p>
                    <p><Truck size={14} aria-hidden="true" /> {match.deliveryOptions.join(", ")}{match.deliveryRadiusKm ? ` · stated radius ${match.deliveryRadiusKm} km` : ""}</p>
                    <small>Matched terms: {match.matchedTerms.join(", ")}</small>
                  </div>
                  <Link className="button button--secondary button--small" href={match.listingHref}>View listing</Link>
                </article>
              ))}
            </div>
          ) : null}
          <ul className="marketplace-match-agent__caveats">
            {result.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
