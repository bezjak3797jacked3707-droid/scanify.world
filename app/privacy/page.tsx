export default function PrivacyPage() {
    return (
      <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto" style={{ color: "#ededed" }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#C9A84C" }}>Privacy Policy</h1>
        <p className="text-xs mb-10" style={{ color: "#555" }}>Last updated: May 11, 2026</p>
  
        <section className="space-y-8 text-sm leading-relaxed" style={{ color: "#aaa" }}>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>1. Who We Are</h2>
            <p>Scanify is operated from Sweden. We are committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and Swedish law. For any privacy questions, contact us at <a href="mailto:bezjak3797jacked3707@gmail.com" style={{ color: "#C9A84C" }}>bezjak3797jacked3707@gmail.com</a>.</p>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>2. What Data We Collect</h2>
            <p>We collect the following data when you use Scanify:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your name and email address (via Google Sign-In)</li>
              <li>Images you upload for scanning</li>
              <li>Scan results and usage history</li>
              <li>Subscription and billing information (handled by Stripe)</li>
            </ul>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>3. How We Use Your Data</h2>
            <p>We use your data to provide the Scanify service, including processing your scans, maintaining your account, and managing your subscription. We do not sell your personal data to third parties.</p>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>4. Third-Party Services</h2>
            <p>Scanify uses the following third-party services which may process your data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong style={{ color: "#ededed" }}>Supabase</strong> — database and file storage</li>
              <li><strong style={{ color: "#ededed" }}>Google</strong> — authentication</li>
              <li><strong style={{ color: "#ededed" }}>Stripe</strong> — payment processing</li>
              <li><strong style={{ color: "#ededed" }}>Google Gemini</strong> — AI image analysis</li>
              <li><strong style={{ color: "#ededed" }}>Vercel</strong> — hosting</li>
            </ul>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>5. Data Retention</h2>
            <p>We retain your account data and scan history for as long as your account is active. You may request deletion of your data at any time by contacting us.</p>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>6. Your Rights Under GDPR</h2>
            <p>As a user in the EU/EEA, you have the right to access, correct, or delete your personal data. You also have the right to object to processing and to data portability. To exercise any of these rights, contact us at <a href="mailto:bezjak3797jacked3707@gmail.com" style={{ color: "#C9A84C" }}>bezjak3797jacked3707@gmail.com</a>.</p>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>7. Cookies</h2>
            <p>Scanify uses only essential cookies required for authentication and session management. We do not use tracking or advertising cookies.</p>
          </div>
  
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>8. Contact</h2>
            <p>For any privacy-related questions or requests, contact us at <a href="mailto:bezjak3797jacked3707@gmail.com" style={{ color: "#C9A84C" }}>bezjak3797jacked3707@gmail.com</a>.</p>
          </div>
  
        </section>
      </main>
    );
  }