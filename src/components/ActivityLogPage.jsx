import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Activity,
  Clock,
  FileText,
  Upload,
  Trash2,
  Edit,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { getActivityLogs } from "../firebase/firestoreService";

const ActivityLogPage = ({ setCurrentPage }) => {
  // State management
  const [activityLogs, setActivityLogs] = useState([]); 
  const [filteredLogs, setFilteredLogs] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [filterType, setFilterType] = useState("all"); 

  // Load logs when page opens
  useEffect(() => {
    loadActivityLogs();
  }, []);

  //Re-filter logs whenever search or filter changes
  useEffect(() => {
    let filtered = activityLogs;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [searchQuery, filterType, activityLogs]);

  // Fetch logs from Firebase
  const loadActivityLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await getActivityLogs();
      setActivityLogs(logs);
      setFilteredLogs(logs);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get icon based on log type
  const getActionIcon = (type) => {
    switch (type) {
      case "CREATE_JOB":
        return <FileText className="w-5 h-5 text-green-400" />;
      case "UPLOAD":
        return <Upload className="w-5 h-5 text-blue-400" />;
      case "DELETE":
      case "DELETE_JOB":
      case "BULK_DELETE":
        return <Trash2 className="w-5 h-5 text-red-400" />;
      case "EDIT_JOB":
      case "REEVALUATE":
        return <Edit className="w-5 h-5 text-yellow-400" />;
      case "FIREBASE_PULL":
        return <Activity className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-cyan-400" />;
    }
  };

  // Get color scheme based on log type
  const getActionColor = (type) => {
    switch (type) {
      case "CREATE_JOB":
        return "bg-green-500/10 border-green-500/30";
      case "UPLOAD":
        return "bg-blue-500/10 border-blue-500/30";
      case "DELETE":
      case "DELETE_JOB":
      case "BULK_DELETE":
        return "bg-red-500/10 border-red-500/30";
      case "EDIT_JOB":
      case "REEVALUATE":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "FIREBASE_PULL":
        return "bg-purple-500/10 border-purple-500/30";
      default:
        return "bg-cyan-500/10 border-cyan-500/30";
    }
  };

  // Get readable label for log type
  const getTypeLabel = (type) => {
    const labels = {
      CREATE_JOB: "Job Created",
      UPLOAD: "Upload",
      DELETE: "Delete",
      DELETE_JOB: "Job Deleted",
      BULK_DELETE: "Bulk Delete",
      EDIT_JOB: "Job Updated",
      REEVALUATE: "Re-evaluation",
      FIREBASE_PULL: "Firebase Pull",
    };
    return labels[type] || type;
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => setCurrentPage("dashboard")}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Page Header */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-8 mb-6 border border-white/20 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">
                Activity Log
              </h1>
              <p className="text-white text-sm sm:text-base">
                Track all actions and changes
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadActivityLogs}
            disabled={isLoading}
            className="px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-semibold flex items-center gap-2
            bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
            hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
            transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/30 text-white rounded-xl pl-12 pr-4 py-3 border border-white/10 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-48 bg-black/30 text-white rounded-xl pl-12 pr-4 py-3 border border-white/10 focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Activities</option>
              <option value="CREATE_JOB">Job Created</option>
              <option value="UPLOAD">Uploads</option>
              <option value="DELETE">Deletions</option>
              <option value="EDIT_JOB">Job Updates</option>
              <option value="REEVALUATE">Re-evaluations</option>
              <option value="FIREBASE_PULL">Firebase Pulls</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-12 border border-white/20 text-center">
          <Activity className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-12 border border-white/20 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-white mb-2">No activities found</p>
          <p className="text-gray-300">
            {searchQuery || filterType !== "all"
              ? "Try adjusting your search or filter"
              : "Your actions will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-6 border transition-all hover:scale-[1.01] ${getActionColor(
                log.type
              )}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-black/20 flex-shrink-0">
                  {getActionIcon(log.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold text-base sm:text-lg">
                      {log.action}
                    </h3>
                    <span className="px-3 py-1 bg-black/30 text-white rounded-full text-xs font-medium whitespace-nowrap w-fit">
                      {getTypeLabel(log.type)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {!isLoading && filteredLogs.length > 0 && (
        <div className="mt-6 backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span>
                Showing {filteredLogs.length} of {activityLogs.length}{" "}
                activities
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;