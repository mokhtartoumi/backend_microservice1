import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import * as admin from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import cors from "cors";

// Initialize Firebase Admin SDK
const adminConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
};

admin.initializeApp(adminConfig);

// Test Firebase connection
admin.firestore().listCollections()
  .then(() => console.log('✅ Firebase Admin connected successfully'))
  .catch(err => console.error('🔥 Firebase Admin connection failed:', err));

const db: Firestore = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Client SDK
const clientConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(clientConfig);
const auth = getAuth(firebaseApp);

// Configure CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Base User Class
class User {
  name: string;
  email: string;
  password: string;
  role: string;
  isAvailable: boolean;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;

  constructor(name: string, email: string, password: string, role: string) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.isAvailable = true;
    this.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
}

// Chef Class
class Chef extends User {
  place: string;

  constructor(name: string, email: string, password: string, place: string) {
    super(name, email, password, "chef");
    this.place = place;
  }
}

// Assistant Class
class Assistant extends User {
  section: string;
  chefIds: string[];

  constructor(
    name: string,
    email: string,
    password: string,
    section: string,
    chefIds: string[] = []
  ) {
    super(name, email, password, "assistant");
    this.section = section;
    this.chefIds = chefIds;
  }
}

// Technicien Class
class Technicien extends User {
  speciality: string;
  allProblems: string[];
  currentProblem: string | null;

  constructor(
    name: string,
    email: string,
    password: string,
    speciality: string,
    allProblems: string[] = [],
    currentProblem: string | null = null
  ) {
    super(name, email, password, "technicien");
    this.speciality = speciality;
    this.allProblems = allProblems;
    this.currentProblem = currentProblem;
  }
}

// Admin Class
class Admin extends User {
  nationality: string;

  constructor(
    name: string,
    email: string,
    password: string,
    nationality: string
  ) {
    super(name, email, password, "admin");
    this.nationality = nationality;
  }
}

// API Endpoints
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the User Service Microservice!");
});

// Login endpoint
app.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Auth success for:', userCredential.user.uid);
    
    const token = await userCredential.user.getIdToken();
    const uid = userCredential.user.uid;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      console.error('User not found in Firestore');
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      uid,
      token,
      ...userDoc.data(),
    });
  } catch (error: any) {
    console.error("Login error:", error);
    
    if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      res.status(401).json({ error: "Invalid credentials" });
    } else {
      res.status(500).json({ 
        error: "Login failed",
        details: error.message 
      });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
