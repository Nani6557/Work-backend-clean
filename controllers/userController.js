import { getFirestore, getBucket } from '../config/firebase.js';

const inMemory = { workers: [] };

export async function listWorkers(req, res) {
  const firestore = getFirestore();
  if (!firestore) {
    return res.json([]);
  }

  try {
    const snap = await firestore
      .collection("workers")
      .limit(500)
      .get();

    const out = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,            // Firestore doc id
        workerId: d.workerId,  // mani_56 (SEARCH KEY)
        name: d.name || "",
        workName: d.workName || "",
        area: d.area || "",
        profilePic: d.profilePic || "",
        type: d.type || "",
      };
    });

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


export async function getWorker(req, res) {
  const id = req.params.id;
  const firestore = getFirestore();
  if (!firestore) {
    const w = inMemory.workers.find(w => w.id === id);
    return res.json(w || {});
  }
  try {
    const doc = await firestore.collection('workers').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createWorker(req, res) {
  const data = req.body;
  const firestore = getFirestore();
  if (!firestore) {
    const id = 'w_' + Date.now();
    const rec = { id, ...data };
    inMemory.workers.push(rec);
    return res.json(rec);
  }
  try {
    const ref = await firestore.collection('workers').add({ ...data, createdAt: Date.now() });
    const doc = await ref.get();
    res.json({ id: ref.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateWorker(req, res) {
  const id = req.params.id;
  const data = req.body;
  const firestore = getFirestore();
  if (!firestore) {
    const idx = inMemory.workers.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    inMemory.workers[idx] = { ...inMemory.workers[idx], ...data };
    return res.json(inMemory.workers[idx]);
  }
  try {
    await firestore.collection('workers').doc(id).set(data, { merge: true });
    const doc = await firestore.collection('workers').doc(id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteWorker(req, res) {
  const id = req.params.id;
  const firestore = getFirestore();
  if (!firestore) {
    inMemory.workers = inMemory.workers.filter(w => w.id !== id);
    return res.json({ ok: true });
  }
  try {
    await firestore.collection('workers').doc(id).delete();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
