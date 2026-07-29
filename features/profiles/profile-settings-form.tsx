"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui";
import { currentUserId, getProfile } from "@/lib/demo-data";

export function ProfileSettingsForm() {
  const profile = getProfile(currentUserId);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <form
        className="card settings-card form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          setToast("Profile changes saved in the demonstration.");
        }}
      >
        <h2>Profile and language</h2>
        <p>Keep your public farming identity current and useful.</p>
        <div className="person-row">
          <Avatar initials={profile.initials} size="large" />
          <button className="button button--secondary button--small" type="button">
            <Upload size={16} aria-hidden="true" /> Change avatar
          </button>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-name">Full name</label>
            <input
              className="input"
              id="settings-name"
              defaultValue={profile.fullName}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-handle">Public handle</label>
            <input
              className="input"
              id="settings-handle"
              defaultValue={profile.handle}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-district">District</label>
            <input
              className="input"
              id="settings-district"
              defaultValue={profile.district}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-state">State</label>
            <input
              className="input"
              id="settings-state"
              defaultValue={profile.state}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="settings-bio">Short introduction</label>
          <textarea
            className="textarea"
            id="settings-bio"
            defaultValue={profile.bio}
            maxLength={500}
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-crops">Primary crops</label>
            <input
              className="input"
              id="settings-crops"
              defaultValue={profile.crops.join(", ")}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-language">Interface language</label>
            <select className="select" id="settings-language" defaultValue="en">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी (translation review pending)</option>
            </select>
          </div>
        </div>
        <div>
          <button className="button" type="submit">
            Save changes
          </button>
        </div>
      </form>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 size={19} aria-hidden="true" /> {toast}
        </div>
      ) : null}
    </>
  );
}
