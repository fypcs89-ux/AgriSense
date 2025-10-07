import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { database, isDemoMode } from "../firebase/config";
import {
  Settings,
  Users,
  Database,
  Trash2,
  Edit,
  Plus,
  Save,
  X,
  Shield,
  Activity,
} from "lucide-react";

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const { hourlyData } = useData();
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [adminData, setAdminData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [newSensorData, setNewSensorData] = useState({
    temperature: "",
    humidity: "",
    moisture: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    ph: "",
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch admin-added data separately from hourly data
    let unsubscribeAdmin;

    const updateAdminData = (data) => {
      if (data) {
        const adminArray = Object.entries(data)
          .map(([key, value]) => ({
            id: key,
            ...value,
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setAdminData(adminArray);
      } else {
        setAdminData([]);
      }
    };

    if (isDemoMode) {
      const adminRef = database.ref("sensors/adminData");
      unsubscribeAdmin = adminRef.on("value", (snapshot) => {
        updateAdminData(snapshot.val());
      });

      // Listen for custom events for real-time updates
      const handleAdminDataUpdate = (event) => {
        updateAdminData(event.detail);
      };
      window.addEventListener("adminDataUpdated", handleAdminDataUpdate);

      // Cleanup event listener
      const originalCleanup = unsubscribeAdmin;
      unsubscribeAdmin = () => {
        if (originalCleanup) originalCleanup();
        window.removeEventListener("adminDataUpdated", handleAdminDataUpdate);
      };
    } else {
      // Real Firebase mode
      import("firebase/database").then(({ ref, onValue }) => {
        const adminRef = ref(database, "sensors/adminData");
        unsubscribeAdmin = onValue(adminRef, (snapshot) => {
          updateAdminData(snapshot.val());
        });
      });
    }

    // Mock users data
    setUsers([
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        role: "Admin",
        status: "Active",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        role: "User",
        status: "Active",
      },
      {
        id: 3,
        name: "Bob Johnson",
        email: "bob@example.com",
        role: "User",
        status: "Inactive",
      },
    ]);

    return () => {
      if (unsubscribeAdmin) {
        unsubscribeAdmin();
      }
    };
  }, [currentUser]);

  

  const handleAddSensorData = async () => {
    try {
      // Validate that all fields are filled
      const requiredFields = [
        "temperature",
        "humidity",
        "moisture",
        "nitrogen",
        "phosphorus",
        "potassium",
        "ph",
      ];
      const emptyFields = requiredFields.filter(
        (field) => !newSensorData[field] || newSensorData[field].trim() === ""
      );

      if (emptyFields.length > 0) {
        alert(`Please fill in all fields: ${emptyFields.join(", ")}`);
        return;
      }

      const timestamp = Date.now();
      const sensorEntry = {
        avgTemperature: parseFloat(newSensorData.temperature),
        avgHumidity: parseFloat(newSensorData.humidity),
        avgMoisture: parseFloat(newSensorData.moisture),
        avgNitrogen: parseFloat(newSensorData.nitrogen),
        avgPhosphorus: parseFloat(newSensorData.phosphorus),
        avgPotassium: parseFloat(newSensorData.potassium),
        avgPh: parseFloat(newSensorData.ph),
        timestamp: timestamp,
        hour: new Date(timestamp).getHours(),
        readingCount: 1,
      };

      if (isDemoMode) {
        // Demo mode - add to admin-only data (separate from hourly collection)
        const adminRef = database.ref(`sensors/adminData/${timestamp}`);
        await adminRef.set(sensorEntry);
      } else {
        // Real Firebase mode
        const { ref, set } = await import("firebase/database");
        const adminRef = ref(database, `sensors/adminData/${timestamp}`);
        await set(adminRef, sensorEntry);
      }

      // Reset form
      setNewSensorData({
        temperature: "",
        humidity: "",
        moisture: "",
        nitrogen: "",
        phosphorus: "",
        potassium: "",
        ph: "",
      });

      alert("Sensor data added successfully!");
    } catch (error) {
      console.error("Error adding sensor data:", error);
      alert("Failed to add sensor data. Please try again.");
    }
  };

  const handleEditRecord = (data, index) => {
    setEditingItem({ ...data, index });
  };

  const handleDeleteAdminRecord = async (id) => {
    if (!confirm("Are you sure you want to delete this admin record?")) return;

    try {
      if (isDemoMode) {
        const adminRef = database.ref(`sensors/adminData/${id}`);
        await adminRef.remove();
      } else {
        const { ref, remove } = await import("firebase/database");
        const adminRef = ref(database, `sensors/adminData/${id}`);
        await remove(adminRef);
      }
      alert("Admin record deleted successfully!");
    } catch (error) {
      console.error("Error deleting admin record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingItem || !editingItem.id) {
        alert("No record selected for editing");
        return;
      }

      const updatedData = {
        avgTemperature: parseFloat(editingItem.avgTemperature),
        avgHumidity: parseFloat(editingItem.avgHumidity),
        avgMoisture: parseFloat(editingItem.avgMoisture),
        avgNitrogen: parseFloat(editingItem.avgNitrogen),
        avgPhosphorus: parseFloat(editingItem.avgPhosphorus),
        avgPotassium: parseFloat(editingItem.avgPotassium),
        avgPh: parseFloat(editingItem.avgPh),
        timestamp: editingItem.timestamp,
        hour: editingItem.hour,
        readingCount: editingItem.readingCount,
      };

      if (isDemoMode) {
        const adminRef = database.ref(`sensors/adminData/${editingItem.id}`);
        await adminRef.set(updatedData);
      } else {
        const { ref, set } = await import("firebase/database");
        const adminRef = ref(database, `sensors/adminData/${editingItem.id}`);
        await set(adminRef, updatedData);
      }

      alert("Record updated successfully!");
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleUpdateSensorData = async (id, updatedData) => {
    try {
      // Convert string values to numbers for consistency
      const processedData = {
        ...updatedData,
        temperature: parseFloat(updatedData.temperature),
        humidity: parseFloat(updatedData.humidity),
        moisture: parseFloat(updatedData.moisture),
        nitrogen: parseFloat(updatedData.nitrogen),
        phosphorus: parseFloat(updatedData.phosphorus),
        potassium: parseFloat(updatedData.potassium),
        ph: parseFloat(updatedData.ph),
      };

      if (isDemoMode) {
        // Demo mode - directly update the state
        setSensorData((prevData) =>
          prevData.map((item) =>
            item.id === id ? { ...item, ...processedData } : item
          )
        );
      } else {
        // Real Firebase mode
        const { ref, set } = await import("firebase/database");
        const sensorRef = ref(database, `sensors/history/${id}`);
        await set(sensorRef, processedData);
      }

      setEditingItem(null);
      alert("Sensor data updated successfully!");
    } catch (error) {
      console.error("Error updating sensor data:", error);
      alert("Error updating sensor data. Please try again.");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Please sign in to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6 page-with-top-gap">
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <Settings className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
              <p className="text-gray-600">
                Manage system data and configurations
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", name: "Overview", icon: Activity },
                { id: "sensors", name: "Sensor Data", icon: Database },
                { id: "users", name: "Users", icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Sensor Records
                  </h3>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {hourlyData.length}
                </div>
                <div className="text-sm text-gray-600">Total data points</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    System Status
                  </h3>
                </div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  Online
                </div>
                <div className="text-sm text-gray-600">
                  All systems operational
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Active Users
                  </h3>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-2">1</div>
                <div className="text-sm text-gray-600">Currently signed in</div>
              </div>
            </div>
          )}

          {activeTab === "sensors" && (
            <div className="space-y-6">
              {/* Add New Sensor Data */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-primary-600" />
                  <span>Add New Sensor Data</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
                  {Object.entries(newSensorData).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {key}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={value}
                        onChange={(e) =>
                          setNewSensorData({
                            ...newSensorData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.0"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddSensorData}
                  className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Add Data</span>
                </button>
              </div>

              {/* Hourly Sensor Data Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Sensor Records</h3>
                  <p className="text-sm text-gray-600 mt-1">All data collected from sensors</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Temp (°C)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Humidity (%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Moisture (%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          N (ppm)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          P (ppm)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          K (ppm)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          pH
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Display hourly data from automatic collection */}
                      {hourlyData.map((data, index) => (
                        <tr
                          key={`hourly-${data.timestamp || index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(data.timestamp).toLocaleDateString()}{" "}
                            {new Date(data.timestamp).toLocaleTimeString()}
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Auto
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgTemperature || data.temperature}°C
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgHumidity || data.humidity}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgMoisture || data.moisture}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgNitrogen || data.nitrogen}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPhosphorus || data.phosphorus}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPotassium || data.potassium}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPh || data.ph}
                          </td>
                        </tr>
                      ))}

                      {/* Display admin-added data */}
                      {adminData.map((data, index) => (
                        <tr
                          key={`admin-${data.id || index}`}
                          className="hover:bg-gray-50 bg-green-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(data.timestamp).toLocaleDateString()}{" "}
                            {new Date(data.timestamp).toLocaleTimeString()}
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Admin
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgTemperature}°C
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgHumidity}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgMoisture}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgNitrogen}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPhosphorus}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPotassium}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.avgPh}
                          </td>
                        </tr>
                      ))}

                      {hourlyData.length === 0 && adminData.length === 0 && (
                        <tr>
                          <td
                            colSpan="8"
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            No sensor data available yet. Hourly data will
                            appear automatically, or you can add data manually
                            above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                User Management
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {currentUser.email}
                      </div>
                      <div className="text-sm text-gray-600">Administrator</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Edit Sensor Data
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(editingItem)
                  .filter(
                    ([key]) =>
                      key !== "id" &&
                      key !== "timestamp" &&
                      key !== "hour" &&
                      key !== "readingCount" &&
                      key !== "index"
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {key.replace("avg", "").toLowerCase()}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={value || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  ))}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
