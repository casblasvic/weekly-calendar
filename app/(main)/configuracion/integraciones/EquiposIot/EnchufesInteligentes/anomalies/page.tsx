"use client";

import dynamic from "next/dynamic";

// Cargamos de forma diferida para no duplicar lógica y mantener un solo origen.
const EnergyInsightsPage = dynamic(() => import("@/app/(main)/configuracion/integraciones/energy-insights/page"), { ssr: false });

export default function AnomaliesTab() {
  return <EnergyInsightsPage />;
} 