import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, googleSignup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google OAuth
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "384698730754-e8dhto602di0o4trdvoelggmk61gjiqp.apps.googleusercontent.com",
        callback: handleGoogleLogin,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-login-button"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, [userType]);

  const handleGoogleLogin = async (response) => {
    try {
      setLoading(true);
      setError(null);
      const { credential } = response;
      const payload = JSON.parse(atob(credential.split('.')[1]));
      const googleData = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
        userType: userType
      };
      await googleSignup(googleData);
      navigate(userType === "vendor" ? "/vendor-dashboard" : "/account");
    } catch (err) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password }, userType);
      navigate(userType === "customer" ? "/account" : "/account");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[80vh]">
      <img
        src="/Ladies.png"
        alt="Login"
        className="w-full md:w-1/2 object-cover hidden md:block"
      />
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <h1 className="text-3xl font-bold mb-4">Log in to SheWorks</h1>
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-l border ${userType === "customer" ? "bg-primary text-white" : "bg-white text-primary border-primary"}`}
            onClick={() => setUserType("customer")}
            type="button"
          >
            Customer
          </button>
          <button
            className={`px-4 py-2 rounded-r border ${userType === "vendor" ? "bg-primary text-white" : "bg-white text-primary border-primary"}`}
            onClick={() => setUserType("vendor")}
            type="button"
          >
            Vendor
          </button>
        </div>
        <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
          <input
            className="bg-gray-100 p-2 rounded w-full"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="bg-gray-100 p-2 rounded w-full"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            className="bg-primary text-white w-full py-2 rounded disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        </form>
        <div className="mt-4 w-full max-w-md">
          <div id="google-login-button"></div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <Link to="/forgot-password" className="text-primary underline">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}