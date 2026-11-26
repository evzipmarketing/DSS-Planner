import { useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SkyExplorer } from "@/components/sky/sky-explorer";
import { OfflineBanner, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { usePlannerState } from "@/state/planner-context";

export default function SkyScreen() {
  const planner = usePlannerState();
  const online = useNetworkOnline();
  const styles = useThemeStyles(planner.theme);

  const popularDsos = useMemo(() => {
    const catalogue = planner.catalogue ?? [];
    return catalogue.filter((object) => {
      if (object.messier != null) return true;
      if (object.names.length === 0) return false;
      if (object.magnitude != null && object.magnitude <= 8.5) return true;
      return ["HII", "PN", "SNR", "Cl+N", "GCl", "OCl"].includes(object.type) && object.majorArcmin != null && object.majorArcmin >= 10;
    });
  }, [planner.catalogue]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: "#000" }]} edges={["top"]}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <OfflineBanner theme={planner.theme} online={online} />
      </View>
      <SkyExplorer
        theme={planner.theme}
        site={planner.site}
        locationReady={planner.locationReady}
        target={planner.selected}
        popularDsos={popularDsos}
      />
    </SafeAreaView>
  );
}
