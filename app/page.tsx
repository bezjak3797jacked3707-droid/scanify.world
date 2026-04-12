export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-6 text-center">
        Scanify
      </h1>

      <p className="text-lg text-zinc-400 mb-8 text-center max-w-md">
        Scan anything. Get instant AI-powered insights.
      </p>

      <button className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition">
        Start Scanning
      </button>
    </main>
  );
}