import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useThemeStyles } from "@/components/ui";
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
import { usePlannerState } from "@/state/planner-context";

type AboutPageId = "about" | "terms" | "privacy" | "acknowledgements";

export default function AboutLegalScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const id = parsePage(page);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.title}>{pageTitle(id)}</Text>
        {id === "about" ? <AboutBody theme={planner.theme} /> : null}
        {id === "terms" ? <TermsBody theme={planner.theme} /> : null}
        {id === "privacy" ? <PrivacyBody theme={planner.theme} /> : null}
        {id === "acknowledgements" ? <AcknowledgementsBody theme={planner.theme} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.body}>
        {APP_NAME} helps imagers plan deep-sky sessions: tonight’s shortlist, framing, altitude windows, and gear setup.
      </Text>
      <MetaRow theme={theme} label="Version" value={APP_VERSION} />
      <MetaRow theme={theme} label="Product" value={APP_NAME} />
      <MetaRow theme={theme} label="Publisher" value={COMPANY_LEGAL_NAME} />
      <MetaRow theme={theme} label="Focus" value={APP_TAGLINE} />
      <MetaRow
        theme={theme}
        label="Contact"
        value={COMPANY_EMAIL}
        onPress={() => void Linking.openURL(`mailto:${COMPANY_EMAIL}`)}
      />
      <Text style={styles.muted}>
        Planning scores, weather summaries, and sky previews are aids for preparation. Always confirm conditions outdoors
        before you commit to a session.
      </Text>
    </View>
  );
}

function TermsBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.body}>
        Using {APP_NAME} means you accept these Terms and Conditions. If you do not agree, stop using the app. The
        service is provided by {COMPANY_LEGAL_NAME} (“we”, “us”).
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>1. Intellectual property and attribution</Text>
      <Text style={styles.muted}>
        {APP_NAME} software and branding are copyrighted by {COMPANY_LEGAL_NAME}. When republishing planning output,
        include attribution with a link to {APP_URL}. Third-party catalogues and imagery remain under their own licences
        (see Acknowledgements).
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>2. Accounts, subscriptions, and payments</Text>
      <Text style={styles.muted}>
        {APP_NAME} is intended as freemium: core planning is free; paid tiers may add limits or features. Billing will use
        third-party gateways (we do not store full card numbers). Unless stated otherwise, subscription payments may be
        refunded within 30 days via {COMPANY_EMAIL}. Plan changes will be announced with reasonable notice when
        practical. Partner perks are “as is” and do not expand our refund obligations.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>3. User-generated content</Text>
      <Text style={styles.muted}>
        Sites, equipment, lists, and profile details you enter must be lawful, non-spam, and related to astronomy
        planning. You keep ownership; when sync/sharing features are enabled you grant us a licence to host and display
        content as needed to run the service—not to sell it as a standalone product.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>4. Account termination</Text>
      <Text style={styles.muted}>
        We may suspend or delete accounts that violate these Terms. We are not liable for data or unused paid time lost
        due to termination for cause. Clear local data anytime; email {COMPANY_EMAIL} for account deletion when accounts
        exist.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>5. Data loss and backups</Text>
      <Text style={styles.muted}>
        You are responsible for backing up important content. Much data is local today. We do not guarantee preservation
        and are not liable for accidental loss or corruption.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>6. APIs</Text>
      <Text style={styles.muted}>
        Developer APIs, if published, may be limited or revoked. Commercial redistribution needs written consent. No
        minimum uptime is guaranteed.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>7. Accuracy</Text>
      <Text style={styles.muted}>
        Rise/set times, rankings, frame fill, Bortle, weather, and positions are approximations for planning only. Always
        confirm conditions outdoors before a session.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>8. Third-party data</Text>
      <Text style={styles.muted}>
        Catalogues, weather, places, and sky plates come from third parties and remain theirs. Paid features do not
        transfer ownership of those datasets. See Acknowledgements.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>9. Disclaimer and liability</Text>
      <Text style={styles.muted}>
        {APP_NAME} is provided “as is” and “as available”. To the maximum extent permitted by law, {COMPANY_SHORT_NAME}{" "}
        disclaims warranties and is not liable for data loss, breaches, lost imaging time, interruptions, or other
        damages arising from use of the app. Use is at your own risk.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>10. Indemnification</Text>
      <Text style={styles.muted}>
        You agree to indemnify {COMPANY_LEGAL_NAME} against claims arising from your use, your breach of these Terms, or
        your infringement of third-party rights.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>11. Changes and governing law</Text>
      <Text style={styles.muted}>
        We may update these Terms; continued use after changes means acceptance. Governed by the laws of India; disputes
        (subject to mandatory consumer protections) in Hyderabad, Telangana courts. Contact: {COMPANY_EMAIL}. Office:{" "}
        {COMPANY_ADDRESS}.
      </Text>
      <Text style={styles.muted}>Last updated {TERMS_LAST_UPDATED}.</Text>
    </View>
  );
}

function PrivacyBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.body}>
        {APP_NAME} values your privacy and is dedicated to protecting your personal data. We make reasonable efforts and
        employ industry-standard safeguards to preserve your privacy. This Privacy Policy explains how {COMPANY_LEGAL_NAME}{" "}
        (“we”, “us”) collects, uses, processes, and protects information when you use {APP_NAME}.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>1. Information we collect</Text>
      <Text style={styles.muted}>
        Account & profile information you enter (email, username, phone, preferences); planner content such as sites,
        equipment, lists, and gear settings; observing location coordinates and place names; and technical data such as
        IP address, device or browser type, and error logs when the app calls our APIs.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>2. How we use your information</Text>
      <Text style={styles.muted}>
        To compute planning results tailored to your site, date, and gear; to store your library and preferences on
        device (and sync them if you later enable an account); to send important service notices; and to maintain
        security and enforce our Terms of use.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>3. What stays on your device today</Text>
      <Text style={styles.muted}>
        The current apps are primarily local-first. Planner settings are stored on your device. We do not receive a
        standing copy of that library unless you enable cloud sync or another account feature.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>4. Third-party processing and sharing</Text>
      <Text style={styles.muted}>
        We do not sell your personal information. Limited data may go to hosting providers; weather/place/sky services
        (for example Open-Meteo, OpenStreetMap Nominatim, CDS imagery); and, when enabled, payment or email providers. We
        may also disclose information when required by law or to protect rights and safety.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>5. Cookies and local storage</Text>
      <Text style={styles.muted}>
        {APP_NAME} uses local storage (and comparable mobile storage) to remember theme, gear, locations, and lists.
        Clearing storage may reset those settings.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>6. Data retention and your rights</Text>
      <Text style={styles.muted}>
        Local data remains until you clear it or uninstall. Account data, when available, is kept while the account is
        active and as needed afterward for legal or backup purposes. You may request access, correction, or deletion by
        emailing {COMPANY_EMAIL}.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>7. Children</Text>
      <Text style={styles.muted}>
        {APP_NAME} is not directed at children under 13 (or the minimum age in your country). We do not knowingly collect
        children’s personal information.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>8. International processing</Text>
      <Text style={styles.muted}>
        {COMPANY_LEGAL_NAME} is based in India. Providers may process data in other countries with appropriate safeguards.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>9. Security disclaimer</Text>
      <Text style={styles.muted}>
        No system is 100% secure. {APP_NAME} is provided “as is”. To the maximum extent permitted by law,{" "}
        {COMPANY_SHORT_NAME} is not liable for unauthorized access, transmission errors, or third-party security failures.
        See also our Terms of use.
      </Text>

      <Text style={[styles.body, { fontWeight: "600" }]}>10. Policy changes and contact</Text>
      <Text style={styles.muted}>
        We may update this policy and will note significant changes in the app when practical. Privacy questions:{" "}
        {COMPANY_EMAIL}. Registered office: {COMPANY_ADDRESS}.
      </Text>
      <Text style={styles.muted}>Last updated {PRIVACY_LAST_UPDATED}.</Text>
    </View>
  );
}

function AcknowledgementsBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.body}>
        {APP_NAME} builds on public catalogues, open APIs, and sky surveys. Credits follow the attribution terms of those
        sources.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Deep-sky catalogues</Text>
      <Text style={styles.muted}>
        NGC/IC and common names derive from OpenNGC (CC BY-SA 4.0). Additional catalogues include Sharpless, Barnard,
        Lynds, and others as described in our data notices.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Sky preview imagery</Text>
      <Text style={styles.muted}>
        Framing thumbnails use CDS DSS2 color HiPS / hips2fits. Credit: CDS Aladin Sky Atlas / STScI DSS material.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Weather and places</Text>
      <Text style={styles.muted}>Forecasts and geocoding use Open-Meteo (CC BY 4.0) and OpenStreetMap Nominatim (ODbL).</Text>
      <Text style={styles.muted}>If a credit should be corrected, email {COMPANY_EMAIL}.</Text>
    </View>
  );
}

function MetaRow({
  theme,
  label,
  value,
  onPress,
}: {
  theme: "dark" | "night";
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const styles = useThemeStyles(theme);
  const content = (
    <View style={{ gap: 2 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {content}
    </Pressable>
  );
}

function parsePage(page: string | undefined): AboutPageId {
  switch (page) {
    case "terms":
    case "privacy":
    case "acknowledgements":
    case "about":
      return page;
    default:
      return "about";
  }
}

function pageTitle(id: AboutPageId): string {
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
