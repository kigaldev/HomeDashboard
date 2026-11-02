"use client";

import dynamic from "next/dynamic";

const Placeholder = () => <div style={{ height: 220 }} aria-hidden="true" />;

// Recharts se carga bajo demanda (solo cliente) para no engordar el bundle inicial.
export const CategoryDonutChart = dynamic(
  () => import("./Charts").then((m) => m.CategoryDonutChart),
  { ssr: false, loading: Placeholder },
);
export const MonthCompareChart = dynamic(
  () => import("./Charts").then((m) => m.MonthCompareChart),
  { ssr: false, loading: Placeholder },
);
export const EnergyCostChart = dynamic(
  () => import("./Charts").then((m) => m.EnergyCostChart),
  { ssr: false, loading: Placeholder },
);
