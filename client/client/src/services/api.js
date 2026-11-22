const API_BASE = "http://localhost:5000/api/audit";

export async function runAuditAPI(systemPrompt, safetyPolicy) {
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, safetyPolicy }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Audit failed");
  return data;
}

export async function runHardenerAPI(payload) {
  const res = await fetch(`${API_BASE}/harden`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Hardening failed");
  return data;
}