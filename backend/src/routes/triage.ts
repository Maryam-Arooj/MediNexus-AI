import { Router } from 'express';
import { triageOptions } from '../triage/triageConfig';
import { isAiEnabled } from '../services/llm';

const r = Router();
// Public, non-sensitive: the symptom/duration lists the rule engine accepts.
r.get('/options', (_req, res) => res.json({ success: true, data: { ...triageOptions(), aiEnabled: isAiEnabled() } }));
export default r;
