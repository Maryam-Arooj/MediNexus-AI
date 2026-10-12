import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { notFound } from '../lib/httpError';
import { loginSchema, registerSchema } from '../validation/schemas';
import * as auth from '../services/auth.service';

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body ?? {});
  const result = await auth.registerPatient(input);
  res.status(201).json({ success: true, data: result });
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = loginSchema.parse(req.body ?? {});
  res.json({ success: true, data: await auth.login(identifier, password) });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw notFound('User not found.');
  res.json({ success: true, data: auth.publicUser(user) });
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.user!.id);
  res.json({ success: true, data: { message: 'Logged out.' } });
}
