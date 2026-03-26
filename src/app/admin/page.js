"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabaseClient"

function SegmentedWheel({ segments, spinning }) {

  const angle = 360 / segments.length

  return (
    <svg
      viewBox="0 0 100 100"
      className={`
        w-72 h-72
        transition-transform duration-[2500ms] ease-out
        ${spinning ? "rotate-[1440deg]" : ""}
      `}
      style={{ transformOrigin: "50% 50%" }}
    >

      {/* OUTER RING */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="#ECFDF5"
        stroke="#059669"
        strokeWidth="4"
      />

      {segments.map((label, i) => {

        const startAngle = i * angle - 90
        const endAngle = startAngle + angle

        const startRad = (Math.PI / 180) * startAngle
        const endRad = (Math.PI / 180) * endAngle

        const x1 = 50 + 48 * Math.cos(startRad)
        const y1 = 50 + 48 * Math.sin(startRad)

        const x2 = 50 + 48 * Math.cos(endRad)
        const y2 = 50 + 48 * Math.sin(endRad)

        const largeArc = angle > 180 ? 1 : 0

        const path = `
          M 50 50
          L ${x1} ${y1}
          A 48 48 0 ${largeArc} 1 ${x2} ${y2}
          Z
        `

        return (
          <g key={i}>

            {/* SEGMENT */}
            <path
              d={path}
              fill={i % 2 ? "#A7F3D0" : "#D1FAE5"}
              stroke="#10B981"
              strokeWidth="0.5"
            />

            {/* LABEL */}
            {(() => {

            const midAngle = startAngle + angle / 2
            const rad = (Math.PI / 180) * midAngle

            const labelRadius = 30   // distance from center

            const lx = 50 + labelRadius * Math.cos(rad)
            const ly = 50 + labelRadius * Math.sin(rad)

            return (
                <text
                x={lx}
                y={ly}
                fill="#065F46"
                fontSize="4.2"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${midAngle} ${lx} ${ly})`}
                >
                {label}
                </text>
            )
            })()}

          </g>
        )
      })}

    </svg>
  )
}

export default function AdminPanel() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("users")

  // =========================================================
  // USERS DATA
  // =========================================================

  const [users, setUsers] = useState([])

  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase()
    return (
      (u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s)) &&
      (planFilter === "all" || u.plan === planFilter)
    )
  })

  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [editUser, setEditUser] = useState({
    name: "",
    email: "",
    role: "user",
  })
  const [showScores, setShowScores] = useState(false)

  // =========================================================
  // CHARITIES DATA
  // =========================================================

  const [charities, setCharities] = useState([])

  const [showAddCharity, setShowAddCharity] = useState(false)
  const [showEditCharity, setShowEditCharity] = useState(false)
  const [selectedCharity, setSelectedCharity] = useState(null)

  const [charityForm, setCharityForm] = useState({
    name: "",
    url: "",
    purpose: "",
  })

  // =========================================================
  // DRAW MANAGEMENT
  // =========================================================

  const [spinning, setSpinning] = useState(false)
  const [drawNumbers, setDrawNumbers] = useState([])
  const [drawMode, setDrawMode] = useState("random")

  const wheelSegments = [
  "01–05",
  "06–10",
  "11–15",
  "16–20",
  "21–25",
  "26–30",
  "31–35",
  "36–40",
  "41–45",
  ]

  // =========================================================
  // WINNERS DATA
  // =========================================================
  const [winners, setWinners] = useState([])

  // =========================================================
  // PAYOUT MODAL STATE
  // =========================================================
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [entryScores, setEntryScores] = useState([])

  // =========================================================
  // AUTH GUARD
  // =========================================================

  useEffect(() => {
  async function checkAdmin() {
    const { data: auth } = await supabase.auth.getUser()

    if (!auth?.user) {
      router.push("/login")
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      router.push("/dashboard")
    }
  }

  checkAdmin()
}, [router])

// Loading User Data
useEffect(() => {
  async function loadUsers() {

    const { data: userRows } = await supabase
      .from("users")
      .select("*")

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")

    const { data: scores } = await supabase
      .from("scores")
      .select("*")

    // Merge related data for display
    const merged = userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || "user",
      plan:
        subs.find((s) => s.user_id === u.id)?.plan || "none",
      scores:
        scores
          .filter((s) => s.user_id === u.id)
          .map((s) => s.score) || [],
    }))

    setUsers(merged)
  }

  loadUsers()
}, [])

// Loading Charity Data
useEffect(() => {
  async function loadCharities() {

    const { data: charityRows } = await supabase
      .from("charities")
      .select("*")

    const { data: uc } = await supabase
      .from("user_charities")
      .select("*")

    const formatted = charityRows.map((c) => ({
      id: c.id,
      name: c.name,
      url: c.website,
      purpose: c.purpose,
      contributors:
        uc.filter((u) => u.charity_id === c.id).length,
      funds: 0, // Replace later if tracking donations
    }))

    setCharities(formatted)
  }

  loadCharities()
}, [])

//Loading Winner's Data
useEffect(() => {
  async function loadWinners() {

    const { data } = await supabase
      .from("winners")
      .select(`
        id,
        amount,
        tier,
        status,
        users ( name )
      `)
      .order("created_at", { ascending: false })

    const formatted = data.map((w) => ({
      id: w.id,
      name: w.users?.name || "Unknown",
      amount: `$${w.amount}`,
      tier: w.tier,
      status: w.status,
    }))

    setWinners(formatted)
  }

  loadWinners()
}, [])

  // =========================================================
  // USER ACTIONS
  // =========================================================

    function openDetails(user) {
    setSelectedUser(user)

    setEditUser({
        name: user.name,
        email: user.email,
        role: user.role,
    })

    setShowDetails(true)
    }

  function openScores(user) {
    setSelectedUser({ ...user })
    setShowScores(true)
  }

  function saveDetails() {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? selectedUser : u
      )
    )
    setShowDetails(false)
  }

  function saveScores() {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? selectedUser : u
      )
    )
    setShowScores(false)
  }

  async function saveUserChanges() {

  if (!selectedUser) return

  await supabase
    .from("users")
    .update({
      name: editUser.name,
      email: editUser.email,
      role: editUser.role,
    })
    .eq("id", selectedUser.id)

  // Update UI list
  setUsers((prev) =>
    prev.map((u) =>
      u.id === selectedUser.id
        ? { ...u, ...editUser }
        : u
    )
  )

  setShowDetails(false)
}

  // =========================================================
  // CHARITY ACTIONS
  // =========================================================

    async function addCharity() {
    const { data } = await supabase
        .from("charities")
        .insert({
        name: charityForm.name,
        website: charityForm.url,
        purpose: charityForm.purpose,
        })
        .select()
        .single()

    setCharities([
        ...charities,
        {
        id: data.id,
        name: data.name,
        url: data.website,
        purpose: data.purpose,
        contributors: 0,
        funds: 0,
        },
    ])

    setShowAddCharity(false)
    }

  function openEditCharity(c) {
    setSelectedCharity(c)
    setCharityForm({
      name: c.name,
      url: c.url,
      purpose: c.purpose,
    })
    setShowEditCharity(true)
  }

    async function saveCharityEdit() {

  if (!selectedCharity) return   // ⭐ FIX

  await supabase
    .from("charities")
    .update({
      name: charityForm.name,
      website: charityForm.url,
      purpose: charityForm.purpose,
    })
    .eq("id", selectedCharity.id)

  setCharities((prev) =>
    prev.map((c) =>
      c.id === selectedCharity.id
        ? { ...c, ...charityForm }
        : c
    )
  )

  setShowEditCharity(false)
}

    async function deleteCharity(id) {

    await supabase
        .from("charities")
        .delete()
        .eq("id", id)

    setCharities(charities.filter((c) => c.id !== id))
    }

    async function spinDraw() {

        if (drawNumbers.length >= 5) return

        setSpinning(true)

        await new Promise((r) => setTimeout(r, 2500))

        let winningNumber

        // ================= RANDOM MODE =================
        if (drawMode === "random") {

            const bucketIndex =
            Math.floor(Math.random() * wheelSegments.length)

            const [min, max] =
            wheelSegments[bucketIndex].split("–").map(Number)

            do {
            winningNumber =
                Math.floor(Math.random() * (max - min + 1)) + min
            } while (drawNumbers.includes(winningNumber))

        }

        // ================= ALGORITHM MODE =================
        else {

            // Example algorithm:
            // Choose number not used recently + balanced range

            const available = []

            for (let i = 1; i <= 45; i++) {
            if (!drawNumbers.includes(i)) {
                available.push(i)
            }
            }

            // Example: pick middle-range numbers more often
            const weighted = available.filter(
            (n) => n >= 10 && n <= 35
            )

            const pool =
            weighted.length > 0 ? weighted : available

            winningNumber =
            pool[Math.floor(Math.random() * pool.length)]
        }

        setDrawNumbers((prev) => [...prev, winningNumber])
        setSpinning(false)
        }

    function resetDraw() {
    setDrawNumbers([])
    }

    async function saveDraw() {

    if (drawNumbers.length === 0) return

    await supabase.from("draws").insert({
        numbers: drawNumbers,
        month: new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
        }),
        published: true,
    })

    alert("Draw saved successfully!")
    }

    async function openVerifyPay(winner) {

        setSelectedWinner(winner)

        // ⭐ Get auth user id of winner
        const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .eq("name", winner.name)
            .single()

        if (!userRow) return

        // ⭐ Get latest draw entry snapshot
        const { data: entry } = await supabase
            .from("draw_entries")
            .select("scores")
            .eq("user_id", userRow.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

        if (entry) {
            setEntryScores(entry.scores)
        }

        setShowPayModal(true)
    }

    async function proceedToPay() {

        if (!selectedWinner) return

        await supabase
            .from("winners")
            .update({ status: "Paid" })
            .eq("id", selectedWinner.id)

        // Update UI
        setWinners((prev) =>
            prev.map((w) =>
            w.id === selectedWinner.id
                ? { ...w, status: "Paid" }
                : w
            )
        )

        setShowPayModal(false)

        alert("Payment completed successfully")
    }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-[#F6F8F7] flex text-gray-900">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-white border-r p-6 space-y-3">
        <h2 className="text-xl font-bold mb-6 text-black">
          Admin Panel
        </h2>

        <NavItem id="users" label="Users" {...{ activeTab, setActiveTab }} />
        <NavItem id="charity" label="Charities" {...{ activeTab, setActiveTab }} />
        <NavItem id="draws" label="Draw Management" {...{ activeTab, setActiveTab }} />
        <NavItem id="winners" label="Winners" {...{ activeTab, setActiveTab }} />
        <NavItem id="reports" label="Reports" {...{ activeTab, setActiveTab }} />
      </aside>

      {/* ================= CONTENT ================= */}
      <section className="flex-1 p-10 space-y-8">

        {/* ================= USERS ================= */}
        {activeTab === "users" && (
          <>
            <h1 className="text-3xl font-bold text-black">
              User Management
            </h1>

            <div className="flex gap-4">
              <input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-4 py-2 rounded-lg"
              />

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                <option value="all">All Plans</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">

              <table className="w-full">

                <thead className="bg-gray-50">
                    <tr>

                        <th className="px-6 py-3 text-center text-sm font-semibold text-black">
                        Name
                        </th>

                        <th className="px-6 py-3 text-center text-sm font-semibold text-black">
                        Email
                        </th>

                        <th className="px-6 py-3 text-center text-sm font-semibold text-black">
                        Plan
                        </th>

                        <th className="px-6 py-3 text-center text-sm font-semibold text-black">
                        Role
                        </th>

                        <th className="px-6 py-3 text-center text-sm font-semibold text-black">
                        Actions
                        </th>

                    </tr>
                </thead>

               <tbody>
                    {filteredUsers.map((u) => (
                        <tr
                        key={u.id}
                        className="border-t hover:bg-gray-50 transition"
                        >

                        {/* NAME */}
                        <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-3">

                            <div className="
                                w-10 h-10 rounded-full
                                bg-emerald-100
                                flex items-center justify-center
                                font-semibold text-emerald-700
                            ">
                                {u.name.charAt(0)}
                            </div>

                            <span className="font-medium text-black">
                                {u.name}
                            </span>

                            </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-6 py-4 text-center align-middle text-gray-700">
                            {u.email}
                        </td>

                        {/* PLAN */}
                        <td className="px-6 py-4 text-center align-middle">
                            <span className="
                            bg-blue-100 text-blue-700
                            px-3 py-1 rounded-full
                            text-sm font-medium capitalize
                            ">
                            {u.plan}
                            </span>
                        </td>

                        {/* ROLE */}
                        <td className="px-6 py-4 text-center align-middle">
                            <span
                            className={`
                                px-3 py-1 rounded-full text-sm font-medium
                                ${
                                u.role === "admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                                }
                            `}
                            >
                            {u.role}
                            </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-center align-middle">
                            <div className="flex justify-center gap-2">

                            <button
                                onClick={() => openDetails(u)}
                                className="
                                px-3 py-1 bg-gray-100
                                rounded-md hover:bg-gray-200
                                text-sm font-medium
                                "
                            >
                                Details
                            </button>

                            <button
                                onClick={() => openScores(u)}
                                className="
                                px-3 py-1 bg-emerald-100
                                text-emerald-700 rounded-md
                                hover:bg-emerald-200
                                text-sm font-medium
                                "
                            >
                                Scores
                            </button>

                            </div>
                        </td>

                        </tr>
                    ))}
                </tbody>

              </table>

            </div>
          </>
        )}

        {/* ================= CHARITIES ================= */}
        {activeTab === "charity" && (
          <>
            <h1 className="text-3xl font-bold text-black">
              Charity Management
            </h1>

            <button
              onClick={() => setShowAddCharity(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
            >
              Add Charity
            </button>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {charities.map((c) => (
            <div
                key={c.id}
                className="
                bg-white rounded-2xl p-6
                border border-gray-200
                shadow-sm hover:shadow-xl
                transition-all duration-300
                flex flex-col justify-between
                "
            >

                {/* HEADER */}
                <div className="space-y-2">

                <h3 className="text-xl font-semibold text-gray-900">
                    {c.name}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed">
                    {c.purpose}
                </p>

                <a
                    href={c.url}
                    target="_blank"
                    className="
                    text-emerald-600 text-sm font-medium
                    hover:underline
                    "
                >
                    Visit Website →
                </a>

                </div>

                {/* METRICS */}
                <div className="flex justify-between mt-6 text-center">

                <div>
                    <p className="text-lg font-bold text-gray-900">
                    {c.contributors}
                    </p>
                    <p className="text-xs text-gray-500">
                    Contributors
                    </p>
                </div>

                <div>
                    <p className="text-lg font-bold text-emerald-700">
                    ₹{c.funds}
                    </p>
                    <p className="text-xs text-gray-500">
                    Funds Raised
                    </p>
                </div>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 mt-6">

                <button
                    onClick={() => openEditCharity(c)}
                    className="
                    flex-1 bg-emerald-600 text-white
                    py-2 rounded-lg font-semibold
                    hover:bg-emerald-700 transition
                    "
                >
                    Edit
                </button>

                <button
                    onClick={() => deleteCharity(c.id)}
                    className="
                    flex-1 border border-red-500
                    text-red-600 py-2 rounded-lg
                    font-semibold hover:bg-red-50 transition
                    "
                >
                    Delete
                </button>

                </div>

            </div>
            ))}

            </div>
          </>
        )}

        {/* ================= DRAW MANAGEMENT ================= */}
        {activeTab === "draws" && (
        <>
            <h1 className="text-3xl font-bold text-black">
            Draw Management
            </h1>

            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-10 text-center">

                {/* ===== DRAW MODE TOGGLE ===== */}
                <div className="flex justify-center items-center gap-4">

                <span
                    className={`font-semibold ${
                    drawMode === "random"
                        ? "text-emerald-700"
                        : "text-gray-400"
                    }`}
                >
                    Random
                </span>

                <button
                    onClick={() =>
                    setDrawMode(
                        drawMode === "random" ? "algorithm" : "random"
                    )
                    }
                    className={`
                    relative w-14 h-7 rounded-full
                    transition
                    ${
                        drawMode === "algorithm"
                        ? "bg-blue-600"
                        : "bg-emerald-500"
                    }
                    `}
                >
                    <div
                    className={`
                        absolute top-1 left-1 w-5 h-5 bg-white rounded-full
                        shadow transition
                        ${
                        drawMode === "algorithm"
                            ? "translate-x-7"
                            : ""
                        }
                    `}
                    />
                </button>

                <span
                    className={`font-semibold ${
                    drawMode === "algorithm"
                        ? "text-blue-700"
                        : "text-gray-400"
                    }`}
                >
                    Algorithm
                </span>

                </div>

            {/* ===== WHEEL AREA ===== */}
            <div className="flex justify-center">

                <div className="relative">

                {/* POINTER */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-red-500 text-3xl z-20 drop-shadow">
                    ▼
                </div>

                {/* WHEEL */}
                <div
                    className={`
                    rounded-full
                    border-[10px] border-emerald-600
                    shadow-2xl
                    bg-white
                    ${spinning ? "animate-spin" : ""}
                    `}
                >
                    <SegmentedWheel
                    segments={wheelSegments}
                    spinning={spinning}
                    />
                </div>

                </div>

            </div>

            {/* ===== BUTTONS ===== */}
            <div className="flex justify-center gap-4 flex-wrap">

                {/* SPIN */}
                <button
                onClick={spinDraw}
                disabled={spinning || drawNumbers.length >= 5}
                className="
                    bg-emerald-600 text-white px-6 py-3 rounded-lg
                    text-lg font-semibold hover:bg-emerald-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                "
                >
                {spinning
                    ? "Spinning..."
                    : drawNumbers.length >= 5
                    ? "Draw Complete"
                    : "Spin Draw"}
                </button>

                {/* SAVE */}
                <button
                onClick={saveDraw}
                disabled={drawNumbers.length === 0}
                className="
                    bg-blue-600 text-white px-6 py-3 rounded-lg
                    text-lg font-semibold hover:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                "
                >
                Save Draw
                </button>

                {/* RESET */}
                <button
                onClick={resetDraw}
                disabled={drawNumbers.length === 0}
                className="
                    bg-gray-500 text-white px-6 py-3 rounded-lg
                    text-lg font-semibold hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                "
                >
                Reset
                </button>

            </div>

            {/* ===== RESULT ===== */}
            {drawNumbers.length > 0 && (
                <div className="pt-4">

                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Drawn Numbers
                </h3>

                <div className="flex justify-center gap-4 flex-wrap">

                    {drawNumbers.map((n, i) => (
                    <div
                        key={i}
                        className="
                        w-16 h-16 rounded-full
                        bg-gradient-to-br from-emerald-200 to-emerald-100
                        border-2 border-emerald-500
                        flex items-center justify-center
                        text-xl font-bold text-emerald-800
                        shadow-lg
                        "
                    >
                        {n}
                    </div>
                    ))}

                </div>

                {/* PROGRESS MESSAGE */}
                {drawNumbers.length < 5 && (
                    <p className="text-sm text-gray-500 mt-4">
                    Spin to generate {5 - drawNumbers.length} more number
                    {5 - drawNumbers.length !== 1 && "s"}
                    </p>
                )}

                </div>
            )}

            </div>
        </>
        )}
        {/* ================= WINNERS ================= */}
        {activeTab === "winners" && (
          <>
            <h1 className="text-3xl font-bold text-black">
              Winners Management
            </h1>

            {winners.map((w) => (
                <WinnerRow
                    key={w.id}
                    name={w.name}
                    amount={w.amount}
                    tier={w.tier}
                    status={w.status}
                    onVerify={() => openVerifyPay(w)}
                />
            ))}
          </>
        )}

        {/* ================= REPORTS ================= */}
        {activeTab === "reports" && (
          <>
            <h1 className="text-3xl font-bold text-black">
              Reports & Analytics
            </h1>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ReportCard title="Total Users" value="1,245" />
              <ReportCard title="Active Subscriptions" value="1,102" />
              <ReportCard title="Prize Pool" value="$52,000" />
              <ReportCard title="Charity Contributions" value="$18,300" />
            </div>
          </>
        )}

      </section>

      {/* ================= MODALS ================= */}

      {showAddCharity && (
        <Modal onClose={() => setShowAddCharity(false)}>
          <CharityForm
            title="Add Charity"
            form={charityForm}
            setForm={setCharityForm}
            onSubmit={addCharity}
          />
        </Modal>
      )}

      {showEditCharity && (
        <Modal onClose={() => setShowEditCharity(false)}>
          <CharityForm
            title="Edit Charity"
            form={charityForm}
            setForm={setCharityForm}
            onSubmit={saveCharityEdit}
          />
        </Modal>
      )}

      {showDetails && selectedUser && (
        <Modal onClose={() => setShowDetails(false)}>

            <h2 className="text-xl font-semibold mb-6 text-black">
            Edit User Details
            </h2>

            <div className="space-y-4">

            {/* NAME */}
            <div>
                <label className="block text-sm font-medium text-black mb-1">
                Name
                </label>

                <input
                type="text"
                value={editUser.name}
                onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-gray-700"
                />
            </div>

            {/* EMAIL */}
            <div>
                <label className="block text-sm font-medium text-black mb-1">
                Email
                </label>

                <input
                type="email"
                value={editUser.email}
                onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-gray-700"
                />
            </div>

            {/* ROLE */}
            <div>
                <label className="block text-sm font-medium text-black mb-1">
                Role
                </label>

                <select
                value={editUser.role}
                onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-gray-700"
                >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                </select>
            </div>

            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 mt-6">

            <button
                onClick={saveUserChanges}
                className="
                flex-1 bg-emerald-600 text-white
                py-2 rounded-lg font-semibold
                hover:bg-emerald-700
                "
            >
                Save Changes
            </button>

            <button
                onClick={() => setShowDetails(false)}
                className="
                flex-1 border border-gray-400
                py-2 rounded-lg font-semibold
                "
            >
                Cancel
            </button>

            </div>

        </Modal>
        )}

    {showScores && selectedUser && (
        <Modal onClose={() => setShowScores(false)}>

            <h2 className="text-xl font-semibold mb-4 text-black">
            User Scores
            </h2>

            {selectedUser.scores?.length > 0 ? (
            <div className="space-y-2">

                {selectedUser.scores.map((s, i) => (
                <div
                    key={i}
                    className="
                    bg-emerald-100 text-emerald-700
                    px-4 py-2 rounded
                    text-center font-semibold
                    "
                >
                    {s}
                </div>
                ))}

            </div>
            ) : (
            <p className="text-gray-500">
                No scores submitted
            </p>
            )}

            <button
            onClick={saveScores}
            className="mt-6 bg-emerald-600 text-white px-4 py-2 rounded"
            >
            Close
            </button>

        </Modal>
        )}

        {showPayModal && selectedWinner && (
            <Modal onClose={() => setShowPayModal(false)}>

                <h2 className="text-xl font-semibold mb-4 text-black">
                Verify Prize Payment
                </h2>

                <p className="mb-2">
                <strong>Winner:</strong> {selectedWinner.name}
                </p>

                <p className="mb-4">
                <strong>Prize:</strong> {selectedWinner.amount}
                </p>

                <p className="font-medium mb-2">
                Submitted Scores
                </p>

                <div className="flex gap-2 justify-center mb-6">

                {entryScores.map((n, i) => (
                    <div
                    key={i}
                    className="
                        w-12 h-12 rounded-full
                        bg-emerald-100 text-emerald-700
                        flex items-center justify-center
                        font-semibold
                    "
                    >
                    {n}
                    </div>
                ))}

                </div>

                <button
                onClick={proceedToPay}
                className="
                    w-full bg-emerald-600 text-white
                    py-2 rounded-lg font-semibold
                    hover:bg-emerald-700
                "
                >
                Proceed to Pay
                </button>

            </Modal>
        )}

    </main>
  )
}

//
// COMPONENTS
//

function NavItem({ id, label, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left px-3 py-2 rounded-lg ${
        activeTab === id
          ? "bg-emerald-100 font-semibold"
          : "hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  )
}

function WinnerRow({ name, amount, tier, status, onVerify }) {

  const isPaid = status === "Paid"

  return (
    <div
      className="
        group bg-white rounded-2xl p-6
        border border-gray-200
        shadow-sm hover:shadow-xl
        transition-all duration-300
        flex justify-between items-center
      "
    >

      {/* LEFT — USER INFO */}
      <div className="space-y-1">

        <p className="text-lg font-semibold text-gray-900">
          {name}
        </p>

        <p className="text-sm text-gray-500">
          {tier} Prize
        </p>

      </div>

      {/* RIGHT — AMOUNT + STATUS */}
      <div className="text-right space-y-2">

        <p className="text-2xl font-bold text-emerald-700">
          {amount}
        </p>

        <span
          className={`
            inline-block text-xs px-3 py-1
            rounded-full font-medium
            ${
              isPaid
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }
          `}
        >
          {status}
        </span>

        {/* ACTION BUTTON */}
        {!isPaid && (
          <button
            onClick={onVerify}
            className="
              mt-2 bg-emerald-600 text-white
              px-4 py-2 rounded-lg text-sm
              font-semibold
              shadow hover:bg-emerald-700
              transition
            "
          >
            Verify & Pay
          </button>
        )}

      </div>

    </div>
  )
}

function ReportCard({ title, value }) {
  return (
    <div
      className="
        relative bg-white rounded-2xl p-6
        border border-gray-200
        shadow-md
        hover:shadow-xl hover:-translate-y-1
        transition-all duration-300
        overflow-hidden
      "
    >

      {/* Accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-70" />

      <div className="relative">

        <p className="text-sm text-gray-500">
          {title}
        </p>

        <p className="text-3xl font-bold text-black mt-2">
          {value}
        </p>

      </div>

    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function CharityForm({ title, form, setForm, onSubmit }) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 text-black">
        {title}
      </h2>

      <input
        placeholder="Charity Name"
        className="border w-full mb-2 p-2 rounded"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
      />

      <input
        placeholder="Official Website URL"
        className="border w-full mb-2 p-2 rounded"
        value={form.url}
        onChange={(e) =>
          setForm({ ...form, url: e.target.value })
        }
      />

      <textarea
        placeholder="Purpose"
        className="border w-full mb-4 p-2 rounded"
        value={form.purpose}
        onChange={(e) =>
          setForm({ ...form, purpose: e.target.value })
        }
      />

      <button
        onClick={onSubmit}
        className="bg-emerald-600 text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </>
  )
}