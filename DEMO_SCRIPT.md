# MediNexus AI — Hackathon Demo Script (about 4 minutes)

## Before the demo (10 minutes earlier)

1. `backend\.env` has `GEMINI_API_KEY` set. Open http://localhost:3001/api/triage/options and check it shows `"aiEnabled":true`.
2. Start both servers (see README → Quick start). Log in once as the patient and once as the doctor to check both accounts.
3. Have `demo-assets\sample_lab_report_cbc.png` and `demo-assets\sample_prescription.png` ready (synthetic, no real data).
4. Do one full **rehearsal** run and **screen-record it**. That recording is your fallback if the internet or AI fails on stage. Always say it is a recording.
5. Use two browser windows: one for the patient (normal), one for the doctor (private/incognito).

## The 30-second pitch

> "In Pakistani government hospitals, patients queue at paper counters, often reach the wrong OPD, and doctors receive them with no context.
> MediNexus AI is an AI-powered decision-support and health assistant. Patients describe symptoms in English, Urdu or Roman Urdu. Google's Gemini AI understands them, suggests possible conditions with clear uncertainty, gives safe preliminary guidance, and explains lab reports and prescriptions in simple words.
> Safety-critical parts, **emergency detection and priority**, are deterministic rules, so they're reliable and work even when the AI is offline. No personal identifiers go to the AI, and a doctor reviews every case, with an AI-drafted summary."

## Demo sequence

| # | Do | Say |
|---|---|---|
| 1 | Patient: log in → **New Assessment** | "The patient registers before arriving at the hospital." |
| 2 | Type `mujhe 3 din se bukhar, khansi aur gala kharab hai, umar 34` → **Analyse & fill the form** | "Roman Urdu, like people actually text. The AI fills Fever, Cough, Sore throat, 3–5 days and age 34." |
| 3 | Point to **Possible conditions** and **guidance** | "Possible conditions with *more likely / possible / less likely*, never a percentage, never a diagnosis. The guidance is filtered on our server: no medicine names or doses can get through." |
| 4 | Select gender → **Start Triage Check** | "Now the **rule engine**, not the AI, sets priority and department, and issues a token." Open **Digital Parchi**. |
| 5 | New Assessment → type `kal se seene mein dard aur saans lene mein takleef` → **Analyse** | The red **Possible emergency** alert appears. "Emergency detection is rules-based in English, Urdu and Roman Urdu. It works even with the AI switched off. It tells the patient to go to Emergency or call Rescue 1122." |
| 6 | **Continue registration** → fill age/gender, tick a symptom and duration → submit | "If they still register, the case is forced to High priority with an emergency flag, on the result and on the parchi." |
| 7 | My Visits → **Understand a report / prescription** → upload `sample_lab_report_cbc.png` → **Explain** | "Gemini reads the image: each value is compared with the range printed on the report, explained simply, with questions to ask the doctor." |
| 8 | Upload `sample_prescription.png` | "Medicines are copied exactly as written. It never suggests changing a dose. We show that warning every time." |
| 9 | Doctor window: log in → dashboard | "Real PostgreSQL records. The emergency case is on top with a red badge." |
| 10 | Open the emergency case → **Generate AI summary** | "An SBAR handover draft for the doctor. Only age, gender, symptoms, duration and the rule result are sent, no name or CNIC. It's labelled a draft to verify." |
| 11 | Edit the plan → **Approve**. Patient window: refresh the parchi → **Approved** | "The doctor stays in control; the patient sees the decision live." |
| 12 | Close on the README table "What is AI and what is not" | "We're explicit about what is AI and what is rules." |

## If the AI fails during the demo

- The app **does not break**: you'll see "AI assistant unavailable — please select your symptoms manually". Show that this is designed behaviour: the emergency alert (step 5) still works without AI, as does the manual form → triage → parchi → doctor approval.
- Then play the rehearsal **screen recording**, clearly introduced as "a recording of a live run from earlier today". Never show made-up AI output.
- Common causes: no internet, free-quota limit (wait 1 minute), wrong key or model name (see SETUP.md → Troubleshooting).

## Likely judge questions (honest answers)

| Question | Answer |
|---|---|
| Is the disease prediction machine learning? | It's an LLM (Google Gemini) giving **possible conditions with qualitative likelihood**, not a trained or validated ML classifier. We chose not to train a model on unvalidated public data in 48 hours; the output is labelled a suggestion and a doctor decides. |
| What if the AI is wrong? | It can't set the priority, department or token (the rules do), it can't remove an emergency warning, its guidance is filtered for medicines and doses, and a doctor reviews every case. |
| Why not let the AI detect emergencies? | Emergencies must be reliable and work offline, so they're deterministic rules with unit tests in three languages. The AI can only *add* a concern. |
| What about patient privacy? | Names, CNIC, phone, email and IDs are never sent to the AI. Uploaded documents and AI answers are not stored. The API key never reaches the browser or the logs. |
| What does it cost? | Gemini's free tier is enough for a pilot; the AI is rate-limited per user. Without a key, the whole OPD workflow still runs. |
| How is it tested? | Backend: 131 automated tests (AI mocked, real PostgreSQL). Frontend: unit tests and build. 11 browser end-to-end tests using an offline fake AI server. |
| What's next? | Validation with clinicians, more departments, Urdu-language responses, voice input, and a properly validated prediction model trained on local hospital data. |
