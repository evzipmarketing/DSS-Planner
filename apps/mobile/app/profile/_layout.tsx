import { Stack } from "expo-router";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function ProfileStackLayout() {
  const { theme } = usePlannerState();
  const c = colors(theme);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bgRaised },
        headerTintColor: c.text,
        headerTitleStyle: { color: c.text },
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="lists" options={{ title: "Target Lists" }} />
      <Stack.Screen name="imaging-plans" options={{ title: "Imaging plans" }} />
      <Stack.Screen name="equipment" options={{ title: "Equipment" }} />
      <Stack.Screen name="locations" options={{ title: "Locations" }} />
      <Stack.Screen name="catalogue" options={{ title: "Catalogue" }} />
      <Stack.Screen name="subscription" options={{ title: "Subscription" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}
