// backend/routes/conversationRoutes.js
import express from 'express';
import { createConversation, getMessages, postMessage, getUserConversations } from '../controllers/conversationController.js';
const router = express.Router();

router.post('/create', createConversation);           // { a, b } -> { conversationId }
router.get('/:id/messages', getMessages);            // GET messages for conversation
router.post('/:id/messages', postMessage);           // POST { from, text }
router.get('/user/:userId', getUserConversations);



export default router;
