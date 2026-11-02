"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Mismos acentos que las variables --apple-* de globals.css
// (los atributos SVG de Recharts no resuelven var() de forma fiable).
const PALETTE = ["#0071e3", "#34c759", "#ff9500", "#af52de", "#30b0c7", "#ff3b30", "#5856d6"];

const tickStyle = { fill: "var(--apple-text-secondary)", fontSize: 11 };
const tooltipStyle = {
  background: "var(--apple-surface-elevated)",
  border: "1px solid var(--apple-border)",
  borderRadius: 12,
  color: "var(--apple-text)",
  fontSize: 12,
};

export function CategoryDonutChart({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  return (
    <div style={{ width: "100%", height: 220 }} role="img" aria-label="Gasto por categoría">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${Number(v).toFixed(2)} €`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthCompareChart({
  last,
  current,
}: {
  last: number;
  current: number;
}) {
  const data = [
    { name: "Mes anterior", total: last },
    { name: "Mes actual", total: current },
  ];
  return (
    <div style={{ width: "100%", height: 220 }} role="img" aria-label="Gasto mensual comparado">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.2)" />
          <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(128,128,128,0.1)" }}
            formatter={(v) => `${Number(v).toFixed(2)} €`}
          />
          <Bar dataKey="total" radius={[8, 8, 0, 0]}>
            <Cell fill="#86868b" />
            <Cell fill="#0071e3" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EnergyCostChart({
  data,
}: {
  data: { name: string; cost: number }[];
}) {
  return (
    <div style={{ width: "100%", height: 220 }} role="img" aria-label="Coste energético estimado por uso">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.2)" />
          <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(128,128,128,0.1)" }}
            formatter={(v) => `${Number(v).toFixed(2)} €`}
          />
          <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
