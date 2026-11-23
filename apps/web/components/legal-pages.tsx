"use client";

import type { ReactNode } from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_URL,
  APP_VERSION,
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_LEGAL_NAME,
  COMPANY_SHORT_NAME,
  COPYRIGHT_YEAR,
  PRIVACY_LAST_UPDATED,
  TERMS_LAST_UPDATED,
} from "@/lib/app-meta";

export type LegalPageId = "about" | "terms" | "privacy" | "acknowledgements";

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
        <div>
          <dt>Contact</dt>
          <dd>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </dd>
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
        Using {APP_NAME} (the website, mobile apps, and related services) means you explicitly accept these Terms and
        Conditions. If you do not agree, stop using {APP_NAME} immediately. The service is provided by{" "}
        {COMPANY_LEGAL_NAME} (“we”, “us”).
      </p>

      <h3>1. Intellectual property and attribution</h3>
      <p>
        {APP_NAME} software, branding, and original programming code are copyrighted by {COMPANY_LEGAL_NAME} and may not
        be copied, reverse engineered for redistribution, or reused elsewhere without prior written authorization, except
        as allowed by open-source licences that accompany specific libraries we ship.
      </p>
      <p>
        When you republish planning output from {APP_NAME} (for example target shortlists, framing notes, or charts) on
        websites, emails, or print, please include clear attribution with a link to{" "}
        <a href={APP_URL} target="_blank" rel="noreferrer">
          {APP_URL}
        </a>
        . Third-party catalogue rows, weather data, and sky survey imagery remain subject to their own licences; see
        Acknowledgements. It is your responsibility to respect those licences before reproducing third-party material.
      </p>

      <h3>2. Accounts, subscriptions, and payments</h3>
      <p>
        {APP_NAME} is intended to operate under a freemium model: core tonight planning features are available without
        charge, and advanced features or higher limits may be offered under a paid plan when billing is enabled.
      </p>
      <p>
        <strong>Billing.</strong> When subscriptions launch, they will be billed in advance through third-party payment
        gateways. We do not store full payment card numbers on our servers and assume no liability for gateway failures,
        breaches, or billing errors beyond what applicable law requires.
      </p>
      <p>
        <strong>Refunds.</strong> Unless a specific offer states otherwise, you may request a full refund of a
        subscription payment within 30 days of the transaction by emailing{" "}
        <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a> with the email used for payment. Verified refunds are
        returned to the original payment method within a reasonable processing window.
      </p>
      <p>
        <strong>Plan changes.</strong> We may modify features, limits, and pricing. Material changes to paid tiers will be
        announced with reasonable advance notice when practical so you can cancel before renewal if you disagree.
      </p>
      <p>
        <strong>Communications.</strong> If you create an account, we may send essential service and security messages.
        Marketing or observing tip emails are optional; you can unsubscribe where provided.
      </p>
      <p>
        <strong>Partner promotions.</strong> From time to time we may offer third-party discounts or perks. Those offers
        are operated by independent partners under their own terms. We may modify or discontinue them, and their
        unavailability does not entitle you to damages beyond our standard refund policy for paid {APP_NAME}{" "}
        subscriptions.
      </p>

      <h3>3. User-generated content</h3>
      <p>
        User-generated content means information you enter in {APP_NAME}, including profile details, observing sites,
        equipment and rig configurations, favorites, named lists, and any other activity stored for your account or on
        your device.
      </p>
      <p>
        Content must not be illegal, offensive, infringing, or contain malware. It should relate to astronomy or imaging
        planning. Spam and unsolicited advertising are prohibited. You retain ownership of your content; by saving or
        uploading it to our services (when sync or sharing features are enabled), you grant us a worldwide,
        non-exclusive licence to host, reproduce, and display it as needed to operate {APP_NAME}, including backups and
        support. We do not claim the right to sell your content as standalone products.
      </p>

      <h3>4. Account termination and content deletion</h3>
      <p>
        We may suspend or delete accounts that violate these Terms or harm the service, with or without prior notice
        when necessary. We are not liable for loss of local data, reputation, or unused paid time resulting from
        termination for cause. You may stop using the app and clear local data at any time; account deletion requests can
        be sent to <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a> once accounts are available.
      </p>

      <h3>5. Data loss and backups</h3>
      <p>
        You are responsible for backing up important lists, equipment setups, and other content. The current apps store
        much of that data locally on your device. While we may maintain server backups for cloud features when they
        exist, we make no guarantee of preservation. We are not liable for accidental loss, deletion, or corruption of
        user content.
      </p>

      <h3>6. APIs and automated access</h3>
      <p>
        If we publish developer APIs or keys, access may be granted, limited, or revoked at our discretion. Commercial
        redistribution of API data requires written consent. Fair use and attribution rules will apply. There is no
        minimum guaranteed uptime for APIs or the app.
      </p>

      <h3>7. General use and accuracy</h3>
      <p>
        You may use {APP_NAME} for personal or professional imaging planning. You must not misuse the service, attempt
        unauthorized access, scrape or redistribute feeds beyond normal product use, or interfere with other users.
      </p>
      <p>
        Rise/set times, altitudes, rankings, frame fill, Bortle estimates, weather summaries, and object positions are
        reasonable approximations for informational planning only. We do not guarantee absolute precision or that a target
        will be imageable on a given night. Always confirm conditions outdoors before you commit to a session.
      </p>

      <h3>8. Third-party astronomical data and sky surveys</h3>
      <p>
        {APP_NAME} integrates catalogues, ephemerides, place data, weather, and sky survey imagery from third parties
        (including CDS / Aladin HiPS, Digitized Sky Survey material, Open-Meteo, OpenStreetMap Nominatim, and others).
        Paid features, when offered, provide enhanced software tools and limits; they do not sell or transfer ownership
        of third-party surveys or catalogues, which remain with their providers. Full credits appear under
        Acknowledgements.
      </p>

      <h3>9. Disclaimer of warranties and limitation of liability</h3>
      <p>
        {APP_NAME} IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
        DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT.
      </p>
      <p>
        UNDER NO CIRCUMSTANCES SHALL {COMPANY_SHORT_NAME}, ITS OWNERS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT,
        INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES — INCLUDING LOSS OF DATA, DATA BREACHES, UNAUTHORIZED ACCESS, LOST
        IMAGING TIME, HARDWARE DECISIONS, PROFIT LOSS, SERVICE INTERRUPTIONS, OR THIRD-PARTY PERK FAILURES — ARISING FROM
        YOUR USE OF {APP_NAME}. YOUR USE IS ENTIRELY AT YOUR OWN RISK.
      </p>

      <h3>10. Indemnification</h3>
      <p>
        You agree to indemnify and hold harmless {COMPANY_LEGAL_NAME} and its officers from claims, damages, costs, and
        expenses (including reasonable legal fees) arising from your use of the platform, your violation of these Terms,
        or your infringement of third-party rights.
      </p>

      <h3>11. Modifications and governing law</h3>
      <p>
        We may modify these Terms at any time. Significant updates will be noted in the app or, when practical,
        communicated by email to account holders. Continued use after a change constitutes acceptance of the revised
        Terms.
      </p>
      <p>
        These Terms are governed by the laws of India. Subject to mandatory consumer protections where you live, disputes
        relating to {APP_NAME} shall be brought in the courts of Hyderabad, Telangana, India, without regard to conflict
        of law rules that would require another venue.
      </p>
      <p>
        Questions: <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>. Registered office: {COMPANY_ADDRESS}.
      </p>
      <p className="note">Last updated {TERMS_LAST_UPDATED}.</p>
    </LegalProse>
  );
}

function PrivacyPage() {
  return (
    <LegalProse>
      <p>
        {APP_NAME} values your privacy and is dedicated to protecting your personal data. We make reasonable efforts and
        employ industry-standard administrative, technical, and physical safeguards to preserve your privacy. This
        Privacy Policy explains how {COMPANY_LEGAL_NAME} (“we”, “us”) collects, uses, processes, and protects information
        when you access or use {APP_NAME} on the web or in related mobile apps.
      </p>

      <h3>1. Information we collect</h3>
      <p>We collect information you provide directly as well as data generated when you use {APP_NAME}:</p>
      <p>
        <strong>Account &amp; profile information.</strong> If you enter profile details or later create an account, this
        may include email address, username, phone number, password hashes (when accounts are enabled), profile photo,
        and user preferences such as theme.
      </p>
      <p>
        <strong>Planner &amp; user-generated content.</strong> Observing sites, planning dates, equipment and rig
        configurations, focal-length overrides, custom filters, favorites, named target lists, and similar settings you
        save in the app.
      </p>
      <p>
        <strong>Observing location data.</strong> Coordinates, place names, time zones, and related site details you
        choose so we can calculate object visibility, rise/set windows, altitude charts, Bortle estimates, and weather
        for that site.
      </p>
      <p>
        <strong>Automated &amp; technical data.</strong> When the app talks to our servers or partner APIs, those systems
        may process IP addresses, browser or device type, operating system, request timing, referring URLs, access logs,
        and error telemetry needed to deliver and secure the service.
      </p>

      <h3>2. How we use your information</h3>
      <p>Your information is used to provide, maintain, and improve {APP_NAME}:</p>
      <p>
        To compute astronomical planning results, visibility charts, frame fill, target shortlists, and weather summaries
        tailored to your site, date, and gear.
      </p>
      <p>
        To store your equipment library, observing lists, locations, catalogue preferences, and theme on your device, and
        — when you opt into an account — to sync those settings across devices according to your choices.
      </p>
      <p>
        To communicate important service notices, security alerts, and (only if you opt in) product updates or observing
        tips.
      </p>
      <p>
        To monitor performance, troubleshoot issues, prevent abuse or fraud, and enforce our Terms of use.
      </p>

      <h3>3. What stays on your device today</h3>
      <p>
        The current web build is primarily local-first. Site, date, rig, equipment library, lists, profile fields, theme,
        and similar planner settings are stored in your browser’s local storage (and, on mobile, on-device storage). We do
        not receive a standing copy of that library unless you later enable cloud sync or another account feature.
      </p>

      <h3>4. Third-party processing and sharing</h3>
      <p>
        We do not sell your personal information. To operate {APP_NAME}, we may share limited data with trusted providers
        who process it only to deliver the service:
      </p>
      <p>
        <strong>Service infrastructure &amp; hosting.</strong> Cloud hosting, databases, and related infrastructure that
        run our APIs and static app assets.
      </p>
      <p>
        <strong>Weather, places, and sky previews.</strong> Forecasts and time zones use Open-Meteo. Place names may use
        OpenStreetMap Nominatim. Framing thumbnails and sky plates use CDS / survey imagery services. Those providers
        receive the coordinates, dates, or sky positions needed for the request and process them under their own
        policies.
      </p>
      <p>
        <strong>Payments &amp; communications (when enabled).</strong> If paid plans or transactional email launch, secure
        payment gateways and email delivery services will process only what is required. We do not store full payment card
        numbers on our servers.
      </p>
      <p>
        <strong>Analytics, security &amp; support.</strong> The current web build does not include a marketing analytics
        SDK. We may use aggregated usage metrics, automated error tracking, and support tools later to keep the service
        reliable. If we add analytics that identify you, we will update this notice and seek any required consent.
      </p>
      <p>
        <strong>Legal compliance.</strong> We may disclose information if required by law, court order, or regulation, or
        when necessary to protect the rights, safety, or property of {APP_NAME}, {COMPANY_SHORT_NAME}, or our users.
      </p>

      <h3>5. Cookies and local storage</h3>
      <p>
        {APP_NAME} uses browser cookies and local storage (and comparable mobile storage) to remember theme, gear,
        locations, lists, and other planner settings, and to keep optional signed-in sessions working. You can clear or
        restrict storage in your browser or device settings; some features will not work correctly without it.
      </p>

      <h3>6. Data retention and your rights</h3>
      <p>
        Local planner data remains on your device until you clear site data, uninstall the app, or delete it in-product.
        If you create an account, we retain account data while the account is active and for a reasonable period afterward
        as needed for backups, legal obligations, or dispute resolution.
      </p>
      <p>
        Depending on where you live, you may have rights to access, correct, export, or delete personal data we hold
        about you, and to object to or restrict certain processing. To exercise those rights, or to request deletion of
        account data once accounts are available, contact us at{" "}
        <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>. We will respond as promptly as reasonably possible.
      </p>

      <h3>7. Children</h3>
      <p>
        {APP_NAME} is not directed at children under 13 (or the minimum age required in your country). We do not
        knowingly collect personal information from children. If you believe a child has provided us data, contact us and
        we will take appropriate steps to delete it.
      </p>

      <h3>8. International processing</h3>
      <p>
        {COMPANY_LEGAL_NAME} is based in India. Service providers and APIs may process data in other countries. Where we
        transfer personal data internationally, we take steps appropriate to the circumstances and applicable law.
      </p>

      <h3>9. Security disclaimer</h3>
      <p>
        We take reasonable precautions to safeguard personal data, but no internet transmission or storage system is 100%
        secure. {APP_NAME} is provided on an “as is” and “as available” basis. To the maximum extent permitted by law,{" "}
        {COMPANY_SHORT_NAME} is not liable for unauthorized access, transmission errors, data loss, or security failures
        involving third-party providers. Your use of {APP_NAME} and submission of data is at your own risk. See also our
        Terms of use.
      </p>

      <h3>10. Policy changes and contact</h3>
      <p>
        We may update this Privacy Policy from time to time. Significant changes will be noted in the app or, if you have
        an account with a verified email, communicated by email when practical. Continued use after a change means you
        accept the revised policy.
      </p>
      <p>
        Privacy questions:{" "}
        <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>. Registered office: {COMPANY_ADDRESS}.
      </p>
      <p className="note">Last updated {PRIVACY_LAST_UPDATED}.</p>
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
        Full machine-readable notices ship with the data package. If a credit should be corrected, email{" "}
        <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
      </p>
    </LegalProse>
  );
}

function LegalProse({ children }: { children: ReactNode }) {
  return <div className="legal-prose">{children}</div>;
}
