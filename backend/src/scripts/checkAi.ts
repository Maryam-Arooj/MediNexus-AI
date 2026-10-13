/**
 * Live Gemini check:  npm run ai:check
 * Sends ONE real request in the exact format the app uses (system instruction + JSON response schema)
 * through the app's own client (src/services/llm.ts). The API key is never printed.
 * Exit code 0 = live AI works; 1 = it does not (the reason is printed).
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env' });
import { getAiConfig } from '../config/env';
import { generateJson } from '../services/llm';

async function rawProbe(base: string, model: string, key: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: controller.signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }] }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: { status?: string; message?: string } };
    const msg = body.error ? ` ${body.error.status ?? ''}: ${(body.error.message ?? '').split(key).join('[key]').slice(0, 200)}` : '';
    return `HTTP ${res.status}${msg}`;
  } catch (e) {
    if (controller.signal.aborted) return `timeout (no answer within ${timeoutMs / 1000} s)`;
    return `network error (${(e as Error).message})`;
  } finally {
    clearTimeout(timer);
  }
}

const BENCH_TIMEOUT_MS = 30000;

/** One app-format request (same body as src/services/llm.ts), no retries, no fallback. */
async function benchRun(base: string, model: string, key: string): Promise<{ ok: boolean; status: string; seconds: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BENCH_TIMEOUT_MS);
  const t0 = Date.now();
  const seconds = () => (Date.now() - t0) / 1000;
  try {
    const res = await fetch(`${base}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a connectivity test. Answer exactly as instructed.' }] },
        contents: [{ role: 'user', parts: [{ text: 'Return status "OK".' }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { status: { type: 'STRING' } }, required: ['status'] },
        },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    if (!res.ok) return { ok: false, status: `HTTP ${res.status}`, seconds: seconds() };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      JSON.parse(text);
      return { ok: true, status: 'HTTP 200', seconds: seconds() };
    } catch {
      return { ok: false, status: 'HTTP 200 (no valid JSON)', seconds: seconds() };
    }
  } catch {
    return { ok: false, status: controller.signal.aborted ? 'timeout' : 'network error', seconds: seconds() };
  } finally {
    clearTimeout(timer);
  }
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function bench(base: string, key: string, models: string[], runs: number) {
  console.log(`\nBenchmark: app-format request, ${runs} run(s) per model, ${BENCH_TIMEOUT_MS / 1000} s timeout, no retries, no fallback\n`);
  const rows: string[] = [];
  for (const m of models) {
    const results: { ok: boolean; status: string; seconds: number }[] = [];
    for (let i = 0; i < runs; i++) {
      const r = await benchRun(base, m, key);
      results.push(r);
      console.log(`   ${m} run ${i + 1}: ${r.status} (${r.seconds.toFixed(1)} s)`);
    }
    const ok = results.filter((r) => r.ok);
    const med = median(ok.map((r) => r.seconds));
    rows.push(
      `| ${m} | ${ok.length}/${runs} | ${results.map((r) => `${r.status} ${r.seconds.toFixed(1)}s`).join('; ')} | ${med === null ? '-' : med.toFixed(1)} |`
    );
  }
  console.log('\n| Model | Success | Runs (status, time) | Median s (successful runs) |');
  console.log('|---|---|---|---|');
  for (const row of rows) console.log(row);
}

async function main() {
  const cfg = getAiConfig();
  if (!cfg.apiKey) {
    console.log('FAIL: GEMINI_API_KEY is empty in backend/.env — AI features are switched off.');
    process.exit(1);
  }
  console.log(`Key: present (${cfg.apiKey.length} chars)`);

  const args = process.argv.slice(2);
  const benchIdx = args.indexOf('--bench');
  if (benchIdx !== -1) {
    const models = (args[benchIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const runsIdx = args.indexOf('--runs');
    const runs = runsIdx !== -1 ? parseInt(args[runsIdx + 1] ?? '', 10) || 1 : 1;
    if (models.length === 0) {
      console.log('Usage: npx ts-node src/scripts/checkAi.ts --bench model1,model2 [--runs N]');
      process.exit(1);
    }
    console.log(`Endpoint: ${cfg.apiBase}`);
    await bench(cfg.apiBase, cfg.apiKey, models, runs);
    return;
  }
  console.log(`Model: ${cfg.model}   Fallback: ${cfg.fallbackModel ?? '(none)'}`);
  console.log(`Endpoint: ${cfg.apiBase}`);

  console.log('\n1) Raw request per model:');
  for (const m of [cfg.model, cfg.fallbackModel].filter(Boolean) as string[]) {
    const t0 = Date.now();
    const r = await rawProbe(cfg.apiBase, m, cfg.apiKey, cfg.timeoutMs);
    console.log(`   ${m}: ${r}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }

  console.log('\n2) App request (system instruction + JSON schema, via src/services/llm.ts):');
  const t1 = Date.now();
  try {
    const out = (await generateJson({
      task: 'ai-check',
      system: 'You are a connectivity test. Answer exactly as instructed.',
      parts: [{ text: 'Return status "OK".' }],
      responseSchema: { type: 'OBJECT', properties: { status: { type: 'STRING' } }, required: ['status'] },
      maxOutputTokens: 256,
    })) as { status?: string };
    console.log(`   Response JSON: ${JSON.stringify(out)}`);
    console.log(`   Time: ${((Date.now() - t1) / 1000).toFixed(1)} s`);
    if (/^https:\/\/generativelanguage\.googleapis\.com\//.test(cfg.apiBase)) {
      console.log('\nPASS: live Gemini works with the app\'s request format.');
    } else {
      console.log('\nPASS (NOT LIVE): GEMINI_API_BASE points to a non-Google server (test/fake). Remove it from .env for real AI.');
    }
  } catch (e) {
    console.log(`   FAIL: ${(e as Error).message}`);
    console.log('\nHints: 400/401/403 = key not accepted by this API (create a key at https://aistudio.google.com/apikey);');
    console.log('       404 = model name not available for this key (change GEMINI_MODEL); 429 = quota/rate limit.');
    process.exit(1);
  }
}

main();
