import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBQI4kQl30trTxdqeBalU9u8xXWkdtbCfU",
    authDomain: "safe-route-53cad.firebaseapp.com",
    projectId: "safe-route-53cad",
    storageBucket: "safe-route-53cad.firebasestorage.app",
    messagingSenderId: "1048761593809",
    appId: "1:1048761593809:web:8a02dc458cbb76c8defaf0",
    measurementId: "G-MCVREVNSK3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
