import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Upload,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  Menu,
} from "lucide-react";
import { aiEngine } from "../utils/aiEngine";
import {
  createCandidate, //Use single candidate function
  deleteCandidate,
  updateCandidate,
  getCandidatesByJobId,
} from "../firebase/firestoreService";
import {
  fetchResumeAsFile,
  getResumesByJobId,
} from "../firebase/storageService";
import { createActivityLog } from "../firebase/firestoreService";
import toast, { Toaster } from "react-hot-toast";

// ADD: Server API URL
const API_URL = process.env.REACT_APP_API_URL || '/api';

// small sleep helper to throttle OCR requests (prevent timeouts)
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ADD: Server-side text extraction function
const extractTextFromFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_URL}/extract`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return data.text;
    } else {
      throw new Error(data.error || "Failed to extract text");
    }
  } catch (error) {
    console.error("Server extraction error:", error);
    throw new Error(
      `Extraction failed: ${error.message}. Make sure Node.js server is running on port 5000.`
    );
  }
};

// Custom confirm toast (Yes / No) using react-hot-toast
const confirmToast = (message, opts = {}) =>
  new Promise((resolve) => {
    toast(
      (t) => (
        <div className="text-white">
          <div className="mb-2">{message}</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
            >
              No
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-500"
            >
              Yes
            </button>
          </div>
        </div>
      ),
      {
        duration: opts.duration ?? 8000,
        style: {
          background: "#1e1e1e",
          color: "white",
          border: "1px solid #444",
        },
      }
    );
  });

const JobDetailPage = ({
  selectedJob,
  candidates,
  setCandidates,
  setCurrentPage,
  setSelectedCandidate,
  isProcessing,
  setIsProcessing,
  setIsSidebarOpen,
}) => {
  const fileInputRef = useRef(null);
  const uploadButtonRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [localCriteria, setLocalCriteria] = useState(selectedJob.criteria);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (showUploadOptions && uploadButtonRef.current) {
      const rect = uploadButtonRef.current.getBoundingClientRect();
      const top = rect.bottom + 8;
      const left = rect.left;
      const width = rect.width;
      setMenuPosition({ top, left, width });
    }
  }, [showUploadOptions]);

  useEffect(() => {
    if (!showUploadOptions) return;
    const handleScrollOrResize = () => {
      if (!uploadButtonRef.current) return;
      const rect = uploadButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowUploadOptions(false);
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showUploadOptions]);

  useEffect(() => {
    const loadCandidates = async () => {
      if (!candidates[selectedJob.id]) {
        const jobCandidates = await getCandidatesByJobId(selectedJob.id);
        setCandidates((prev) => ({
          ...prev,
          [selectedJob.id]: jobCandidates,
        }));
      }
    };
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob.id]);

  const jobCandidates = candidates[selectedJob.id] || [];
  const top10Count = Math.ceil(jobCandidates.length * 0.1) || 1;
  const top20Count = Math.ceil(jobCandidates.length * 0.2) || 2;

  const filteredCandidates = jobCandidates.filter((c) => {
    const index = jobCandidates.indexOf(c);
    if (filter === "top10") return index < top10Count;
    if (filter === "top20") return index < top20Count;
    if (filter === "below20") return index >= top20Count;
    return true;
  });

  // PROGRESSIVE FILE UPLOAD - Process, Save, Display ONE BY ONE
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    setShowUploadOptions(false);
    setUploadProgress(`Starting upload of ${files.length} files...`);

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Processing ${i + 1}/${files.length}: ${file.name}`);

        try {
          // Extract text from file using SERVER
          const text = await extractTextFromFile(file);

          // Extract contact info using AI
          const contactInfo = await aiEngine.extractContactInfo(text);

          // Create candidate object
          const candidateData = {
            jobId: selectedJob.id,
            ...contactInfo,
            resumeText: text,
            fileName: file.name,
            uploadDate: new Date().toLocaleString(),
          };

          // Score resume using AI
          const analysis = await aiEngine.scoreResume(
            text,
            selectedJob.description,
            localCriteria
          );
          Object.assign(candidateData, analysis);

          // SAVE THIS ONE CANDIDATE IMMEDIATELY
          const savedCandidate = await createCandidate(candidateData);

          // DISPLAY THIS ONE CANDIDATE IMMEDIATELY
          setCandidates((prev) => {
            const currentCandidates = prev[selectedJob.id] || [];
            const updatedCandidates = [
              ...currentCandidates,
              savedCandidate,
            ].sort((a, b) => b.score - a.score);
            return {
              ...prev,
              [selectedJob.id]: updatedCandidates,
            };
          });

          successCount++;

          // Show progress toast
          toast.success(
            `Processed: ${file.name} (${i + 1}/${files.length})`,
            {
              duration: 2000,
            }
          );
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          errorCount++;
          toast.error(`Failed: ${file.name} - ${error.message}`, {
            duration: 3000,
          });
        }

        // Small throttle to avoid overloading
        await sleep(300);
      }

      // Log activity
      await createActivityLog({
        action: `Uploaded ${successCount} resumes for: ${selectedJob.title}`,
        type: "UPLOAD",
        metadata: {
          jobId: selectedJob.id,
          successCount,
          errorCount,
          totalFiles: files.length,
        },
      });

      // Final summary toast
      if (successCount > 0) {
        toast.success(
          `🎉 Complete! ${successCount} resumes processed successfully!`,
          {
            duration: 4000,
          }
        );
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} files failed to process`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload process error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress("");
      if (e && e.target) e.target.value = "";
    }
  };

  // PROGRESSIVE FIREBASE PULL - Process, Save, Display ONE BY ONE
  const handlePullFromFirebase = async () => {
    setIsProcessing(true);
    setShowUploadOptions(false);
    setUploadProgress("Fetching resumes from Firebase...");

    let successCount = 0;
    let errorCount = 0;

    try {
      // Get all resume files for this job from Firebase Storage
      const resumeFiles = await getResumesByJobId(selectedJob.id);

      if (resumeFiles.length === 0) {
        toast("ℹ️ No resumes found in Firebase Storage for this job.");
        setIsProcessing(false);
        setUploadProgress("");
        return;
      }

      setUploadProgress(`Found ${resumeFiles.length} resumes. Processing...`);

      for (let i = 0; i < resumeFiles.length; i++) {
        const resumeFile = resumeFiles[i];
        setUploadProgress(
          `Processing ${i + 1}/${resumeFiles.length}: ${resumeFile.name}`
        );

        try {
          // Fetch file as File object
          const file = await fetchResumeAsFile(resumeFile.url, resumeFile.name);

          // Extract text using SERVER
          const text = await extractTextFromFile(file);

          // Extract contact info
          const contactInfo = await aiEngine.extractContactInfo(text);

          const candidateData = {
            jobId: selectedJob.id,
            ...contactInfo,
            resumeText: text,
            fileName: resumeFile.name,
            uploadDate: new Date().toLocaleString(),
            storageUrl: resumeFile.url,
            storagePath: resumeFile.path,
          };

          // Score resume
          const analysis = await aiEngine.scoreResume(
            text,
            selectedJob.description,
            localCriteria
          );
          Object.assign(candidateData, analysis);

          // SAVE THIS ONE CANDIDATE IMMEDIATELY
          const savedCandidate = await createCandidate(candidateData);

          // DISPLAY THIS ONE CANDIDATE IMMEDIATELY
          setCandidates((prev) => {
            const currentCandidates = prev[selectedJob.id] || [];
            const updatedCandidates = [
              ...currentCandidates,
              savedCandidate,
            ].sort((a, b) => b.score - a.score);
            return {
              ...prev,
              [selectedJob.id]: updatedCandidates,
            };
          });

          successCount++;

          // Show progress toast
          toast.success(
            `Pulled: ${resumeFile.name} (${i + 1}/${resumeFiles.length})`,
            {
              duration: 2000,
            }
          );
        } catch (error) {
          console.error(`Error processing ${resumeFile.name}:`, error);
          errorCount++;
          toast.error(`Failed: ${resumeFile.name} - ${error.message}`, {
            duration: 3000,
          });
        }

        // Small throttle
        await sleep(300);
      }

      // Log activity
      await createActivityLog({
        action: `Pulled ${successCount} resumes from Firebase Storage for: ${selectedJob.title}`,
        type: "FIREBASE_PULL",
        metadata: {
          jobId: selectedJob.id,
          successCount,
          errorCount,
          totalFiles: resumeFiles.length,
        },
      });

      // Final summary
      if (successCount > 0) {
        toast.success(
          `🎉 Complete! ${successCount} resumes pulled successfully!`,
          {
            duration: 4000,
          }
        );
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} files failed to process`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Firebase pull error:", error);
      toast.error(`Error pulling from Firebase: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress("");
    }
  };

  // Re-evaluate top candidates (NO CHANGES)
  const reevaluateTopCandidates = async () => {
    const topCands =
      filter === "top10"
        ? jobCandidates.slice(0, top10Count)
        : jobCandidates.slice(0, top20Count);

    if (topCands.length === 0) {
      toast("No candidates to re-evaluate");
      return;
    }

    setIsProcessing(true);
    setUploadProgress(`Re-evaluating ${topCands.length} candidates...`);

    try {
      const updated = [];

      for (let i = 0; i < topCands.length; i++) {
        const candidate = topCands[i];
        setUploadProgress(
          `Re-evaluating ${i + 1}/${topCands.length}: ${candidate.name}`
        );

        const analysis = await aiEngine.scoreResume(
          candidate.resumeText,
          selectedJob.description,
          localCriteria
        );

        const updatedCandidate = { ...candidate, ...analysis };

        await updateCandidate(candidate.id, {
          score: analysis.score,
          justification: analysis.justification,
          matchedKeywords: analysis.matchedKeywords,
          skillsFound: analysis.skillsFound,
          similarityScore: analysis.similarityScore,
          keywordMatchRate: analysis.keywordMatchRate,
          skillMatchRate: analysis.skillMatchRate,
          recommendation: analysis.recommendation,
        });

        updated.push(updatedCandidate);
        await sleep(100);
      }

      await createActivityLog({
        action: `Re-evaluated ${topCands.length} candidates for: ${selectedJob.title}`,
        type: "REEVALUATE",
        metadata: { jobId: selectedJob.id, count: topCands.length },
      });

      const others =
        filter === "top10"
          ? jobCandidates.slice(top10Count)
          : jobCandidates.slice(top20Count);

      setCandidates((prev) => ({
        ...prev,
        [selectedJob.id]: [...updated, ...others].sort(
          (a, b) => b.score - a.score
        ),
      }));

      toast.success(
        `Re-evaluated ${topCands.length} candidates successfully!`
      );
    } catch (error) {
      console.error("Re-evaluation error:", error);
      toast.error(`Error re-evaluating candidates: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress("");
    }
  };

  // Delete all below 20%
  const deleteBelowTop20 = async () => {
    const belowTop20 = jobCandidates.slice(top20Count);
    if (belowTop20.length === 0) {
      toast("No candidates to delete");
      return;
    }

    const confirm = await confirmToast(
      `Delete ${belowTop20.length} candidates below top 20%?`
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      await Promise.all(belowTop20.map((c) => deleteCandidate(c.id)));

      await createActivityLog({
        action: `Deleted ${belowTop20.length} candidates below 20% for: ${selectedJob.title}`,
        type: "BULK_DELETE",
        metadata: { jobId: selectedJob.id, count: belowTop20.length },
      });

      setCandidates((prev) => ({
        ...prev,
        [selectedJob.id]: jobCandidates.slice(0, top20Count),
      }));

      toast.success(`Deleted ${belowTop20.length} candidates`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(`Error deleting candidates: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete individual candidate
  const handleDeleteCandidate = async (candidateId, candidateName) => {
    const confirm = await confirmToast(`Delete ${candidateName}?`);
    if (!confirm) return;

    try {
      await deleteCandidate(candidateId);
      await createActivityLog({
        action: `Deleted candidate: ${candidateName}`,
        type: "DELETE",
        metadata: { jobId: selectedJob.id, candidateId },
      });

      setCandidates((prev) => ({
        ...prev,
        [selectedJob.id]: jobCandidates.filter((c) => c.id !== candidateId),
      }));

      toast.success(`Deleted ${candidateName}`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting candidate");
    }
  };

  return (
    <div>
      <Toaster position="top-right" reverseOrder={false} />

      {/* Back Button + Menu Button Row */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentPage("dashboard")}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 
          hover:bg-white/20 transition-all group"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>

      {/* Job Info */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-8 mb-6 border border-white/20">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          {selectedJob.title}
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <p className="text-white whitespace-pre-wrap text-sm sm:text-base">
              {selectedJob.description}
            </p>
          </div>
          <div className="backdrop-blur-xl bg-black/20 rounded-2xl p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3">
              Evaluation Criteria
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-white text-xs mb-1 block">
                  Min Experience (years)
                </label>
                <input
                  type="number"
                  value={localCriteria.minExperience}
                  onChange={(e) =>
                    setLocalCriteria({
                      ...localCriteria,
                      minExperience: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-black/30 text-white rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white text-xs mb-1 block">
                  Required Skills
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(localCriteria.skills)
                      ? localCriteria.skills.join(", ")
                      : localCriteria.skills
                  }
                  onChange={(e) =>
                    setLocalCriteria({
                      ...localCriteria,
                      skills: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  className="w-full bg-black/30 text-white rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload & Filters */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 mb-6 border border-white/20">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Button with Dropdown */}
          <div
            className="relative z-[1] w-full sm:w-auto"
            ref={uploadButtonRef}
          >
            <button
              onClick={() => setShowUploadOptions(!showUploadOptions)}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-semibold
              bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
              hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
              transition-all duration-300 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              {isProcessing
                ? uploadProgress || "Processing..."
                : "Upload Resumes"}
              {!isProcessing && (
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>

            {/* Dropdown Menu */}
            {showUploadOptions &&
              !isProcessing &&
              createPortal(
                <div
                  className="fixed backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl overflow-hidden z-[100000]"
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: menuPosition.width,
                  }}
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowUploadOptions(false);
                    }}
                    className="w-full px-6 py-4 text-left text-white hover:bg-white/20 transition-all flex items-center gap-3 border-b border-white/10"
                  >
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <svg
                        className="w-5 h-5 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm sm:text-base">
                        Upload from Computer
                      </div>
                      <div className="text-xs text-purple-200">
                        Select PDF, DOCX, or TXT files
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handlePullFromFirebase}
                    className="w-full px-6 py-4 text-left text-white hover:bg-white/20 transition-all flex items-center gap-3"
                  >
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <svg
                        className="w-5 h-5 text-orange-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3.89 15.673L6.255.461A.542.542 0 017.27.288L9.813 5.06h4.372L16.73.288a.542.542 0 011.015.173l2.365 15.212a.542.542 0 01-.695.622L12 13.5l-7.415 2.795a.542.542 0 01-.695-.622z" />
                        <path d="M12 13.5l7.415 2.795L12 24l-7.415-7.705L12 13.5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm sm:text-base">
                        Pull from Firebase
                      </div>
                      <div className="text-xs text-purple-200">
                        Fetch from database
                      </div>
                    </div>
                  </button>
                </div>,
                document.body
              )}
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                filter === "all"
                  ? "bg-white text-[#3646ff]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              All ({jobCandidates.length})
            </button>
            <button
              onClick={() => setFilter("top10")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                filter === "top10"
                  ? "bg-white text-[#3646ff]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Top 10% ({top10Count})
            </button>
            <button
              onClick={() => setFilter("top20")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                filter === "top20"
                  ? "bg-white text-[#3646ff]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Top 20% ({top20Count})
            </button>
            <button
              onClick={() => setFilter("below20")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                filter === "below20"
                  ? "bg-white text-[#3646ff]"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Below 20% ({Math.max(0, jobCandidates.length - top20Count)})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            {(filter === "top10" || filter === "top20") && (
              <button
                onClick={reevaluateTopCandidates}
                disabled={isProcessing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50 text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
                />
                Re-evaluate
              </button>
            )}
            {filter === "below20" && jobCandidates.length > top20Count && (
              <button
                onClick={deleteBelowTop20}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500/20 text-red-300 rounded-xl font-medium hover:bg-red-500/30 transition-all text-xs sm:text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete All Below 20%</span>
                <span className="sm:hidden">Delete All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Candidate List */}
      <div className="space-y-3">
        {filteredCandidates.map((candidate) => {
          const actualIndex = jobCandidates.indexOf(candidate);
          return (
            <div
              key={candidate.id}
              onClick={() => {
                setSelectedCandidate(candidate);
                setCurrentPage("candidateDetail");
              }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-5 border border-white/20 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Score */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <div
                    className={`text-2xl sm:text-3xl font-bold text-[#85EDFF]`}
                  >
                    {candidate.score}/10
                  </div>
                  <div className="text-xs text-white mt-1">
                    #{actualIndex + 1}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">
                    {candidate.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-white mb-2">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />{" "}
                      {candidate.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0" />{" "}
                      {candidate.phone}
                    </span>
                    {candidate.linkedin && (
                      <span className="flex items-center gap-1 truncate">
                        <Linkedin className="w-3 h-3 flex-shrink-0" />{" "}
                        {candidate.linkedin}
                      </span>
                    )}
                  </div>
                  <p className="text-cyan-200 text-xs sm:text-sm">
                    {candidate.justification}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-[#85EDFF] rounded-lg text-xs sm:text-sm font-semibold
                  bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                  hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                  transition-all duration-300 whitespace-nowrap"
                  >
                    View Details →
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCandidate(candidate.id, candidate.name);
                    }}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCandidates.length === 0 && (
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 sm:p-12 border border-white/20 text-center">
          <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-lg sm:text-xl text-white mb-2">
            {jobCandidates.length === 0
              ? "No candidates yet"
              : "No candidates in this filter"}
          </p>
          <p className="text-purple-200 text-sm sm:text-base">
            {jobCandidates.length === 0
              ? "Upload resumes to start"
              : "Try a different filter"}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;
