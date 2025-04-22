import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import * as admin from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import cors from "cors";

// Initialize Firebase Admin SDK
const serviceAccount = require("./test-e1389-firebase-adminsdk-fbsvc-43a7d72b74.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db: Firestore = admin.firestore();
const app = express();
const port = 3000;

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

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

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
    this.isAvailable = true; // Default to true
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

// Technicien Class - Updated with problem tracking
class Technicien extends User {
  speciality: string;
  allProblems: string[];  // Array of problem IDs
  currentProblem: string | null;  // Current problem ID or null if none

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

// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the User Service Microservice!");
});

// Get assigned chefs for a specific assistant
app.get("/users/:id/assigned-chefs", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the user exists and is an assistant
    const userRef = db.collection("users").doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists || userDoc.data()?.role !== "assistant") {
      res.status(404).json({ error: "Assistant not found" });
      return;
    }

    // Fetch all chefs assigned to this assistant
    const assignedChefIds = userDoc.data()?.chefIds || [];
    const chefs: any[] = [];

    for (const chefId of assignedChefIds) {
      const chefRef = db.collection("users").doc(chefId);
      const chefDoc = await chefRef.get();
      if (chefDoc.exists) {
        chefs.push({ id: chefDoc.id, ...chefDoc.data() });
      }
    }

    res.status(200).json(chefs);
  } catch (error) {
    console.error("Error fetching assigned chefs:", error);
    res.status(500).json({ error: "Failed to fetch assigned chefs" });
  }
});

// Create a new user (both in Auth and Firestore)
app.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, isAvailable, ...additionalData } = req.body;

    let user: User;

    // Create the appropriate user object based on role
    switch (role) {
      case "chef":
        user = new Chef(name, email, password, additionalData.place);
        break;
      case "assistant":
        user = new Assistant(
          name,
          email,
          password,
          additionalData.section,
          additionalData.chefIds || []
        );
        break;
      case "technicien":
        user = new Technicien(
          name,
          email,
          password,
          additionalData.speciality,
          additionalData.allProblems || [],
          additionalData.currentProblem || null
        );
        break;
      case "admin":
        user = new Admin(name, email, password, additionalData.nationality);
        break;
      default:
        throw new Error("Invalid role");
    }

    // Override default isAvailable if provided in request
    if (isAvailable !== undefined) {
      user.isAvailable = isAvailable;
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: user.email,
      password: user.password,
      displayName: user.name,
    });

    // 2. Save user data in Firestore using UID as document ID
    const userRef = db.collection("users").doc(userRecord.uid);

    let userData: any = {
      name: user.name,
      email: user.email,
      role: user.role,
      isAvailable: user.isAvailable,
      createdAt: user.createdAt,
    };

    if (role === "chef") {
      userData.place = (user as Chef).place;
    } else if (role === "assistant") {
      userData.section = (user as Assistant).section;
      userData.chefIds = (user as Assistant).chefIds;
    } else if (role === "technicien") {
      userData.speciality = (user as Technicien).speciality;
      userData.allProblems = (user as Technicien).allProblems;
      userData.currentProblem = (user as Technicien).currentProblem;
    } else if (role === "admin") {
      userData.nationality = (user as Admin).nationality;
    }

    await userRef.set(userData);

    res.status(201).json({
      id: userRecord.uid,
      ...userData,
      message: "User created successfully in Auth and Firestore",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get current user
app.get("/users/me", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json({ id: userDoc.id, ...userDoc.data() });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Login Endpoint (returns token)
app.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    const uid = userCredential.user.uid;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      throw new Error("User not found in Firestore");
    }

    res.status(200).json({
      uid,
      token,
      ...userDoc.data(),
    });
  } catch (error) {
    console.error("Login error:", error);
    if ((error as any).code === "auth/wrong-password" || (error as any).code === "auth/user-not-found") {
      res.status(401).json({ error: "Invalid credentials" });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});
app.put("/users/:id/availability", async (req: Request, res: Response) => {
  try {
    const { isAvailable, currentProblem } = req.body;
    const userRef = db.collection("users").doc(req.params.id);

    await userRef.update({
      isAvailable,
      currentProblem,
    });

    res.status(200).json({ message: "Technician availability updated" });
  } catch (error) {
    console.error("Error updating technician:", error);
    res.status(500).json({ error: "Failed to update technician" });
  }
});

// Assign a chef to an assistant
app.put(
  "/users/assign-chef/:assistantId",
  async (
    req: Request<{ assistantId: string }, {}, { chefId: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { assistantId } = req.params;
      const { chefId } = req.body;

      // Check if the assistant exists
      const assistantRef = db.collection("users").doc(assistantId);
      const assistantDoc = await assistantRef.get();
      if (!assistantDoc.exists || assistantDoc.data()?.role !== "assistant") {
        res.status(404).json({ error: "Assistant not found" });
        return;
      }

      // Check if the chef exists
      const chefRef = db.collection("users").doc(chefId);
      const chefDoc = await chefRef.get();
      if (!chefDoc.exists || chefDoc.data()?.role !== "chef") {
        res.status(404).json({ error: "Chef not found" });
        return;
      }

      // Check if the chef is already assigned to another assistant
      const assistantsSnapshot = await db
        .collection("users")
        .where("role", "==", "assistant")
        .where("chefIds", "array-contains", chefId)
        .get();

      if (!assistantsSnapshot.empty) {
        res
          .status(400)
          .json({ error: "Chef is already assigned to another assistant" });
        return;
      }

      // Get the current chefIds array for the selected assistant
      const currentChefIds = assistantDoc.data()?.chefIds || [];

      // Add the new chefId if it doesn't already exist
      if (!currentChefIds.includes(chefId)) {
        currentChefIds.push(chefId);
      }

      // Update the assistant with the new chefIds array
      await assistantRef.update({ chefIds: currentChefIds });

      res.status(200).json({
        message: "Chef assigned to assistant successfully",
        chefIds: currentChefIds,
      });
    } catch (error) {
      console.error("Error assigning chef:", error);
      res.status(500).json({ error: "Failed to assign chef" });
    }
  }
);

// Get all users or search by email/availability
app.get("/users", async (req: Request, res: Response) => {
  try {
    const { email, isAvailable } = req.query;

    let usersQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection("users");

    // If email is provided, filter users by email
    if (email) {
      usersQuery = usersQuery.where("email", "==", email);
    }

    // If isAvailable is provided, filter by availability
    if (isAvailable !== undefined) {
      const available = isAvailable === 'true';
      usersQuery = usersQuery.where("isAvailable", "==", available);
    }

    const usersSnapshot = await usersQuery.get();
    const users: any[] = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get assigned chefs for all assistants
app.get("/assigned-chefs", async (req: Request, res: Response) => {
  try {
    // Fetch all assistants
    const assistantsSnapshot = await db
      .collection("users")
      .where("role", "==", "assistant")
      .get();

    // Extract all assigned chefIds
    const assignedChefIds: string[] = [];
    assistantsSnapshot.forEach((doc) => {
      const chefIds = doc.data()?.chefIds || [];
      assignedChefIds.push(...chefIds);
    });

    // Remove duplicates (if any)
    const uniqueAssignedChefIds = [...new Set(assignedChefIds)];

    res.status(200).json({ assignedChefIds: uniqueAssignedChefIds });
  } catch (error) {
    console.error("Error fetching assigned chefs:", error);
    res.status(500).json({ error: "Failed to fetch assigned chefs" });
  }
});

// Get a user by ID
app.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const userRef = db.collection("users").doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json({ id: userDoc.id, ...userDoc.data() });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update a user
app.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const userRef = db.collection("users").doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
    } else {
      await userRef.update(req.body);
      res.status(200).json({ message: "User updated successfully" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete a user (from both Auth and Firestore)
app.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const uid = req.params.id;

    // Delete from Authentication
    await admin.auth().deleteUser(uid);

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();

    res
      .status(200)
      .json({ message: "User deleted successfully from Auth and Firestore" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// **************** Technician Problem Management ********************

// Assign a problem to a technician


// Complete current problem for a technician


// Get technician's problems


// Get available technicians (those with no current problem)
app.get('/techniciens/available', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'technicien')
      .where('currentProblem', '==', null)
      .where('isAvailable', '==', true)
      .get();

    const availableTechnicians = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(availableTechnicians);
  } catch (error) {
    console.error("Error fetching available technicians:", error);
    res.status(500).json({ error: "Failed to fetch available technicians" });
  }
});

// **************** Statistic Endpoints ********************
// Get problem statistics
app.get('/problems/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month problems count
    const currentMonthQuery = db.collection('problems')
      .where('createdAt', '>=', startOfCurrentMonth);
    
    // Get last month problems count
    const lastMonthQuery = db.collection('problems')
      .where('createdAt', '>=', startOfLastMonth)
      .where('createdAt', '<=', endOfLastMonth);

    // Get problems by type
    const typeAggregation = await db.collection('problems')
      .select('type')
      .get();

    const typeCounts: Record<string, number> = {};
    typeAggregation.forEach(doc => {
      const type = doc.data().type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const byType = Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value
    }));

    const [currentMonthSnapshot, lastMonthSnapshot] = await Promise.all([
      currentMonthQuery.count().get(),
      lastMonthQuery.count().get()
    ]);

    res.status(200).json({
      currentMonthCount: currentMonthSnapshot.data().count,
      lastMonthCount: lastMonthSnapshot.data().count,
      byType
    });
  } catch (error) {
    console.error("Error getting problem stats:", error);
    res.status(500).json({ error: "Failed to get problem statistics" });
  }
});

// Get recent problems
app.get('/problems/recent', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('problems')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentProblems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(recentProblems);
  } catch (error) {
    console.error("Error getting recent problems:", error);
    res.status(500).json({ error: "Failed to get recent problems" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`User Service running on http://localhost:${port}`);
});