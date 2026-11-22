import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useThemeStyles } from "@/components/ui";
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
import { usePlannerState } from "@/state/planner-context";

type AboutPageId = "about" | "terms" | "privacy" | "acknowledgements" | "contact";

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
        {id === "contact" ? <ContactBody theme={planner.theme} /> : null}
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
    <View style={{ gap: 10 }}>
      <Text style={styles.body}>
        By using {APP_NAME}, you agree to these terms. The service is provided by {COMPANY_LEGAL_NAME} (“we”, “us”).
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Use of the app</Text>
      <Text style={styles.muted}>
        You may use {APP_NAME} for personal or professional imaging planning. You must not misuse the service, attempt
        unauthorized access, scrape or redistribute catalogue or imagery feeds beyond what the product provides, or
        interfere with other users.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Planning information</Text>
      <Text style={styles.muted}>
        Rankings, usable hours, frame fill, Bortle estimates, and forecasts are approximate. They depend on site, date,
        gear, and third-party data. We do not guarantee that a target will be imageable or that forecasts will match the
        sky.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Liability</Text>
      <Text style={styles.muted}>
        To the fullest extent permitted by law, {COMPANY_SHORT_NAME} is not liable for lost imaging time, equipment
        decisions, or other damages arising from reliance on planning output. The app is provided “as is”.
      </Text>
      <Text style={styles.muted}>Last updated {COPYRIGHT_YEAR}.</Text>
    </View>
  );
}

function PrivacyBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.body}>
        This notice describes how {APP_NAME} handles information when you use the app published by {COMPANY_LEGAL_NAME}.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>What stays on your device</Text>
      <Text style={styles.muted}>
        Site, date, rig, equipment library, theme, list preferences, and similar planner settings are stored on your
        device. We do not receive that data unless you later opt into a synced account feature.
      </Text>
      <Text style={[styles.body, { fontWeight: "600" }]}>Requests the app makes</Text>
      <Text style={styles.muted}>
        To show forecasts, place names, time zones, and sky preview plates, the app calls our servers or partner APIs with
        coordinates, dates, or sky positions you select.
      </Text>
      <Text style={styles.muted}>
        Privacy questions: {COMPANY_EMAIL}. Last updated {COPYRIGHT_YEAR}.
      </Text>
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
      <Text style={styles.muted}>If a credit should be corrected, use Contact.</Text>
    </View>
  );
}

function ContactBody({ theme }: { theme: "dark" | "night" }) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.body}>
        Reach the team behind {APP_NAME} at {COMPANY_LEGAL_NAME}.
      </Text>
      <MetaRow theme={theme} label="Email" value={COMPANY_EMAIL} onPress={() => void Linking.openURL(`mailto:${COMPANY_EMAIL}`)} />
      <MetaRow theme={theme} label="Registered office" value={COMPANY_ADDRESS} />
      <MetaRow theme={theme} label="Company" value={COMPANY_LEGAL_NAME} />
      <Text style={styles.muted}>For catalogue credit corrections, privacy questions, or product feedback, email is best.</Text>
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
    case "contact":
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
    case "contact":
      return "Contact";
    default: {
      const unexpected: never = id;
      return unexpected;
    }
  }
}
