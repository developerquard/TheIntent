"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/typing/global");

    ws.onmessage = (e) => {
      if (e.data.startsWith("typing:")) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1200);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* LEFT */}
      <aside style={{ width: 220, borderRight: "1px solid #ddd", padding: 16 }}>
        <b>Live Topics</b>
        <ul>
          <li>MacBook battery</li>
          <li>Startup funding</li>
          <li>AI agents</li>
        </ul>
      </aside>

      {/* CENTER */}
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Social Discovery — Live</h2>
        <div style={{ border: "1px solid #ccc", height: "70vh", padding: 12 }}>
          {typing && (
            <div style={{ fontSize: 12, color: "#666" }}>
              Someone is typing…
            </div>
          )}
        </div>
      </main>

      {/* RIGHT */}
      <aside style={{ width: 260, borderLeft: "1px solid #ddd", padding: 16 }}>
        <b>Promoted</b>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Brand: Laptop Care<br />
          Signal: Battery anxiety ↑
        </div>
      </aside>
    </div>
  );
}
