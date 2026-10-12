import { Request, Response } from 'express';
import { caseInputSchema, publicIdParam } from '../validation/schemas';
import * as svc from '../services/patients.service';

export async function create(req: Request, res: Response) {
  const input = caseInputSchema.parse(req.body ?? {});
  const { record, created } = await svc.createCase(req.user!, input);
  res.status(created ? 201 : 200).json({ success: true, data: record, meta: { created } });
}

export async function listMine(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listMyCases(req.user!) });
}

export async function getOne(req: Request, res: Response) {
  const id = publicIdParam.parse(req.params.id);
  res.json({ success: true, data: await svc.getCaseForUser(req.user!, id) });
}

export async function update(req: Request, res: Response) {
  const id = publicIdParam.parse(req.params.id);
  const input = caseInputSchema.parse(req.body ?? {});
  const { record, changed } = await svc.updateMyCase(req.user!, id, input);
  res.json({ success: true, data: record, meta: { changed } });
}
