import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";

export default function Signup() {
  const [userType, setUserType] = useState("customer");
  // Customer fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Vendor fields
  const [businessName, setBusinessName] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { register, googleSignup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google OAuth
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "384698730754-e8dhto602di0o4trdvoelggmk61gjiqp.apps.googleusercontent.com",
        callback: handleGoogleSignup,
      });
      
      window.google.accounts.id.renderButton(
        document.getElementById("google-signup-button"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (userType === "customer") {
        await register({
          username,
          email,
          password,
          firstName,
          lastName
        }, "customer");
        navigate("/");
      } else {
        await register({
          businessName,
          email,
          password,
          contactPerson: {
            firstName: contactFirstName,
            lastName: contactLastName,
            phone: contactPhone
          },
          businessInfo: {
            category
          }
        }, "vendor");
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (response) => {
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
      navigate("/");
    } catch (err) {
      setError(err.message || "Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[80vh]">
      <img
        src="/Ladies.png"
        alt="Signup"
        className="w-full md:w-1/2 object-cover hidden md:block"
      />
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <h1 className="text-3xl font-bold mb-4">Create an account</h1>
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
          {userType === "customer" ? (
            <>
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
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
            </>
          ) : (
            <>
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Business Name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
              />
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Contact First Name"
                value={contactFirstName}
                onChange={e => setContactFirstName(e.target.value)}
                required
              />
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Contact Last Name"
                value={contactLastName}
                onChange={e => setContactLastName(e.target.value)}
                required
              />
              <input
                className="bg-gray-100 p-2 rounded w-full"
                placeholder="Contact Phone"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                required
              />
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
              <select
                className="bg-gray-100 p-2 rounded w-full"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              >
                <option value="">Select Category</option>
                <option value="jewelry">Jewelry</option>
                <option value="accessories">Accessories</option>
                <option value="fashion">Fashion</option>
                <option value="watches">Watches</option>
                <option value="bags">Bags</option>
                <option value="other">Other</option>
              </select>
            </>
          )}
          <button
            className="bg-primary text-white w-full py-2 rounded disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        </form>
        <div className="mt-4 w-full max-w-md">
          <div id="google-signup-button"></div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-primary underline">Login</Link>
        </div>
      </div>
    </div>
  );
}