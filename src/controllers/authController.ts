import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;
  const hashedPassword: string = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role: role as Role },
  });

  res.json({ id: user.id, email: user.email });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid: boolean = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token: string = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string
  );

  res.json({ token });
};
