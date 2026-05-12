export default function TermsPage() {
  return (
    <main className="min-h-screen pb-24 px-6 py-10" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Legal</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Terms of Service</h1>
          <p className="text-xs" style={{ color: "#555" }}>Last updated: May 2026</p>
        </div>

        {[
          {
            title: "1. Acceptance of Terms",
            content: "By using Scanify you agree to these terms. If you do not agree, do not use the service."
          },
          {
            title: "2. Description of Service",
            content: "Scanify provides AI-powered object identification and valuation. Results are estimates only and should not be used for financial decisions."
          },
          {
            title: "3. User Accounts",
            content: "You must sign in with a valid Google account to use Scanify. You are responsible for all activity under your account."
          },
          {
            title: "4. Subscriptions and Payments",
            content: "Pro and Business plans are billed monthly. You can cancel at any time through your profile page. Cancellations take effect at the end of the current billing period."
          },
          {
            title: "5. Free Plan Limits",
            content: "Free accounts receive 5 scans per month. Scan counts reset at the start of each calendar month."
          },
          {
            title: "6. Accuracy Disclaimer",
            content: "Scanify uses AI to estimate values. We do not guarantee the accuracy of any valuation. Always verify with a professional appraiser before making financial decisions."
          },
          {
            title: "7. Prohibited Use",
            content: "You may not use Scanify to submit false, misleading, or manipulated images to the leaderboard. We reserve the right to remove any content and ban accounts that violate this policy."
          },
          {
            title: "8. Intellectual Property",
            content: "All content, design, and code of Scanify is owned by Scanify. You may not copy, reproduce, or distribute any part of the service."
          },
          {
            title: "9. Changes to Terms",
            content: "We may update these terms at any time. Continued use of Scanify after changes means you accept the new terms."
          },
          {
            title: "10. Contact",
            content: "For questions about these terms please contact us through the contact form on our homepage."
          },
        ].map((section) => (
          <div key={section.title} className="rounded-2xl p-5 space-y-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>{section.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export {};