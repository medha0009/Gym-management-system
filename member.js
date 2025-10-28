// member.js
import { auth, db } from "./firebase-config.js";
import { writeLog } from "./helpers.js";

// Initialize loading indicator
const loadingIndicator = document.getElementById('loading-indicator');

// Get DOM elements
const elements = {
    logoutMemberBtn: document.getElementById("logoutMemberBtn"),
    myDetails: document.getElementById("myDetails"),
    myBills: document.getElementById("myBills"),
    myNotifications: document.getElementById("myNotifications"),
    memberSupplements: document.getElementById("memberSupplements"),
    myDiet: document.getElementById("myDiet"),
    searchQueryInput: document.getElementById("searchQuery"),
    searchBtn: document.getElementById("searchBtn"),
    searchResults: document.getElementById("searchResults")
};

// Verify all elements exist
Object.entries(elements).forEach(([name, element]) => {
    if (!element) {
        throw new Error(`Required element ${name} not found in the document`);
    }
});

const {
    logoutMemberBtn,
    myDetails,
    myBills,
    myNotifications,
    memberSupplements,
    myDiet,
    searchQueryInput,
    searchBtn,
    searchResults
} = elements;

// Show/hide loading state
function setLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    alert(message); // Simple alert for now
}

// Error handler wrapper
async function handleOperation(operation, errorMessage) {
    try {
        setLoading(true);
        await operation();
        return true;
    } catch (error) {
        console.error(errorMessage, error);
        showNotification(errorMessage + ": " + error.message, "error");
        return false;
    } finally {
        setLoading(false);
    }
}

let currentUserEmail = null;

auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    await handleOperation(async () => {
        const udoc = await db.collection("users").doc(user.uid).get();
        currentUserEmail = udoc.exists ? udoc.data().email : user.email;
        
        myDetails.innerHTML = `
            <div class="user-details">
                <strong>Email:</strong> ${currentUserEmail}
                <div class="status">Status: Active</div>
            </div>
        `;

        // Load all data
        await Promise.all([
            loadMyBills(),
            loadMyNotifications(),
            loadSupplements(),
            loadDiet()
        ]);

        await writeLog("member_login", { 
            email: currentUserEmail,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification("Welcome back!", "success");
    }, "Error loading member data");
});

// Logout handler
logoutMemberBtn.addEventListener("click", async () => {
    const success = await handleOperation(async () => {
        await writeLog("member_logout", { 
            email: currentUserEmail,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        await auth.signOut();
        window.location.href = "index.html";
    }, "Error logging out");

    if (!success) {
        console.error("Failed to logout properly");
    }
});

async function loadMyBills() {
    await handleOperation(async () => {
        myBills.innerHTML = "";
        const snap = await db.collection("bills").where("email", "==", currentUserEmail).get();

        if (snap.empty) {
            myBills.innerHTML = '<div class="no-data">No bills found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "bill-row";
            row.innerHTML = `
                <div class="bill-info">
                    <div class="amount">₹${d.amount}</div>
                    <div class="month">${d.month}</div>
                    <div class="status ${d.paid ? 'paid' : 'unpaid'}">
                        ${d.paid ? 'Paid' : 'Unpaid'}
                    </div>
                </div>
                <div class="bill-actions">
                    <button data-id="${docSnap.id}" class="viewReceipt">View Receipt</button>
                </div>
            `;
            myBills.appendChild(row);
        });

        // Add receipt viewers
        myBills.querySelectorAll(".viewReceipt").forEach(btn => {
            btn.onclick = async (e) => {
                const billId = e.target.dataset.id;
                const billDoc = await db.collection("bills").doc(billId).get();
                if (billDoc.exists) {
                    const billData = billDoc.data();
                    alert(
                        "Receipt Details:\n" +
                        `Amount: ₹${billData.amount}\n` +
                        `Month: ${billData.month}\n` +
                        `Status: ${billData.paid ? 'Paid' : 'Unpaid'}\n` +
                        `Date: ${billData.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}`
                    );
                }
            };
        });
    }, "Error loading bills");
}

async function loadMyNotifications() {
    await handleOperation(async () => {
        myNotifications.innerHTML = "";
        const snap = await db.collection("notifications")
            .where("email", "==", currentUserEmail)
            .orderBy("ts", "desc")
            .get();

        if (snap.empty) {
            myNotifications.innerHTML = '<div class="no-data">No notifications found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "notification-row";
            row.innerHTML = `
                <div class="notification-message">${d.message}</div>
                <div class="notification-time">
                    ${d.ts?.toDate?.().toLocaleString() || 'N/A'}
                </div>
            `;
            myNotifications.appendChild(row);
        });
    }, "Error loading notifications");
}

async function loadSupplements() {
    await handleOperation(async () => {
        memberSupplements.innerHTML = "";
        const snap = await db.collection("supplements").orderBy("name").get();

        if (snap.empty) {
            memberSupplements.innerHTML = '<div class="no-data">No supplements available</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "supplement-row";
            row.innerHTML = `
                <div class="supplement-info">
                    <div class="name">${d.name}</div>
                    <div class="price">₹${d.price}</div>
                </div>
            `;
            memberSupplements.appendChild(row);
        });
    }, "Error loading supplements");
}

async function loadDiet() {
    await handleOperation(async () => {
        myDiet.innerHTML = "";
        const snap = await db.collection("diets")
            .where("email", "==", currentUserEmail)
            .orderBy("assignedAt", "desc")
            .get();

        if (snap.empty) {
            myDiet.innerHTML = '<div class="no-data">No diet plan assigned</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "diet-row";
            row.innerHTML = `
                <div class="diet-info">
                    <div class="plan">${d.plan}</div>
                    <div class="assigned-date">
                        Assigned: ${d.assignedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </div>
                </div>
            `;
            myDiet.appendChild(row);
        });
    }, "Error loading diet plan");
}

// Search functionality
searchBtn.addEventListener("click", async () => {
    const query = searchQueryInput.value.trim().toLowerCase();
    
    if (!query) {
        showNotification("Please enter a search term", "error");
        return;
    }

    await handleOperation(async () => {
        searchResults.innerHTML = '<div class="loading">Searching...</div>';
        
        const snap = await db.collection("members").get();
        const filtered = snap.docs.filter(d => {
            const data = d.data();
            return (data.name && data.name.toLowerCase().includes(query)) || 
                   (data.email && data.email.toLowerCase().includes(query));
        });

        searchResults.innerHTML = "";
        
        if (!filtered.length) {
            searchResults.innerHTML = '<div class="no-data">No matching records found</div>';
            return;
        }

        filtered.forEach(fd => {
            const data = fd.data();
            const row = document.createElement("div");
            row.className = "search-result-row";
            row.innerHTML = `
                <div class="member-info">
                    <div class="name">${data.name || 'N/A'}</div>
                    <div class="email">${data.email}</div>
                    <div class="package">Package: ${data.feePackage || 'N/A'}</div>
                </div>
            `;
            searchResults.appendChild(row);
        });

        await writeLog("member_search", { 
            email: currentUserEmail, 
            query, 
            results: filtered.length,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`Found ${filtered.length} matching record(s)`, "success");
    }, "Error performing search");
});
