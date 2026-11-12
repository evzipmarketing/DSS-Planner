import { PlannerApp } from "@/components/planner-app";
import type { MinimalLayout } from "@/components/minimal-layouts";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string }>;
}) {
  const params = await searchParams;
  return <PlannerApp layout={parseLayout(params.layout)} />;
}

function parseLayout(value: string | undefined): MinimalLayout | null {
  switch (value) {
    case "a":
    case "b":
    case "c":
    case "d":
      return value;
    default:
      return null;
  }
}
