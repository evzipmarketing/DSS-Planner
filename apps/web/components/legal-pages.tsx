"use client";

import type { ReactNode } from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_LEGAL_NAME,
  COMPANY_SHORT_NAME,
  COPYRIGHT_YEAR,
} from "@/lib/app-meta";

export type LegalPageId = "about" | "terms" | "privacy" | "acknowledgements" | "contact";

export function LegalPage({ id }: { id: LegalPageId }) {
  switch (id) {
    case "about":
      return <AboutPage />;
    case "terms":
      return <TermsPage />;
    case "privacy":
      return <PrivacyPage />;
    case "acknowledgements":
      return <AcknowledgementsPage />;
    case "contact":
      return <ContactPage />;
    default: {
      const unexpected: never = id;
      return unexpected;
    }
  }
}

export function legalTitle(id: LegalPageId): string {
  switch (id) {
    case "about":
      return "About";
    case "terms":
      return "Terms of use";
    case "privacy":
      return "Privacy";
    case "acknowledgements":
      return "Acknowledgements";
    case "contact":
      return "Contact";
    default: {
      const unexpected: never = id;
      return unexpected;
    }
  }
}

function AboutPage() {
  return (
    <LegalProse>
      <p>
        {APP_NAME} helps imagers plan deep-sky sessions: tonight’s shortlist, framing, altitude windows, and gear
        setup.
      </p>
      <dl className="about-meta">
        <div>
          <dt>Version</dt>
          <dd>{APP_VERSION}</dd>
        </div>
        <div>
          <dt>Product</dt>
          <dd>{APP_NAME}</dd>
        </div>
        <div>
          <dt>Publisher</dt>
          <dd>{COMPANY_LEGAL_NAME}</dd>
        </div>
        <div>
          <dt>Focus</dt>
          <dd>{APP_TAGLINE}</dd>
        </div>
      </dl>
      <p className="note">
        Planning scores, weather summaries, and sky previews are aids for preparation. Always confirm conditions
        outdoors before you commit to a session.
      </p>
    </LegalProse>
  );
}

function TermsPage() {
  return (
    <LegalProse>
      <p>
        By using {APP_NAME}, you agree to these terms. The service is provided by {COMPANY_LEGAL_NAME} (“we”, “us”).
      </p>
      <h3>Use of the app</h3>
      <p>
        You may use {APP_NAME} for personal or professional imaging planning. You must not misuse the service, attempt
        unauthorized access, scrape or redistribute catalogue or imagery feeds beyond what the product provides, or
        interfere with other users.
      </p>
      <h3>Planning information</h3>
      <p>
        Rankings, usable hours, frame fill, Bortle estimates, and forecasts are approximate. They depend on site,
        date, gear, and third-party data. We do not guarantee that a target will be imageable or that forecasts will
        match the sky.
      </p>
      <h3>Third-party data</h3>
      <p>
        Object catalogues, place names, weather, and sky preview imagery come from third parties under their own
        licences. See Acknowledgements. Those licences may limit how you reuse that material outside the app.
      </p>
      <h3>Accounts and subscriptions</h3>
      <p>
        Optional account and paid features may be added later. Additional terms will apply when those features become
        available.
      </p>
      <h3>Liability</h3>
      <p>
        To the fullest extent permitted by law, {COMPANY_SHORT_NAME} is not liable for lost imaging time, equipment
        decisions, or other damages arising from reliance on planning output. The app is provided “as is” without
        warranties of merchantability or fitness for a particular purpose.
      </p>
      <h3>Changes</h3>
      <p>
        We may update these terms. Continued use after a change means you accept the updated terms. For questions, use
        Contact.
      </p>
      <p className="note">Last updated {COPYRIGHT_YEAR}.</p>
    </LegalProse>
  );
}

function PrivacyPage() {
  return (
    <LegalProse>
      <p>
        This notice describes how {APP_NAME} handles information when you use the web app published by{" "}
        {COMPANY_LEGAL_NAME}.
      </p>
      <h3>What stays on your device</h3>
      <p>
        Site, date, rig, equipment library, theme, list preferences, and similar planner settings are stored in your
        browser’s local storage. We do not receive that data unless you later opt into a synced account feature.
      </p>
      <h3>Requests the app makes</h3>
      <p>
        To show forecasts, place names, time zones, and sky preview plates, the app calls our servers or partner APIs
        with coordinates, dates, or sky positions you select. Those providers process the request under their own
        policies (for example Open-Meteo, OpenStreetMap Nominatim, and CDS / survey image hosts).
      </p>
      <h3>Analytics and accounts</h3>
      <p>
        The current web build does not require an account and does not include a marketing analytics SDK. If we add
        sign-in, billing, or analytics later, we will update this notice and ask for any required consent.
      </p>
      <h3>Contact</h3>
      <p>
        Privacy questions:{" "}
        <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
      </p>
      <p className="note">Last updated {COPYRIGHT_YEAR}.</p>
    </LegalProse>
  );
}

function AcknowledgementsPage() {
  return (
    <LegalProse>
      <p>
        {APP_NAME} builds on public catalogues, open APIs, and sky surveys. The credits below follow the attribution
        terms of those sources. Licences that allow acknowledgement and redistribution of the derived planning data we
        ship are listed here; underlying plate copyright still belongs to the survey institutions.
      </p>

      <h3>Deep-sky catalogues</h3>
      <p>
        NGC, IC, addendum rows, and many common names are derived from{" "}
        <a href="https://github.com/mattiaverga/OpenNGC" target="_blank" rel="noreferrer">
          OpenNGC
        </a>{" "}
        by Mattia Verga, licensed under{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        . Attribution and share-alike conditions apply to that extract.
      </p>
      <p>
        This research has made use of the VizieR catalogue access tool, CDS, Strasbourg, France (DOI:{" "}
        <a href="https://doi.org/10.26093/cds/vizier" target="_blank" rel="noreferrer">
          10.26093/cds/vizier
        </a>
        ). Additional catalogues include Sharpless, Barnard, Lynds, van den Bergh, Strasbourg-ESO planetary nebulae,
        Abell clusters, Dias open clusters, Arp, RCW, Cederblad, and the Uppsala General Catalogue, as described in our
        data notices.
      </p>

      <h3>Sky preview imagery</h3>
      <p>
        Framing thumbnails use the CDS “DSS2 color” HiPS / hips2fits services. Credit: CDS Aladin Sky Atlas,
        Unistra/CNRS — DSS colored (DSS/STScI). Digitized Sky Survey material is © STScI/NASA and partner observatories;
        the HiPS packaging is provided by CDS under ODbL-1.0. Previews are for planning reference inside the app.
      </p>

      <h3>Weather and places</h3>
      <p>
        Forecasts and time zones use{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (CC BY 4.0). Forward geocoding also uses Open-Meteo. Reverse place names may use OpenStreetMap Nominatim — ©
        OpenStreetMap contributors, ODbL.
      </p>

      <h3>Sky brightness estimate</h3>
      <p>
        The Bortle class shown in the app is a coarse estimate derived from NASA Visible Earth “Black Marble 2016”
        (public domain US government work). NASA does not endorse this project. The value is not a calibrated SQM
        reading.
      </p>

      <h3>Gear list</h3>
      <p>
        Telescope and camera presets are a curated set of nominal manufacturer specifications for planning only, not a
        scrape of third-party imaging galleries.
      </p>

      <p className="note">
        Full machine-readable notices ship with the data package. If a credit should be corrected, use Contact.
      </p>
    </LegalProse>
  );
}

function ContactPage() {
  return (
    <LegalProse>
      <p>
        Reach the team behind {APP_NAME} at {COMPANY_LEGAL_NAME}.
      </p>
      <dl className="about-meta">
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </dd>
        </div>
        <div>
          <dt>Registered office</dt>
          <dd>{COMPANY_ADDRESS}</dd>
        </div>
        <div>
          <dt>Company</dt>
          <dd>{COMPANY_LEGAL_NAME}</dd>
        </div>
      </dl>
      <p className="note">For catalogue credit corrections, privacy questions, or product feedback, email is best.</p>
    </LegalProse>
  );
}

function LegalProse({ children }: { children: ReactNode }) {
  return <div className="legal-prose">{children}</div>;
}
