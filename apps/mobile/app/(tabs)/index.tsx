import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  TARGET_LIST_FILTERS,
  TARGET_SORT_KEYS,
  bandLabel,
  compareTargetSort,
  defaultSortDirection,
  formatImageableHours,
  listFilterLabel,
  objectTitle,
  objectTypeLabel,
  primaryDesignation,
  shortPlaceName,
  targetSortLabel,
  type TargetListFilter,
  type TargetSortKey,
} from "@dss/core";
import { constellationName } from "@dss/data";
import { SettingsSheet } from "@/components/settings-sheet";
import { TargetThumb } from "@/components/target-thumb";
import { OfflineBanner, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function TonightScreen() {
  const planner = usePlannerState();
  const online = useNetworkOnline();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const ordered = useMemo(
    () =>
      [...planner.shortlist].sort((a, b) =>
        compareTargetSort(
          {
            id: a.object.id,
            frameFit: a.frameFit,
            usableHours: a.usableHours,
            moonScore: a.moonScore,
            visibility: a.visibility,
            catalogueRank: a.catalogueRank,
            frameFillPercent: a.frameFillPercent,
            imageableAtDusk: a.imageableAtDusk,
            imageableRise: a.imageableRise,
          },
          {
            id: b.object.id,
            frameFit: b.frameFit,
            usableHours: b.usableHours,
            moonScore: b.moonScore,
            visibility: b.visibility,
            catalogueRank: b.catalogueRank,
            frameFillPercent: b.frameFillPercent,
            imageableAtDusk: b.imageableAtDusk,
            imageableRise: b.imageableRise,
          },
          planner.listSort,
          planner.listSortDirection,
        ),
      ),
    [planner.shortlist, planner.listSort, planner.listSortDirection],
  );

  const place = planner.locationReady
    ? shortPlaceName(planner.site.name)
    : planner.placeStatus === "detecting"
      ? "Detecting…"
      : "Set location";

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setFilterOpen(false);
  }

  function chooseSort(key: TargetSortKey) {
    planner.setListSort(key);
    planner.setListSortDirection(defaultSortDirection(key));
    setSortOpen(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={planner.setupReady ? ordered : []}
        keyExtractor={(item) => item.object.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Image
                  source={require("../../assets/images/deepskymate-logo-dark.png")}
                  style={{ width: 168, height: 40, marginBottom: 2 }}
                  resizeMode="contain"
                  accessibilityLabel="DeepSkyMate"
                />
                <Text style={[styles.muted, { fontSize: 13 }]}>
                  {planner.locationReady
                    ? `${place} · ${formatDayLong(planner.date)}`
                    : planner.placeStatus === "detecting"
                      ? "Detecting location…"
                      : "Set location and date in settings"}
                </Text>
              </View>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Observatory settings"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.lineStrong,
                  backgroundColor: c.bgRaised,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <SettingsGlyph color={c.accent} />
              </Pressable>
            </View>
            <OfflineBanner theme={planner.theme} online={online} />
            {!planner.setupReady ? (
              <View style={styles.card}>
                <Text style={styles.body}>Open settings to choose location, date, telescope, and camera.</Text>
              </View>
            ) : null}
            {planner.setupReady ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ToolChip
                    theme={planner.theme}
                    label={listFilterLabel(planner.listFilter)}
                    onPress={() => setFilterOpen(true)}
                    flex
                  />
                  <ToolChip
                    theme={planner.theme}
                    label={targetSortLabel(planner.listSort)}
                    onPress={() => setSortOpen(true)}
                    flex
                  />
                  <Pressable
                    onPress={() => setSearchOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Search targets"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: c.lineStrong,
                      backgroundColor: c.bgRaised,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SearchGlyph color={c.accent} />
                  </Pressable>
                </View>
                {searchOpen ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      ref={searchRef}
                      style={[styles.input, { flex: 1 }]}
                      value={search || planner.query}
                      onChangeText={(text) => {
                        setSearch(text);
                        planner.setQuery(text);
                      }}
                      placeholder="Search M42, NGC 224…"
                      placeholderTextColor={c.faint}
                      returnKeyType="search"
                    />
                    <Pressable
                      onPress={() => {
                        setSearch("");
                        planner.setQuery("");
                        setSearchOpen(false);
                      }}
                      style={{ paddingHorizontal: 8, paddingVertical: 10 }}
                    >
                      <Text style={styles.muted}>Close</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {planner.setupReady && planner.scoring ? <Text style={styles.muted}>Scoring objects for this site and rig…</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { flexDirection: "row", gap: 12, alignItems: "center" }]}>
            <TargetThumb
              raDeg={item.object.raDeg}
              decDeg={item.object.decDeg}
              majorArcmin={item.object.majorArcmin}
              theme={planner.theme}
              name={objectTitle(item.object)}
            />
            <Pressable
              onPress={() => {
                planner.chooseTarget(item.object.id);
                router.push(`/target/${item.object.id}`);
              }}
              style={{ flex: 1, gap: 4 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={[styles.body, { fontWeight: "600", flex: 1 }]}>{objectTitle(item.object)}</Text>
                <Text style={styles.accent}>{bandLabel(item.band)}</Text>
              </View>
              <Text style={styles.muted}>
                {primaryDesignation(item.object)} · {objectTypeLabel(item.object.type)}
                {item.object.constellation ? ` · ${constellationName(item.object.constellation)}` : ""}
              </Text>
              <Text style={styles.muted}>
                Frame {item.frameFillPercent == null ? "—" : `${Math.round(item.frameFillPercent)}%`} · Imageable{" "}
                {formatImageableHours(item.usableHours)}
              </Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          planner.setupReady && !planner.scoring ? <Text style={styles.muted}>Nothing clears the horizon in this view.</Text> : null
        }
      />

      <PickerSheet
        theme={planner.theme}
        visible={filterOpen}
        title="Filter"
        onClose={() => setFilterOpen(false)}
        options={TARGET_LIST_FILTERS.map((filter) => ({
          id: filter,
          label: listFilterLabel(filter),
          selected: planner.listFilter === filter,
          onPress: () => chooseFilter(filter),
        }))}
      />
      <PickerSheet
        theme={planner.theme}
        visible={sortOpen}
        title="Sort"
        onClose={() => setSortOpen(false)}
        options={TARGET_SORT_KEYS.map((key) => ({
          id: key,
          label: targetSortLabel(key),
          selected: planner.listSort === key,
          onPress: () => chooseSort(key),
        }))}
      />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

function ToolChip({
  theme,
  label,
  onPress,
  flex,
}: {
  theme: "dark" | "night";
  label: string;
  onPress: () => void;
  flex?: boolean;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          flex: flex ? 1 : undefined,
          minHeight: 40,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          borderRadius: 12,
        },
      ]}
    >
      <Text style={[styles.chipText, { flexShrink: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: c.accent, fontSize: 10 }}>▼</Text>
    </Pressable>
  );
}

function PickerSheet({
  theme,
  visible,
  title,
  onClose,
  options,
}: {
  theme: "dark" | "night";
  visible: boolean;
  title: string;
  onClose: () => void;
  options: { id: string; label: string; selected: boolean; onPress: () => void }[];
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.bgRaised,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderColor: c.line,
            borderWidth: 1,
            padding: 16,
            paddingBottom: 28,
            gap: 8,
            maxHeight: "70%",
          }}
        >
          <Text style={[styles.label, { marginBottom: 4 }]}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={option.onPress}
              style={[
                styles.card,
                option.selected ? { borderColor: c.accent } : null,
                { paddingVertical: 12 },
              ]}
            >
              <Text style={[styles.body, option.selected ? styles.accent : null]}>{option.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={styles.muted}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SettingsGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 14, justifyContent: "space-between" }}>
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color, width: "100%" }} />
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color, width: "70%", alignSelf: "flex-end" }} />
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color, width: "85%" }} />
    </View>
  );
}

function SearchGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          borderWidth: 1.7,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 1,
          bottom: 1,
          width: 6,
          height: 1.7,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

function formatDayLong(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}
