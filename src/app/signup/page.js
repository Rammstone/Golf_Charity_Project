"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState("")   // ⭐ NEW
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [plan, setPlan] = useState("monthly")
  const [charityId, setCharityId] = useState(null)
  const [donationPercent, setDonationPercent] = useState(10)

  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ===== LOAD CHARITIES =====
  useEffect(() => {
    async function fetchCharities() {
      const { data } = await supabase
        .from("charities")
        .select("*")

      setCharities(data || [])
    }

    fetchCharities()
  }, [])

  // ===== SIGNUP HANDLER =====
  async function handleSignup(e) {
    e.preventDefault()

    if (!charityId) {
      setError("Please select a charity to support")
      return
    }

    setLoading(true)
    setError("")

    try {
      // ⭐ 1) Create Auth User
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
        })

      if (authError) throw authError

      const user = authData.user
      if (!user) throw new Error("Signup failed")

      // ⭐ 2) Insert profile with NAME
      const { error: userInsertError } =
        await supabase.from("users").insert({
          id: user.id,
          name,            // ⭐ NEW
          email,
          role: "user",
        })

      if (userInsertError) throw userInsertError

      // ⭐ 3) Save charity preference
      await supabase.from("user_charities").insert({
        user_id: user.id,
        charity_id: charityId,
        donation_percent: donationPercent,
      })

      // ⭐ 4) Save subscription
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan,
        status: "active",
      })

      // ⭐ 5) Redirect safely to dashboard
      router.replace("/dashboard")

    } catch (err) {
      setError(err.message || "Signup failed")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-4 py-10">

      <div className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-xl">

        <h1 className="text-3xl font-extrabold text-black text-center mb-6">
          Create Your Account
        </h1>

        <form onSubmit={handleSignup} className="space-y-6">

          {/* ⭐ USERNAME INPUT */}
          <input
            type="text"
            placeholder="Username"
            required
            className="w-full border rounded-lg px-4 py-3 text-gray-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full border rounded-lg px-4 py-3 text-gray-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full border rounded-lg px-4 py-3 text-gray-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* SUBSCRIPTION */}
          <div>
            <h2 className="font-semibold mb-3 text-black">
              Choose Subscription
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <PlanCard
                title="Monthly"
                price="$9.99 / mo"
                selected={plan === "monthly"}
                onClick={() => setPlan("monthly")}
              />
              <PlanCard
                title="Yearly"
                price="$99 / yr"
                selected={plan === "yearly"}
                onClick={() => setPlan("yearly")}
              />
            </div>
          </div>

          {/* CHARITY */}
          <div>
            <h2 className="font-semibold mb-3 text-black">
              Select a Charity to Support
            </h2>

            <div className="space-y-3 max-h-56 overflow-y-auto">
              {charities.map((charity) => (
                <CharityCard
                  key={charity.id}
                  charity={charity}
                  selected={charityId === charity.id}
                  onClick={() => setCharityId(charity.id)}
                />
              ))}
            </div>
          </div>

          {/* DONATION */}
          {charityId && (
            <div>
              <h2 className="font-semibold mb-2 text-black">
                Donation Percentage (Minimum 10%)
              </h2>

              <p className="text-sm text-gray-600 mb-2">
                Donate <strong>{donationPercent}%</strong>
              </p>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={donationPercent}
                onChange={(e) =>
                  setDonationPercent(Number(e.target.value))
                }
                className="w-full accent-emerald-600"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>

        </form>

      </div>
    </main>
  )
}

/* COMPONENTS unchanged */

function PlanCard({ title, price, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer ${
        selected
          ? "border-emerald-500 bg-emerald-50"
          : "hover:border-gray-300"
      }`}
    >
      <h3 className="font-semibold text-black">{title}</h3>
      <p className="text-gray-600">{price}</p>
    </div>
  )
}

function CharityCard({ charity, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer ${
        selected
          ? "border-emerald-500 bg-emerald-50"
          : "hover:border-gray-300"
      }`}
    >
      <h3 className="font-semibold text-black">
        {charity.name}
      </h3>

      <p className="text-sm text-gray-600">
        {charity.purpose}
      </p>
    </div>
  )
}