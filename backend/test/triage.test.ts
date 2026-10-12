import { describe, expect, it } from 'vitest';
import { evaluateMedicalTriage } from '../src/triage/evaluateMedicalTriage';
import { api } from './helpers';

const t = (symptoms: string[], duration = '1 - 2 days', age = 30) =>
  evaluateMedicalTriage({ name: 'X', age, gender: 'Male', symptoms, duration });

describe('rule-based triage (rules-v2)', () => {
  it('routes by the department with more selected symptoms (tie → General Medicine)', () => {
    expect(t(['Fever']).suggestedDepartment).toBe('General Medicine');
    expect(t(['Skin rash', 'Itching']).suggestedDepartment).toBe('Dermatology');
    expect(t(['Fever', 'Itching']).suggestedDepartment).toBe('General Medicine');
  });

  it('applies the documented rules', () => {
    expect(t(['Fever', 'Cough'], '1 - 2 weeks').riskLevel).toBe('High');
    expect(t(['Fever', 'Headache'], '1 - 2 days', 55).riskLevel).toBe('High');
    expect(t(['Fever', 'Headache'], '1 - 2 days', 30).riskLevel).toBe('Low');
    expect(t(['Fever', 'Cough', 'Body pain']).riskLevel).toBe('Medium');
    expect(t(['Minor skin infection', 'Skin rash']).riskLevel).toBe('High');
    expect(t(['Skin rash', 'Redness', 'Itching']).riskLevel).toBe('Medium');
    expect(t(['Headache'], 'More than 2 weeks').riskLevel).toBe('Medium');
    expect(t(['Itching']).riskLevel).toBe('Low');
  });

  it('does not ignore general rules for a dermatology-routed patient (rules-v1 bug)', () => {
    const r = t(['Fever', 'Cough', 'Skin rash', 'Itching', 'Redness'], '1 - 2 weeks');
    expect(r.suggestedDepartment).toBe('Dermatology');
    expect(r.riskLevel).toBe('High');
  });

  it('never invents findings or confidence and always explains the result', () => {
    const r = t(['Itching']);
    expect(r.redFlags).toEqual([]);
    expect(r.riskReason).toMatch(/No priority rule/);
    const all = JSON.stringify([t(['Fever', 'Headache'], '1 - 2 days', 70), t(['Itching']), t(['Minor skin infection'], 'More than 2 weeks')]);
    expect(all).not.toMatch(/vital signs stable|confidence|severe cephalalgia|94/i);
    expect(t(['Fever']).doctorHandoverSummary).toMatch(/Not a diagnosis/);
  });

  it('options endpoint exposes the same lists the validator accepts', async () => {
    const res = await api().get('/api/triage/options');
    expect(res.status).toBe(200);
    const names = res.body.data.departments.flatMap((d: any) => d.symptoms.map((s: any) => s.name));
    expect(names).toContain('Fever');
    expect(names).toContain('Minor skin infection');
    expect(res.body.data.durations).toHaveLength(5);
  });

  it('health endpoint does not leak internals', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/postgres(ql)?:\/\//i);
  });
});
