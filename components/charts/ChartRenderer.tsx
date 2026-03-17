"use client";

import SouthIndianChart from "./SouthIndianChart";
import NorthIndianChart from "./NorthIndianChart";
import BengaliChart     from "./BengaliChart";
import { ChartProps, ChartStyle } from "./types";

export type { ChartStyle } from "./types";
export type { ChartProps, ChartPlanet, SignAbbr } from "./types";

interface ChartRendererProps extends ChartProps {
  style: ChartStyle;
}

export default function ChartRenderer({ style, ...rest }: ChartRendererProps) {
  switch (style) {
    case "north-indian": return <NorthIndianChart {...rest} />;
    case "bengali":      return <BengaliChart     {...rest} />;
    default:             return <SouthIndianChart  {...rest} />;
  }
}
