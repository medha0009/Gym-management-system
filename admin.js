// admin.js
import { auth, db, testConnection } from "./firebase-config.js";
import { writeLog, toCsv } from "./helpers.js";

// Initialize loading indicator
const loadingIndicator = document.getElementById('loading-indicator');

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

// Check connection before operations
async function checkConnectionBeforeOperation() {
    if (!navigator.onLine) {
        showNotification("You are offline. Please check your internet connection.", "error");
        return false;
    }

    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            showNotification("Cannot connect to server. Please check your connection.", "error");
            return false;
        }
        return true;
    } catch (error) {
        console.error("Connection test error:", error);
        showNotification("Error checking connection. Please try again.", "error");
        return false;
    }
}

// Error handler wrapper
async function handleOperation(operation, errorMessage) {
    try {
        if (!await checkConnectionBeforeOperation()) {
            return false;
        }
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

const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

// Members UI
const mName = document.getElementById("m_name");
const mEmail = document.getElementById("m_email");
const mPackage = document.getElementById("m_package");
const addMemberBtn = document.getElementById("addMemberBtn");
const membersList = document.getElementById("membersList");

// Bills UI
const billEmail = document.getElementById("bill_member_email");
const billAmount = document.getElementById("bill_amount");
const billMonth = document.getElementById("bill_month");
const createBillBtn = document.getElementById("createBillBtn");
const billsList = document.getElementById("billsList");

// Notifications
const notifyEmail = document.getElementById("notify_email");
const notifyMessage = document.getElementById("notify_message");
const sendNotificationBtn = document.getElementById("sendNotificationBtn");
const monthlyNotifyBtn = document.getElementById("monthlyNotifyBtn");
const notificationsList = document.getElementById("notificationsList");

// Supplements
const suppName = document.getElementById("supp_name");
const suppPrice = document.getElementById("supp_price");
const addSuppBtn = document.getElementById("addSuppBtn");
const supplementsList = document.getElementById("supplementsList");

// Diet
const dietEmail = document.getElementById("diet_member_email");
const dietPlan = document.getElementById("diet_plan");
const addDietBtn = document.getElementById("addDietBtn");
const dietList = document.getElementById("dietList");

// Export & Logs
const exportMembersCsv = document.getElementById("exportMembersCsv");
const exportBillsCsv = document.getElementById("exportBillsCsv");
const logsList = document.getElementById("logsList");

// Helpers
function el(text) { const d = document.createElement('div'); d.innerText = text; return d; }

// Auth guard
auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "index.html"; }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// Refresh
refreshBtn.addEventListener("click", () => loadAll());

// Members
addMemberBtn.addEventListener("click", async () => {
    const name = mName.value.trim();
    const email = mEmail.value.trim();
    const feePackage = mPackage.value.trim();
    
    if (!name || !email) {
        showNotification("Please enter both name and email");
        return;
    }

    if (!email.includes('@')) {
        showNotification("Please enter a valid email address");
        return;
    }

    const success = await handleOperation(async () => {
        // Check if member already exists
        const existingMember = await db.collection("members").where("email", "==", email).get();
        if (!existingMember.empty) {
            throw new Error("A member with this email already exists");
        }

        // Add new member
        await db.collection("members").add({
            name,
            email,
            feePackage,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        // Log the action
        await writeLog("add_member", { name, email, feePackage });

        // Clear form
        mName.value = "";
        mEmail.value = "";
        mPackage.value = "";

        // Refresh list
        await loadMembers();
        
        showNotification("Member added successfully!", "success");
    }, "Error adding member");

    if (!success) {
        console.error("Failed to add member");
    }
});

async function loadMembers() {
    try {
        setLoading(true);
        membersList.innerHTML = "";
    
        const snap = await db.collection("members").orderBy("createdAt", "desc").get();
    
        if (snap.empty) {
            membersList.innerHTML = '<div class="no-data">No members found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
      const row = document.createElement("div");
      row.className = "member-row";
      row.innerHTML = `
        <div class="member-info">
          <strong>${data.name}</strong>
          <span class="email">(${data.email})</span>
          <span class="package">${data.feePackage || "-"}</span>
        </div>
        <div class="member-actions">
          <button data-id="${docSnap.id}" class="editMember">Edit</button>
          <button data-id="${docSnap.id}" class="delMember">Delete</button>
        </div>
      `;
      membersList.appendChild(row);
    });

    // Attach listeners
        membersList.querySelectorAll(".delMember").forEach(btn => {
            btn.onclick = async (e) => {
                try {
                    const id = e.target.dataset.id;
                    if (!confirm("Are you sure you want to delete this member?")) return;
          
                    setLoading(true);
                    await db.collection("members").doc(id).delete();
                    await writeLog("delete_member", { id });
                    await loadMembers();
                    alert("Member deleted successfully!");
                } catch (error) {
                    console.error("Error deleting member:", error);
                    alert("Error deleting member: " + error.message);
                } finally {
                    setLoading(false);
                }
            };
        });

        membersList.querySelectorAll(".editMember").forEach(btn => {
            btn.onclick = async (e) => {
                try {
                    const id = e.target.dataset.id;
                    const newName = prompt("Enter new name");
                    if (!newName || !newName.trim()) return;
          
                    setLoading(true);
                    await db.collection("members").doc(id).update({ 
                        name: newName.trim(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await writeLog("edit_member", { id, newName });
                    await loadMembers();
                    alert("Member updated successfully!");
                } catch (error) {
                    console.error("Error updating member:", error);
                    alert("Error updating member: " + error.message);
                } finally {
                    setLoading(false);
                }
            };
        });
  } catch (error) {
    console.error("Error loading members:", error);
    membersList.innerHTML = '<div class="error">Error loading members. Please try again.</div>';
  } finally {
    setLoading(false);
  }
}

// Bills
createBillBtn.addEventListener("click", async () => {
    const email = billEmail.value.trim();
    const amount = parseFloat(billAmount.value);
    const month = billMonth.value.trim();

    if (!email || !amount || !month) {
        showNotification("Please enter all bill fields");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showNotification("Please enter a valid amount");
        return;
    }

    const success = await handleOperation(async () => {
        // find member by email
        const snap = await db.collection("members").where("email", "==", email).get();
        if (snap.empty) {
            throw new Error("Member not found");
        }

        const memberId = snap.docs[0].id;
        await db.collection("bills").add({
            memberId,
            email,
            amount,
            month,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            paid: false
        });

        await writeLog("create_bill", { email, amount, month });
        
        // Clear form
        billEmail.value = billAmount.value = billMonth.value = "";
        await loadBills();
        
        showNotification("Bill created successfully!", "success");
    }, "Error creating bill");

    if (!success) {
        console.error("Failed to create bill");
    }
});

async function loadBills() {
    await handleOperation(async () => {
        billsList.innerHTML = "";
        const snap = await db.collection("bills").orderBy("createdAt", "desc").get();
        
        if (snap.empty) {
            billsList.innerHTML = '<div class="no-data">No bills found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "bill-row";
            row.innerHTML = `
                <div class="bill-info">
                    <span class="email">${d.email}</span>
                    <span class="amount">₹${d.amount}</span>
                    <span class="month">(${d.month})</span>
                    <span class="status">Paid: ${d.paid ? 'Yes' : 'No'}</span>
                </div>
                <div class="bill-actions">
                    ${!d.paid ? `<button data-id="${docSnap.id}" class="markPaid">Mark Paid</button>` : ''}
                    <button data-id="${docSnap.id}" class="delBill">Delete</button>
                </div>
            `;
            billsList.appendChild(row);
        });

        // Attach listeners
        billsList.querySelectorAll(".markPaid").forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.dataset.id;
                    const success = await handleOperation(async () => {
                    await db.collection("bills").doc(id).update({ 
                        paid: true,
                        paidAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await writeLog("mark_paid", { id });
                    await loadBills();
                    showNotification("Bill marked as paid successfully!", "success");
                }, "Error marking bill as paid");

                if (!success) {
                    console.error("Failed to mark bill as paid");
                }
            };
        });

        billsList.querySelectorAll(".delBill").forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.dataset.id;
                if (!confirm("Are you sure you want to delete this bill?")) return;

                    const success = await handleOperation(async () => {
                    await db.collection("bills").doc(id).delete();
                    await writeLog("delete_bill", { id });
                    await loadBills();
                    showNotification("Bill deleted successfully!", "success");
                }, "Error deleting bill");

                if (!success) {
                    console.error("Failed to delete bill");
                }
            };
        });
    }, "Error loading bills");
}

// Notifications
sendNotificationBtn.addEventListener("click", async () => {
    const email = notifyEmail.value.trim();
    const msg = notifyMessage.value.trim();

    if (!msg) {
        showNotification("Please enter a message");
        return;
    }

    const success = await handleOperation(async () => {
        if (email) {
            // Single member notification
            const memberExists = await db.collection("members").where("email", "==", email).get();
            if (memberExists.empty) {
                throw new Error("Member not found with this email");
            }

            await db.collection("notifications").add({
                email,
                message: msg,
                ts: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        } else {
            // Broadcast to all members
            const membersSnap = await db.collection("members").get();
            if (membersSnap.empty) {
                throw new Error("No members found to send notifications");
            }

            const batch = [];
            for (const m of membersSnap.docs) {
                batch.push(
                    db.collection("notifications").add({
                        email: m.data().email,
                        message: msg,
                        ts: firebase.firestore.FieldValue.serverTimestamp(),
                        read: false
                    })
                );
            }
            await Promise.all(batch);
        }

        await writeLog("send_notification", { email: email || "broadcast", msg });
        notifyEmail.value = notifyMessage.value = "";
        await loadNotifications();
        
        showNotification(
            email 
                ? "Notification sent successfully!" 
                : "Broadcast notification sent to all members!",
            "success"
        );
    }, "Error sending notification");

    if (!success) {
        console.error("Failed to send notification");
    }
});

monthlyNotifyBtn.addEventListener("click", async () => {
        const success = await handleOperation(async () => {
        // Get all members
        const membersSnap = await db.collection("members").get();
        
        if (membersSnap.empty) {
            throw new Error("No members found to send notifications");
        }

        // Prepare batch of notifications
        const batch = [];
        for (const m of membersSnap.docs) {
            const mem = m.data();
            const message = `Monthly fee reminder: please pay your ${mem.feePackage || "fee"}`;
            batch.push(
                db.collection("notifications").add({
                    email: mem.email,
                    message,
                    ts: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                })
            );
        }

        // Send all notifications in parallel
        await Promise.all(batch);
        await writeLog("monthly_notifications", { count: batch.length });
        await loadNotifications();

        showNotification(`Monthly fee reminders sent to ${batch.length} members!`, "success");
    }, "Error sending monthly notifications");

    if (!success) {
        console.error("Failed to send monthly notifications");
    }
});

async function loadNotifications() {
    notificationsList.innerHTML = "";
    const snap = await db.collection("notifications").orderBy("ts","desc").limit(100).get();
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const row = document.createElement("div");
        row.innerHTML = `${d.email} — ${d.message} — ${d.ts?.toDate?.() || d.ts}
            <button data-id="${docSnap.id}" class="delNotif">Delete</button>`;
        notificationsList.appendChild(row);
    });
    notificationsList.querySelectorAll(".delNotif").forEach(btn => btn.onclick = async (e) => {
        await db.collection("notifications").doc(e.target.dataset.id).delete();
        loadNotifications();
    });
}

// Supplements
addSuppBtn.addEventListener("click", async () => {
    const name = suppName.value.trim();
    const price = parseFloat(suppPrice.value);

    if (!name) {
        showNotification("Please enter supplement name");
        return;
    }

    if (isNaN(price) || price <= 0) {
        showNotification("Please enter a valid price");
        return;
    }

    const success = await handleOperation(async () => {
        // Check if supplement already exists
        const existingSupp = await db.collection("supplements").where("name", "==", name).get();
        if (!existingSupp.empty) {
            throw new Error("A supplement with this name already exists");
        }

        await db.collection("supplements").add({
            name,
            price,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await writeLog("add_supp", { name, price });
        
        suppName.value = suppPrice.value = "";
        await loadSupplements();
        
        showNotification("Supplement added successfully!", "success");
    }, "Error adding supplement");

    if (!success) {
        console.error("Failed to add supplement");
    }
});

async function loadSupplements() {
    await handleOperation(async () => {
        supplementsList.innerHTML = "";
    const snap = await db.collection("supplements").orderBy("createdAt", "desc").get();
        
        if (snap.empty) {
            supplementsList.innerHTML = '<div class="no-data">No supplements found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "supplement-row";
            row.innerHTML = `
                <div class="supplement-info">
                    <span class="name">${d.name}</span>
                    <span class="price">₹${d.price}</span>
                </div>
                <div class="supplement-actions">
                    <button data-id="${docSnap.id}" class="delSupp">Delete</button>
                </div>
            `;
            supplementsList.appendChild(row);
        });

        // Attach listeners
        supplementsList.querySelectorAll(".delSupp").forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.dataset.id;
                if (!confirm("Are you sure you want to delete this supplement?")) return;

                    const success = await handleOperation(async () => {
                    await db.collection("supplements").doc(id).delete();
                    await writeLog("delete_supplement", { id });
                    await loadSupplements();
                    showNotification("Supplement deleted successfully!", "success");
                }, "Error deleting supplement");

                if (!success) {
                    console.error("Failed to delete supplement");
                }
            };
        });
    }, "Error loading supplements");
}

// Diets
addDietBtn.addEventListener("click", async () => {
    const email = dietEmail.value.trim();
    const plan = dietPlan.value.trim();

    if (!email || !plan) {
        showNotification("Please enter member email and plan");
        return;
    }

    const success = await handleOperation(async () => {
        // Check if member exists
        const memberExists = await db.collection("members").where("email", "==", email).get();
        if (memberExists.empty) {
            throw new Error("Member not found with this email");
        }

        // Check if member already has a diet plan
        const existingDiet = await db.collection("diets").where("email", "==", email).get();
        if (!existingDiet.empty) {
            if (!confirm("Member already has a diet plan. Do you want to add another one?")) {
                return;
            }
        }

        await db.collection("diets").add({
            email,
            plan,
            assignedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await writeLog("add_diet", { email });
        
        dietEmail.value = dietPlan.value = "";
        await loadDiets();
        
        showNotification("Diet plan added successfully!", "success");
    }, "Error adding diet plan");

    if (!success) {
        console.error("Failed to add diet plan");
    }
});

async function loadDiets() {
    await handleOperation(async () => {
        dietList.innerHTML = "";
        const snap = await db.collection("diets").orderBy("assignedAt", "desc").get();
        
        if (snap.empty) {
            dietList.innerHTML = '<div class="no-data">No diet plans found</div>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const row = document.createElement("div");
            row.className = "diet-row";
            row.innerHTML = `
                <div class="diet-info">
                    <span class="email">${d.email}</span>
                    <div class="plan">${d.plan}</div>
                    <span class="date">${d.assignedAt?.toDate?.().toLocaleDateString() || 'N/A'}</span>
                </div>
                <div class="diet-actions">
                    <button data-id="${docSnap.id}" class="delDiet">Delete</button>
                </div>
            `;
            dietList.appendChild(row);
        });

        // Attach listeners
        dietList.querySelectorAll(".delDiet").forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.dataset.id;
                if (!confirm("Are you sure you want to delete this diet plan?")) return;

                    const success = await handleOperation(async () => {
                    await db.collection("diets").doc(id).delete();
                    await writeLog("delete_diet", { id });
                    await loadDiets();
                    showNotification("Diet plan deleted successfully!", "success");
                }, "Error deleting diet plan");

                if (!success) {
                    console.error("Failed to delete diet plan");
                }
            };
        });
    }, "Error loading diet plans");
}

// Export CSV
exportMembersCsv.addEventListener("click", async () => {
    const success = await handleOperation(async () => {
        const snap = await db.collection("members").get();
        
        if (snap.empty) {
            throw new Error("No members found to export");
        }

        const rows = snap.docs.map(d => ({
            name: d.data().name,
            email: d.data().email,
            package: d.data().feePackage || ""
        }));

        const csv = toCsv(rows, ["name", "email", "package"]);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification(`Successfully exported ${rows.length} members to CSV`, "success");
    }, "Error exporting members to CSV");

    if (!success) {
        console.error("Failed to export members to CSV");
    }
});

exportBillsCsv.addEventListener("click", async () => {
    const success = await handleOperation(async () => {
        const snap = await db.collection("bills").get();
        
        if (snap.empty) {
            throw new Error("No bills found to export");
        }

        const rows = snap.docs.map(d => ({
            email: d.data().email,
            amount: d.data().amount,
            month: d.data().month,
            paid: d.data().paid
        }));

        const csv = toCsv(rows, ["email", "amount", "month", "paid"]);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bills_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification(`Successfully exported ${rows.length} bills to CSV`, "success");
    }, "Error exporting bills to CSV");

    if (!success) {
        console.error("Failed to export bills to CSV");
    }
});

// Logs
async function loadLogs() {
    logsList.innerHTML = "";
    const snap = await db.collection("logs").orderBy("ts","desc").limit(50).get();
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const row = document.createElement("div");
        row.textContent = `${d.ts?.toDate?.() || d.ts} — ${d.action} — ${JSON.stringify(d.details || {})}`;
        logsList.appendChild(row);
    });
}

// Load all
async function loadAll() {
  await loadMembers();
  await loadBills();
  await loadNotifications();
  await loadSupplements();
  await loadDiets();
  await loadLogs();
}

loadAll();
