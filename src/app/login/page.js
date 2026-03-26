"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // ⭐ 1) Sign in with Supabase Auth
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (error) throw error

      const userId = data.user.id

      // ⭐ 2) Fetch profile to get role
      const { data: profile, error: profileError } =
        await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single()

      if (profileError || !profile) {
        throw new Error("User profile not found")
      }

      // ⭐ 3) Role-based routing
      if (profile.role === "admin") {
        router.replace("/admin")
      } else {
        router.replace("/dashboard")
      }

    } catch (err) {
      setError(err.message || "Login failed")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-4">

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">

        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-6 tracking-tight">
          Welcome Back
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            required
            className="w-full border rounded-lg px-4 py-3 text-gray-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            required
            className="w-full border rounded-lg px-4 py-3 text-gray-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don’t have an account?{" "}
          <a href="/signup" className="text-emerald-600 font-medium">
            Sign up
          </a>
        </p>

      </div>
    </main>
  )
}