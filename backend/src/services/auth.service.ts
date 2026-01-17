import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export interface UserInfo {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
}

/**
 * Hash a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new AppError(401, 'INVALID_TOKEN', 'Geçersiz veya süresi dolmuş token');
  }
}

/**
 * Login a user with username and password
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  // Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Geçersiz kullanıcı adı veya şifre');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Geçersiz kullanıcı adı veya şifre');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

/**
 * Get current user info from token payload
 */
export async function getCurrentUser(userId: string): Promise<UserInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Kullanıcı bulunamadı');
  }

  return user;
}

/**
 * Create a new user (for seeding/admin purposes)
 */
export async function createUser(
  username: string,
  password: string,
  role: string = 'USER'
): Promise<UserInfo> {
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new AppError(409, 'USER_EXISTS', 'Bu kullanıcı adı zaten kullanılıyor');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}
