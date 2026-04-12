export default function ResultPage() {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10 space-y-8">
        <div className="max-w-md mx-auto space-y-6">
  
          {/* HEADER */}
          <h1 className="text-3xl font-bold text-center">Scan Result</h1>
  
          {/* IMAGE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-64 flex items-center justify-center">
            <p className="text-zinc-500">Scanned Image</p>
          </div>
  
          {/* MAIN INFO CARD */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Nike Air Jordan 1</h2>
  
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Current Value</p>
                <p className="text-lg font-semibold">$220</p>
              </div>
  
              <div>
                <p className="text-zinc-500">Original Price</p>
                <p className="text-lg font-semibold">$160</p>
              </div>
  
              <div>
                <p className="text-zinc-500">Confidence</p>
                <p className="text-lg font-semibold">92%</p>
              </div>
  
              <div>
                <p className="text-zinc-500">Category</p>
                <p className="text-lg font-semibold">Sneakers</p>
              </div>
            </div>
          </div>
  
          {/* DETAILS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">Details</h3>
  
            <p className="text-zinc-400 text-sm">
              Classic high-top sneaker made with leather upper, rubber sole,
              and iconic Nike branding. Popular among collectors.
            </p>
          </div>
  
          {/* MATERIALS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-semibold">Materials</h3>
  
            <p className="text-zinc-400 text-sm">
              Leather, rubber sole, synthetic lining
            </p>
          </div>
  
          {/* ACTION BUTTON */}
          <button className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition">
            Scan Another Item
          </button>
  
        </div>
      </main>
    );
  }