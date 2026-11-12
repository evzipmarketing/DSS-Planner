import type { Site } from "@dss/core";

export const locations: Site[] = [
  { id: "hyderabad", name: "Hyderabad", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
  { id: "bengaluru", name: "Bengaluru", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata" },
  { id: "chennai", name: "Chennai", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata" },
  { id: "mumbai", name: "Mumbai", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { id: "pune", name: "Pune", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" },
  { id: "delhi", name: "Delhi", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
  { id: "jaipur", name: "Jaipur", latitude: 26.9124, longitude: 75.7873, timezone: "Asia/Kolkata" },
  { id: "kolkata", name: "Kolkata", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata" },
  { id: "hanle", name: "Hanle", latitude: 32.7794, longitude: 78.9641, timezone: "Asia/Kolkata" },
];

export const defaultSite: Site = locations[0] ?? {
  id: "hyderabad",
  name: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
};
