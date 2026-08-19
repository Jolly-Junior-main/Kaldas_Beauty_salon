import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCJbJkcEbJOfiugVmFLnhZ6KrMRTHYryUk",
  authDomain: "intrepid-envoy-wtxfk.firebaseapp.com",
  projectId: "intrepid-envoy-wtxfk",
  storageBucket: "intrepid-envoy-wtxfk.firebasestorage.app",
  messagingSenderId: "533237225947",
  appId: "1:533237225947:web:9be8b6d9dccba5872caffe"
};

// Ensure Firebase app is initialized only once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Database ID — where all production data lives
const DB_ID = "ai-studio-22086102-239d-4a2c-94c5-673769b61fd8";

function initDb() {
  try {
    // Use singleTabManager (stable on Cloudflare/browsers) + long-polling (bypasses WebSocket restrictions)
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      }),
      // Critical: long-polling ensures real-time works behind proxies, Cloudflare, and restricted browsers
      experimentalForceLongPolling: true,
    }, DB_ID);
  } catch (e1) {
    // Already initialized — get the existing instance
    try {
      return getFirestore(app, DB_ID);
    } catch (e2) {
      return getFirestore(app);
    }
  }
}

export const db = initDb();
export const auth = getAuth(app);
export const storage = getStorage(app);

// Helper to compress an image file to a lightweight Data URL (~10-25 KB)
export function compressImageToDataUrl(file: File, maxWidth = 256, maxHeight = 256, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Ultra-fast media uploader with 2-second timeout and lightweight compression fallback
export async function uploadToStorage(folder: string, file: File): Promise<string> {
  const compressedDataUrlPromise = compressImageToDataUrl(file);

  try {
    const uploadWithTimeout = new Promise<string>(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Storage upload timeout')), 2000);
      try {
        const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        clearTimeout(timer);
        resolve(downloadUrl);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    return await uploadWithTimeout;
  } catch (err) {
    console.debug('Storage upload using lightweight compressed image:', err);
    return await compressedDataUrlPromise;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Helper to sanitize objects before sending to Firestore (removes undefined fields which crash setDoc)
export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean;
}

// IMPORTANT: Never throw here — throwing kills the onSnapshot listener permanently
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn(`[Firestore ${operationType}] ${path || ''}:`, error instanceof Error ? error.message : String(error));
}
