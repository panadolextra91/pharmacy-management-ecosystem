import { Request, Response, NextFunction } from 'express';
import adminAuthService from '../../application/admin-auth.service';

export const registerAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminAuthService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const loginAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminAuthService.login(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const refreshAdminToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const result = await adminAuthService.refreshToken(refreshToken);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
