import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../../utils/api";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        // We call getMe() which now handles missing database records gracefully
        await api.getMe();
        setAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        // Only clear token if we specifically failed authentication, not just a network error
        // But for and simple redirect logic, this is safer.
        localStorage.removeItem("token");
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking authentication…
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
