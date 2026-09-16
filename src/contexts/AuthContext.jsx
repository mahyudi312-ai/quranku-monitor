import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, nama, role) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Simpan dengan UID sebagai doc ID
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nama,
      email: email.toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
    });
    return cred;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // Cari role user — coba UID dulu, lalu email
  async function cariRoleUser(user) {
    try {
      // Cara 1: dokumen dengan ID = UID
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().role) {
        console.log("✅ Role ditemukan via UID:", snap.data().role);
        return snap.data().role;
      }

      // Cara 2: query by email
      if (user.email) {
        const q = query(
          collection(db, "users"),
          where("email", "==", user.email.toLowerCase())
        );
        const querySnap = await getDocs(q);
        if (querySnap.docs.length > 0) {
          const role = querySnap.docs[0].data().role;
          console.log("✅ Role ditemukan via email:", role);
          return role || null;
        }
      }

      console.warn("⚠️ Role tidak ditemukan untuk user:", user.email);
      return null;
    } catch (err) {
      console.error("❌ Gagal cari role user:", err);
      return null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log("🔵 Auth state changed:", user?.email || "tidak login");
      setCurrentUser(user);

      if (user) {
        const role = await cariRoleUser(user);
        setUserRole(role);
      } else {
        setUserRole(null);
      }

      // ⚠️ PENTING: setLoading(false) HARUS selalu dijalankan
      setLoading(false);
      console.log("🟢 Loading selesai");
    });
    return unsub;
  }, []);

  const value = { currentUser, userRole, loading, register, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}