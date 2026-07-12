"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RoomPage() {
  const params = useParams();
  const [typing, setTyping] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/typing/${params.id}`
    );

    ws.onmessage = (e) => {
      if (e.data.startsWith("typing:")) {
        setTyping(e.data.replace("typing:", ""));
        setTimeout(() => setTyping(null), 1200);
      }
    };

    return () => ws.close();
  }, [params.id]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* LEFT */}
      <aside style={{ width: 220, borderRight: "1px solid #eee", padding: 16 }}>
        <b>Live Topics</b>
        <ul>
          <li>MacBook battery</li>
          <li>Startup funding</li>
          <li>AI agents</li>
        </ul>
      </aside>

      {/* CENTER */}
      <main style={{ flex: 1, padding: 24 }}>
        <h2>Room: {params.id}</h2>

        <div style={{ border: "1px solid #ddd", height: "70vh", padding: 12 }}>
          {typing && (
            <div style={{ fontSize: 12, color: "#666" }}>
              Someone is typing…
            </div>
          )}
        </div>
      </main>

      {/* RIGHT */}
      <aside style={{ width: 260, borderLeft: "1px solid #eee", padding: 16 }}>
        <b>Promoted</b>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Brand: Laptop Care<br />
          Signal: Battery anxiety ↑
        </div>
      </aside>
    </div>
  );
}
