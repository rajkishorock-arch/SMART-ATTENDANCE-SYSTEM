/**
 * FastFaceEngine - Client-Side Ultra-Fast Face Recognition & Embedding Matcher
 * 
 * Provides:
 * 1. Offline IndexedDB storage for institution student embeddings (SFace 128-D vectors).
 * 2. In-memory Float32Array matrix multiplication for sub-millisecond local cosine matching.
 * 3. Consecutive-frame stability tracker to filter motion blur before extraction.
 * 4. Two-tier confidence decisioning (Instant match vs. Borderline review vs. Reject).
 */

const DB_NAME = 'SmartAttendance_FaceCache';
const DB_VERSION = 1;
const STORE_NAME = 'student_embeddings';

class FastFaceEngine {
  constructor() {
    this.db = null;
    this.cachedInstitutionId = null;
    this.embeddingMatrix = null; // Float32Array of shape (N * 128)
    this.studentsList = [];      // Array of student metadata [{ student_id, name, roll, dep }]
    this.isReady = false;
    this.lastFaceBox = null;
    this.stableFramesCount = 0;
    this.STABILITY_THRESHOLD_PX = 30; // max box movement between frames to count as stable
    this.REQUIRED_STABLE_FRAMES = 2;   // 2 consecutive stable frames needed
  }

  /**
   * Open IndexedDB database for student face embeddings cache
   */
  async _openDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'student_id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Sync and load all student embeddings for an institution into local IndexedDB and RAM.
   */
  async syncEmbeddings(apiBaseUrl, token, institutionId) {
    if (!token || !institutionId) return false;
    try {
      const res = await fetch(`${apiBaseUrl}/offline-face/download-embeddings/${institutionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        console.warn(`[FastFaceEngine] Could not download offline embeddings (${res.status}).`);
        // Try to load whatever is already cached in IndexedDB
        await this.loadFromCache(institutionId);
        return false;
      }

      const studentsData = await res.json();
      if (!Array.isArray(studentsData) || studentsData.length === 0) {
        console.info('[FastFaceEngine] No student face embeddings enrolled yet.');
        return false;
      }

      const db = await this._openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const s of studentsData) {
        store.put({
          student_id: s.student_id,
          institution_id: institutionId,
          name: s.name,
          roll: s.roll_number,
          dep: s.department || '',
          face_embedding: s.face_embedding,
          updated_at: Date.now()
        });
      }

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      console.info(`[FastFaceEngine] Successfully cached ${studentsData.length} student embeddings.`);
      try {
        const cachedList = studentsData.map(s => ({
          id: s.student_id,
          student_id: s.student_id,
          name: s.name,
          roll: s.roll_number || 'N/A',
          dep: s.department || 'CSE'
        }));
        localStorage.setItem('cached_students', JSON.stringify(cachedList));
      } catch (e) {
        console.warn('Failed to save cached_students to localStorage:', e);
      }
      await this.loadFromCache(institutionId);
      return true;
    } catch (err) {
      console.warn('[FastFaceEngine] Network sync failed, falling back to local cache:', err);
      await this.loadFromCache(institutionId);
      return false;
    }
  }

  /**
   * Load embeddings from local IndexedDB into Float32Array matrix in RAM.
   */
  async loadFromCache(institutionId) {
    try {
      const db = await this._openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      const allRecords = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const instRecords = allRecords.filter(r => !institutionId || r.institution_id === institutionId);
      if (instRecords.length === 0) {
        this.isReady = false;
        return false;
      }

      const N = instRecords.length;
      const matrix = new Float32Array(N * 128);
      const students = [];

      for (let i = 0; i < N; i++) {
        const rec = instRecords[i];
        students.push({
          student_id: rec.student_id,
          name: rec.name,
          roll: rec.roll,
          dep: rec.dep
        });

        // Normalize embedding vector to unit length
        const raw = rec.face_embedding || [];
        let normSq = 0;
        for (let d = 0; d < 128; d++) {
          const val = raw[d] || 0;
          normSq += val * val;
        }
        const norm = Math.sqrt(normSq) || 1e-9;
        const offset = i * 128;
        for (let d = 0; d < 128; d++) {
          matrix[offset + d] = (raw[d] || 0) / norm;
        }
      }

      this.embeddingMatrix = matrix;
      this.studentsList = students;
      this.cachedInstitutionId = institutionId;
      this.isReady = true;
      console.info(`[FastFaceEngine] Memory Matrix compiled: ${N} students, 128-D vector space.`);
      return true;
    } catch (err) {
      console.error('[FastFaceEngine] Failed to load cache:', err);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Check if face position is stable across consecutive video frames
   */
  checkFaceStability(currentBox) {
    if (!currentBox) {
      this.stableFramesCount = 0;
      this.lastFaceBox = null;
      return false;
    }

    if (!this.lastFaceBox) {
      this.lastFaceBox = currentBox;
      this.stableFramesCount = 1;
      return false;
    }

    const curCenterX = currentBox.x + currentBox.w / 2;
    const curCenterY = currentBox.y + currentBox.h / 2;
    const prevCenterX = this.lastFaceBox.x + this.lastFaceBox.w / 2;
    const prevCenterY = this.lastFaceBox.y + this.lastFaceBox.h / 2;

    const deltaX = Math.abs(curCenterX - prevCenterX);
    const deltaY = Math.abs(curCenterY - prevCenterY);
    const deltaW = Math.abs(currentBox.w - this.lastFaceBox.w);

    if (deltaX < this.STABILITY_THRESHOLD_PX && deltaY < this.STABILITY_THRESHOLD_PX && deltaW < this.STABILITY_THRESHOLD_PX) {
      this.stableFramesCount += 1;
    } else {
      this.stableFramesCount = 1;
    }

    this.lastFaceBox = currentBox;
    return this.stableFramesCount >= this.REQUIRED_STABLE_FRAMES;
  }

  /**
   * Vectorized Cosine Similarity Search in Memory
   * 
   * @param {Float32Array|Array} targetEmbedding - 128-D feature vector
   * @param {number} highConfidenceThreshold - default 0.50
   * @param {number} borderlineThreshold - default 0.35
   * @returns {Object|null} Best match result with timing metrics
   */
  matchVector(targetEmbedding, highConfidenceThreshold = 0.50, borderlineThreshold = 0.35) {
    if (!this.isReady || !this.embeddingMatrix || this.studentsList.length === 0) {
      return null;
    }

    const tStart = performance.now();
    const N = this.studentsList.length;
    const matrix = this.embeddingMatrix;

    // Normalize target vector
    let targetNormSq = 0;
    for (let d = 0; d < 128; d++) {
      const v = targetEmbedding[d] || 0;
      targetNormSq += v * v;
    }
    const targetNorm = Math.sqrt(targetNormSq) || 1e-9;
    const targetNormed = new Float32Array(128);
    for (let d = 0; d < 128; d++) {
      targetNormed[d] = (targetEmbedding[d] || 0) / targetNorm;
    }

    let bestScore = -1.0;
    let bestIdx = -1;

    // Vectorized dot product across all students
    for (let i = 0; i < N; i++) {
      let dot = 0;
      const offset = i * 128;
      // Loop unrolling for 128 dimensions (16 steps of 8)
      for (let d = 0; d < 128; d += 8) {
        dot += matrix[offset + d] * targetNormed[d]
             + matrix[offset + d + 1] * targetNormed[d + 1]
             + matrix[offset + d + 2] * targetNormed[d + 2]
             + matrix[offset + d + 3] * targetNormed[d + 3]
             + matrix[offset + d + 4] * targetNormed[d + 4]
             + matrix[offset + d + 5] * targetNormed[d + 5]
             + matrix[offset + d + 6] * targetNormed[d + 6]
             + matrix[offset + d + 7] * targetNormed[d + 7];
      }

      if (dot > bestScore) {
        bestScore = dot;
        bestIdx = i;
      }
    }

    const matchDurationMs = performance.now() - tStart;

    if (bestIdx >= 0 && bestScore >= borderlineThreshold) {
      const student = this.studentsList[bestIdx];
      const matchQuality = bestScore >= highConfidenceThreshold ? 'HIGH' : 'BORDERLINE';
      return {
        matched: true,
        studentId: student.student_id,
        name: student.name,
        roll: student.roll,
        dep: student.dep,
        confidence: Math.round(Math.min(100, Math.max(0, bestScore * 100))),
        rawScore: parseFloat(bestScore.toFixed(4)),
        matchQuality,
        matchDurationMs: parseFloat(matchDurationMs.toFixed(2))
      };
    }

    return {
      matched: false,
      bestScore: parseFloat(bestScore.toFixed(4)),
      matchDurationMs: parseFloat(matchDurationMs.toFixed(2))
    };
  }
}

export const fastFaceEngine = new FastFaceEngine();
