"use client";

interface ScanningOverlayProps {
  imageUrl: string;
}

export default function ScanningOverlay({ imageUrl }: ScanningOverlayProps) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      <img
        src={imageUrl}
        alt="Scanning..."
        className="w-full h-full object-cover"
        style={{ filter: "brightness(0.85)" }}
      />

      {/* Corner brackets */}
      <span className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute bottom-3 left-3 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute bottom-3 right-3 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />

      {/* Bouncing sweep line, top to bottom and back */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: "-5%",
          height: 3,
          background: "linear-gradient(90deg, transparent 0%, #7c3aed 20%, #a78bfa 50%, #7c3aed 80%, transparent 100%)",
          boxShadow: "0 0 12px 3px rgba(124,58,237,0.8), 0 0 24px 6px rgba(124,58,237,0.4)",
          animation: "scan-sweep 2.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}