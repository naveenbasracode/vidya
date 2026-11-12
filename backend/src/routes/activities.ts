import { Router, Request, Response } from 'express';
import * as activityHandlers from './activities';
import { authenticatedUser } from '../middleware/rbac';

const router = Router();

// Apply authentication to activity-related routes
router.use(authenticatedUser);

router.get('/', activityHandlers.getAllActivities);
router.post('/', activityHandlers.createActivity);
router.put('/:id', activityHandlers.updateActivity);

export const activityRouter = router;
