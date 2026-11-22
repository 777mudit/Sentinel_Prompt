import { generateTestVectors } from "../services/redTeamService.js";
import { evaluateVectors, calculateSummary } from "../services/judgeService.js";
import { hardenAndVerify } from "../services/hardenerService.js";

export async function runAudit(req, res) {
  try {
    const { systemPrompt, safetyPolicy } = req.body;
    if (!systemPrompt?.trim() || !Array.isArray(safetyPolicy) || safetyPolicy.length === 0) {
      return res.status(400).json({ error: "systemPrompt and at least one safetyPolicy rule are required." });
    }

    const { attacks, benign } = await generateTestVectors(systemPrompt, safetyPolicy);
    const attackLogs = await evaluateVectors(systemPrompt, safetyPolicy, attacks, false);
    const summary = calculateSummary(attackLogs);

    res.json({
      summary,
      attackLogs,
      benignVectors: benign,
    });
  } catch (err) {
    console.error("Audit Error:", err);
    res.status(500).json({ error: err.message || "Failed to run red-team audit." });
  }
}

export async function runHardener(req, res) {
  try {
    const { systemPrompt, safetyPolicy, attackLogs, benignVectors } = req.body;
    if (!systemPrompt || !attackLogs) {
      return res.status(400).json({ error: "Missing audit data for hardening." });
    }

    const result = await hardenAndVerify({
      systemPrompt,
      safetyPolicy,
      attackLogs,
      benignVectors: benignVectors || [],
    });

    res.json(result);
  } catch (err) {
    console.error("Hardener Error:", err);
    res.status(500).json({ error: err.message || "Failed to harden system prompt." });
  }
}