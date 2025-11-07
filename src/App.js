import React, { useState, useEffect } from "react";
import { aiEngine } from "./utils/aiEngine";
import {
  getAllJobPosts,
  getCandidatesByJobId,
} from "./firebase/firestoreService";
import LoadingScreen from "./components/LoadingScreen";
import Dashboard from "./components/Dashboard";
import JobDetailPage from "./components/JobDetailPage";
import CandidateDetailPage from "./components/CandidateDetailPage";
import ActivityLogPage from "./components/ActivityLogPage";
import AccountPage from "./components/AccountPage";
import Sidebar from "./components/Sidebar";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [jobPosts, setJobPosts] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidates, setCandidates] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading AI Models...");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize AI models and load data on first render
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize AI models
        await aiEngine.initialize((message, progress) => {
          setLoadingMessage(message);
          setLoadingProgress(progress);
        });
        setAiLoaded(true);

        // Load data from Firebase
        setLoadingMessage("Loading your data...");
        setLoadingProgress(100);
        await loadDataFromFirebase();
        setDataLoaded(true);
      } catch (error) {
        console.error("Initialization error:", error);
        alert("Error loading AI models. Please refresh the page.");
      }
    };

    initialize();
  }, []);

  // Load all job posts and candidates from Firebase
  const loadDataFromFirebase = async () => {
    try {
      const jobs = await getAllJobPosts();
      setJobPosts(jobs);

      // Load candidates for each job
      const candidatesMap = {};
      for (const job of jobs) {
        const jobCandidates = await getCandidatesByJobId(job.id);
        candidatesMap[job.id] = jobCandidates;
      }
      setCandidates(candidatesMap);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Refresh data from Firebase
  const refreshData = async () => {
    await loadDataFromFirebase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00004D] via-[#00004D] to-[#00004D] p-4 sm:p-6">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Loading Screen */}
      {(!aiLoaded || !dataLoaded) && (
        <LoadingScreen message={loadingMessage} progress={loadingProgress} />
      )}

      {/* Main Content */}
      {aiLoaded && dataLoaded && (
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Dashboard Page */}
          {currentPage === "dashboard" && (
            <Dashboard
              jobPosts={jobPosts}
              setJobPosts={setJobPosts}
              candidates={candidates}
              setSelectedJob={setSelectedJob}
              setCurrentPage={setCurrentPage}
              refreshData={refreshData}
              setIsSidebarOpen={setIsSidebarOpen} 
            />
          )}

          {/* Job Detail Page */}
          {currentPage === "jobDetail" && selectedJob && (
            <JobDetailPage
              selectedJob={selectedJob}
              candidates={candidates}
              setCandidates={setCandidates}
              setCurrentPage={setCurrentPage}
              setSelectedCandidate={setSelectedCandidate}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              setIsSidebarOpen={setIsSidebarOpen} 
            />
          )}

          {/* Candidate Detail Page */}
          {currentPage === "candidateDetail" && selectedCandidate && (
            <CandidateDetailPage
              selectedCandidate={selectedCandidate}
              setCurrentPage={setCurrentPage}
              setIsSidebarOpen={setIsSidebarOpen} 
            />
          )}

          {/* Activity Log Page */}
          {currentPage === "activityLog" && (
            <ActivityLogPage setCurrentPage={setCurrentPage} />
          )}

          {/* Account Page */}
          {currentPage === "account" && (
            <AccountPage setCurrentPage={setCurrentPage} />
          )}

          {/*Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onNavigate={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
