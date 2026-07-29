"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import type { FarmerProfile, ParticipantType } from "@/lib/types";
import { saveProfileAction } from "./actions";

export function OnboardingForm({
  initialProfile,
}: {
  initialProfile: FarmerProfile;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [crops, setCrops] = useState(
    initialProfile.crops.length ? initialProfile.crops : ["Tomato"],
  );
  const [details, setDetails] = useState({
    fullName: initialProfile.fullName,
    handle: initialProfile.handle,
    participantType: initialProfile.participantType,
    district: initialProfile.district,
    state: initialProfile.state,
    bio: initialProfile.bio,
    experienceYears: initialProfile.experienceYears ?? 0,
    preferredLanguage: "en" as "en" | "hi" | "mr",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveProfileAction({ ...details, crops });
      if (!result.ok) {
        setError(result.message ?? "Your profile could not be saved.");
        return;
      }
      router.push("/feed");
      router.refresh();
    });
  }

  return (
    <form className="form-stack" onSubmit={finish}>
      <div className="notice notice--success">
        <Check size={18} aria-hidden="true" />
        Step {step} of 2 · Your profile helps relevant people find you.
      </div>
      {step === 1 ? (
        <>
          <div className="form-row">
            <div className="field">
              <label htmlFor="full-name">Full name</label>
              <input
                className="input"
                id="full-name"
                name="fullName"
                value={details.fullName}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="handle">Public handle</label>
              <input
                className="input"
                id="handle"
                name="handle"
                value={details.handle}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    handle: event.target.value,
                  }))
                }
                pattern="[a-z0-9_]{3,30}"
                required
              />
              <p className="form-helper">Lowercase letters, numbers and _</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="participant-type">How do you participate in agriculture?</label>
            <select
              className="select"
              id="participant-type"
              value={details.participantType}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  participantType: event.target.value as ParticipantType,
                }))
              }
            >
              <option value="farmer">Farmer</option>
              <option value="agronomist">Agronomist</option>
              <option value="fpo">FPO representative</option>
              <option value="buyer">Buyer</option>
              <option value="trainer">Trainer</option>
              <option value="ngo">NGO participant</option>
            </select>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="district">District</label>
              <input
                className="input"
                id="district"
                value={details.district}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    district: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input
                className="input"
                id="state"
                value={details.state}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          <button className="button button--full" type="button" onClick={() => setStep(2)}>
            Continue <ChevronRight size={17} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field-label">Primary crops</legend>
            <div className="profile-card__crops">
              {["Tomato", "Onion", "Grapes", "Pomegranate", "Okra", "Millets"].map(
                (crop) => (
                  <button
                    className={`button button--small ${
                      crops.includes(crop) ? "" : "button--secondary"
                    }`}
                    type="button"
                    aria-pressed={crops.includes(crop)}
                    key={crop}
                    onClick={() =>
                      setCrops((current) =>
                        current.includes(crop)
                          ? current.filter((item) => item !== crop)
                          : [...current, crop],
                      )
                    }
                  >
                    {crop}
                  </button>
                ),
              )}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="bio">Short introduction</label>
            <textarea
              className="textarea"
              id="bio"
              maxLength={500}
              value={details.bio}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="experience">Years of experience</label>
              <input
                className="input"
                id="experience"
                type="number"
                min={0}
                max={80}
                value={details.experienceYears}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    experienceYears: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="language">Interface language</label>
              <select
                className="select"
                id="language"
                value={details.preferredLanguage}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    preferredLanguage: event.target.value as "en" | "hi" | "mr",
                  }))
                }
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी (pilot translation pending)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              className="button"
              type="submit"
              disabled={!crops.length || isPending}
            >
              {isPending ? "Saving…" : "Finish profile"}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </>
      )}
    </form>
  );
}
