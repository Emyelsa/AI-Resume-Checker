import React, { useState } from "react";
import { Sparkles, Plus, Edit2, Trash2, FileText, Menu } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  createJobPost,
  updateJobPost,
  deleteJobPost,
} from "../firebase/firestoreService";
import { createActivityLog } from "../firebase/firestoreService";

//Custom confirmation toast (non-blocking replacement for window.confirm)
const confirmToast = (message) => {
  return new Promise((resolve) => {
    const toastId = toast(
      (t) => (
        <div className="flex flex-col gap-3 text-white">
          <span>{message}</span>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(true);
              }}
              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
            >
              Yes
            </button>
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(false);
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
            >
              No
            </button>
          </div>
        </div>
      ),
      { duration: 8000, style: { background: "#1f1f1f" } }
    );
  });
};

const Dashboard = ({
  jobPosts,
  setJobPosts,
  candidates,
  setSelectedJob,
  setCurrentPage,
  refreshData,
  setIsSidebarOpen,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    criteria: {
      minExperience: "",
      skills: "",
      education: "Bachelor",
    },
  });

  //Create Job Post
  const handleCreateJob = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = {
        title: formData.title,
        description: formData.description,
        criteria: {
          ...formData.criteria,
          minExperience: parseInt(formData.criteria.minExperience) || 2,
          skills: formData.criteria.skills
            ? formData.criteria.skills.split(",").map((s) => s.trim())
            : [],
        },
      };

      const createdJob = await createJobPost(job);
      await createActivityLog({
        action: `Created job post: ${job.title}`,
        type: "CREATE_JOB",
        metadata: { jobId: createdJob.id },
      });

      setJobPosts((prev) => [createdJob, ...prev]);
      setShowCreateForm(false);
      setFormData({
        title: "",
        description: "",
        criteria: {
          minExperience: 2,
          skills: "JavaScript, React, Node.js",
          education: "Bachelor",
        },
      });
      toast.success("Job post created successfully!");
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Error creating job post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  //Update Job Post
  const handleUpdateJob = async () => {
    if (!editingJob.title || !editingJob.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const jobData = {
        title: editingJob.title,
        description: editingJob.description,
        criteria: {
          ...editingJob.criteria,
          skills:
            typeof editingJob.criteria.skills === "string"
              ? editingJob.criteria.skills.split(",").map((s) => s.trim())
              : editingJob.criteria.skills,
        },
      };

      await updateJobPost(editingJob.id, jobData);
      await createActivityLog({
        action: `Updated job post: ${jobData.title}`,
        type: "EDIT_JOB",
        metadata: { jobId: editingJob.id },
      });

      setJobPosts((prev) =>
        prev.map((j) => (j.id === editingJob.id ? { ...j, ...jobData } : j))
      );
      setEditingJob(null);
      setShowCreateForm(false);
      toast.success("Job post updated successfully!");
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("Error updating job post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  //Delete Job Post (using confirmToast)
  const handleDeleteJob = async (jobId, jobTitle) => {
    const confirmed = await confirmToast(
      `Are you sure you want to delete "${jobTitle}"? This will also delete all associated candidates.`
    );
    if (!confirmed) return;

    try {
      await deleteJobPost(jobId);
      await createActivityLog({
        action: `Deleted job post: ${jobTitle}`,
        type: "DELETE_JOB",
        metadata: { jobId },
      });

      setJobPosts((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job post deleted successfully!");
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Error deleting job post. Please try again.");
    }
  };

  const startEdit = (job) => {
    setEditingJob({
      ...job,
      criteria: {
        ...job.criteria,
        skills: Array.isArray(job.criteria.skills)
          ? job.criteria.skills.join(", ")
          : job.criteria.skills,
      },
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingJob(null);
    setShowCreateForm(false);
    setFormData({
      title: "",
      description: "",
      criteria: { minExperience: "", skills: "", education: "Bachelor" },
    });
  };

  return (
    <div>
      <Toaster position="top-right" reverseOrder={false} />

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-8 mb-6 border border-white/20 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#85EDFF]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">
                Job Posts Dashboard
              </h1>
              <p className="text-white text-sm sm:text-base">
                Manage all your job openings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 sm:px-6 py-2 sm:py-3 text-[#85EDFF] rounded-xl font-semibold flex items-center gap-2
    bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
    hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
    transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Job Post</span>
              <span className="sm:hidden">New Post</span>
            </button>

            {/*MENU BUTTON */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 
    hover:bg-white/20 transition-all group"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 mb-6 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            {editingJob ? "Edit Job Post" : "Create New Job Post"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">
                Job Title *
              </label>
              <input
                type="text"
                value={editingJob ? editingJob.title : formData.title}
                onChange={(e) =>
                  editingJob
                    ? setEditingJob({ ...editingJob, title: e.target.value })
                    : setFormData({ ...formData, title: e.target.value })
                }
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-white/10 focus:border-purple-500 focus:outline-none"
                placeholder="e.g. Senior Full Stack Developer"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">
                Job Description *
              </label>
              <textarea
                value={
                  editingJob ? editingJob.description : formData.description
                }
                onChange={(e) =>
                  editingJob
                    ? setEditingJob({
                        ...editingJob,
                        description: e.target.value,
                      })
                    : setFormData({ ...formData, description: e.target.value })
                }
                className="w-full h-32 sm:h-48 bg-black/30 text-white rounded-lg px-4 py-3 border border-white/10 focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Describe the role, requirements, and responsibilities..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-white text-sm mb-2 block">
                  Min Experience (years)
                </label>
                <input
                  type="number"
                  value={
                    editingJob
                      ? editingJob.criteria.minExperience
                      : formData.criteria.minExperience
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    editingJob
                      ? setEditingJob({
                          ...editingJob,
                          criteria: {
                            ...editingJob.criteria,
                            minExperience: val,
                          },
                        })
                      : setFormData({
                          ...formData,
                          criteria: {
                            ...formData.criteria,
                            minExperience: val,
                          },
                        });
                  }}
                  className="w-full bg-black/30 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. 2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-white text-sm mb-2 block">
                  Required Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={
                    editingJob
                      ? editingJob.criteria.skills
                      : formData.criteria.skills
                  }
                  onChange={(e) =>
                    editingJob
                      ? setEditingJob({
                          ...editingJob,
                          criteria: {
                            ...editingJob.criteria,
                            skills: e.target.value,
                          },
                        })
                      : setFormData({
                          ...formData,
                          criteria: {
                            ...formData.criteria,
                            skills: e.target.value,
                          },
                        })
                  }
                  className="w-full bg-black/30 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. JavaScript, React, Node.js"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingJob ? handleUpdateJob : handleCreateJob}
                disabled={isSubmitting}
                className="px-4 sm:px-6 py-2 sm:py-3 text-[#85EDFF] rounded-xl font-semibold
                bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingJob
                  ? "Save Changes"
                  : "Create Job Post"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-semibold
                bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {jobPosts.map((job) => (
          <div
            key={job.id}
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 border border-white/20 hover:border-purple-500/50 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">
                  {job.title}
                </h3>
                <p className="text-white text-xs sm:text-sm">
                  Created: {job.createdAt || "Just now"}
                </p>
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(job);
                  }}
                  className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleDeleteJob(job.id, job.title);
                  }}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4 line-clamp-3">
              {job.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-cyan-400 text-sm">
                {candidates[job.id]?.length || 0} candidates
              </div>
              <button
                onClick={() => {
                  setSelectedJob(job);
                  setCurrentPage("jobDetail");
                }}
                className="px-3 sm:px-4 py-2 text-[#85EDFF] rounded-lg text-xs sm:text-sm font-semibold
                bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                transition-all duration-300"
              >
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {jobPosts.length === 0 && (
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 sm:p-12 border border-white/20 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-lg sm:text-xl text-white mb-2">No job posts yet</p>
          <p className="text-purple-200 text-sm sm:text-base">
            Create your first job post to start evaluating candidates
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
