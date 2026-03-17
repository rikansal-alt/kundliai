"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react";

const EFFECTIVE_DATE = "March 16, 2026";
const CONTACT_EMAIL  = "privacy@kundliai.app";
const APP_NAME       = "KundaliAI";
const COMPANY        = "KundaliAI, Inc.";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div
      className="relative flex min-h-screen flex-col bg-white"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 40px)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 pb-3 bg-white/90 backdrop-blur-md border-b border-slate-100"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700"
        >
          <ArrowLeftIcon size={20} weight="thin" />
        </button>
        <div>
          <h1 className="font-bold text-slate-900 text-base leading-tight">Privacy Policy</h1>
          <p className="text-[10px] text-slate-400">Effective {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 text-slate-700 text-sm leading-relaxed">

        <section>
          <p>
            {COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the {APP_NAME} mobile and web application.
            This Privacy Policy explains how we collect, use, and protect your personal information,
            and describes your rights under the California Consumer Privacy Act (CCPA) and other applicable laws.
          </p>
        </section>

        <Section title="1. Information We Collect">
          <p><strong>Information you provide:</strong></p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Full name</li>
            <li>Date, time, and city of birth</li>
            <li>Geographic coordinates (derived from city, or from your device if you grant location permission)</li>
            <li>Partner birth details (if you use the Compatibility feature)</li>
          </ul>
          <p className="mt-3"><strong>Automatically collected:</strong></p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Device type and operating system</li>
            <li>App usage analytics (pages visited, features used)</li>
            <li>IP address (used only for abuse prevention, not stored long-term)</li>
          </ul>
          <p className="mt-3"><strong>We do NOT collect:</strong></p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Social Security numbers, financial account numbers, or government IDs</li>
            <li>Health or medical information</li>
            <li>Precise real-time location beyond what you explicitly provide</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Birth data is used exclusively to calculate your Vedic birth chart.</strong> It is not used for advertising, profiling, or any other purpose.</li>
            <li>We use analytics data to improve app performance and fix bugs.</li>
            <li>We use your email (if provided) to send account-related notifications only.</li>
          </ul>
        </Section>

        <Section title="3. We Never Sell Your Data">
          <p>
            We do not sell, rent, trade, or otherwise transfer your personal information to third parties for
            commercial purposes. This applies to all users, including California residents under CCPA.
          </p>
        </Section>

        <Section title="4. Data Sharing">
          <p>We share data only with:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>Anthropic</strong> — AI consultation text is processed by Anthropic&apos;s Claude API. Your birth chart details may be included in consultation context. Anthropic&apos;s privacy policy applies to this processing.</li>
            <li><strong>MongoDB Atlas</strong> — Chart and consultation data is stored in MongoDB Atlas (cloud database). Data is encrypted at rest and in transit.</li>
            <li><strong>Payment processors</strong> — If you subscribe, payment is handled by Razorpay or Stripe. We never store your full card number.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li>Birth chart data is retained as long as your account is active.</li>
            <li>Consultation history is retained for 12 months, then automatically deleted.</li>
            <li>If you delete your account, all personal data is permanently deleted within 30 days.</li>
          </ul>
        </Section>

        <Section title="6. Your Rights (CCPA — California Residents)">
          <p>If you are a California resident, you have the right to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>Know</strong> what personal information we have collected about you</li>
            <li><strong>Delete</strong> your personal information</li>
            <li><strong>Correct</strong> inaccurate personal information</li>
            <li><strong>Opt out</strong> of the sale or sharing of personal information (we do not sell data)</li>
            <li><strong>Non-discrimination</strong> — we will not discriminate against you for exercising your rights</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, submit a request to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
            We will respond within 45 days.
          </p>
        </Section>

        <Section title="7. Data Deletion Request">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <p className="font-bold text-red-700 text-sm mb-2">Request Account & Data Deletion</p>
            <p className="text-red-600 text-xs leading-relaxed mb-3">
              To permanently delete your account and all associated data (birth chart, consultation history,
              preferences), email us at the address below with the subject line &quot;Data Deletion Request&quot;.
              Include the name and email associated with your account.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Data Deletion Request`}
              className="inline-block px-4 py-2 rounded-full text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}
            >
              Email Data Deletion Request →
            </a>
          </div>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            {APP_NAME} is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have inadvertently collected such
            information, contact us immediately at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We use industry-standard security measures including TLS encryption for data in transit
            and AES-256 encryption for data at rest. No method of transmission over the internet is
            100% secure; we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by posting a notice in the app or sending an email. Continued use of the app
            after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            For privacy questions, data requests, or concerns:
          </p>
          <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1">
            <p className="font-bold text-slate-800">{COMPANY}</p>
            <p>Privacy inquiries: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></p>
          </div>
        </Section>

        <p className="text-xs text-slate-400 text-center pt-4">
          © {new Date().getFullYear()} {COMPANY}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
      {children}
    </section>
  );
}
