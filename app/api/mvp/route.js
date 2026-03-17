import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FOUNDER_PROFILE = `
PROFILO FOUNDER:
- Background: Tech/Dev + Giornalismo/Media + 15+ anni workflow broadcaster TV
- Solo, nessun dev, budget €5k iniziale, AI agents al 95%, 5% lavoro manuale
- Obiettivo: lifestyle business, no investitori, no scala enterprise
- Mercati: Francia (TF1, M6, France TV, Arte, Canal+), Italia (RAI, Mediaset), Europa
- Clienti target: Creator, Freelancer video, Consumer B2C
- Stack preferito: Next.js, Vercel, Anthropic API, tool no-code/low-code dove possibile
`;

const SYSTEM_PROMPT = `Sei un esperto di product design e architettura AI-first. Aiuti founder solo (senza team dev) a progettare MVP minimali, gestibili al 95% da agenti AI.

${FOUNDER_PROFILE}

Quando analizzi una validazione di mercato, rispondi SEMPRE con questo formato esatto, usando queste label esatte:

SEMAFORO_MVP: [BUILD / ATTENZIONE / NO-BUILD]
MOTIVAZIONE_SEMAFORO: [Spiegazione in 2-3 frasi del verdetto. Sii diretto e concreto.]

MVP_CORE:
- [Feature 1 essenziale — quella senza cui il prodotto non esiste]
- [Feature 2 essenziale]
- [Feature 3 essenziale — max 5 feature totali]

MVP_ESCLUDI:
- [Feature da rimandare alla v2 — con motivazione breve]
- [Feature da rimandare alla v2]

AGENTI_AI:
- [Nome agente]: [Cosa fa in modo specifico] | Tool: [tool specifico es. Claude API, Make.com, n8n, Zapier, Airtable] | Trigger: [evento che lo attiva]
- [ripeti per ogni agente — almeno 4, max 8]

ARCHITETTURA_STACK:
- Frontend: [tecnologia specifica]
- Backend/API: [tecnologia specifica]
- AI layer: [modelli e tool AI specifici]
- Database: [tecnologia specifica]
- Automazione: [tool automazione specifici]
- Pagamenti: [se rilevante]

ROADMAP_30: [Cosa costruire nei primi 30 giorni — sii specifico sulle milestone]
ROADMAP_60: [Cosa aggiungere tra 30 e 60 giorni — focus su acquisizione primi clienti]
ROADMAP_90: [Cosa avere a 90 giorni — primo revenue, metriche chiave]

EFFORT_FOUNDER: [Stima ore/settimana suddivise per attività: es. "Totale: 15h/sett — Setup agenti: 6h, Contenuto/Marketing: 4h, Clienti: 3h, Monitoring: 2h"]

PRIMO_PASSO: [La singola azione concreta da fare domani mattina, con tool specifico e tempo stimato]

Sii concreto, usa nomi di tool reali, evita generalità. Pensa da founder solo con budget limitato.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { marketValidation, chat, previousAnalysis } = body;

    let messages;

    if (chat && chat.length > 0) {
      messages = [
        {
          role: "user",
          content: `Contesto: analisi di mercato originale:\n\n${marketValidation}\n\nAnalisi MVP già generata:\n\n${previousAnalysis || ""}`,
        },
        {
          role: "assistant",
          content: "Ho analizzato la validazione di mercato e generato il design MVP. Sono pronto a rispondere alle tue domande.",
        },
        ...chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: chat[chat.length - 1].content },
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `Analizza questa validazione di mercato e genera il design MVP completo seguendo esattamente il formato richiesto.\n\nVALIDAZIONE DI MERCATO:\n${marketValidation}`,
        },
      ];
    }

    const stream = await client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              const data = JSON.stringify({ text: chunk.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
