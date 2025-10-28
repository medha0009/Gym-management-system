// auth.js
import { auth, db } from "./firebase-config.js";
import { writeLog } from "./helpers.js";

// Initialize loading indicator
const loadingIndicator = document.getElementById('loading-indicator');

// Get DOM elements and verify they exist
const elements = {
  registerBtn: document.getElementById("registerBtn"),
  loginBtn: document.getElementById("loginBtn"),
  roleSelect: document.getElementById("roleSelect"),
  authMsg: document.getElementById("authMsg"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  notification: document.getElementById("notification")
};

// Listen for online/offline events
document.addEventListener('app-online', () => {
  showNotification('Connection restored', 'success');
  elements.registerBtn.disabled = false;
  elements.loginBtn.disabled = false;
});

document.addEventListener('app-offline', () => {
  showNotification('You are offline. Please check your internet connection.', 'error');
  elements.registerBtn.disabled = true;
  elements.loginBtn.disabled = true;
});

// Notification system
function showNotification(message, type = 'info') {
  const { notification } = elements;
  
  // Remove existing classes
  notification.classList.remove('success', 'error', 'info');
  
  // Add new class and message
  notification.textContent = message;
  notification.classList.add(type);
  notification.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Verify all elements are found
Object.entries(elements).forEach(([name, element]) => {
  if (!element) {
    console.error(`Element not found: ${name}`);
    throw new Error(`Required element ${name} not found in the document`);
  }
});

const { registerBtn, loginBtn, roleSelect, authMsg, email, password } = elements;

// Helper function to validate input
function validateInput(email, password) {
  if (!email) return "Email is required";
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
  return null;
}

// Helper function to show/hide loading
function setLoading(show) {
  loadingIndicator.style.display = show ? 'flex' : 'none';
  registerBtn.disabled = show;
  loginBtn.disabled = show;
}

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is already logged in:", user.email);
    // Get user role and redirect
    db.collection("users").doc(user.uid).get().then(userDoc => {
      const role = userDoc.exists ? userDoc.data().role : "member";
      window.location.href = role === "admin" ? "admin.html" : "member.html";
    });
  }
});

registerBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  
  // Clear previous message
  authMsg.textContent = "";
  
  // Get and validate input
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  const role = roleSelect.value || "member";
  
  const validationError = validateInput(emailValue, passwordValue);
  if (validationError) {
    showNotification(validationError, "error");
    return;
  }
  
  setLoading(true);
  
  try {
    // Disable buttons during registration
    registerBtn.disabled = true;
    loginBtn.disabled = true;
    
    console.log("Starting registration process");
    const userCred = await auth.createUserWithEmailAndPassword(emailValue, passwordValue);
    console.log("User created successfully:", userCred.user.uid);
    
    // Store user role
    const userData = {
      email: emailValue,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
    await db.collection("users").doc(userCred.user.uid).set(userData);
    console.log("User role document created:", userData);
    
    // Log the registration
    await writeLog("register", { email: emailValue, role });
    
    // Clear form and show success message
    email.value = "";
    password.value = "";
    showNotification("Registration successful! Please log in.", "success");
    
  } catch (err) {
    console.error("Registration error:", err);
    
    switch(err.code) {
      case "auth/email-already-in-use":
        showNotification("This email is already registered. Please log in instead.", "error");
        password.value = "";
        break;
      case "auth/invalid-email":
        showNotification("Please enter a valid email address.", "error");
        break;
      case "auth/weak-password":
        showNotification("Password must be at least 6 characters long.", "error");
        break;
      case "auth/network-request-failed":
        showNotification("Network error. Please check your internet connection.", "error");
        break;
      default:
        showNotification("Registration failed: " + (err.message || "Unknown error"), "error");
    }
  } finally {
    // Re-enable buttons
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  
  // Clear previous message
  authMsg.textContent = "";
  
  // Get and validate input
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  
  const validationError = validateInput(emailValue, passwordValue);
  if (validationError) {
    authMsg.textContent = validationError;
    return;
  }
  
  try {
    // Disable buttons during login
    registerBtn.disabled = true;
    loginBtn.disabled = true;
    
    console.log("Starting login process");
    const userCred = await auth.signInWithEmailAndPassword(emailValue, passwordValue);
    console.log("Login successful:", userCred.user.uid);
    
    // Get user role
    const userDoc = await db.collection("users").doc(userCred.user.uid).get();
    console.log("User document retrieved");
    
    if (!userDoc.exists) {
      console.log("No user document found, creating one");
      // Create user document if it doesn't exist
      await db.collection("users").doc(userCred.user.uid).set({
        email: emailValue,
        role: "member",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    const role = userDoc.exists ? userDoc.data().role : "member";
    console.log("User role:", role);
    
    // Log the login
    await writeLog("login", { email: emailValue, role });
    
    // Redirect based on role
    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "member.html";
    }
    
  } catch (err) {
    console.error("Login error:", err);
    authMsg.style.color = "red";
    
    switch(err.code) {
      case "auth/user-not-found":
        showNotification("No account found with this email. Please register first.", "error");
        break;
      case "auth/wrong-password":
        showNotification("Incorrect password. Please try again.", "error");
        password.value = "";
        break;
      case "auth/invalid-credential":
        showNotification("Invalid email or password. Please try again.", "error");
        password.value = "";
        break;
      case "auth/too-many-requests":
        showNotification("Too many failed attempts. Please try again later.", "error");
        break;
      case "auth/network-request-failed":
        showNotification("Unable to connect to server. Please check your internet connection and try again.", "error");
        break;
      case "auth/internal-error":
        showNotification("Server error. Please try again in a few moments.", "error");
        break;
      default:
        if (!navigator.onLine) {
          showNotification("You are offline. Please check your internet connection.", "error");
        } else {
          showNotification("Login failed: " + (err.message || "Unknown error"), "error");
        }
    }
  } finally {
    // Re-enable buttons
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});
