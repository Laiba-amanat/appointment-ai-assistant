import type { Response } from "express";
import type { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
): Response =>
  res.status(statusCode).json({ success: true, message, data } satisfies ApiResponse<T>);

export const sendCreated = <T>(res: Response, data: T, message = "Created"): Response =>
  sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: { field: string; message: string }[]
): Response => {
  const body: ApiResponse = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

export const sendUnauthorized = (res: Response, message = "Unauthorized"): Response =>
  sendError(res, message, 401);

export const sendNotFound = (res: Response, message = "Not found"): Response =>
  sendError(res, message, 404);

export const sendBadRequest = (
  res: Response,
  message = "Bad request",
  errors?: { field: string; message: string }[]
): Response => sendError(res, message, 400, errors);
