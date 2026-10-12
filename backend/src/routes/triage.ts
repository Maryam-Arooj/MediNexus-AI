import { Router } from 'express';
import { triageOptions } from '../triage/triageConfig';

const r = Router();
// Public, non-sensitive: the symptom/duration lists the rule engine accepts.
r.get('/options', (_req, res) => res.json({ success: true, data: triageOptions() }));
export default r;
