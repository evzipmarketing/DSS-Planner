import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HubRow } from "@/components/hub-row";
import { Field, GhostButton, OfflineBanner, PrimaryButton, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { APP_NAME, APP_TAGLINE, APP_VERSION, COMPANY_SHORT_NAME } from "@/lib/app-meta";
import { EMPTY_PROFILE, loadProfile, saveProfile, type LocalProfile } from "@/lib/storage";
import { useAuth } from "@/state/auth-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function ProfileScreen() {
  const planner = usePlannerState();
  const auth = useAuth();
  const online = useNetworkOnline();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [profile, setProfile] = useState<LocalProfile>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    void loadProfile().then((next) => {
      setProfile(next);
      setLoaded(true);
      if (next.username.trim() || next.phone.trim()) setAccountOpen(false);
    });
  }, []);

  function updateProfile(patch: Partial<LocalProfile>) {
    setProfile((current) => {
      const next = { ...current, ...patch };
      void saveProfile(next);
      return next;
    });
  }

  const accountEmail = auth.user?.email ?? email;
  const accountSummary = useMemo(() => {
    const name = profile.username.trim() || "Account";
    const mail = accountEmail.trim() || "No email";
    const phone = profile.phone.trim() || "No phone";
    return `${name} · ${mail} · ${phone}`;
  }, [profile.username, profile.phone, accountEmail]);

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    setPasswordBusy(true);
    const result = await auth.updatePassword(newPassword);
    setPasswordBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}>
        <Text style={styles.title}>Profile</Text>
        <OfflineBanner theme={planner.theme} online={online} />

        <View style={[styles.card, { gap: 12 }]}>
          <Pressable
            onPress={() => setAccountOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: accountOpen }}
            style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.label}>Account</Text>
              <Text style={[styles.body, { fontWeight: "600" }]} numberOfLines={2}>
                {accountSummary}
              </Text>
            </View>
            <Text style={{ color: c.accent, fontSize: 12, marginTop: 4 }}>{accountOpen ? "▲" : "▼"}</Text>
          </Pressable>

          {accountOpen ? (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <Pressable
                  onPress={() => setMessage("Photo picker lands with the next Profile pass.")}
                  accessibilityRole="button"
                  accessibilityLabel="Profile photo"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    borderWidth: 1,
                    borderColor: c.lineStrong,
                    backgroundColor: c.bgSunken,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {profile.photoUri ? (
                    <Image source={{ uri: profile.photoUri }} style={{ width: 88, height: 88 }} />
                  ) : (
                    <Text style={{ color: c.faint, fontSize: 28 }}>◌</Text>
                  )}
                </Pressable>

                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={styles.muted}>{loaded ? "Tap photo to change" : "Loading…"}</Text>
                  <Field
                    theme={planner.theme}
                    label="Username"
                    value={profile.username}
                    onChangeText={(username) => updateProfile({ username })}
                    placeholder="deepskyimager"
                    autoCapitalize="none"
                    textContentType="username"
                  />
                  <Field
                    theme={planner.theme}
                    label="Email"
                    value={accountEmail}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    editable={!auth.user}
                    textContentType="emailAddress"
                  />
                  <Field
                    theme={planner.theme}
                    label="Phone (optional)"
                    value={profile.phone}
                    onChangeText={(phone) => updateProfile({ phone })}
                    placeholder="+1 …"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                </View>
              </View>

              {!auth.configured ? (
                <Text style={styles.muted}>
                  Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and cloud sync.
                </Text>
              ) : auth.user ? (
                <GhostButton theme={planner.theme} title="Sign out" onPress={() => void auth.signOut()} />
              ) : (
                <PrimaryButton
                  theme={planner.theme}
                  title="Send magic link"
                  onPress={() => {
                    void auth.signInWithEmail(email).then((result) => {
                      setMessage(result.error ?? "Check your email for a sign-in link.");
                    });
                  }}
                />
              )}

              <View style={{ gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.line }}>
                <Pressable
                  onPress={() => setPasswordOpen((value) => !value)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: passwordOpen }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                >
                  <Text style={[styles.body, { fontWeight: "600" }]}>Change password</Text>
                  <Text style={{ color: c.accent, fontSize: 12 }}>{passwordOpen ? "▲" : "▼"}</Text>
                </Pressable>
                {passwordOpen ? (
                  <View style={{ gap: 10 }}>
                    <Field
                      theme={planner.theme}
                      label="New password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="At least 8 characters"
                      secureTextEntry
                      textContentType="newPassword"
                    />
                    <Field
                      theme={planner.theme}
                      label="Confirm password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat new password"
                      secureTextEntry
                      textContentType="newPassword"
                    />
                    <PrimaryButton
                      theme={planner.theme}
                      title={passwordBusy ? "Updating…" : "Update password"}
                      disabled={passwordBusy || !newPassword || !confirmPassword}
                      onPress={() => void changePassword()}
                    />
                    {!auth.user ? (
                      <Text style={styles.muted}>Sign in first to change your account password.</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {message ? <Text style={styles.muted}>{message}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
          <HubRow theme={planner.theme} title="Target Lists" detail="Favorites and named target lists" onPress={() => router.push("/profile/lists")} />
          <HubRow
            theme={planner.theme}
            title="Imaging plans"
            detail="Saved Multi-target, Single-target, Mosaic, Multi-rigs, and Collage sessions"
            onPress={() => router.push("/profile/imaging-plans")}
          />
          <HubRow theme={planner.theme} title="Equipment" detail="Scopes, cameras, filters" onPress={() => router.push("/profile/equipment")} />
          <HubRow theme={planner.theme} title="Locations" detail="Observing sites" onPress={() => router.push("/profile/locations")} />
          <HubRow theme={planner.theme} title="Catalogue" detail="Extended catalogue and components" onPress={() => router.push("/profile/catalogue")} />
          <HubRow theme={planner.theme} title="Subscription" detail="Plan and billing" onPress={() => router.push("/profile/subscription")} />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[styles.body, { fontWeight: "600", fontSize: 18 }]}>About</Text>
          <Text style={styles.muted}>
            {APP_NAME} · v{APP_VERSION}. {APP_TAGLINE}
          </Text>
          <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
            <Text style={[styles.muted, { paddingVertical: 10, paddingHorizontal: 4 }]}>
              Published by {COMPANY_SHORT_NAME}
            </Text>
            <HubRow
              theme={planner.theme}
              title="About DeepSkyMate"
              detail="Version and product details"
              onPress={() => router.push({ pathname: "/profile/about", params: { page: "about" } })}
            />
            <HubRow
              theme={planner.theme}
              title="Terms of use"
              detail="Acceptance, subscriptions, content, and liability"
              onPress={() => router.push({ pathname: "/profile/about", params: { page: "terms" } })}
            />
            <HubRow
              theme={planner.theme}
              title="Privacy"
              detail="How we collect, use, and protect your data"
              onPress={() => router.push({ pathname: "/profile/about", params: { page: "privacy" } })}
            />
            <HubRow
              theme={planner.theme}
              title="Acknowledgements"
              detail="Catalogue, sky, weather, and place data credits"
              onPress={() => router.push({ pathname: "/profile/about", params: { page: "acknowledgements" } })}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
