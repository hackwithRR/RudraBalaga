# Rudra Parayana - Mobile Web Application

A mobile-first web application for Vedic chanting group management with Firebase authentication and database.

## Quick Start (Demo Mode)

To test the app without Firebase setup, add `?demo=true` to the URL:
- `index.html?demo=true` - Member dashboard in demo mode
- `admin.html?demo=true` - Admin panel in demo mode

## Firebase Setup (Required for Production)

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Register your web app

### 2. Enable Authentication
1. Go to Authentication > Sign-in method
2. Enable **Phone** authentication
3. Enable **Google** sign-in
4. Add your domain to **Authorized domains** (under Authentication > Settings)
   - For local testing: `localhost`
   - For production: your actual domain

### 3. Enable Firestore
1. Go to Firestore Database
2. Create database in test mode

### 4. Set Up Security Rules
Go to Firestore > Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow read/write for authenticated users
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Events collection - allow read for all, write for authenticated
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Bus routes collection - allow read for all, write for authenticated
    match /busRoutes/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // RSVPs collection - allow read/write for authenticated users
    match /rsvps/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Announcements collection - allow read for all, write for authenticated
    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Attendance collection - allow read/write for authenticated users
    match /attendance/{attendanceId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**For testing without Firebase authentication (demo mode), use these relaxed rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow read/write for all (for demo mode)
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Events collection - allow read/write for all
    match /events/{eventId} {
      allow read, write: if true;
    }
    
    // Bus routes collection - allow read/write for all
    match /busRoutes/{eventId} {
      allow read, write: if true;
    }
    
    // RSVPs collection - allow read/write for all
    match /rsvps/{userId} {
      allow read, write: if true;
    }
    
    // Announcements collection - allow read/write for all
    match /announcements/{announcementId} {
      allow read, write: if true;
    }
    
    // Attendance collection - allow read/write for all
    match /attendance/{attendanceId} {
      allow read, write: if true;
    }
  }
}
```

**IMPORTANT: Use the first set of rules for production. The second set is only for testing/demo purposes.**

### 5. Update Configuration
Edit `firebase-config.js` with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 6. Set Up Admin Users
1. Go to Firestore Database
2. Create a document in the `users` collection
3. Set the document ID to the user's Firebase UID
4. Add a field `role` with value `admin`

## File Structure

- `index.html` - Member dashboard (requires login)
- `admin.html` - Admin panel (requires admin role)
- `login.html` - Login page
- `profile.html` - Profile page (edit user info, upload photo)
- `firebase-config.js` - Firebase configuration

## Features

### Authentication
- Google Sign-In
- Phone number OTP
- Account linking (prevents duplicate accounts)
- User ID in format 00001, 00002, etc.

### Member Dashboard
- Next upcoming event display
- RSVP (Attending/Not Attending)
- Bus pickup point selection for outstation events
- Google Maps link for outstation events
- Chanting progress tracking
- Admin button (only visible for admin users)

### Admin Panel
- Create events form
- Manage bus routes for outstation events
- View attendance roster with headcount
- Bus pickup breakdown

## Design Features

- Large fonts (18px+ base) for elderly users
- High contrast colors
- Large touch targets (56-60px)
- Clean, uncluttered interface
- Saffron/orange color scheme (#ff5722)
- Premium loading screen with Trishul/Shivling animation

---

# Real-Time Notification System

## What members get

| Trigger | What happens |
|---|---|
| Admin creates an event | All members get "New event: …" instantly (bell + toast + panel) |
| Admin approves/rejects a payment | That member is notified instantly |
| Admin approves/rejects a donation | The donor is notified instantly |
| Admin saves bus number / driver number | All attending members get a "Bus update" with bus no. + driver phone |
| Admin sends an announcement | All members get it as a notification |
| Event is tomorrow / today | Members see a reminder (bell + toast on open); with push enabled it arrives even when the app is closed |
| Member submits payment / donation proof | Admins get "submitted for review" |

How it works: every page includes `notifications.js` (bell + badge + slide-in panel + live toasts) and listens to the `notifications` Firestore collection in real time. `pwa.js` makes the app installable (Chrome ⋮ menu → **Install Rudra Balaga**, Android → **Add to Home Screen**, iOS Safari Share → **Add to Home Screen**).

## Firestore collections used

- `notifications/{autoId}` — one doc per recipient: `{ uid, type, title, body, eventId, read, createdAt }`
- `fcmTokens/{token}` — push tokens: `{ uid, platform, updatedAt }`
- `pushMeta/{reminder_kind_eventId}` — ensures each push reminder is sent exactly once

## Security rules (add to your existing rules)

```
    // Notifications - each user reads/marks only their own; members may create own reminders, admins may fan out
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && (
        request.resource.data.uid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    // Push tokens - a user manages only their own tokens; admins can read for sending
    match /fcmTokens/{tokenId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }

    // pushMeta - only admins / Cloud Function (admin SDK bypasses rules)
    match /pushMeta/{metaId} {
      allow read, write: if request.auth != null;
    }
```

## Push notifications ("WhatsApp-style", free)

1. **VAPID key:** Firebase Console > ⚙️ Project settings > Cloud Messaging > Web push certificates > generate a key pair, then paste the **public key** into `notifications.js` (`PUSH_VAPID_KEY`).
2. Members tap **"Enable phone / laptop notifications"** inside the bell panel → their FCM token is saved to `fcmTokens`.
3. **Sending (free, no Blaze):** the included GitHub Action runs daily at 19:00 IST:
   - Firebase Console > Project settings > Service accounts > **Generate new private key**
   - GitHub repo > Settings > Secrets and variables > Actions > New secret `FIREBASE_SERVICE_ACCOUNT` = full JSON contents
   - Push `service-account.json` is NEVER committed. The Action sends "day before" reminders via `tools/send-notifications.mjs`.
   - Manual test: Actions tab → "Daily event reminders (push)" → Run workflow, or locally:
     ```bash
     npm install firebase-admin
     GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node tools/send-notifications.mjs reminders
     ```
   - Immediate broadcast: `node tools/send-notifications.mjs broadcast --title="..." --body="..."`
4. **Platform notes:** Android + desktop browsers: push works right away. iPhone/iPad: push works after **Share → Add to Home Screen** (iOS 16.4+). Later, if you enable Blaze, the same logic can move to a Cloud Function trigger.

## Files

- `notifications.js` — bell, badge, panel, toasts, reminders, push token capture (all pages)
- `pwa.js` — service-worker registration + "Install App" banner
- `firebase-messaging-sw.js` — service worker: offline shell + FCM background push
- `manifest.json`, `icons/` — PWA identity (app icon, name, colors)
- `tools/send-notifications.mjs` + `.github/workflows/daily-reminders.yml` — free push sender
# RudraBalaga
