import express from 'express';
import { listWorkers, getWorker, createWorker, updateWorker, deleteWorker } from '../controllers/userController.js';
import { uploadImage } from '../controllers/uploadController.js';
const router = express.Router();

router.get('/workers', listWorkers);
router.get('/workers/:id', getWorker);
router.post('/workers', createWorker);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', deleteWorker);

router.post('/upload', uploadImage);

export default router;
