import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { authorizeRole } from '../middleware/roleMiddleware';
import { reviewSubmission, getPendingSubmissions } from '../controllers/reviewController';

const router: Router = Router();

router.use(authenticate);

router.get('/pending', authorizeRole(['REVIEWER', 'ADMIN']), getPendingSubmissions);
router.post('/:id/review', authorizeRole(['REVIEWER', 'ADMIN']), reviewSubmission);

export default router;
