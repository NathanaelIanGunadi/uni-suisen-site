import { Router } from 'express';
import { createSubmission } from '../controllers/submissionController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../utils/fileUpload';

const router: Router = Router();

router.post('/', authenticate, upload.single('document'), createSubmission);

export default router;
