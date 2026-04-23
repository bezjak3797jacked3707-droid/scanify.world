"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string>("");

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setMessage("");
    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error } = await supabase.storage
        .from("scans")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("scans").getPublicUrl(filePath);

      setMessage("Upload successful");

      setTimeout(() => {
        router.push(`/result?imageUrl=${encodeURIComponent(data.publicUrl)}`);
      }, 500);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Check bucket setup and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleCameraClick() {
    alert("Camera feature coming next step");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Scan
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Upload an item
          </h1>
          <p className="text-sm text-zinc-400">
            Add a photo to start your scan.
          </p>
        </div>

        <div className="flex h-72 items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
          {preview ? (
            <img
              src={preview}
              alt="Selected item preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <p className="text-sm text-zinc-500">No image selected</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>

          <button
            onClick={handleCameraClick}
            disabled={isUploading}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
          >
            Use Camera
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {message ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}