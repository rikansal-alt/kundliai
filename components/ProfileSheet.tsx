"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MoonIcon, GearIcon, LockKeyIcon, SignOutIcon, XIcon } from "@phosphor-icons/react";
import { clearGuestSession } from "@/lib/guestSession";

interface Props {
  name:    string | null | undefined;
  email:   string | null | undefined;
  image:   string | null | undefined;
  onClose: () => void;
}

export default function ProfileSheet({ name, email, image, onClose }: Props) {
  const router   = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onBackdrop(e: React.MouseEvent) {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose();
  }

  async function handleSignOut() {
    // Clear all local data before redirect
    try {
      localStorage.removeItem("kundliai_chart");
      localStorage.removeItem("kundliai_compatibility");
      clearGuestSession();
    } catch { /* ignore */ }
    await signOut({ callbackUrl: "/" });
  }

  const initials = name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onBackdrop}
    >
      <div
        ref={sheetRef}
        className="w-full bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ maxWidth: 430, paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3 mb-4" />

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <XIcon className="w-5 h-5 text-slate-400" />
        </button>

        {/* Avatar + name */}
        <div className="flex flex-col items-center px-6 pb-5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name ?? "Profile"} className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3">
              <span className="text-primary font-bold text-2xl">{initials}</span>
            </div>
          )}
          <h2 className="fraunces-italic text-2xl text-slate-900">{name ?? "Guest"}</h2>
          {email && <p className="text-slate-400 text-xs mt-0.5">{email}</p>}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mx-6 mb-2" />

        {/* Menu */}
        <div className="px-3">
          {[
            { label: "My Chart",       icon: MoonIcon,     action: () => { onClose(); router.push("/home"); } },
            { label: "Preferences",    icon: GearIcon,     action: () => { onClose(); router.push("/settings"); } },
            { label: "Privacy & Data", icon: LockKeyIcon,  action: () => { onClose(); router.push("/privacy"); } },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" weight="thin" />
              </div>
              <span className="text-slate-800 font-medium text-sm">{label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="h-px bg-slate-100 my-2 mx-4" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <SignOutIcon className="w-4 h-4 text-red-500" weight="thin" />
            </div>
            <span className="text-red-500 font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
