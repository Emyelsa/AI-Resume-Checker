import React from "react";

// LoadingScreen component: displays a loading animation with optional message and progress bar
const LoadingScreen = ({ message = "Loading AI Models...", progress = 0 }) => {
  return (

    // Fullscreen overlay with blue background and centered content
    <div className="fixed inset-0 bg-[#00004D] flex items-center justify-center z-50">
      <div className="text-center">
        {/* Spinning loader animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
          <div
            className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"
            style={{ animationDuration: "1s" }}
          ></div>
        </div>
         {/* Loading message text */}
        <p className="text-white text-xl font-semibold mb-2">{message}</p>
        {/* Conditional progress bar: only shows if progress > 0 */}
        {progress > 0 && (
          <div className="w-64 h-2 bg-black/30 rounded-full overflow-hidden mx-auto">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        {/* Helper text shown below progress bar */}
        <p className="text-purple-300 text-sm mt-2">
          This may take 10-30 seconds on first load
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
