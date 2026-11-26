import { View } from "react-native";
import { Tabs } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { ThemeFab } from "@/components/theme-fab";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

function TonightIcon({ color, focused }: { color: string; focused: boolean }) {
  const size = focused ? 24 : 22;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path
        d="M14.2 3.6A8.2 8.2 0 1 0 20.4 14.2 6.4 6.4 0 1 1 14.2 3.6Z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-20 12 12)"
      />
    </Svg>
  );
}

function PlannerIcon({ color, focused }: { color: string; focused: boolean }) {
  const size = focused ? 24 : 22;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path
        d="M4 5h16v14H4zM8 3v4M16 3v4M4 9h16"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SkyIcon({ color, focused }: { color: string; focused: boolean }) {
  const size = focused ? 24 : 22;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={12} cy={12} r={8} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M12 6v6l4 2" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ProfileIcon({ color, focused }: { color: string; focused: boolean }) {
  const size = focused ? 24 : 22;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={12} cy={8} r={3.5} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function TabsLayout() {
  const { theme } = usePlannerState();
  const c = colors(theme);
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: c.bgRaised,
            borderTopColor: c.line,
          },
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Tonight",
            tabBarIcon: ({ color, focused }) => <TonightIcon color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: "Planner",
            tabBarIcon: ({ color, focused }) => <PlannerIcon color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="sky"
          options={{
            title: "Sky",
            tabBarIcon: ({ color, focused }) => <SkyIcon color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => <ProfileIcon color={String(color)} focused={focused} />,
          }}
        />
      </Tabs>
      <ThemeFab />
    </View>
  );
}
