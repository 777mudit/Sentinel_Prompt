const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function extractJSON(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBracket = cleaned.indexOf("[");
  const firstBrace = cleaned.indexOf("{");
  const start =
    firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)
      ? firstBracket
      : firstBrace;

  if (start === -1) throw new Error("No JSON found in LLM response");
  const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function callLLM({ systemPrompt = "", userPrompt, jsonMode = false, retries = 3 }) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (provider === "gemini") {
        const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const body = {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          ...(systemPrompt && {
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
          ...(jsonMode && {
            generationConfig: { responseMimeType: "application/json" },
          }),
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.status === 429 && attempt < retries) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (!res.ok) throw new Error(`Gemini API Error (${res.status}): ${await res.text()}`);

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // Default: Groq (OpenAI-compatible)
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: userPrompt });

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages,
            ...(jsonMode && { response_format: { type: "json_object" } }),
          }),
        });

        if (res.status === 429 && attempt < retries) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        if (!res.ok) throw new Error(`Groq API Error (${res.status}): ${await res.text()}`);

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
}