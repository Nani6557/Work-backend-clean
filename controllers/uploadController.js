import { getBucket } from '../config/firebase.js';

export async function uploadImage(req, res) {
  const { filename, base64 } = req.body;
  if (!filename || !base64) return res.status(400).json({ error: 'filename & base64 required' });

  const bucket = getBucket();
  if (!bucket) {
    // local dev fallback: return data URI
    return res.json({ url: `data:image/jpeg;base64,${base64}` });
  }

  try {
    const file = bucket.file(filename);
    const buffer = Buffer.from(base64, 'base64');
    await file.save(buffer, { contentType: 'image/jpeg', public: true });
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(filename)}`;
    res.json({ url: publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
