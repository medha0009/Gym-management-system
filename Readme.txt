# Gym Management System (HTML, CSS, JavaScript, Firebase)

## Project Overview

The Gym Management System is a web-based platform designed to help gym owners and members manage daily operations efficiently. It includes Admin and User modules with secure authentication, member management, billing, notifications, and more.

This project uses Firebase as a backend for Authentication and Database.

---

## Features

### Authentication
- Admin & User Registration
- Login for Admin and Users
- Firebase Authentication (Email + Password)

### Admin Panel
- Add New Members
- Update, View & Delete Members
- Assign Membership Plans
- Generate and View Bills
- Manage Supplements (Store Module)
- Send Monthly Notifications
- Export Reports (Members, Bills, Attendance)
- Assign Diet and Workout Plans
- Activity Logging for Every Action

### User Panel
- Login as User
- View Profile and Membership Details
- View Payment Receipts & Notifications
- Search Own Records
- View Assigned Diet and Workout Plan

---

## Tech Stack

Frontend: HTML, CSS, JavaScript  
Backend Services: Firebase Authentication, Firebase Firestore  
Logging: JavaScript Logging + Firestore Logs  
(Deployment optional): Firebase Hosting  

---

## Firebase Setup Instructions

1. Create Firebase Project  
   - Go to Firebase Console and create a new project

2. Enable Authentication  
   - Go to Authentication → Get Started  
   - Enable Email/Password sign-in method

3. Create Web App  
   - Go to Project Settings → Your Apps → Web App (</>)  
   - Register App and copy the firebaseConfig code  
   - Paste it inside `firebase-config.js`

4. Setup Firestore Database  
   - Go to Firestore → Create Database  
   - Start in Test Mode (recommended while developing)

5. Create the following Firestore Collections:
   - users (Admin and Member data)
   - plans (Membership plans)
   - payments (Billing data)
   - attendance (Daily login record)
   - store (Supplements data)
   - diet (Diet plans)
   - logs (All system actions)

---

## Project Folder Structure

gym-management-system  
│  
├── index.html  
├── admin.html  
├── user.html  
│  
├── css/  
│   ├── style.css  
│   └── admin.css  
│  
├── js/  
│   ├── firebase-config.js  
│   ├── auth-admin.js  
│   ├── auth-user.js  
│   ├── admin-functions.js  
│   ├── user-functions.js  
│   └── logger.js  
│  
└── assets/  
    ├── images/  
    └── icons/  

---

## Test Cases

Test 1: Admin Registration  
Input: Valid email & password  
Expected Output: Admin account created and stored in Firebase  

Test 2: Login with wrong password  
Expected Output: Show error message  

Test 3: Add Member  
Expected Output: Data saved into Firestore users collection  

Test 4: Delete Member  
Expected Output: Member removed and entry added in logs  

Test 5: User Profile View  
Expected Output: Correct data visible only to logged-in user  

---

## Security Rules for Firestore (Recommended)



---

## Logging

- Every admin and user action is logged into the "logs" Firestore collection
- Useful for tracking user activity or misuse

---

## How to Run the Project

1. Download or clone the project
2. Open the folder in VS Code
3. Right click on index.html
4. Select "Open with Live Server"
5. Application runs at: http://127.0.0.1:5500/

---

## Future Enhancements

- Integrate Razorpay/UPI for payments
- Email/SMS alerts for membership renewal
- QR Code attendance system
- Dashboard analytics charts for admins
- Role-based access (Trainer, Accountant, Super Admin)

---


