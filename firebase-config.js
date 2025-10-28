// firebase-config.js

// Get Firebase from window object (loaded via script tags)
const { firebase } = window;

if (!firebase) {
    throw new Error('Firebase SDK not loaded. Make sure the Firebase scripts are included in your HTML.');
}

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBlNwpUwT_OFfypyaLBnlZiBZgw_jNXKRo",
    authDomain: "gym-management-system-fd202.firebaseapp.com",
    projectId: "gym-management-system-fd202",
    storageBucket: "gym-management-system-fd202.firebasestorage.app",
    messagingSenderId: "651666634001",
    appId: "1:651666634001:web:890d0c42f4f24c0c8988b0",
    measurementId: "G-ZCM2SDBCX4"
};

// Firestore settings
const firestoreSettings = {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  cacheSizeBytes: 50000000, // 50 MB
  merge: true
};

// Initialize Firebase
let app;
try {
    app = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    // If already initialized, use existing app
    if (error.code === 'app/duplicate-app') {
        app = firebase.app();
        console.log("Using existing Firebase app");
    } else {
        console.error("Firebase initialization error:", error);
        throw error;
    }
}

// Initialize Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();

// Apply Firestore settings
db.settings(firestoreSettings);

// Function to test connection
export async function testConnection() {
    try {
        const testDoc = await db.collection('__test__').doc('connection').get();
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}

// Function to check Firebase connection
export const checkFirebaseConnection = async () => {
    try {
        // Try to get a document from Firestore to test connection
        const testRef = db.collection('_connection_test_').doc('test');
        await testRef.get();
        console.log('Firebase connection successful');
        return true;
    } catch (error) {
        console.error('Firebase connection error:', error);
        return false;
    }
};

// Monitor online/offline status
let isOnline = navigator.onLine;

const updateOnlineStatus = () => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (wasOnline !== isOnline) {
        const event = new CustomEvent('connection-status-change', { 
            detail: { isOnline } 
        });
        document.dispatchEvent(event);
        console.log(isOnline ? 'Application is online' : 'Application is offline');
        
        // Try reconnecting to Firebase if we're back online
        if (isOnline) {
            checkFirebaseConnection().then(connected => {
                if (connected) {
                    console.log('Reconnected to Firebase successfully');
                } else {
                    console.warn('Failed to reconnect to Firebase');
                }
            });
        }
    }
};

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initial connection checks
updateOnlineStatus();
checkFirebaseConnection().then(connected => {
    if (!connected) {
        console.warn('Unable to establish initial Firebase connection');
    }
});
