import { Request, Response, NextFunction } from 'express';
import { JwtAuthGuard } from '../../auth/jwt.guard';

const jwtAuthGuard = new JwtAuthGuard();

export const jwtMiddleware = (req: Request, res: Response, next: NextFunction) => {
  jwtAuthGuard.canActivate(req).then(
    (result: any) => {
      if (result) {
        next();
      } else {
        res.status(401).json({ message: 'Unauthorized' });
      }
    },
    (error) => {
      res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
  );
};