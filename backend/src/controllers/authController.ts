import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";

const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * body: { email, password, firstName, lastName }
 * - Self-registration always creates a STUDENT
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({
      error: "Email, password, first name, and last name are required.",
    });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "STUDENT", // string field in your schema
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    res.status(201).json(user);
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      (err.meta.target as string[]).includes("email")
    ) {
      res.status(400).json({ error: "A user with that email already exists." });
    } else {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Internal server error." });
    }
  }
};

/**
 * POST /api/auth/login
 * body: { email, password }
 * returns: { token }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET missing");
      res.status(500).json({ error: "Server misconfigured." });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role as Role }, secret, {
      expiresIn: "8h",
    });

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * GET /api/auth/me
 * returns: { id, email, role, firstName?, lastName? }
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
