"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubmitPlayerPage() {
  const [formData, setFormData] = useState({
    name: "",
    category: "NBA",
    era: "Current",
    bio: "",
    photo_url: "",
    handles: 50,
    scoring: 50,
    quickness: 50,
    heart: 50,
    court_iq: 50,
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name in ["handles", "scoring", "quickness", "heart", "court_iq"] ? Number(value) : value,
    }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/submit-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit player");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center">
          <h2 className="text-2xl font-bold text-green-500 mb-4">Submission received!</h2>
          <p className="text-zinc-400 mb-8">
            We'll review and add it shortly.
          </p>
          <Link
            href="/"
            className="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-zinc-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-zinc-500 hover:text-white mb-8 inline-block transition-colors">
          &larr; Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Submit a Player</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-xl">
          {status === "error" && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md">
              {errorMessage}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-700 rounded-md p-3 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
                placeholder="Player Name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-zinc-400 mb-1">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-black border border-zinc-700 rounded-md p-3 text-white focus:ring-2 focus:ring-white outline-none"
                >
                  <option value="NBA">NBA</option>
                  <option value="WNBA">WNBA</option>
                  <option value="Streetball Icons">Streetball Icons</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Celebrity Ballers">Celebrity Ballers</option>
                </select>
              </div>

              <div>
                <label htmlFor="era" className="block text-sm font-medium text-zinc-400 mb-1">Era</label>
                <select
                  id="era"
                  name="era"
                  value={formData.era}
                  onChange={handleChange}
                  className="w-full bg-black border border-zinc-700 rounded-md p-3 text-white focus:ring-2 focus:ring-white outline-none"
                >
                  <option value="90s">90s</option>
                  <option value="2000s">2000s</option>
                  <option value="2010s">2010s</option>
                  <option value="Current">Current</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="photo_url" className="block text-sm font-medium text-zinc-400 mb-1">Photo URL</label>
              <input
                type="url"
                id="photo_url"
                name="photo_url"
                value={formData.photo_url}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-700 rounded-md p-3 text-white focus:ring-2 focus:ring-white outline-none"
                placeholder="https://..."
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-zinc-400 mb-1">Bio</label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-700 rounded-md p-3 text-white focus:ring-2 focus:ring-white outline-none"
                placeholder="A brief bio..."
              />
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-semibold mb-4">Attributes (1-99)</h3>
            <div className="space-y-6">
              {(["handles", "scoring", "quickness", "heart", "court_iq"] as const).map((attr) => (
                <div key={attr}>
                  <div className="flex justify-between mb-1">
                    <label htmlFor={attr} className="text-sm font-medium text-zinc-300 capitalize">
                      {attr.replace("_", " ")}
                    </label>
                    <span className="text-sm font-mono text-zinc-500">{formData[attr]}</span>
                  </div>
                  <input
                    type="range"
                    id={attr}
                    name={attr}
                    min="1"
                    max="99"
                    value={formData[attr]}
                    onChange={handleSliderChange}
                    className="w-full accent-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-white text-black font-bold py-4 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {status === "submitting" ? "Submitting..." : "Submit Player"}
          </button>
        </form>
      </div>
    </div>
  );
}
