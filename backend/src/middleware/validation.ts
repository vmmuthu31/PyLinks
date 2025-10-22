import { Request, Response, NextFunction } from "express";

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map((d: any) => d.message),
      });
    }

    next();
  };
}
