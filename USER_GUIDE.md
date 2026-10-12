# MediNexus AI — User Guide

MediNexus AI lets patients pre-register for the OPD and lets doctors review those registrations.

> **Important:** the triage is **rule-based**. It applies fixed rules to the symptoms a patient selects. It is **not** a diagnosis and does not replace a doctor.

---

## 1. Opening the app

Open <http://localhost:5173>.

- A short splash screen appears, then the **Login** page.
- If you are already logged in, you go straight to **your** dashboard: patients to *My Visits*, doctors to the *Doctor Dashboard*.

## 2. Patient: create an account

1. On the Login page, click **Register**.
2. Fill in your details:

   | Field | Required? | Rule |
   |---|---|---|
   | Full name | Yes | |
   | CNIC | Yes | 13 digits; dashes are added for you as you type |
   | Mobile | No | Pakistani number, e.g. 03001234567 |
   | Email | No | |
   | Password and Confirm | Yes | At least 8 characters with letters and numbers |

3. Tick the confirmation box and click **Register**.
4. You are logged in and taken to **My Visits**.

There is no "Doctor" option on this page. Doctor accounts are created by the hospital administrator.

### Messages you may see

| Message | Meaning |
|---|---|
| CNIC must be 13 digits | Check your CNIC |
| An account with this CNIC already exists | Log in instead |
| Password must contain at least one number | Use letters **and** numbers |
| Passwords do not match | Retype the confirmation |

## 3. Patient: log in

Enter your **CNIC** (with or without dashes) or **email**, then your password, and click **Sign In**. You always land on **My Visits**.

## 4. Patient: new assessment

1. On *My Visits*, click **New Assessment**.
2. Fill in your details:
   - Your **name** is pre-filled from your account (you can change it, e.g. for a family member).
   - Enter your **age** and select your **gender**.
3. Select your **symptoms**:
   - General Medicine (Room 104): Fever, Flu, Headache, Cough, Sore throat, Body pain
   - Dermatology (Room 208): Skin rash, Itching, Redness, Minor skin infection

   The "Example symptoms" buttons only fill in sample symptoms. They don't submit anything.
4. Choose **how long** you've had the symptoms.
5. Click **Start Triage Check**. The button is disabled while saving, so double clicks can't create duplicates.

## 5. Patient: triage result

You'll see:

- **Priority:** High, Medium or Routine, with the reason (for example "Fever and headache in a patient over 50").
- **Warnings** from the triage rules, if any matched.
- **Suggested department and room**, and your **token** (e.g. `GM-07`).
- **Doctor review status:** awaiting, under review, or approved (with the doctor's name).
- **What to do next**, including when to go to Emergency.

**Edit Symptoms** opens your saved answers so you can correct them. This updates the **same** case. It's only possible until a doctor starts reviewing.

## 6. Patient: digital parchi

Click **View Digital Parchi**. The slip shows:

- Token, Patient ID, name, age and gender, room, priority and its reason
- Your symptoms, the instructions, and the **current** doctor-review status
- The date and time

Click **Print / Save Slip** and choose a printer or "Save as PDF". The navigation is hidden in print. Click **Refresh** to see the latest review status. Staff verify the slip by searching for the Patient ID.

## 7. Patient: My Visits

My Visits lists **only your** cases, with token, department, priority and status. From here you can:

- **Open** a case
- Open its **Parchi**
- **Edit** a case that is still pending

## 8. Doctor: log in

Use the doctor email and password set up by the administrator. (For local demos, these are `DEMO_DOCTOR_EMAIL` and `DEMO_DOCTOR_PASSWORD` in `backend\.env`; see SETUP.md, step 6.) You land on the **Physician OPD Triage Dashboard**.

## 9. Doctor dashboard

- **Metrics:** total cases, open high-priority cases, cases awaiting approval.
- **Filters:** department (All, General Medicine, Dermatology) and status.
- **Search:** by name, Patient ID, token or symptom.
- **Table:** click a row or **Open Report**.

### Review modal

The modal shows:

- The rule-based priority and why it was given
- The reported symptoms and duration
- The rule warnings
- Conditions to consider. This is a fixed list chosen by the rules, **not a diagnosis**.
- An auto-generated handover summary

To review a case:

1. **Edit** lets you change the plan shown to the patient and add **clinical notes**. Notes are private to doctors.
2. **Save** records you as the reviewer and sets the status to *Under Review*. If nothing changed, nothing is saved.
3. **Approve** records you as the approver, with the time.
4. Approved cases are locked. **Reopen** clears the approval if a change is needed.

## 10. Who can see what

| | Patient | Doctor |
|---|---|---|
| Own cases | ✅ | — |
| Other patients' cases | ❌ | ✅ |
| Doctor dashboard and doctor actions | ❌ (redirected; the API returns 403) | ✅ |
| Clinical notes, conditions to consider | ❌ | ✅ |
| Edit symptoms | Own case, only before review | ❌ |

## 11. Logging out

Click **Logout** at the top right. Your session is ended **on the server**, so the old login token stops working everywhere.
