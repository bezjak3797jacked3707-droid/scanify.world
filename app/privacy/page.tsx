export default function PrivacyPage() {
  return (
    <main className="min-h-screen pb-24 px-6 py-10" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Legal</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Privacy Policy</h1>
          <p className="text-xs" style={{ color: "#555" }}>Last updated: August 2026</p>
        </div>

        {[
          {
            title: "1. Information We Collect",
            content: "We collect your email address, name, and profile picture when you sign in with Google or Apple. We also store the images you scan and the AI-generated results of those scans."
          },
          {
            title: "2. How We Use Your Information",
            content: "We use your information to provide the Scanify service, track your scan history, manage your subscription, and, if you choose to appear there, display your name on the leaderboard."
          },
          {
            title: "3. Images You Upload",
            content: "Images you upload are stored securely in our cloud storage. Photos taken with your camera may appear on the public leaderboard; images uploaded from your photo gallery are never shown on the leaderboard. You can delete individual scans, or delete your entire account, from your profile at any time."
          },
          {
            title: "4. Leaderboard",
            content: "Only scans taken directly with your camera are eligible to appear on the public leaderboard, alongside your display name. You can remove any of your scans from the leaderboard individually at any time without deleting them from your personal history."
          },
          {
            title: "5. Payment Information",
            content: "Payments made on our website are processed by Stripe. We never store your credit card details. Stripe's own privacy policy applies to all payment data."
          },
          {
            title: "6. Third Party Services",
            content: "We use Google and Apple for authentication, Supabase for data storage, Stripe for payments, Upstash for rate limiting, and Google Gemini, Anthropic Claude, and OpenAI for AI-powered image analysis. Each service has its own privacy policy."
          },
          {
            title: "7. Data Security",
            content: "We take reasonable measures to protect your data. However, no method of internet transmission or electronic storage is 100% secure, and we cannot guarantee absolute security."
          },
          {
            title: "8. Your Rights",
            content: "You can permanently delete your account and all associated data, including your uploaded photos, at any time from your profile page — no need to contact us. If you are located in the European Economic Area, you also have the right to access, correct, or request a copy of your personal data, and the right to lodge a complaint with your local data protection authority."
          },
          {
            title: "9. Children's Privacy",
            content: "Scanify is not intended for children under 13. If you believe a child has provided us with personal information, please contact us so we can delete it."
          },
          {
            title: "10. Cookies",
            content: "Scanify uses essential cookies and local storage for authentication and app functionality. We do not use tracking or advertising cookies."
          },
          {
            title: "11. Contact",
            content: "For privacy related questions please contact us through the contact form on our homepage."
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