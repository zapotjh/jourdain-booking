"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");

  const pay = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error");
      return;
    }

    window.location.href = data.url;
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Jourdain Booking</h1>

      <div style={{ marginTop: 16 }}>
        <label>Email</label>
        <br />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{ padding: 10, width: 320, marginTop: 8 }}
        />
      </div>

      <button
        onClick={pay}
        style={{ marginTop: 16, padding: "10px 16px" }}
      >
        Pay (test)
      </button>
    </main>
  );
}