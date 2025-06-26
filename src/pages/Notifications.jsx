import { useEffect, useState } from "react";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiService.request("/notifications")
      .then(res => setNotifications(res.notifications || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiService.request(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications(n => n.map(notif => notif._id === id ? { ...notif, read: true } : notif));
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Notifications</h1>
      {loading ? <Spinner /> : error ? <div className="text-red-500">{error}</div> : notifications.length === 0 ? <div>No notifications.</div> : (
        <ul className="space-y-4">
          {notifications.map(n => (
            <li key={n._id} className={`p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center justify-between ${n.read ? 'bg-gray-100' : 'bg-blue-50'}`}>
              <div>
                <div className="font-semibold text-sm md:text-base">{n.message}</div>
                <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && <button className="text-primary underline mt-2 md:mt-0 md:ml-4" onClick={() => markAsRead(n._id)}>Mark as read</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 