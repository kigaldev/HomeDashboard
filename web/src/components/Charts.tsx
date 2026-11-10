"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

const tickStyle = { fill: "#a1a1a6", fontSize: 12, fontWeight: 500 };
const tooltipStyle = {
  background: "rgba(22, 24, 30, 0.94)",
  backgroundColor: "rgba(22, 24, 30, 0.94)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: 14,
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 600,
  boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
};

export function CategoryDonutChart({
  data,
  onSelectCategory,
}: {
  data: { category: string; total: number }[];
  onSelectCategory?: (category: string) => void;
}) {
  return (
    <div
      style={{ width: "100%", height: 220, cursor: onSelectCategory ? "pointer" : "default" }}
      role="img"
      aria-label="Gasto por categoría"
    >
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
            onClick={(entry) => {
              const cat = (entry as unknown as { category?: string })?.category;
              if (onSelectCategory && cat) {
                onSelectCategory(cat);
              }
            }}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={PALETTE[i % PALETTE.length]}
                cursor={onSelectCategory ? "pointer" : "default"}
              />
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
        <BarChart
          data={data}
          margin={{ top: 34, right: 16, left: -10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.35))]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            formatter={(v) => `${Number(v).toFixed(2)} €`}
          />
          <Bar dataKey="total" radius={[8, 8, 0, 0]}>
            <LabelList
              dataKey="total"
              position="top"
              fill="#ffffff"
              fontSize={13}
              fontWeight={700}
              offset={10}
              formatter={(v) => `${Number(v).toFixed(2)} €`}
            />
            <Cell fill="#636366" />
            <Cell fill="#0a84ff" />
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
