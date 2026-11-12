export function bortleLabel(bortle: number): string {
  switch (Math.min(9, Math.max(1, Math.round(bortle)))) {
    case 1:
      return "Excellent dark";
    case 2:
      return "Typical dark site";
    case 3:
      return "Rural";
    case 4:
      return "Rural-suburban";
    case 5:
      return "Suburban";
    case 6:
      return "Bright suburban";
    case 7:
      return "Suburban-urban";
    case 8:
      return "City";
    default:
      return "Inner city";
  }
}
