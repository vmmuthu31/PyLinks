import { Request, Response, NextFunction } from "express";

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);

    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d: any) => d.message),
      });
      return;
    }

    next();
  };
}
