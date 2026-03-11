"use client";

// ─────────────────────────────────────────────────────────────────────────────
// JANVIER Ecom Photo Studio — Main Page
// Single-page app: upload → choose mode → generate → download
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";

// Types for the three generation modes
type Mode = "A" | "B" | "C";

// Shape of an image returned by the Gemini API (base64 + mimeType)
type ImageResult = {
  data: string;    // base64-encoded image data
  mimeType: string; // e.g. "image/png"
};

// The results object returned from our /api/generate route
type Results = {
  layflat?: ImageResult;  // Mode A result
  detail?: ImageResult;   // Mode B result
};

// ─── Mode configuration used to render the mode selector ──────────────────
const MODES = [
  {
    value: "A" as Mode,
    label: "Layflat",
    description: "Overhead flat lay on white",
  },
  {
    value: "B" as Mode,
    label: "Detail Close-up",
    description: "Texture, stitching & craft",
  },
  {
    value: "C" as Mode,
    label: "Full Set",
    description: "Both A + B delivered together",
  },
];

// ─── Accepted file types ───────────────────────────────────────────────────
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 8;

export default function Home() {
  // ── State ───────────────────────────────────────────────────────────────
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("A");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────────

  /** Validates and stores the selected image file, creates a preview URL */
  const handleFile = useCallback((file: File) => {
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    // Validate file size (Vercel free tier has 4.5MB body limit for API routes)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Please upload an image under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    // Clear any previous state when a new file is chosen
    setError(null);
    setResults(null);
    setImage(file);
    // Revoke previous object URL to avoid memory leaks
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  /** Handle drag-and-drop onto the upload zone */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  /** Handle file chosen via the hidden file input */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Generation ───────────────────────────────────────────────────────────

  /** Sends the image + mode to our backend API route and stores results */
  const handleGenerate = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Build multipart form data — the image file plus the selected mode
      const formData = new FormData();
      formData.append("image", image);
      formData.append("mode", mode);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
        // No Content-Type header — browser sets it automatically with boundary
      });

      if (!res.ok) {
        // Parse the error message from our API route
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload.error || `Server error (${res.status}). Please try again.`
        );
      }

      const data: Results = await res.json();
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────

  /** Triggers a browser download for a generated image */
  const handleDownload = (img: ImageResult, filename: string) => {
    const link = document.createElement("a");
    // Construct a data URI from the base64 image
    link.href = `data:${img.mimeType};base64,${img.data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Reset ────────────────────────────────────────────────────────────────

  /** Clears everything so the user can start fresh */
  const handleReset = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setResults(null);
    setError(null);
    setLoading(false);
    // Reset the hidden file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Derived display state ────────────────────────────────────────────────
  const showUploadArea = !results; // Hide upload once results are shown
  const showResults = !!results && !loading;
  const bothImages = results?.layflat && results?.detail;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white text-black">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-100 py-8 px-6 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-2">
          JANVIER
        </p>
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] uppercase">
          Ecom Photo Studio
        </h1>
        <p className="mt-2 text-sm text-gray-500 tracking-wide">
          Professional fashion photography, powered by AI
        </p>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Upload + Mode + Generate (hidden once results are shown) ── */}
        {showUploadArea && (
          <>
            {/* Upload Zone */}
            <section aria-label="Upload garment photo">
              {/* Hidden file input — triggered programmatically */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={handleInputChange}
                aria-label="Upload image file"
              />

              {/* Drag & Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload garment photo — drag and drop or click to browse"
                className={`
                  border-2 border-dashed rounded-xl p-8 sm:p-12 text-center
                  cursor-pointer transition-all duration-200 select-none
                  ${isDragging
                    ? "border-black bg-gray-50 scale-[1.01]"
                    : "border-gray-200 hover:border-gray-400"
                  }
                  ${loading ? "opacity-50 pointer-events-none" : ""}
                `}
                onClick={() => !loading && fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && !loading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  /* ── Preview of the uploaded image ─────────────────── */
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Uploaded garment preview"
                        className="max-h-72 max-w-full mx-auto rounded-lg object-contain shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-400 tracking-wide">
                      {image?.name} &nbsp;·&nbsp; Click to change
                    </p>
                  </div>
                ) : (
                  /* ── Empty state prompt ─────────────────────────────── */
                  <div className="space-y-4 py-4">
                    {/* Upload icon */}
                    <div className="mx-auto w-12 h-12 border border-gray-200 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-sm tracking-wide">
                        Drop your garment photo here
                      </p>
                      <p className="mt-1 text-xs text-gray-400 tracking-wide">
                        or click to browse &nbsp;·&nbsp; JPG, PNG, WEBP &nbsp;·&nbsp; Max {MAX_FILE_SIZE_MB}MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Mode Selector */}
            <section aria-label="Select generation mode">
              <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-3">
                Select Mode
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {MODES.map((m) => {
                  const isSelected = mode === m.value;
                  return (
                    <label
                      key={m.value}
                      className={`
                        relative border rounded-xl p-3 sm:p-4 cursor-pointer
                        transition-all duration-150 text-left
                        ${isSelected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-gray-400 bg-white"
                        }
                        ${loading ? "opacity-50 pointer-events-none" : ""}
                      `}
                    >
                      {/* Hidden radio input for accessibility */}
                      <input
                        type="radio"
                        name="mode"
                        value={m.value}
                        checked={isSelected}
                        onChange={() => !loading && setMode(m.value)}
                        className="sr-only"
                        aria-label={`Mode ${m.value}: ${m.label}`}
                      />
                      <span className="block font-semibold text-xs sm:text-sm tracking-wide">
                        {m.label}
                      </span>
                      <span
                        className={`
                          block text-[10px] sm:text-xs mt-1 leading-snug
                          ${isSelected ? "text-gray-300" : "text-gray-500"}
                        `}
                      >
                        {m.description}
                      </span>
                      {/* Mode C badge */}
                      {m.value === "C" && (
                        <span
                          className={`
                            absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full
                            font-semibold tracking-wider uppercase
                            ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
                          `}
                        >
                          2×
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!image || loading}
              className={`
                w-full py-4 rounded-xl text-sm tracking-[0.2em] uppercase font-medium
                transition-all duration-200
                ${image && !loading
                  ? "bg-black text-white hover:bg-gray-900 active:scale-[0.99]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
              aria-disabled={!image || loading}
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </>
        )}

        {/* ── Loading State ───────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-16 space-y-6 animate-fade-in">
            {/* Animated spinner */}
            <div className="mx-auto w-10 h-10">
              <svg
                className="animate-spin-slow w-10 h-10 text-black"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-10"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v2a6 6 0 00-6 6H4z"
                />
              </svg>
            </div>

            {/* Show two progress lines for Mode C (both running in parallel) */}
            {mode === "C" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-black animate-pulse" />
                  Generating Layflat…
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-black animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  />
                  Generating Detail Close-up…
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {mode === "A" ? "Generating Layflat…" : "Generating Detail Close-up…"}
              </p>
            )}

            <p className="text-xs text-gray-400 tracking-wide max-w-xs mx-auto">
              Generating your ecom images, this may take 20–30 seconds…
            </p>
          </div>
        )}

        {/* ── Error Message ───────────────────────────────────────────── */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Generation failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {showResults && (
          <section className="space-y-6 animate-fade-in" aria-label="Generated images">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400">
                Results
              </p>
              {/* Show the mode label next to "Results" */}
              <span className="text-[10px] tracking-widest uppercase text-gray-300">
                {mode === "A" ? "Layflat" : mode === "B" ? "Detail Close-up" : "Full Set"}
              </span>
            </div>

            {/* Image grid — 1 column for single results, 2 for Mode C */}
            <div className={`grid gap-6 ${bothImages ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>

              {/* Layflat result (Mode A or C) */}
              {results?.layflat && (
                <ResultCard
                  label="Layflat"
                  image={results.layflat}
                  downloadFilename="janvier-layflat.png"
                  downloadLabel="Download Layflat"
                  onDownload={handleDownload}
                />
              )}

              {/* Detail Close-up result (Mode B or C) */}
              {results?.detail && (
                <ResultCard
                  label="Detail Close-up"
                  image={results.detail}
                  downloadFilename="janvier-detail-closeup.png"
                  downloadLabel="Download Detail Close-up"
                  onDownload={handleDownload}
                />
              )}
            </div>

            {/* Try Another button — resets the app for a new image */}
            <button
              onClick={handleReset}
              className="
                w-full py-3 border border-gray-200 rounded-xl
                text-sm text-gray-500 tracking-wide
                hover:border-gray-400 hover:text-gray-700
                transition-all duration-150
              "
            >
              Try Another
            </button>
          </section>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="text-center pb-10 pt-4">
        <p className="text-[10px] text-gray-300 tracking-widest uppercase">
          JANVIER Ecom Photo Studio
        </p>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultCard — displays a single generated image with its download button
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({
  label,
  image,
  downloadFilename,
  downloadLabel,
  onDownload,
}: {
  label: string;
  image: ImageResult;
  downloadFilename: string;
  downloadLabel: string;
  onDownload: (img: ImageResult, filename: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Label above the image */}
      <p className="text-xs font-medium tracking-widest uppercase text-gray-500">
        {label}
      </p>

      {/* Generated image — displayed on white background */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
        <img
          src={`data:${image.mimeType};base64,${image.data}`}
          alt={`Generated ${label} image`}
          className="w-full object-contain"
        />
      </div>

      {/* Download button */}
      <button
        onClick={() => onDownload(image, downloadFilename)}
        className="
          w-full py-3 border border-black rounded-xl
          text-xs tracking-widest uppercase font-medium
          hover:bg-black hover:text-white
          transition-all duration-150
        "
      >
        {downloadLabel}
      </button>
    </div>
  );
}
