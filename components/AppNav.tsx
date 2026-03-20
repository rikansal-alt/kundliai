"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import { useNavContext } from "@/context/NavContext";

const NAV_ROUTES = ["/home", "/kundli", "/panchang", "/compatibility", "/transits", "/settings", "/daily"];

export default function AppNav() {
  const pathname = usePathname();
  const { sheetOpen } = useNavContext();

  const show = NAV_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (!show || sheetOpen) return null;
  return <BottomNav />;
}
