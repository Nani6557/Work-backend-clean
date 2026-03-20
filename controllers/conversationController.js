// backend/controllers/conversationController.js
import express from 'express';
import { getFirestore } from '../config/firebase.js'; // your firebase helper

// create (or return existing) conversation for two users
export async function createConversation(req, res) {
  try {
    const { a, b } = req.body; // a = visitorId, b = ownerId
    if (!a || !b) return res.status(400).json({ error: 'a and b required' });

    const db = getFirestore();
    if (!db) return res.status(500).json({ error: 'firestore not available' });

    // ensure deterministic participant ordering to reuse existing conversation
if (a === b) {
  return res.status(400).json({ error: "Cannot create conversation with same user" });
}

const participants = [a, b].sort(); 


// Search for existing conversation with same participants
    const q = await db.collection('conversations')
  .where('participants', '==', participants)
  .get();

if (!q.empty) {
  const doc = q.docs[0];
  return res.json({ conversationId: doc.id, exists: true });
}

    // create new conversation
    const now = Date.now();
    const newDocRef = await db.collection('conversations').add({
      participants,
      createdAt: now,
      updatedAt: now,
      lastMessage: null
    });

    return res.json({ conversationId: newDocRef.id, exists: false });
  } catch (err) {
    console.error('createConversation err', err);
    return res.status(500).json({ error: err.message });
  }
}

// list messages in conversation (simple, last n)
export async function getMessages(req, res) {
  try {
    const { id } = req.params;
    const db = getFirestore();
    if (!db) return res.status(500).json({ error: 'firestore not available' });

    const q = await db.collection('conversations').doc(id).collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    const out = q.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(out);
  } catch (err) {
    console.error('getMessages err', err);
    return res.status(500).json({ error: err.message });
  }
}

// post message to conversation
export async function postMessage(req, res) {
  try {
    const { id } = req.params; // conversation id
    const { from, text } = req.body;
    if (!from || !text) return res.status(400).json({ error: 'from and text required' });

    const db = getFirestore();
    if (!db) return res.status(500).json({ error: 'firestore not available' });

    const now = Date.now();
    const msgRef = await db.collection('conversations').doc(id).collection('messages').add({
      from,
      text,
      createdAt: now
    });

    // update conversation meta
    await db.collection('conversations').doc(id).set({
      lastMessage: text,
      updatedAt: now
    }, { merge: true });

    return res.json({ id: msgRef.id, from, text, createdAt: now });
  } catch (err) {
    console.error('postMessage err', err);
    return res.status(500).json({ error: err.message });
  }
}




export async function getUserConversations(req, res) {
  try {
 
 
 
    const { userId } = req.params;
  
  
    const db = getFirestore();

    const snap = await db
      .collection("conversations")
      .where("participants", "array-contains", userId)
      .get();

    const out = [];

    snap.docs.forEach(doc => {
      const data = doc.data();

      // ignore broken conversations
          if (!data.participants || data.participants.length !== 2) return;

      // ensure the user is actually a participant
if (!data.participants.includes(userId)) return;

      out.push({
        id: doc.id,
        ...data
      });
    });

    res.json(out);

  } catch (err) {
    console.error("getUserConversations error:", err);
    res.status(500).json({ error: err.message });
  }
}

