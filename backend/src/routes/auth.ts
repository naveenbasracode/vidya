import { Router, Request, Response } from 'express';
import * as authHandlers from './auth';

const router = Router();

router.post('/register', authHandlers.register);
router.post('/login', authHandlers.login);

export const authRouter = router;
