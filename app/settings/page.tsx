"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, SignOutIcon, TrashIcon, LockKeyIcon, EnvelopeIcon, InstagramLogoIcon } from "@phosphor-icons/react";
import { clearGuestSession } from "@/lib/guestSession";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    try {
      localStorage.removeItem("kundliai_chart");
      localStorage.removeItem("kundliai_compatibility");
      clearGuestSession();
    } catch { /* ignore */ }
    await signOut({ callbackUrl: "/" });
  }

  function handleDeleteAccount() {
    // Opens mailto for data deletion request per CCPA
    window.location.href = "mailto:privacy@kundliai.app?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20associated%20data.";
  }

  return (
    <div
      className="min-h-screen bg-white page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-4 border-b border-slate-100"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-slate-900 font-bold text-lg">Settings</h1>
      </header>

      <div className="px-4 pt-6 space-y-6">

        {/* Account section */}
        {session?.user && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Account</p>
            <div className="bg-slate-50 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {session.user.name?.[0] ?? "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{session.user.name}</p>
                  <p className="text-slate-400 text-xs">{session.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <EnvelopeIcon className="w-4 h-4 text-slate-400" weight="thin" />
                <span className="text-slate-500 text-sm">{session.user.email}</span>
              </div>
            </div>
          </section>
        )}

        {/* Privacy */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Privacy</p>
          <div className="bg-slate-50 rounded-2xl overflow-hidden">
            <button
              onClick={() => router.push("/privacy")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-100 transition-colors border-b border-slate-100"
            >
              <LockKeyIcon className="w-4 h-4 text-slate-500" weight="thin" />
              <span className="text-slate-700 text-sm font-medium">Privacy Policy</span>
            </button>
            <button
              onClick={() => router.push("/terms")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-100 transition-colors"
            >
              <LockKeyIcon className="w-4 h-4 text-slate-500" weight="thin" />
              <span className="text-slate-700 text-sm font-medium">Terms of Service</span>
            </button>
          </div>
        </section>

        {/* Data & Account Actions */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
            {session?.user ? "Account Actions" : "Data"}
          </p>
          <div className="bg-slate-50 rounded-2xl overflow-hidden">
            {/* Clear chart — always visible */}
            <button
              onClick={() => {
                if (!confirm("This will delete your chart and all local data. Continue?")) return;
                try {
                  localStorage.removeItem("kundliai_chart");
                  localStorage.removeItem("kundliai_guest");
                  localStorage.removeItem("kundliai_summary_v2");
                  localStorage.removeItem("kundliai_compatibility");
                  // Clear any daily caches
                  Object.keys(localStorage).forEach((k) => {
                    if (k.startsWith("kundliai_daily_")) localStorage.removeItem(k);
                  });
                } catch { /* ignore */ }
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors border-b border-slate-100"
            >
              <TrashIcon className="w-4 h-4 text-red-400" weight="thin" />
              <div className="text-left">
                <p className="text-red-400 text-sm font-medium">Clear My Chart</p>
                <p className="text-slate-400 text-[11px]">Remove chart data from this device</p>
              </div>
            </button>
            {/* Sign Out & Delete — logged-in only */}
            {session?.user && (
              <>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors border-b border-slate-100"
                >
                  <SignOutIcon className="w-4 h-4 text-red-500" weight="thin" />
                  <span className="text-red-500 text-sm font-medium">Sign Out</span>
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" weight="thin" />
                  <div className="text-left">
                    <p className="text-red-400 text-sm font-medium">Delete Account</p>
                    <p className="text-slate-400 text-[11px]">Permanently remove your data</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Follow Us */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Follow Us</p>
          <div className="bg-slate-50 rounded-2xl overflow-hidden">
            <a
              href="https://www.instagram.com/kundliai/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-100 transition-colors"
            >
              <InstagramLogoIcon className="w-4 h-4 text-slate-500" weight="thin" />
              <span className="text-slate-700 text-sm font-medium">@kundliai on Instagram</span>
            </a>
          </div>
        </section>

        <p className="text-center text-[10px] text-slate-300 pt-2">
          For entertainment purposes only. Not a substitute for professional advice.
        </p>
      </div>
    </div>
  );
}
