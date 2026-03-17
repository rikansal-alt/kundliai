"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react";

const EFFECTIVE_DATE = "March 16, 2026";
const CONTACT_EMAIL  = "support@kundliai.app";
const APP_NAME       = "KundaliAI";
const COMPANY        = "KundaliAI, Inc.";

export default function TermsPage() {
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
          <h1 className="font-bold text-slate-900 text-base leading-tight">Terms of Service</h1>
          <p className="text-[10px] text-slate-400">Effective {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 text-slate-700 text-sm leading-relaxed">

        <section>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of the {APP_NAME} application and
            services operated by {COMPANY} (&quot;we&quot;, &quot;us&quot;). By using {APP_NAME}, you agree to these Terms.
          </p>
        </section>

        <Section title="1. Description of Service">
          <p>
            {APP_NAME} is an entertainment application that provides Vedic astrology calculations,
            AI-generated astrological content, and related features. <strong>All content is provided
            for entertainment and informational purposes only.</strong> Nothing in {APP_NAME} constitutes
            professional advice of any kind, including but not limited to medical, financial, legal,
            or psychological advice.
          </p>
        </Section>

        <Section title="2. Entertainment Disclaimer">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-800 text-sm mb-1">Important Notice</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Astrology and related content provided by {APP_NAME} is for entertainment purposes only.
              Astrological interpretations are not scientifically proven and should not be used to make
              important life decisions. Do not rely on {APP_NAME} for medical diagnosis, financial
              investment decisions, legal guidance, or any professional consultation. Always seek
              qualified professionals for such matters.
            </p>
          </div>
        </Section>

        <Section title="3. Eligibility">
          <ul className="list-disc pl-5 space-y-1">
            <li>You must be at least 13 years old to use {APP_NAME}.</li>
            <li>By using the app, you represent that you meet this age requirement.</li>
            <li>If you are under 18, you may only use the app with parental consent.</li>
          </ul>
        </Section>

        <Section title="4. Subscriptions and Billing">
          <p className="font-bold text-slate-900">Auto-Renewal Disclosure (FTC Requirement)</p>
          <p className="mt-1">
            {APP_NAME} offers subscription plans that <strong>automatically renew</strong> at the end of
            each billing period unless you cancel before the renewal date. By subscribing, you authorize
            us to charge your payment method on a recurring basis at the then-current subscription price.
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li><strong>Silver Plan:</strong> ₹299/month, billed monthly, auto-renews each month</li>
            <li><strong>Gold Plan:</strong> ₹799/month, billed monthly, auto-renews each month</li>
            <li>Prices are in Indian Rupees (INR). International users may see converted prices.</li>
            <li>We will notify you by email at least 7 days before any price change.</li>
            <li>Applicable taxes may be added depending on your location.</li>
          </ul>
        </Section>

        <Section title="5. Free Trial">
          <p>
            We may offer free trials of paid features. At the end of the free trial period, your
            subscription will automatically convert to a paid subscription unless you cancel before
            the trial ends. You will not be charged during the trial period.
          </p>
        </Section>

        <Section title="6. Cancellation — How to Cancel (FTC Requirement)">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-slate-800 text-sm mb-2">Cancelling your subscription is as easy as signing up.</p>
            <p className="text-slate-600 text-xs leading-relaxed mb-3">
              You may cancel your subscription at any time using any of the following methods:
            </p>
            <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1.5">
              <li><strong>In-app:</strong> Go to Settings → Subscription → Cancel Subscription</li>
              <li><strong>Email:</strong> Send &quot;Cancel Subscription&quot; to <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a> — we will process within 24 hours</li>
              <li><strong>iOS App Store:</strong> Settings → Apple ID → Subscriptions → {APP_NAME} → Cancel</li>
              <li><strong>Google Play:</strong> Play Store → Subscriptions → {APP_NAME} → Cancel</li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Cancellation takes effect at the end of the current billing period. You retain access
              to paid features until that date. We do not offer partial-month refunds.
            </p>
          </div>
        </Section>

        <Section title="7. Refunds">
          <p>
            Subscription fees are generally non-refundable. Exceptions:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>If you were charged after cancelling, contact us within 14 days for a full refund.</li>
            <li>If the service was unavailable for more than 72 consecutive hours in a billing period, you may request a pro-rated credit.</li>
            <li>Refunds for Apple App Store or Google Play purchases are governed by their respective refund policies.</li>
          </ul>
        </Section>

        <Section title="8. User Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Use {APP_NAME} for any unlawful purpose</li>
            <li>Attempt to reverse-engineer, scrape, or copy the app or its algorithms</li>
            <li>Share your account credentials with others</li>
            <li>Submit false or misleading information</li>
            <li>Use AI consultation to make high-stakes decisions without independent professional advice</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            All content, algorithms, designs, and AI-generated outputs in {APP_NAME} are owned by or
            licensed to {COMPANY}. The Vedic astrological calculation engine, Gun Milan algorithm, and
            associated software are proprietary. You may not reproduce, distribute, or create derivative
            works without our written consent.
          </p>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <p>
            {APP_NAME} is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
            either express or implied. We do not warrant that the app will be uninterrupted, error-free,
            or that astrological calculations are accurate for any particular purpose. Astrological
            interpretations are inherently subjective and not scientifically validated.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, {COMPANY} shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of {APP_NAME},
            including decisions made based on astrological content. Our total liability shall not
            exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Delaware, USA, without regard to
            conflict of law principles. Disputes shall be resolved by binding arbitration in
            accordance with JAMS rules, except either party may seek injunctive relief in court.
          </p>
        </Section>

        <Section title="13. Changes to Terms">
          <p>
            We may modify these Terms at any time. We will provide 30 days&apos; notice of material
            changes via email or in-app notification. Continued use after the notice period
            constitutes acceptance. If you disagree with changes, you may cancel your subscription
            and discontinue use.
          </p>
        </Section>

        <Section title="14. Contact">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1">
            <p className="font-bold text-slate-800">{COMPANY}</p>
            <p>Support: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></p>
            <p>Legal: <a href="mailto:legal@kundliai.app" className="text-primary underline">legal@kundliai.app</a></p>
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
