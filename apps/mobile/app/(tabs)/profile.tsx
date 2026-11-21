import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HubRow } from "@/components/hub-row";
import { Field, GhostButton, OfflineBanner, PrimaryButton, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { getApiBase } from "@/lib/api";
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

  useEffect(() => {
    void loadProfile().then((next) => {
      setProfile(next);
      setLoaded(true);
    });
  }, []);

  function updateProfile(patch: Partial<LocalProfile>) {
    setProfile((current) => {
      const next = { ...current, ...patch };
      void saveProfile(next);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Profile</Text>
        <OfflineBanner theme={planner.theme} online={online} />

        <View style={[styles.card, { gap: 12, alignItems: "center" }]}>
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
            }}
          >
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={{ width: 88, height: 88 }} />
            ) : (
              <Text style={{ color: c.faint, fontSize: 28 }}>◌</Text>
            )}
          </Pressable>
          <Text style={styles.muted}>{loaded ? "Tap to add a photo" : "Loading…"}</Text>
        </View>

        <View style={[styles.card, { gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.body, { fontWeight: "600" }]}>Theme</Text>
              <Text style={styles.muted}>{planner.theme === "night" ? "Night vision" : "Dark"}</Text>
            </View>
            <Switch
              value={planner.theme === "night"}
              onValueChange={(night) => planner.setTheme(night ? "night" : "dark")}
              trackColor={{ false: c.lineStrong, true: c.accent }}
              thumbColor={c.bgRaised}
            />
          </View>
        </View>

        <View style={[styles.card, { gap: 12 }]}>
          <Field
            theme={planner.theme}
            label="Username"
            value={profile.username}
            onChangeText={(username) => updateProfile({ username })}
            placeholder="deepskyimager"
            autoCapitalize="none"
          />
          <Field
            theme={planner.theme}
            label="Email"
            value={auth.user?.email ?? email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            editable={!auth.user}
          />
          <Field
            theme={planner.theme}
            label="Phone (optional)"
            value={profile.phone}
            onChangeText={(phone) => updateProfile({ phone })}
            placeholder="+1 …"
            keyboardType="phone-pad"
          />

          {!auth.configured ? (
            <Text style={styles.muted}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and cloud sync.
            </Text>
          ) : auth.user ? (
            <GhostButton theme={planner.theme} title="Sign out" onPress={() => void auth.signOut()} />
          ) : (
            <>
              <PrimaryButton
                theme={planner.theme}
                title="Send magic link"
                onPress={() => {
                  void auth.signInWithEmail(email).then((result) => {
                    setMessage(result.error ?? "Check your email for a sign-in link.");
                  });
                }}
              />
            </>
          )}
          {message ? <Text style={styles.muted}>{message}</Text> : null}
        </View>

        <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
          <HubRow theme={planner.theme} title="Lists" detail="Favorites and named observing lists" onPress={() => router.push("/profile/lists")} />
          <HubRow theme={planner.theme} title="Equipment" detail="Scopes, cameras, filters" onPress={() => router.push("/profile/equipment")} />
          <HubRow theme={planner.theme} title="Locations" detail="Observing sites" onPress={() => router.push("/profile/locations")} />
          <HubRow theme={planner.theme} title="Catalogue" detail="Extended catalogue and components" onPress={() => router.push("/profile/catalogue")} />
          <HubRow theme={planner.theme} title="Subscription" detail="Plan and billing" onPress={() => router.push("/profile/subscription")} />
        </View>

        <View style={[styles.card, { gap: 8 }]}>
          <Text style={[styles.body, { fontWeight: "600" }]}>Offline & API</Text>
          <Text style={styles.muted}>Network: {online ? "Online" : "Offline"}</Text>
          <Text style={styles.muted}>API: {getApiBase()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
