import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/state/auth-context";
import { ListsProvider } from "@/state/lists-context";
import { PlannerProvider, usePlannerState } from "@/state/planner-context";

function RootNav() {
  const { theme } = usePlannerState();
  return (
    <>
      <StatusBar style={theme === "night" ? "light" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme === "night" ? "#120707" : "#141616" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="planner" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="target/[id]" options={{ presentation: "card", headerShown: true, title: "Target" }} />
        <Stack.Screen name="setup/[panel]" options={{ presentation: "modal", headerShown: true, title: "Setup" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PlannerProvider>
          <ListsProvider>
            <RootNav />
          </ListsProvider>
        </PlannerProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
