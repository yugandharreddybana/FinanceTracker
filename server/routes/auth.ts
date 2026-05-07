import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import {
  registerUser,
  loginUser,
  changeUserPassword,
  deleteUserByEmail,
  verifyToken,
  resetUserPassword,
  createT