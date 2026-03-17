"use client";
import { useState } from "react";

const SEMAFORO_COLORS = {
  BUILD: { bg: "#00ff87", text: "#0a0a0a", label: "🟢 BUILD" },
  ATTENZIONE: { bg: "#ffb800", text: "#0a0a0a", label: "🟡 ATTENZIONE" },
  "NO-BUILD": { bg: "#ff3b3b", text: "#fff", label: "🔴 NO-BUILD" },
};

function parseOutput(raw) {
  const get = (label) => {
    const regex = new RegExp(`${label}:\\s*([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, "i");
    const m = raw.match(regex);
    return m ? m[1].trim() : null;
  };
  const getList = (label) => {
    const regex = new RegExp(`${label}:[\\s\\S]*?(?=\\n[A-Z_]+:|$)`, "i");
    const block = raw.match(regex);
    if (!block) return [];
    return block[0]
      .split("\n")
      .slice(1)
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-\s*/, "").trim());
  };
  return {
    semaforo: get("SEMAFORO_MVP"),
    motivazione: get("MOTIVAZIONE_SEMAFORO"),
    mvpCore: getList("MVP_CORE"),
    mvpEscludi: getList("MVP_ESCLUDI"),
    agenti: getList("AGENTI_AI"),
    architettura: getList("ARCHITETTURA_STACK"),
    roadmap30: get("ROADMAP_30"),
    roadmap60: get("ROADMAP_60"),
    roadmap90: get("ROADMAP_90"),
    effort: get("EFFORT_FOUNDER"),
    primoPasso: get("PRIMO_PASSO"),
  };
}

export default function App4() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRaw("");
    setChatMessages([]);
    try {
      const res = await fetch("/api/mvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketValidation: input }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) { fullText += parsed.text; setRaw(fullText); }
            } catch {}
          }
        }
      }
      setResult(parseOutput(fullText));
    } catch (e) {
      setError("Errore durante l'analisi. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    try {
      const res = await fetch("/api/mvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketValidation: input, chat: newMessages, previousAnalysis: raw }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setChatMessages([...newMessages, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) { reply += parsed.text; setChatMessages([...newMessages, { role: "assistant", content: reply }]); }
            } catch {}
          }
        }
      }
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Errore. Riprova." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sem = result?.semaforo?.toUpperCase().replace(/-/g, "-");
  const semStyle = sem && SEMAFORO_COLORS[sem] ? SEMAFORO_COLORS[sem] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0f", color: "#e8e6e0", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0c0c0f}::-webkit-scrollbar-thumb{background:#333}
        textarea{resize:vertical}
        .card{background:#14141a;border:1px solid #222;border-radius:2px;padding:24px;margin-bottom:20px}
        .label{font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase;margin-bottom:8px}
        .section-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#e8e6e0;margin-bottom:16px;border-bottom:1px solid #222;padding-bottom:8px}
        .tag{display:inline-block;padding:2px 10px;border:1px solid #333;font-size:11px;letter-spacing:1px;margin:3px;color:#aaa}
        .btn{cursor:pointer;border:none;font-family:'DM Mono',monospace;letter-spacing:2px;font-size:11px;text-transform:uppercase;padding:14px 32px;transition:all 0.2s}
        .btn-primary{background:#e8e6e0;color:#0c0c0f}
        .btn-primary:hover{background:#fff}
        .btn-primary:disabled{background:#333;color:#666;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid #333;color:#aaa;padding:10px 20px}
        .btn-ghost:hover{border-color:#666;color:#e8e6e0}
        .item-row{border-left:2px solid #222;padding:8px 12px;margin:6px 0;font-size:13px;line-height:1.6;color:#c0bdb6}
        .item-row:hover{border-left-color:#e8e6e0;background:#16161c}
        .roadmap-block{background:#0f0f14;border:1px solid #222;padding:16px;margin:8px 0;position:relative;overflow:hidden}
        .roadmap-num{font-family:'Bebas Neue',sans-serif;font-size:48px;color:#1a1a20;position:absolute;right:16px;top:8px}
        .chat-bubble-user{background:#1a1a22;border:1px solid #2a2a35;border-radius:2px;padding:10px 14px;margin:8px 0;font-size:13px;line-height:1.6}
        .chat-bubble-ai{background:#141418;border-left:2px solid #e8e6e0;padding:10px 14px;margin:8px 0;font-size:13px;line-height:1.6;color:#c0bdb6}
        .pulse{animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .fade-in{animation:fadeIn 0.4s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:700px){.grid-2,.grid-3{grid-template-columns:1fr}}
      `}</style>

      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="label">Suite Montemagno — Step 4 di 6</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "4px" }}>MVP DESIGN</div>
          <div style={{ fontSize: "11px", color: "#555", letterSpacing: "1px" }}>Architettura Agenti AI + Roadmap 30/60/90</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[1,2,3,4,5,6].map((n) => (
            <div key={n} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", letterSpacing: "1px", border: `1px solid ${n === 4 ? "#e8e6e0" : "#222"}`, color: n === 4 ? "#e8e6e0" : n < 4 ? "#444" : "#2a2a2a", background: n < 4 ? "#e8e6e010" : "transparent" }}>
              {n}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        <div className="card">
          <div className="label">Input — Output App 3 (Validazione di Mercato)</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Incolla qui l'output completo dell'App 3 (Validazione di Mercato)...\n\nInclude: semaforo, ICP, TAM/SAM/SOM, competitor, WTP, canali, ecc."}
            style={{ width: "100%", minHeight: 160, background: "#0c0c0f", border: "1px solid #222", color: "#e8e6e0", fontFamily: "'DM Mono', monospace", fontSize: "12px", padding: 12, lineHeight: 1.6, outline: "none" }}
          />
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !input.trim()}>
              {loading ? <span className="pulse">— Analisi in corso —</span> : "→ Genera MVP Design"}
            </button>
            {input.trim() && <span style={{ fontSize: "11px", color: "#444" }}>{input.trim().split(/\s+/).length} parole</span>}
          </div>
          {error && <div style={{ marginTop: 12, color: "#ff3b3b", fontSize: 12 }}>{error}</div>}
        </div>

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 4, color: "#444", marginBottom: 8 }} className="pulse">ANALISI MVP IN CORSO</div>
            <div style={{ fontSize: 11, color: "#333", letterSpacing: 2 }}>Architettura agenti + roadmap in generazione...</div>
          </div>
        )}

        {result && (
          <div className="fade-in">
            {semStyle && (
              <div className="card" style={{ background: semStyle.bg, border: "none", display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: semStyle.text, lineHeight: 1 }}>{semStyle.label}</div>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: semStyle.text, opacity: 0.6, marginTop: 4 }}>VERDETTO MVP</div>
                </div>
                {result.motivazione && <div style={{ flex: 1, color: semStyle.text, fontSize: 13, lineHeight: 1.7, maxWidth: 600, paddingTop: 4 }}>{result.motivazione}</div>}
              </div>
            )}

            <div className="grid-2">
              {result.mvpCore?.length > 0 && (
                <div className="card">
                  <div className="section-title">✓ MVP Core</div>
                  <div className="label">Feature essenziali v1</div>
                  {result.mvpCore.map((f, i) => <div key={i} className="item-row">→ {f}</div>)}
                </div>
              )}
              {result.mvpEscludi?.length > 0 && (
                <div className="card">
                  <div className="section-title">✗ Escludi ora</div>
                  <div className="label">Rimanda alla v2+</div>
                  {result.mvpEscludi.map((f, i) => <div key={i} className="item-row" style={{ borderLeftColor: "#333", color: "#666" }}>— {f}</div>)}
                </div>
              )}
            </div>

            {result.agenti?.length > 0 && (
              <div className="card">
                <div className="section-title">⚡ Architettura Agenti AI</div>
                <div className="label">Stack agenti — 95% automazione</div>
                {result.agenti.map((a, i) => {
                  const parts = a.split("|").map(p => p.trim());
                  return (
                    <div key={i} className="item-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ flex: 1 }}>{parts[0]}</span>
                      {parts.slice(1).map((p, j) => <span key={j} className="tag">{p}</span>)}
                    </div>
                  );
                })}
              </div>
            )}

            {result.architettura?.length > 0 && (
              <div className="card">
                <div className="section-title">◈ Stack Tecnico</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {result.architettura.map((s, i) => {
                    const [key, ...rest] = s.split(":").map(p => p.trim());
                    return (
                      <div key={i} style={{ background: "#0f0f14", border: "1px solid #222", padding: "10px 14px", minWidth: 150 }}>
                        <div style={{ fontSize: 9, letterSpacing: 2, color: "#555", marginBottom: 4 }}>{key?.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: "#c0bdb6" }}>{rest.join(": ") || key}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(result.roadmap30 || result.roadmap60 || result.roadmap90) && (
              <div className="card">
                <div className="section-title">◎ Roadmap</div>
                <div className="grid-3">
                  {[["30", result.roadmap30], ["60", result.roadmap60], ["90", result.roadmap90]].map(([days, text]) => text && (
                    <div key={days} className="roadmap-block">
                      <div className="roadmap-num">{days}</div>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#444", marginBottom: 8 }}>GIORNI {days}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#c0bdb6", position: "relative" }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-2">
              {result.effort && (
                <div className="card">
                  <div className="section-title">⏱ Effort Founder</div>
                  <div className="label">Ore/settimana stimate</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: "#c0bdb6", marginTop: 8 }}>{result.effort}</div>
                </div>
              )}
              {result.primoPasso && (
                <div className="card" style={{ border: "1px solid #e8e6e030" }}>
                  <div className="section-title">→ Primo Passo</div>
                  <div className="label">Fai questo domani mattina</div>
                  <div style={{ fontSize: 14, lineHeight: 1.8, color: "#e8e6e0", marginTop: 8 }}>{result.primoPasso}</div>
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: 8 }}>
              <div className="section-title">◈ Approfondisci</div>
              <div className="label">Domande sull'analisi MVP</div>
              {chatMessages.length > 0 && (
                <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 16, paddingRight: 4 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#555", marginBottom: 4 }}>{m.role === "user" ? "YOU" : "AI"}</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{m.content}{m.role === "assistant" && chatLoading && i === chatMessages.length - 1 && <span className="pulse"> ▋</span>}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChat()}
                  placeholder="Es: Come implemento l'agente X? Quale tool uso per Y?"
                  style={{ flex: 1, background: "#0c0c0f", border: "1px solid #222", color: "#e8e6e0", fontFamily: "'DM Mono', monospace", fontSize: 12, padding: "10px 14px", outline: "none" }}
                />
                <button className="btn btn-ghost" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? <span className="pulse">...</span> : "→"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
