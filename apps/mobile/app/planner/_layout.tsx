import { Stack } from "expo-router";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function PlannerStackLayout() {
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
      <Stack.Screen name="multi-target" options={{ title: "Multi-target" }} />
      <Stack.Screen name="single-target" options={{ title: "Single-target" }} />
      <Stack.Screen name="multi-rigs" options={{ title: "Multi-rigs" }} />
      <Stack.Screen name="mosaic" options={{ title: "Mosaic" }} />
      <Stack.Screen name="collage" options={{ title: "Collage" }} />
      <Stack.Screen name="asterisms" options={{ title: "Asterisms" }} />
    </Stack>
  );
}
