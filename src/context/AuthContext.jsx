import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";
import { AUTH_LOGIN } from "../api/endpoints";
import { decryptData, encryptData } from "../utils/encrypt";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user_access");

    return savedUser ? decryptData(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
  const encryptedToken = localStorage.getItem("authToken");

  return decryptData(encryptedToken);
});
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // On mount: token exists → try to hydrate user profile.
  // ONLY clear the token when the server explicitly says it is invalid (401/403).
  // Network errors, 5xx, or any other issue must NOT remove a valid token —
  // otherwise a page refresh while the API is unreachable logs the user out.
  // useEffect(() => {
  //   const initAuth = async () => {
  //     const storedToken = localStorage.getItem("authToken");
  //     if (!storedToken) {
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       const res = await API.get(USER_ME);
  //       setUser(res.data?.user ?? res.data);
  //     } catch (err) {
  //       const status = err?.response?.status;

  //       // 401 Unauthorized or 403 Forbidden → token genuinely invalid, clear it
  //       if (status === 401 || status === 403) {
  //         localStorage.removeItem("authToken");
  //         setToken(null);
  //       }
  //       // Any other error (network down, 500, timeout) → keep token,
  //       // user stays authenticated, data will load when API is back
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   initAuth();
  // }, []);

const login = useCallback(async ({ email, password }) => {
    setAuthError(null);

    try {
      const res = await API.post(AUTH_LOGIN, {
        email,
        password,
      });

      const { token: newToken, user: userData } = res.data;

      // SAVE ENCRYPTED TOKEN
      localStorage.setItem(
        "authToken",
        encryptData(newToken)
      );

      // SAVE ENCRYPTED USER
      localStorage.setItem(
        "user_access",
        encryptData(userData)
      );

      // UPDATE STATE
      setToken(newToken);
      setUser(userData);

      return { success: true };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed. Please check your credentials.";

      setAuthError(msg);

      return {
        success: false,
        message: msg,
      };
    }
  }, []);

  // const register = useCallback(async ({ name, email, password, role }) => {
  //   setAuthError(null);
  //   try {
  //     const res = await API.post(AUTH_REGISTER, { name, email, password, role });
  //     const { token: newToken, user: userData } = res.data;
  //     localStorage.setItem("authToken", newToken);
  //     setToken(newToken);
  //     setUser(userData);
  //     return { success: true };
  //   } catch (err) {
  //     const msg =
  //       err.response?.data?.message ||
  //       err.response?.data?.error ||
  //       "Registration failed. Please try again.";
  //     setAuthError(msg);
  //     return { success: false, message: msg };
  //   }
  // }, []);

   // LOGOUT
  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user_access");

    setToken(null);
    setUser(null);
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Authenticated = token exists in state (loaded from localStorage on init)
  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        isAuthenticated,
        login,
        // register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
