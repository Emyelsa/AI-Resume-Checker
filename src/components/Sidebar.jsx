import React from "react";
import { X, Activity, User } from "lucide-react";

const Sidebar = ({ isOpen, onClose, onNavigate }) => {
  return (
    <>
      {/* Backdrop - Dark overlay that covers the screen when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose} // Click outside to close sidebar
        />
      )}

      {/* Sidebar Panel - Slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 backdrop-blur-xl bg-white/10 border-l border-white/20 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Close Button */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-2xl font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* Account Button */}
              <button
                onClick={() => {
                  onNavigate("account"); // Navigate to account page
                  onClose(); // Close sidebar after navigation
                }}
                className="w-full flex items-center gap-4 p-4 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group"
              >
                <div className="p-3 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                  <User className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold text-lg">Account</h3>
                  <p className="text-gray-300 text-sm">
                    View your profile settings
                  </p>
                </div>
              </button>

              {/* Activity Log Button */}
              <button
                onClick={() => {
                  onNavigate("activityLog"); // Navigate to activity log page
                  onClose(); // Close sidebar after navigation
                }}
                className="w-full flex items-center gap-4 p-4 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all group"
              >
                <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold text-lg">
                    Activity Log
                  </h3>
                  <p className="text-gray-300 text-sm">
                    View all actions & history
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
