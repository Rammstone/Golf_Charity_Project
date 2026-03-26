"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Dashboard() {
  const router = useRouter()

  const [draw, setDraw] = useState(null)

  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)

  const [scores, setScores] = useState([])
  const [newScore, setNewScore] = useState("")

  const [enteredScores, setEnteredScores] = useState(null)
  const [entered, setEntered] = useState(false)

  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState({ name: "", email: "" })

  const [winner, setWinner] = useState(null)

  // ===== LOAD USER =====
  useEffect(() => {
    async function loadUser() {

    // ⭐ Get logged-in user
    const { data: auth } = await supabase.auth.getUser()

    if (!auth?.user) {
      router.replace("/login")
      return
    }

    const userId = auth.user.id

    // ⭐ Fetch profile from DB
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (!profileData) {
      router.replace("/login")
      return
    }

    // ⭐ ROLE ROUTING FIX
    if (profileData.role === "admin") {
      router.replace("/admin")
      return
    }

    setUser(profileData)

    setProfile({
      name: profileData.name || "User",
      email: profileData.email || "",
    })

    // ⭐ Subscription
    const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

    // ⭐ Charity
    const { data: uc } = await supabase
    .from("user_charities")
    .select("donation_percent, charities(*)")
    .eq("user_id", userId)
    .single()

    setUser({
    ...profileData,
    subscription: sub,
    charity: uc
        ? {
            name: uc.charities.name,
            donationPercent: uc.donation_percent,
        }
        : null,
    })

    // ⭐ Load scores from DB
    const { data: scoreData } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (scoreData) {
      setScores(
        scoreData.map((s) => ({
          id: s.id,
          score: s.score,
          date: new Date(s.created_at).toLocaleDateString(),
        }))
      )
    }

    const { data: drawData } = await supabase
  .from("draws")
  .select("*")
  .eq("published", true)
  .order("created_at", { ascending: false })
  .limit(1)
  .single()

    setDraw(drawData)

    // ⭐ Check if user already entered this draw
    if (drawData) {
    const { data: entry } = await supabase
        .from("draw_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("draw_id", drawData.id)
        .single()

    if (entry) {
        setEntered(true)
        setEnteredScores(entry.scores)
    }
    }

    // ⭐ Check if user has won this draw
    if (drawData) {

    const { data: win } = await supabase
        .from("winners")
        .select("*")
        .eq("user_id", userId)
        .eq("draw_id", drawData.id)
        .single()

    if (win) {
        setWinner(win)
    }
    }

    function countMatches(entryScores, drawNumbers) {
        return entryScores.filter(n => drawNumbers.includes(n)).length
    }

    setMounted(true)
  }

  loadUser()
}, [router])

  if (!user) return null

  async function logout() {
  await supabase.auth.signOut()
  router.replace("/")
}

  async function handleAddScore(e) {
  e.preventDefault()

  const value = Number(newScore)
  if (value < 1 || value > 45) return

  // ⭐ Insert new score
  const { data } = await supabase
    .from("scores")
    .insert({
      user_id: user.id,
      score: value,
    })
    .select()
    .single()

  // ⭐ Fetch ALL scores ordered newest first
  const { data: allScores } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // ⭐ If more than 5 → delete extras
  if (allScores.length > 5) {

    const idsToDelete = allScores
      .slice(5)          // older ones
      .map((s) => s.id)

    await supabase
      .from("scores")
      .delete()
      .in("id", idsToDelete)
  }

  // ⭐ Update UI with latest 5
  const latestFive = allScores.slice(0, 5)

  setScores(
    latestFive.map((s) => ({
      id: s.id,
      score: s.score,
      date: new Date(s.created_at).toLocaleDateString(),
    }))
  )

  setNewScore("")
}

    async function enterDraw() {

    if (!draw || scores.length < 5) {
        alert("You need 5 scores to enter the draw")
        return
    }

    const scoreValues = scores.map((s) => s.score)

    const { error } = await supabase
        .from("draw_entries")
        .insert({
        user_id: user.id,
        draw_id: draw.id,
        scores: scoreValues,
        })

    if (error) {
        alert("Failed to enter draw")
        return
    }

    setEntered(true)
    setEnteredScores(scoreValues)
    }

    async function resetEntry() {

      if (!draw || !user) return

      await supabase
        .from("draw_entries")
        .delete()
        .eq("user_id", user.id)
        .eq("draw_id", draw.id)

      setEntered(false)
      setEnteredScores(null)
      setWinner(null)

      alert("Entry reset — you can re-enter the draw")
    }

    async function forceWinningEntry() {

      if (!draw || !user) return

      await supabase
        .from("draw_entries")
        .upsert({
          user_id: user.id,
          draw_id: draw.id,
          scores: draw.numbers,  // exact match
        })

      setEntered(true)
      setEnteredScores(draw.numbers)

      alert("Winning entry generated")
    }

    async function claimPrize() {

      if (!winner || !draw || !enteredScores) return

      const prizePool = draw.prize_pool || 0

      if (prizePool <= 0) {
        alert("Prize pool not set for this draw")
        return
      }

      // ⭐ Recalculate matches from locked entry
      const matches = enteredScores.filter((n) =>
        draw.numbers.includes(n)
      ).length

      const tierShare = {
        5: 40,
        4: 35,
        3: 25
      }

      const share = tierShare[matches]

      if (!share) {
        alert("Invalid tier value")
        return
      }

      // ⭐ TOTAL POOL FOR THIS TIER
      const tierPool = (share / 100) * prizePool

      // ⭐ COUNT WINNERS IN SAME TIER
      const { count } = await supabase
        .from("winners")
        .select("*", { count: "exact", head: true })
        .eq("draw_id", draw.id)
        .eq("tier", winner.tier)

      const winnerCount = count || 1

      // ⭐ FINAL PER-WINNER AMOUNT
      const amount = tierPool / winnerCount

      // ⭐ UPDATE REQUEST
      const { error } = await supabase
        .from("winners")
        .update({
          status: "requested",
          amount: amount
        })
        .eq("id", winner.id)

      if (!error) {
        setWinner({
          ...winner,
          status: "requested",
          amount
        })

        alert(
          `Request sent for $${amount.toFixed(2)}. ` +
          "Payment will be processed after verification."
        )
      }
    }

  const nextDrawDate = new Date("2026-07-30")
  const daysRemaining = Math.ceil(
    (nextDrawDate - new Date()) / (1000 * 60 * 60 * 24)
  )

  return (
    <main className="min-h-screen bg-[#F6F8F7] text-gray-900">

      {/* ===== NAVBAR ===== */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <h1 className="text-xl font-semibold">GolfForGood</h1>

          <div className="flex items-center gap-4">

            {/* PROFILE ICON */}
            <button
              onClick={() => setShowProfile(true)}
              className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center hover:bg-emerald-200"
            >
              {profile.name.charAt(0).toUpperCase()}
            </button>

            <button
              onClick={logout}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* GREETING */}
        <div className={mounted ? "opacity-100" : "opacity-0"}>
          <h2 className="text-3xl font-bold">
            Welcome back, {profile.name.split(" ")[0]}
          </h2>

          <p className="text-gray-600">
            Track performance, rewards, and impact in one place
          </p>
        </div>

        {/* ===== STAT CARDS ===== */}
        <div className="grid md:grid-cols-3 gap-6">

          <StatCard
            title="Total Winnings"
            value={`$${user.total_winnings || 0}`}
            accent="emerald"
            mounted={mounted}
          />

          <StatCard
            title="Subscription"
            value={`${user.subscription?.plan || "None"} — Active`}
            accent="blue"
            mounted={mounted}
          />

          <StatCard
            title="Charity Contribution"
            value={`${user.charity?.donationPercent || 0}%`}
            accent="purple"
            mounted={mounted}
          />

        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* SCORES */}
          <Card title="Recent Scores" mounted={mounted}>

            <form onSubmit={handleAddScore} className="flex gap-3 mb-5">

                <input
                    type="number"
                    min="1"
                    max="45"
                    placeholder="Enter score"
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                    className="flex-1 border rounded-lg px-4 py-2"
                    required
                />

                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg">
                    Add
                </button>

            </form>

                {entered && (
                <p className="text-sm text-gray-500">
                    Scores locked for current draw
                </p>
                )}

            <ul className="space-y-3">
              {scores.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between p-4 rounded-xl bg-white border border-emerald-100 hover:bg-emerald-50 transition"
                >
                  <span className="font-semibold text-emerald-700">
                    {s.score}
                  </span>

                  <span className="text-sm text-gray-500">
                    {s.date}
                  </span>
                </li>
              ))}
            </ul>

          </Card>

          {/* CURRENT DRAW */}
          <Card
                title={`Current Draw — ${draw?.month || ""}`}
                mounted={mounted}
                >

                {/* DRAW NUMBERS */}
                <div className="flex gap-3 justify-center mb-6">
                    {(draw?.numbers || []).map((n, i) => (
                    <div
                        key={i}
                        className="
                        w-14 h-14 rounded-full
                        bg-gradient-to-br from-emerald-100 to-emerald-200
                        text-emerald-800
                        flex items-center justify-center
                        font-bold text-lg shadow-sm
                        "
                    >
                        {n}
                    </div>
                    ))}
                </div>

                {draw?.prize_pool && (
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">Prize Pool</p>
                    <p className="text-3xl font-bold text-emerald-700">
                      ${draw.prize_pool}
                    </p>
                  </div>
                )}

                {enteredScores ? (
                    (() => {

                    // ⭐ USE LOCKED ENTRY SCORES
                    const userNumbers = enteredScores

                    const matches = userNumbers.filter((n) =>
                        draw?.numbers?.includes(n)
                    ).length

                    const prizePool = draw?.prize_pool || 0

                    const tiers = [
                      { match: 5, share: 40, rollover: true },
                      { match: 4, share: 35, rollover: false },
                      { match: 3, share: 25, rollover: false },
                    ].map(t => ({
                      ...t,
                      amount: Math.round((t.share / 100) * prizePool)
                    }))

                    return (
                        <div className="space-y-6">

                        {/* USER RESULT */}
                        <div className="text-center bg-white/70 rounded-xl p-4 border border-emerald-100">
                            <p className="text-sm text-gray-500">
                            Your Matches
                            </p>

                            <p className="text-3xl font-bold text-emerald-700">
                            {matches}
                            </p>

                            {matches >= 3 ? (
                            <p className="text-emerald-600 font-medium">
                                You qualify for a prize tier 🎉
                            </p>
                            ) : (
                            <p className="text-gray-500">
                                Minimum 3 matches required
                            </p>
                            )}
                        </div>

                        {/* ALL TIERS */}
                        <div className="space-y-3">

                            <p className="text-sm font-semibold text-gray-600">
                            Prize Tiers
                            </p>

                            {tiers.map((t) => {

                            const qualified = matches === t.match
                            const isWinner = qualified && winner

                            return (
                                <div
                                key={t.match}
                                className={`
                                    flex justify-between items-center
                                    p-4 rounded-xl border transition
                                    ${
                                    qualified
                                        ? "bg-emerald-50 border-emerald-300 shadow-sm"
                                        : "bg-white border-gray-200"
                                    }
                                `}
                                >

                                {/* LEFT */}
                                <div>
                                    <p className="font-medium">
                                    {t.match}-Number Match
                                    </p>

                                    <p className="text-sm text-gray-500">
                                      Pool Share: {t.share}% (${t.amount})
                                    </p>
                                </div>

                                {/* RIGHT — WINNER ACTION */}
                                <div className="text-right">

                                    {/* ⭐ CLAIM BUTTON */}
                                    {qualified &&
                                    winner?.status === "pending" && (
                                        <button
                                        onClick={claimPrize}
                                        className="
                                            bg-emerald-600 text-white
                                            px-4 py-2 rounded-lg
                                            font-semibold hover:bg-emerald-700
                                        "
                                        >
                                        Claim Prize
                                        </button>
                                    )}

                                    {/* ⭐ CLAIM REQUESTED */}
                                    {qualified &&
                                    winner?.status === "requested" && (
                                        <span className="text-blue-600 font-semibold">
                                        Claim Requested
                                        </span>
                                    )}

                                    {/* ⭐ DEFAULT LABEL */}
                                    {qualified &&
                                    !winner && (
                                        <span className="text-emerald-700 font-semibold">
                                        Your Tier
                                        </span>
                                    )}

                                    {t.rollover && (
                                    <p className="text-xs text-gray-500">
                                        Jackpot rollover
                                    </p>
                                    )}

                                </div>

                                </div>
                            )
                            })}

                        </div>

                        </div>
                    )

                    })()
                ) : (
                    <div className="text-center text-gray-500 py-8">
                    Enter the draw to participate.
                    </div>
                )}

                {/* FOOTNOTE */}
                <p className="text-xs text-gray-500 mt-6 leading-relaxed">
                    Prize pool is auto-calculated based on active subscribers.
                    Winners in the same tier share the pool equally.
                    5-match jackpot carries forward if unclaimed.
                </p>

            </Card>

          {/* PARTICIPATION SUMMARY */}
          <Card title="Participation Summary" mounted={mounted}>
            <p>Entries this month: 3</p>
            <p>Next draw: {nextDrawDate.toDateString()}</p>
            <p className="text-emerald-600 font-medium">
              {daysRemaining} days remaining
            </p>
            {!entered ? (

              <button
                onClick={enterDraw}
                disabled={scores.length < 5}
                className="
                  mt-4 bg-blue-600 text-white
                  px-5 py-2 rounded-lg font-semibold
                  disabled:opacity-50
                "
              >
                Enter Draw
              </button>

            ) : (

              <div className="mt-6 space-y-4">

                {/* ⭐ DEMO MODE NOTICE */}
                <div className="
                  bg-yellow-50 border border-yellow-200
                  text-yellow-800
                  text-sm rounded-lg
                  px-4 py-2
                  text-center
                ">
                  ⚠️ Demo Mode — Entries can be reset for testing
                </div>

                {/* STATUS */}
                <p className="text-emerald-600 font-semibold text-center">
                  ✓ You have entered this draw
                </p>

                {/* ACTION BUTTONS */}
                <div className="
                  flex flex-col sm:flex-row
                  justify-center items-center
                  gap-3
                  bg-gray-50 border border-gray-200
                  rounded-xl p-4
                ">

                  <button
                    onClick={resetEntry}
                    className="
                      w-full sm:w-auto
                      bg-red-500 text-white
                      px-5 py-2.5 rounded-lg
                      text-sm font-semibold
                      shadow-sm hover:bg-red-600 transition
                    "
                  >
                    Reset Entry
                  </button>

                  <button
                    onClick={forceWinningEntry}
                    className="
                      w-full sm:w-auto
                      bg-purple-600 text-white
                      px-5 py-2.5 rounded-lg
                      text-sm font-semibold
                      shadow-sm hover:bg-purple-700 transition
                    "
                  >
                    Generate Winning Entry
                  </button>

                </div>

              </div>

            )}
          </Card>

          <Card title="Entries Upcoming Draw" mounted={mounted}>

            {enteredScores ? (
                <div className="flex gap-3 justify-center items-center min-h-[140px]
">

                {enteredScores.map((n, i) => (
                    <div
                    key={i}
                    className="
                        w-14 h-14 rounded-full
                        bg-gradient-to-br from-blue-100 to-blue-200
                        text-blue-800
                        flex items-center justify-center
                        font-bold text-lg shadow-sm
                    "
                    >
                    {n}
                    </div>
                ))}

                </div>
            ) : (
                <p className="text-gray-500 text-center">
                You have not entered the upcoming draw yet.
                </p>
            )}

            </Card>

          {/* CHARITY IMPACT */}
          <Card title="Your Charity Impact" mounted={mounted}>
            <p className="font-semibold">
            {user.charity?.name || "No charity selected"}
            </p>

            <p className="text-gray-600">
            Contribution: {user.charity?.donationPercent || 0}%
            </p>
          </Card>

          {/* WINNINGS */}
          <Card title="Winnings Status" mounted={mounted}>
            <p className="text-2xl font-bold text-emerald-700">
              ${user.total_winnings || 0}
            </p>
            <p>Status: {winner?.status || "No active winnings"}</p>
          </Card>

        </div>
      </section>

      {/* ===== PROFILE MODAL ===== */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">
              Edit Profile
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault()

                await supabase
                    .from("users")
                    .update({
                    name: profile.name,
                    email: profile.email,
                    })
                    .eq("id", user.id)

                setUser({
                    ...user,
                    name: profile.name,
                    email: profile.email,
                })

                setShowProfile(false)
                }}
              className="space-y-4"
            >
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
              />

              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

//
// ===== ORIGINAL STYLED COMPONENTS =====
//

function Card({ title, children, mounted }) {
  return (
    <div
      className={`
        rounded-2xl p-6
        bg-gradient-to-br from-white to-emerald-50/60
        border border-emerald-100
        shadow-lg transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl
        ${mounted ? "opacity-100" : "opacity-0"}
      `}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function StatCard({ title, value, accent, mounted }) {
  const styles = {
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700",
    blue: "from-blue-50 to-blue-100 text-blue-700",
    purple: "from-purple-50 to-purple-100 text-purple-700",
  }

  return (
    <div
      className={`
        rounded-2xl p-6 border border-gray-200 shadow-lg
        bg-gradient-to-br ${styles[accent]}
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl
        ${mounted ? "opacity-100" : "opacity-0"}
      `}
    >
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span
        className={`font-semibold ${
          highlight
            ? "text-emerald-700 text-lg"
            : "text-gray-800"
        }`}
      >
        {value}
      </span>
    </div>
  )
}