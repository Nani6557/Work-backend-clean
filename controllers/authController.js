import { getFirestore } from '../config/firebase.js';
import jwt from 'jsonwebtoken';

const firestore = getFirestore();

export async function userLogin(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  if (!firestore) {
    // development fallback: respond not found
    return res.json({ exists: false });
  }

  try {
    const snap = await firestore.collection('users').where('phone', '==', phone).get();
    if (snap.empty) return res.json({ exists: false });
    const doc = snap.docs[0];
    const user = { id: doc.id, ...doc.data() };
    const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET || 'devsecret');
    return res.json({ exists: true, user, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
