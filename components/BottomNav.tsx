"use client";

import { useRouter, usePathname } from "next/navigation";
import { HouseIcon, MoonStarsIcon, RobotIcon, PlanetIcon } from "@phosphor-icons/react";

const navItems = [
  { href: "/home",     icon: HouseIcon,     label: "Home"    },
  { href: "/panchang", icon: MoonStarsIcon, label: "Panchang" },
  { href: "/consult",  icon: RobotIcon,     label: "Consult" },
  { href: "/kundli",   icon: PlanetIcon,    label: "Kundli"  },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 flex justify-around border-t border-slate-100 bg-white px-4"
      style={{
        transform: "translateX(-50%)",
        width: "min(430px, 100vw)",
        zIndex: 40,
        paddingTop: "12px",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
      }}
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="flex flex-col items-center gap-1"
            style={{ color: active ? "#d6880a" : "#94a3b8" }}
          >
            <div
              style={{
                padding: "6px 14px",
                borderRadius: "12px",
                background: active ? "rgba(214,136,10,0.1)" : "transparent",
                transition: "background 0.2s",
              }}
            >
              <Icon size={22} weight={active ? "regular" : "thin"} />
            </div>
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
