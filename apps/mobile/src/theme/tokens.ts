export type ThemeName = "dark" | "night";

export const palette = {
  dark: {
    bg: "#141616",
    bgRaised: "#1c1f1f",
    bgSunken: "#101212",
    line: "#343838",
    lineStrong: "#4a5050",
    text: "#eceae4",
    muted: "#b7b5ae",
    faint: "#9c9a93",
    accent: "#7ad0e7",
    accentInk: "#0a5566",
    clay: "#e08a7a",
    moon: "#cfcbc4",
    usable: "rgba(122, 208, 231, 0.2)",
  },
  night: {
    bg: "#120707",
    bgRaised: "#1a0c0c",
    bgSunken: "#0e0505",
    line: "#3a1c1c",
    lineStrong: "#5a3030",
    text: "#f0b4b4",
    muted: "#c48a8a",
    faint: "#a87070",
    accent: "#e08a7a",
    accentInk: "#3a1010",
    clay: "#e08a7a",
    moon: "#e6aaa1",
    usable: "rgba(224, 138, 122, 0.22)",
  },
} as const;

export function colors(theme: ThemeName) {
  return palette[theme];
}
