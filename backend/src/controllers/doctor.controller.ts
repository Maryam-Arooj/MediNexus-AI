import { Request, Response } from 'express';
import { approveSchema, publicIdParam, reviewSchema } from '../validation/schemas';
import * as svc from '../services/doctor.service';

export async function queue(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listQueue(req.user!) });
}

export async function review(req: Request, res: Response) {
  const id = publicIdParam.parse(req.params.id);
  const { record, changed } = await svc.saveReview(req.user!, id, reviewSchema.parse(req.body ?? {}));
  res.json({ success: true, data: record, meta: { changed } });
}

export async function approve(req: Request, res: Response) {
  const id = publicIdParam.parse(req.params.id);
  res.json({ success: true, data: await svc.approveCase(req.user!, id, approveSchema.parse(req.body ?? {})) });
}

export async function reopen(req: Request, res: Response) {
  const id = publicIdParam.parse(req.params.id);
  res.json({ success: true, data: await svc.reopenCase(req.user!, id) });
}
