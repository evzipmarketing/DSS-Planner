"use client";

import { useEffect, useMemo, useState } from "react";
import { EquipmentPanel } from "./equipment-panel";
import { ImagingPlansPanel } from "./imaging-plans-panel";
import { LegalPage, legalTitle, type LegalPageId } from "./legal-pages";
import { ListsPanel } from "./lists-panel";
import { LocationsPanel } from "./locations-panel";
import { usePlannerState } from "./planner-context";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  COMPANY_SHORT_NAME,
} from "@/lib/app-meta";
import { EMPTY_PROFILE, loadProfile, saveProfile, type LocalProfile } from "@/lib/storage";

type ProfileSection =
  | "home"
  | "equipment"
  | "lists"
  | "imaging-plans"
  | "locations"
  | "catalogue"
  | "subscription"
  | LegalPageId;

export function ProfileHubPage() {
  const planner = usePlannerState();
  const [section, setSection] = useState<ProfileSection>("home");
  const [profile, setProfile] = useState<LocalProfile>(EMPTY_PROFILE);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const next = loadProfile();
    setProfile(next);
    setLoaded(true);
    if (next.username.trim() || next.email.trim() || next.phone.trim()) setAccountOpen(false);
  }, []);

  function updateProfile(patch: Partial<LocalProfile>) {
    setProfile((current) => {
      const next = { ...current, ...patch };
      saveProfile(next);
      return next;
    });
  }

  const accountSummary = useMemo(() => {
    const name = profile.username.trim() || "Account";
    const mail = profile.email.trim() || "No email";
    const phone = profile.phone.trim() || "No phone";
    return `${name} · ${mail} · ${phone}`;
  }, [profile.username, profile.email, profile.phone]);

  function submitPasswordChange() {
    if (!newPassword || !confirmPassword) {
      setMessage("Enter and confirm a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password change will work once account sign-in is enabled on web.");
  }

  if (section === "equipment") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Equipment</h1>
          <p>Scopes, cameras, filters, and named rigs for Tonight framing.</p>
        </header>
        <EquipmentPanel />
      </div>
    );
  }

  if (section === "lists") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Target Lists</h1>
          <p>Favorites and named target lists.</p>
        </header>
        <ListsPanel />
      </div>
    );
  }

  if (section === "imaging-plans") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Imaging plans</h1>
          <p>Saved Multi-target, Single-target, Mosaic, Multi-rigs, and Collage sessions.</p>
        </header>
        <ImagingPlansPanel />
      </div>
    );
  }

  if (section === "locations") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Locations</h1>
          <p>Observing sites for Tonight altitude, moon, and weather.</p>
        </header>
        <LocationsPanel />
      </div>
    );
  }

  if (section === "catalogue") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Catalogue</h1>
          <p>
            By default Tonight uses the popular core list (Messier, NGC, IC, Sharpless, …) and hides tiny components of
            larger objects.
          </p>
        </header>
        <div className="hub-card" style={{ display: "grid", gap: 14 }}>
          <label className="field profile-pref">
            <input
              type="checkbox"
              checked={planner.includeExtendedCatalogue}
              onChange={(event) => planner.setIncludeExtendedCatalogue(event.target.checked)}
            />
            <span>
              Include extended catalogue
              <small>Adds ~19k fainter objects. Slower to score.</small>
            </span>
          </label>
          <label className="field profile-pref">
            <input
              type="checkbox"
              checked={planner.includeComponentObjects}
              onChange={(event) => planner.setIncludeComponentObjects(event.target.checked)}
            />
            <span>
              Include component objects
              <small>Shows letter-suffix pieces such as NGC4676A.</small>
            </span>
          </label>
        </div>
        <p className="note">
          Ranking prefers Messier, then NGC, IC, Sharpless when nights are otherwise similar. Catalogue size:{" "}
          {planner.catalogue ? planner.catalogue.length : "…"}
          {planner.includeExtendedCatalogue
            ? planner.extendedReady
              ? " including extended."
              : " (extended still loading)."
            : " · core only."}
        </p>
      </div>
    );
  }

  if (section === "subscription") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>Subscription</h1>
        </header>
        <div className="hub-card" style={{ display: "grid", gap: 8 }}>
          <strong>Free</strong>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Tonight planning, framing, and local target lists are available now. Paid plans for cloud sync limits, multi-rig,
            and mosaic exports will land here.
          </p>
        </div>
      </div>
    );
  }

  if (section === "about" || section === "terms" || section === "privacy" || section === "acknowledgements") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Profile
        </button>
        <header className="hub-intro">
          <h1>{legalTitle(section)}</h1>
        </header>
        <LegalPage id={section} />
      </div>
    );
  }

  return (
    <div className="hub-page">
      <header className="hub-intro">
        <h1>Profile</h1>
      </header>

      <div className="hub-card profile-account">
        <button
          type="button"
          className="module-gear-toggle profile-account-toggle"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((value) => !value)}
        >
          <span>
            <strong>Account</strong>
            <span className="note" style={{ display: "block", margin: "2px 0 0" }}>
              {accountSummary}
            </span>
          </span>
          <span className="module-gear-chevron" aria-hidden="true">
            {accountOpen ? "▲" : "▼"}
          </span>
        </button>

        {accountOpen ? (
          <div className="profile-account-body">
            <div className="profile-account-row">
              <div className="profile-account-photo">
                <button
                  type="button"
                  className="profile-photo"
                  aria-label="Profile photo"
                  onClick={() => setMessage("Photo picker lands with the next Profile pass.")}
                >
                  {profile.photoUri ? <img src={profile.photoUri} alt="" /> : <span aria-hidden="true">◌</span>}
                </button>
                <p className="note" style={{ margin: 0 }}>
                  {loaded ? "Click photo to change" : "Loading…"}
                </p>
              </div>
              <div className="profile-account-fields">
                <label className="field">
                  Username
                  <input
                    value={profile.username}
                    placeholder="deepskyimager"
                    autoCapitalize="none"
                    autoComplete="username"
                    onChange={(event) => updateProfile({ username: event.target.value })}
                  />
                </label>
                <label className="field">
                  Email
                  <input
                    value={profile.email}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    onChange={(event) => updateProfile({ email: event.target.value })}
                  />
                </label>
                <label className="field">
                  Phone (optional)
                  <input
                    value={profile.phone}
                    placeholder="+1 …"
                    type="tel"
                    autoComplete="tel"
                    onChange={(event) => updateProfile({ phone: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="profile-password">
              <button
                type="button"
                className="module-gear-toggle profile-password-toggle"
                aria-expanded={passwordOpen}
                onClick={() => setPasswordOpen((value) => !value)}
              >
                <span>
                  <strong>Change password</strong>
                </span>
                <span className="module-gear-chevron" aria-hidden="true">
                  {passwordOpen ? "▲" : "▼"}
                </span>
              </button>
              {passwordOpen ? (
                <div className="profile-password-body">
                  <label className="field">
                    New password
                    <input
                      type="password"
                      value={newPassword}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Confirm password
                    <input
                      type="password"
                      value={confirmPassword}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                  <button type="button" className="primary" onClick={submitPasswordChange}>
                    Update password
                  </button>
                  <p className="note" style={{ margin: 0 }}>
                    Account sign-in and cloud sync will land with the next Profile pass. Details stay on this device for
                    now.
                  </p>
                </div>
              ) : null}
            </div>

            {message ? <p className="note">{message}</p> : null}
          </div>
        ) : null}
      </div>

      <ul className="hub-list">
        <HubNav title="Target Lists" detail="Favorites and named target lists" onSelect={() => setSection("lists")} />
        <HubNav
          title="Imaging plans"
          detail="Saved Multi-target, Single-target, Mosaic, Multi-rigs, and Collage sessions"
          onSelect={() => setSection("imaging-plans")}
        />
        <HubNav title="Equipment" detail="Scopes, cameras, filters" onSelect={() => setSection("equipment")} />
        <HubNav title="Locations" detail="Observing sites" onSelect={() => setSection("locations")} />
        <HubNav title="Catalogue" detail="Extended catalogue and components" onSelect={() => setSection("catalogue")} />
        <HubNav title="Subscription" detail="Plan and billing" onSelect={() => setSection("subscription")} />
      </ul>

      <section className="about-section" aria-labelledby="about-heading">
        <header className="hub-intro">
          <h2 id="about-heading">About</h2>
          <p>
            {APP_NAME} · v{APP_VERSION}. {APP_TAGLINE}
          </p>
        </header>
        <div className="hub-card about-card">
          <p className="about-publisher">Published by {COMPANY_SHORT_NAME}</p>
          <ul className="hub-list about-links">
            <HubNav title="About DeepSkyMate" detail="Version and product details" onSelect={() => setSection("about")} />
            <HubNav title="Terms of use" detail="Acceptance, subscriptions, content, and liability" onSelect={() => setSection("terms")} />
            <HubNav title="Privacy" detail="How we collect, use, and protect your data" onSelect={() => setSection("privacy")} />
            <HubNav
              title="Acknowledgements"
              detail="Catalogue, sky, weather, and place data credits"
              onSelect={() => setSection("acknowledgements")}
            />
          </ul>
        </div>
      </section>
    </div>
  );
}

function HubNav({
  title,
  detail,
  badge,
  onSelect,
}: {
  title: string;
  detail: string;
  badge?: string;
  onSelect?: () => void;
}) {
  if (!onSelect) {
    return (
      <li className="hub-row">
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
        {badge ? <span className="hub-badge">{badge}</span> : null}
      </li>
    );
  }

  return (
    <li>
      <button type="button" className="hub-row hub-row-btn" onClick={onSelect}>
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
        <span className="hub-chevron" aria-hidden="true">
          →
        </span>
      </button>
    </li>
  );
}
