import { useTheme } from "./theme-context";

const dark = {
  purple: "#8B7BD8",
  purpleLight: "#B4A8EC",
  blue: "#4DA8FF",
  green: "#00E5A0",
  orange: "#FFB347",
  red: "#FF5C5C",
  cyan: "#00D4FF",
  tick: "#6E6E8A",
  tickLight: "#8080A0",
  legend: "#8080A0",
  cursorFill: "rgba(139,123,216,0.06)",
  gradientStart: "#8B7BD8",
  palette: ["#8B7BD8", "#4DA8FF", "#00E5A0", "#FFB347", "#FF5C5C", "#00D4FF", "#B4A8EC"],
};

const light = {
  purple: "#6C5CC0",
  purpleLight: "#8B7BD8",
  blue: "#2563EB",
  green: "#059669",
  orange: "#D97706",
  red: "#DC2626",
  cyan: "#0098C0",
  tick: "#9CA3AF",
  tickLight: "#6B7280",
  legend: "#6B7280",
  cursorFill: "rgba(108,92,192,0.06)",
  gradientStart: "#6C5CC0",
  palette: ["#6C5CC0", "#2563EB", "#059669", "#D97706", "#DC2626", "#0098C0", "#8B7BD8"],
};

export function useChartColors() {
  const { theme } = useTheme();
  return theme === "light" ? light : dark;
}
