import { Request, Response, NextFunction } from "express";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Simple mock auth middleware
  const authHeader = req.headers.authorization;
  
  // In a real app, we would verify a JWT or session here
  // For this demo, we'll just allow everything but log the access
  console.log(`[Auth] Request to ${req.path} by ${authHeader || 'Anonymous'}`);
  
  next();
};
