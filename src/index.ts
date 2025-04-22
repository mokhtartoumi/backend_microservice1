import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import * as admin from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import cors from "cors";

// Initialize Firebase Admin SDK

const serviceAccount = {
  type: "service_account",
  project_id: "test-e1389",
  private_key_id: "09aea48a58a25bf5c71b2d6b7aa8f0c115501e99",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDtyJr/pUl5jCs6\nfOWQwUhvZcb+S8soJBGR+0W6IbvYixwBvk4P1XXE/JjJaG6ZpPj31SXMlq9bCSxN\nNbmaXoFmi4ex2s70mhvLXGE8AvUzeTW7Z33k5mnKmd74Vdqk5F+DV7EJVjeUaTMe\npLIN3OM6Cl89gVCKJlT1tHpHqKpyDWPWvmCGsXLx5la5rUnEL03RWJ6yPpkAPoKe\nHxEhJnrF/KEqL79CgH5EP9AYYxTu33xMglTnFw4p34fsMXjlrxmDlDce5pOCVbja\nq2WYAKj6G46K/XdPCyjHP2G59lZpSc+6meirLNmHdBI++K+NkP9BrQvb54tx4cZs\nuOOsbUjtAgMBAAECgf8g+TCFQuZtdIKKGce7yxHAYNy3ZstFRbsqAy4oIYVrAd9g\nXoN0rqUmK+EEDPdJVxcvRt92/25RsXPzQP/76B8JmU+32h/Yy4YPLUBOkhpuiOBq\nnG9Yzprc/Xlt9nnbY8/a5s4l/U63xd7Q4QXP5lGcOtP6M3R3s9kUOXK7fSglqHE+\n8gXZIwa5iJPxy5vBfbSDAkPiK+bJiMjGHnhtj/yzKwvw8eGdDVbwOZ/+gT9WSBx2\nCDG2dlncW41KOfFHKoBFnUOiVHMNbtg7kaUigtnhhv9++5catP55DZc3/iYWq0eq\neXaim+WNoH+CtzUxIwQNTJFChSOPW+ymlAgr/5ECgYEA+7WMGU3I8xLQ/FUEizb2\nAchwTZF9ptr6KaXbtm9jngs+vuPrLMMKjRkSyL7OsjVGYuZRY17aHoXOCLVVUULM\ngAk3GSieQ45QC7DMvzvY3atpe0dU7ln4ZuTDrYFOMVVC1ZHnV9oU7NAuBLgo8pi3\nVhHhXXyhZDSgrL8/s17wGzUCgYEA8dZJlG3XYGtFpkUfWTmTuC8GxUjfV2ahlAr9\nFdkvpMDVWHjO3cuowl0wLW5G7OEM2lpXfGMNmmGpkC2kZOacFIRZQDoccUCWpMHt\n9Db5BcaO5Dj616c2Grp7PuGFC0Cbwaiqa/g7wEdUGvULdYKXQt4zYjqWNRWbWoIv\nwlR7ddkCgYBspXBTe7/BK94JDKlpbc/B9UKEOMiDvQE9+NldZbcaAMCUpMxeBdII\nFUqGW9XcFiLLjZ6Txd1gT2EfYSXybWLX4SJnOaEWh9cFNMsrwClbhSGClMeUGkGe\nKCBORAH8SVEP3mp9ASUHEtTKNLN4A3MfM5iTQbhoCE9SQTq9sbzyAQKBgD/FpE2R\n0ZPJdepsm+Gpfzy4me54Uvz3QXCKnUafqSKm/xt/b/2o8O2gKU4xoF5i0kLaQ+u3\nKyUkz9QHVSyOa2Y1qFt5d3qd75uu0BLwVCajv5aLOAqaO3g86LciPTVEak5dLeOe\n6BLCPHmHWOg58a1ebupeTLHe6sKpRfLW2F+xAoGACHOdiNWUMATDonmhhJOSihLW\nz166TVjXQnt3l9MW2egQ8xHfmNW4+kO2uCrfQyiSSY+KBDlcwnkVbET+CLVGI/ej\ncUd8VpwppsTt0yvR7G69baRTdcOghztiLCntc6yPSr5/nOYFlpMC6itDblS10Ja8\n9WLkhRCvUrm8xwdlXiI=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@test-e1389.iam.gserviceaccount.com",
  client_id: "102362385922603896378",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40test-e1389.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}


admin.initializeApp(serviceAccount);

// Test Firebase connection
admin.firestore().listCollections()
  .then(() => console.log('✅ Firebase Admin connected successfully'))
  .catch(err => console.error('🔥 Firebase Admin connection failed:', err));

const db: Firestore = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Client SDK
const firebaseConfig = {
  apiKey: "AIzaSyC03gb5CCmoB8uERk5qhGZJpIRZsGtxaXM",
  authDomain: "test-e1389.firebaseapp.com",
  projectId: "test-e1389",
  storageBucket: "test-e1389.appspot.com",
  messagingSenderId: "12312125533",
  appId: "1:12312125533:web:7bf70088f67349f6e36db4",
  measurementId: "G-7J0CETH46N",
};

const firebaseApp = initializeApp(firebaseConfig);
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
