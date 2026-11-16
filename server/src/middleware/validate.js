import { HttpError } from '../utils/HttpError.js';

// Validates req.body against a Zod schema and replaces it with the cleaned result
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    return next(new HttpError(400, field ? `${field}: ${issue.message}` : issue.message));
  }
  req.body = result.data;
  next();
};
