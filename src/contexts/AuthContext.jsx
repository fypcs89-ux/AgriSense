import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  isDemoMode,
  startDataCollection,
  stopDataCollection,
} from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    if (isDemoMode) {
      // Demo mode signup
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (email && password.length >= 6) {
            const demoUser = {
              uid: "demo-" + Date.now(),
              email: email,
              displayName: email.split("@")[0],
            };
            localStorage.setItem(
              "agrisense-demo-user",
              JSON.stringify(demoUser)
            );
            setCurrentUser(demoUser);
            resolve({ user: demoUser });
          } else {
            reject(new Error("Invalid email or password too short"));
          }
        }, 500);
      });
    } else {
      // Real Firebase signup (no soft fallback)
      if (!auth) {
        throw new Error("Authentication is not configured. Please check Firebase setup.");
      }
      const { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } = await import("firebase/auth");
      // Check if account already exists for this email
      const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
      if (Array.isArray(methods) && methods.includes("password")) {
        throw new Error("Account already exists. Please sign in.");
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Ensure app state reflects the new user immediately
        setCurrentUser(cred.user);
        return cred;
      } catch (e) {
        if (e?.code === "auth/user-not-found") {
          throw new Error("No account found for this email. Please sign up.");
        }
        if (e?.code === "auth/wrong-password") {
          throw new Error("Incorrect password. Please try again.");
        }
        if (e?.code === "auth/invalid-credential") {
          throw new Error("Invalid credentials. Please try again.");
        }
        throw e;
      }
    }
  }

  async function resetPassword(email) {
    if (!email) throw new Error("Please enter your email to reset password.");
    if (isDemoMode || !auth) {
      // Simulate reset success in demo/soft mode
      return new Promise((resolve) => setTimeout(resolve, 500));
    }
    const { sendPasswordResetEmail } = await import("firebase/auth");
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      if (e?.code === "auth/user-not-found") {
        throw new Error("No account found for this email.");
      }
      throw e;
    }
  }

  async function login(email, password) {
    if (isDemoMode) {
      // Demo mode login
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (email && password) {
            const demoUser = {
              uid: "demo-" + Date.now(),
              email: email,
              displayName: email.split("@")[0],
            };
            localStorage.setItem(
              "agrisense-demo-user",
              JSON.stringify(demoUser)
            );
            setCurrentUser(demoUser);
            startDataCollection(); // Start data collection when user logs in
            resolve({ user: demoUser });
          } else {
            reject(new Error("Invalid credentials"));
          }
        }, 500);
      });
    } else {
      // Real Firebase login (no soft fallback)
      if (!auth) {
        throw new Error("Authentication is not configured. Please check Firebase setup.");
      }
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        startDataCollection();
        return cred;
      } catch (e) {
        if (e?.code === "auth/user-not-found") {
          throw new Error("No account found for this email. Please sign up.");
        }
        if (e?.code === "auth/wrong-password") {
          throw new Error("Incorrect password. Please try again.");
        }
        if (e?.code === "auth/invalid-credential") {
          throw new Error("Invalid credentials. Please try again.");
        }
        throw e;
      }
    }
  }

  async function logout() {
    if (isDemoMode) {
      // Demo mode logout
      return new Promise((resolve) => {
        localStorage.removeItem("agrisense-demo-user");
        setCurrentUser(null);
        stopDataCollection(); // Stop data collection when user logs out
        resolve();
      });
    } else {
      // Real Firebase logout
      try {
        if (!auth) {
          throw new Error("Authentication is not configured. Please check Firebase setup.");
        }
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
        localStorage.removeItem("agrisense-soft-user");
        localStorage.removeItem("agrisense-demo-user");
        setCurrentUser(null);
        stopDataCollection();
        if (auth) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        }
      } catch (e) {
        console.warn("Logout encountered an issue:", e?.message || e);
      }
    }
  }

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode auth state
      const demoUser = localStorage.getItem("agrisense-demo-user");
      if (demoUser) {
        setCurrentUser(JSON.parse(demoUser));
        startDataCollection();
      }
      setLoading(false);
      return;
    }

    // Prefer real Firebase auth if available
    if (auth) {
      // Clear any stale soft/demo session to avoid spoofed sign-in when real auth is active
      localStorage.removeItem("agrisense-soft-user");
      localStorage.removeItem("agrisense-demo-user");

      import("firebase/auth").then(({ onAuthStateChanged }) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });
        return unsubscribe;
      });
      return;
    }

    // If auth is not initialized (configuration issues), allow soft-user fallback
    const soft = localStorage.getItem("agrisense-soft-user");
    if (soft) {
      setCurrentUser(JSON.parse(soft));
    }
    setLoading(false);
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
