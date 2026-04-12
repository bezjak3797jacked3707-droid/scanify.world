"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    // simulate AI processing → go to result page
    setTimeout(() => {
      router.push("/result");
    }, 500);
  }

  function handleCameraClick() {
    alert("Camera feature coming next step");
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 space-y-6">
      <div className="max-w-md mx-auto space-y-6">

        <h1 className="text-3xl font-bold text-center">Scan</h1>

        {/* PREVIEW */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-72 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" />
          ) : (
            <p className="text-zinc-500">No image selected</p>
          )}
        </div>

        {/* BUTTONS */}
        <div className="space-y-4">
          <button
            onClick={handleUploadClick}
            className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
          >
            Upload Image
          </button>

          <button
            onClick={handleCameraClick}
            className="w-full bg-zinc-800 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition"
          >
            Use Camera
          </button>
        </div>

        {/* HIDDEN INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </main>
  );
}