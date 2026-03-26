"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {

  const [charities, setCharities] = useState([])

  // ===== FETCH CHARITIES FROM SUPABASE =====
  useEffect(() => {
    async function fetchCharities() {
      const { data, error } = await supabase
        .from("charities")
        .select("*")

      if (error) {
        console.error("Error loading charities:", error)
      } else {
        setCharities(data)
      }
    }

    fetchCharities()
  }, [])

  return (
    <main className="bg-white text-gray-900">

      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

          <h1 className="text-2xl font-bold text-emerald-700">
            GolfForGood
          </h1>

          <div className="flex gap-4">
            <a href="/login" className="px-4 py-2 rounded-lg hover:bg-gray-100">
              Login
            </a>

            <a href="/signup" className="px-5 py-2 rounded-lg bg-emerald-600 text-white">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="bg-gradient-to-br from-emerald-50 to-white py-28 px-6 text-center">
        <h2 className="text-5xl font-extrabold mb-6 leading-tight">
          Turn Your Passion Into Impact
        </h2>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Track your performance, enter prize draws, and support
          life-changing charities — all through one subscription.
        </p>

        <a
          href="/signup"
          className="bg-emerald-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-700 shadow-lg"
        >
          Start Making a Difference
        </a>
      </section>

      {/* ===== IMPACT METRICS ===== */}
      <section className="py-16 bg-[#F6F8F7]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 text-center gap-8">
          <Metric value="$1.2M+" label="Raised for Charity" />
          <Metric value="12,000+" label="Active Members" />
          <Metric value="35+" label="Supported Causes" />
        </div>
      </section>

      {/* ===== CHARITY SHOWCASE ===== */}
      <section className="py-24 px-6 bg-emerald-50">
        <div className="max-w-6xl mx-auto">

          <h3 className="text-3xl font-bold text-center mb-6">
            Causes You Can Support
          </h3>

          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            Every subscription contributes to trusted organizations
            creating real change around the world.
          </p>

          <div className="grid md:grid-cols-3 gap-8">

            {charities.map((charity) => (
              <div
                key={charity.id}
                className="
                  bg-white rounded-2xl shadow-lg overflow-hidden
                  hover:shadow-2xl hover:-translate-y-1 transition
                "
              >

                {/* Placeholder Image */}
                <img
                  src={
                    charity.image_url ||
                    "https://images.unsplash.com/photo-1521791136064-7986c2920216"
                  }
                  alt={charity.name}
                  className="h-48 w-full object-cover"
                />

                <div className="p-6">

                  <h4 className="text-xl font-semibold mb-3">
                    {charity.name}
                  </h4>

                  <p className="text-gray-600 mb-6">
                    {charity.purpose}
                  </p>

                  <a
                    href={charity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-medium hover:underline"
                  >
                    Read More →
                  </a>

                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">

          <h3 className="text-3xl font-bold text-center mb-6">
            How the Platform Works
          </h3>

          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-16">
            GolfForGood combines performance tracking, prize draws, and
            charitable giving into a single transparent system.
          </p>

          {/* Steps unchanged */}

        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 text-center bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <h3 className="text-4xl font-bold mb-6">
          Ready to Make Every Round Count?
        </h3>

        <a
          href="/signup"
          className="bg-white text-emerald-700 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100"
        >
          Join Now
        </a>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t py-8 text-center text-gray-500">
        © {new Date().getFullYear()} GolfForGood
      </footer>

    </main>
  )
}

/* ===== COMPONENTS ===== */

function Metric({ value, label }) {
  return (
    <div>
      <p className="text-3xl font-bold text-emerald-700">{value}</p>
      <p className="text-gray-600 mt-1">{label}</p>
    </div>
  )
}