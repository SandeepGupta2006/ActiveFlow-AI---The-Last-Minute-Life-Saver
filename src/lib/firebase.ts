import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, Plan, ChatSession, UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom error handler required by Firebase-Integration skill
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 2. Authentication Helpers
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Auth Error: Google login failed", error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Auth Error: Logout failed", error);
    throw error;
  }
}

// 3. User Profile Database Services
export async function getOrCreateUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    
    if (snap.exists()) {
      return snap.data() as UserProfile;
    } else {
      const newProfile: UserProfile = {
        userId: user.uid,
        email: user.email || '',
        preferences: {
          workHoursStart: "09:00",
          workHoursEnd: "17:00",
          breaksFrequency: "every 50 mins",
          focusVibe: 'calm'
        },
        patterns: {
          mostProductiveTime: "Morning (09:00 - 12:00)",
          riskTolerance: "Medium Procrastinator",
          notes: "Tends to rush assignments the day before."
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save profile
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 4. Tasks Services
export async function fetchUserTasks(userId: string): Promise<Task[]> {
  const path = 'tasks';
  try {
    const q = query(
      collection(db, 'tasks'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createUserTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'tasks';
  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateUserTask(taskId: string, taskUpdates: Partial<Task>): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    const docRef = doc(db, 'tasks', taskId);
    await updateDoc(docRef, {
      ...taskUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserTask(taskId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 5. Plans Services
export async function fetchUserPlans(userId: string): Promise<Plan[]> {
  const path = 'plans';
  try {
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createUserPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'plans';
  try {
    const docRef = await addDoc(collection(db, 'plans'), {
      ...plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// 6. Chat History Services
export async function fetchUserChatSessions(userId: string): Promise<ChatSession[]> {
  const path = 'chats';
  try {
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createOrUpdateChatSession(userId: string, messages: any[], sessionId?: string, title?: string): Promise<string> {
  const path = sessionId ? `chats/${sessionId}` : 'chats';
  try {
    if (sessionId) {
      const docRef = doc(db, 'chats', sessionId);
      const updateData: any = {
        messages,
        updatedAt: serverTimestamp()
      };
      if (title) {
        updateData.title = title;
      }
      await updateDoc(docRef, updateData);
      return sessionId;
    } else {
      const docRef = await addDoc(collection(db, 'chats'), {
        userId,
        messages,
        title: title || "New Chat Session",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, sessionId ? OperationType.UPDATE : OperationType.CREATE, path);
    throw error;
  }
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const path = `chats/${sessionId}`;
  try {
    const docRef = doc(db, 'chats', sessionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}
