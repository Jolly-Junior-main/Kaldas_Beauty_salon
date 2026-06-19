import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCJbJkcEbJOfiugVmFLnhZ6KrMRTHYryUk",
  authDomain: "intrepid-envoy-wtxfk.firebaseapp.com",
  projectId: "intrepid-envoy-wtxfk",
  storageBucket: "intrepid-envoy-wtxfk.firebasestorage.app",
  messagingSenderId: "533237225947",
  appId: "1:533237225947:web:9be8b6d9dccba5872caffe"
};

const app = initializeApp(firebaseConfig);

// Use the designated firestore database id specifically configured for this applet
// Enabled experimentalForceLongPolling to handle proxy/restricted iframe preview connections cleanly
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-22086102-239d-4a2c-94c5-673769b61fd8");
