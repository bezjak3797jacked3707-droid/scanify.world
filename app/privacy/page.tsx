export default function PrivacyPage() {
  return (
    <main className="min-h-screen pb-24 px-6 py-10" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Legal</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Privacy Policy</h1>
          <p className="text-xs" style={{ color: "#555" }}>Last updated: May 2026</p>
        </div>

        {[
          {
            title: "1. Information We Collect",
            content: "We collect your email address and profile picture when you sign in with Google. We also store the images you scan and the results of those scans."
          },
          {
            title: "2. How We Use Your Information",
            content: "We use your information to provide the Scanify service, track your scan history, manage your subscription, and display your name on the leaderboard."
          },
          {
            title: "3. Images You Upload",
            content: "Images you upload are stored securely in our cloud storage. They may appear on the public leaderboard if your scan ranks highly. You can delete your account to remove your data."
          },
          {
            title: "4. Leaderboard",
            content: "Your display name and scanned item may appear on the public leaderboard. You can opt out by not participating in scans during leaderboard periods."
          },
          {
            title: "5. Payment Information",
            content: "Payments are processed by Stripe. We never store your credit card details. Stripe's privacy policy applies to all payment data."
          },
          {
            title: "6. Third Party Services",
            content: "We use Google for authentication, Supabase for data storage, Stripe for payments, and Google Gemini for AI analysis. Each service has its own privacy policy."
          },
          {
            title: "7. Data Security",
            content: "We take reasonable measures to protect your data. However no internet transmission is 100% secure. Use Scanify at your own risk."
          },
          {
            title: "8. Your Rights",
            content: "You can request deletion of your account and data at any time by contacting us through the homepage contact form."
          },
          {
            title: "9. Cookies",
            content: "Scanify uses essential cookies for authentication. We do not use tracking or advertising cookies."
          },
          {
            title: "10. Contact",
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