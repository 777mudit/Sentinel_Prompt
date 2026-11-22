import express from "express";
import { runAudit, runHardener } from "../controllers/auditController.js";

const router = express.Router();
router.post("/run", runAudit);
router.post("/harden", runHardener);

export default router;