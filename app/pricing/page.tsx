import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-md space-y-8">
        <section className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Choose your Scanify plan
          </h1>
          <p className="text-sm leading-6 text-zinc-400">
            Start free, upgrade when you want more scans, deeper analysis,
            and saved history.
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5">
              <p className="text-sm font-medium text-zinc-300">Free</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold">$0</span>
                <span className="pb-1 text-sm text-zinc-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-zinc-400">
              <li>• Limited daily scans</li>
              <li>• Basic item insights</li>
              <li>• Simple result view</li>
            </ul>

            <button
              className="mt-6 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-white"
              type="button"
            >
              Current Starter Plan
            </button>
          </div>

          <div className="rounded-3xl border border-white bg-white p-6 text-black shadow-2xl">
            <div className="mb-2 inline-flex rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              Most Popular
            </div>

            <div className="mb-5">
              <p className="text-sm font-medium text-zinc-700">Pro</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold">$9</span>
                <span className="pb-1 text-sm text-zinc-600">/month</span>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-zinc-700">
              <li>• More monthly scans</li>
              <li>• Better value estimates</li>
              <li>• Saved scan history</li>
              <li>• Faster results</li>
              <li>• Premium features as they launch</li>
            </ul>

            <button
              className="mt-6 w-full rounded-2xl bg-black px-4 py-3 font-medium text-white"
              type="button"
            >
              Upgrade to Pro
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-medium">Why upgrade?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Pro is designed for power users who scan often and want better
            insights, more history, and a smoother experience.
          </p>
        </section>

        <Link
          href="/"
          className="block text-center text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}