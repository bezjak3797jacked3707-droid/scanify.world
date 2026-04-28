import Link from "next/link";


export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen px-6 py-10 space-y-16">
      {/* HERO */}
      <section className="text-center max-w-2xl mx-auto space-y-6">
        <h1 className="text-5xl font-bold leading-tight">
          Scan Anything. <br /> Know Its Value.
        </h1>
        <p className="text-zinc-400 text-lg">
          Upload or snap a photo and get instant AI-powered insights —
          value, specs, materials, and more.
        </p>


        <Link
          href="/scan"
          className="inline-block bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
        >
          Try Free Scan
        </Link>
      </section>


      {/* EXAMPLE RESULT */}
      <section className="max-w-3xl mx-auto">
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <h2 className="text-xl font-semibold">Example Result</h2>


          <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
            <div>
              <p className="text-zinc-500">Item</p>
              <p>Nike Air Jordan 1</p>
            </div>
            <div>
              <p className="text-zinc-500">Current Value</p>
              <p>$220</p>
            </div>
            <div>
              <p className="text-zinc-500">Original Price</p>
              <p>$160</p>
            </div>
            <div>
              <p className="text-zinc-500">Confidence</p>
              <p>92%</p>
            </div>
          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="max-w-3xl mx-auto space-y-8">
        <h2 className="text-2xl font-semibold text-center">
          How it works
        </h2>


        <div className="grid gap-6 md:grid-cols-3">
          {[
            "Upload or take a photo",
            "AI analyzes the object",
            "Get instant insights",
          ].map((step, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center"
            >
              <p className="text-lg font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>


      {/* PRICING PREVIEW */}
      <section className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-center">
          Simple Pricing
        </h2>


        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Free</h3>
            <p className="text-zinc-400 mb-4">Basic scans</p>
            <p className="text-2xl font-bold mb-4">$0</p>
            <p className="text-zinc-500 text-sm">Limited daily scans</p>
          </div>


          <div className="bg-white text-black rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Pro</h3>
            <p className="mb-4">Unlimited scans + advanced insights</p>
            <p className="text-2xl font-bold mb-4">$9/mo</p>
            <p className="text-sm">Coming soon</p>
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-center">FAQ</h2>


        <div className="space-y-4 text-zinc-400">
          <div>
            <p className="text-white font-medium">
              How accurate is Scanify?
            </p>
            <p>
              Scanify uses advanced AI models to estimate value and details
              with high confidence.
            </p>
          </div>


          <div>
            <p className="text-white font-medium">
              What can I scan?
            </p>
            <p>
              Sneakers, electronics, collectibles, furniture, and more.
            </p>
          </div>


          <div>
            <p className="text-white font-medium">
              Is it free?
            </p>
            <p>
              Yes, with limits. Pro will unlock unlimited scans.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
