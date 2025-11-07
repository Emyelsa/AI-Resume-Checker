import React from "react";
import { ArrowLeft, User } from "lucide-react";

const AccountPage = ({ setCurrentPage }) => {
  return (
    <div>
      {/* Back Button - Returns to Dashboard */}
      <button
        onClick={() => setCurrentPage("dashboard")}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Page Header */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-8 mb-6 border border-white/20 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">
              Account Settings
            </h1>
            <p className="text-white text-sm sm:text-base">
              Manage your profile information
            </p>
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 sm:p-8 border border-white/20">
        {/* Profile Avatar and Name */}
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Admin User
            </h2>
            <p className="text-gray-300 text-sm sm:text-base">Administrator</p>
          </div>
        </div>

        {/* Account Information Form */}
        <div className="space-y-6">
          {/* Row 1: Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white text-sm mb-2 block font-medium">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-500 focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block font-medium">
                Email Address
              </label>
              <input
                type="email"
                defaultValue="admin@example.com"
                className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-500 focus:outline-none"
                readOnly
              />
            </div>
          </div>

          {/* Row 2: Role and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white text-sm mb-2 block font-medium">
                Role
              </label>
              <input
                type="text"
                defaultValue="Administrator"
                className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-500 focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block font-medium">
                Account Status
              </label>
              <div className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm text-center">
              Account settings are currently read-only. Contact your system
              administrator for changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
