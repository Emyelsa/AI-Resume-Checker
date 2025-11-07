import React, { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Brain,
  Target,
  CheckCircle,
  FileText,
  TrendingUp,
  Star,
  AlertCircle,
  X,
  Menu,
} from "lucide-react";

const CandidateDetailPage = ({
  selectedCandidate,
  setCurrentPage,
  setIsSidebarOpen,
}) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const rec = selectedCandidate?.recommendation || {
    shouldCall: false,
    action: "",
    reason: "",
    priority: "medium",
  };

  const matchedKeywords = Array.isArray(selectedCandidate?.matchedKeywords)
    ? selectedCandidate.matchedKeywords
    : [];

  const skillsFound = Array.isArray(selectedCandidate?.skillsFound)
    ? selectedCandidate.skillsFound
    : [];

  const criticalSkillsFound = Array.isArray(
    selectedCandidate?.criticalSkillsFound
  )
    ? selectedCandidate.criticalSkillsFound
    : [];

  const criticalSkillsMissing = Array.isArray(
    selectedCandidate?.criticalSkillsMissing
  )
    ? selectedCandidate.criticalSkillsMissing
    : [];

  const handleSendEmail = () => {
    //Add email sending logic here
    console.log("Sending email to:", selectedCandidate?.email);
    console.log("Message:", emailMessage);

    // Close modal and reset message
    setShowEmailModal(false);
    setEmailMessage("");
  };

  const handleCancelEmail = () => {
    setShowEmailModal(false);
    setEmailMessage("");
  };

  // Determine if candidate is high priority based on recommendation
  const isHighPriority = rec.priority === "urgent" || rec.priority === "high";

  return (
    <div>
      {/*Back Button + Menu Button Row */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentPage("jobDetail")}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Candidates
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Profile (2/3 width) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Profile Header */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-8 border border-white/20">
            <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 break-words">
                  {selectedCandidate?.name || "Unnamed Candidate"}
                </h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-white text-sm sm:text-base">
                  {selectedCandidate?.email && (
                    <span className="flex items-center gap-2 break-all">
                      <Mail className="w-4 h-4 flex-shrink-0 text-[#85EDFF]" />{" "}
                      {selectedCandidate.email}
                    </span>
                  )}
                  {selectedCandidate?.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0 text-[#85EDFF]" />{" "}
                      {selectedCandidate.phone}
                    </span>
                  )}
                  {selectedCandidate?.linkedin && (
                    <a
                      href={`https://${selectedCandidate.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[#85EDFF] transition-colors break-all text-white"
                    >
                      <Linkedin className="w-4 h-4 flex-shrink-0 text-[#85EDFF]" />{" "}
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl sm:text-6xl font-bold text-[#85EDFF]">
                  {selectedCandidate?.score ?? "N/A"}/10
                </div>
                <div className="text-white text-sm mt-2">Overall Score</div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div
              className={`p-4 sm:p-6 rounded-2xl border-2 mb-6 ${
                rec.priority === "urgent"
                  ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
                  : rec.priority === "high"
                  ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
                  : rec.priority === "medium"
                  ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30"
                  : "bg-gray-500/10 border-gray-500/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div
                  className={`p-3 rounded-xl ${
                    rec.priority === "urgent"
                      ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20"
                      : rec.priority === "high"
                      ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                      : rec.priority === "medium"
                      ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20"
                      : "bg-gray-500/20"
                  }`}
                >
                  {isHighPriority || rec.shouldCall ? (
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  ) : rec.priority === "medium" ? (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3
                      className={`text-lg sm:text-xl font-bold ${
                        rec.priority === "urgent"
                          ? "text-yellow-400"
                          : rec.priority === "high"
                          ? "text-green-400"
                          : rec.priority === "medium"
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    >
                      {rec.priority === "urgent"
                        ? "🌟 High Priority Candidate"
                        : rec.priority === "high"
                        ? "📞 Recommended Candidate"
                        : rec.priority === "medium"
                        ? "💡 Consider - Review with Team"
                        : "⏸️ Hold in Talent Pool"}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                        rec.priority === "urgent"
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                          : rec.priority === "high"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          : rec.priority === "medium"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                      }`}
                    >
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white font-semibold mb-1 text-sm sm:text-base">
                    {rec.action}
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    {rec.reason}
                  </p>
                  {(isHighPriority || rec.shouldCall) && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                        <Phone className="w-4 h-4" />
                        Schedule Interview
                      </button>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Mail className="w-4 h-4" />
                        Send Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Justification */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Brain className="w-5 h-5 text-cyan-400" />
                AI Analysis Summary
              </h3>
              <p className="text-cyan-200 text-base sm:text-lg">
                {selectedCandidate?.justification || "No analysis available."}
              </p>
            </div>

            {/* Critical Skills Section */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Star className="w-5 h-5 text-yellow-400" />
                Critical Skills Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Critical Skills Found */}
                <div>
                  <p className="text-cyan-200 text-xs mb-2">
                    ✓ Critical Skills Found
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {criticalSkillsFound.length > 0 ? (
                      criticalSkillsFound.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-green-500/30 text-white rounded-full text-xs sm:text-sm border border-green-400/30"
                        >
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs">None found</span>
                    )}
                  </div>
                </div>
                {/* Critical Skills Missing */}
                <div>
                  <p className="text-red-200 text-xs mb-2">
                    ✗ Critical Skills Missing
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {criticalSkillsMissing.length > 0 ? (
                      criticalSkillsMissing.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-red-500/30 text-white rounded-full text-xs sm:text-sm border border-red-400/30"
                        >
                          ✗ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-green-400 text-xs">
                        All critical skills met!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Keywords & Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Target className="w-5 h-5 text-purple-400" />
                  Matched Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {matchedKeywords.length > 0 ? (
                    matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-500/30 text-white rounded-full text-xs sm:text-sm border border-purple-400/30"
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs sm:text-sm">
                      No keywords matched
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                  All Skills Found
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillsFound.length > 0 ? (
                    skillsFound.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-cyan-500/30 text-white rounded-full text-xs sm:text-sm border border-cyan-400/30"
                      >
                        ✓ {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs sm:text-sm">
                      No required skills found
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resume Preview */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-5 h-5 text-cyan-400" />
              Resume Content
            </h3>
            <div className="bg-black/30 rounded-xl p-3 sm:p-4 max-h-64 sm:max-h-96 overflow-y-auto">
              <pre className="text-gray-300 text-xs sm:text-sm whitespace-pre-wrap font-mono break-words">
                {selectedCandidate?.resumeText ||
                  "No resume content available."}
              </pre>
            </div>
          </div>
        </div>

        {/* Analytics Sidebar (1/3 width) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Detailed Analytics */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Detailed Analytics
            </h3>
            <div className="space-y-4">
              {/* Semantic Similarity */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-white text-xs sm:text-sm">
                    Semantic Similarity
                  </span>
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {selectedCandidate?.similarityScore ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedCandidate?.similarityScore ?? 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Critical Skill Match Rate */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-white text-xs sm:text-sm">
                    Critical Skill Match
                  </span>
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {selectedCandidate?.criticalSkillMatchRate ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        selectedCandidate?.criticalSkillMatchRate ?? 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Keyword Match Rate */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-white text-xs sm:text-sm">
                    Keyword Match Rate
                  </span>
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {selectedCandidate?.keywordMatchRate ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedCandidate?.keywordMatchRate ?? 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Overall Skill Match Rate */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-white text-xs sm:text-sm">
                    Overall Skill Match
                  </span>
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {selectedCandidate?.skillMatchRate ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedCandidate?.skillMatchRate ?? 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Years of Experience */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs sm:text-sm">
                    Years of Experience
                  </span>
                  <span className="text-white font-bold text-base sm:text-lg">
                    {selectedCandidate?.yearsExp ?? 0}+ years
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Facts */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Star className="w-5 h-5 text-cyan-400" />
              Quick Facts
            </h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="text-white">Resume uploaded</span>
                <span className="text-white text-right">
                  {selectedCandidate?.uploadDate || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-white">File name</span>
                <span className="text-white text-right break-all">
                  {selectedCandidate?.fileName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Priority Level</span>
                <span
                  className={`font-semibold ${
                    rec.priority === "urgent"
                      ? "text-red-400"
                      : rec.priority === "high"
                      ? "text-orange-400"
                      : rec.priority === "medium"
                      ? "text-blue-400"
                      : "text-gray-400"
                  }`}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 sm:p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 text-sm sm:text-base">
              Next Actions
            </h3>
            <div className="space-y-3">
              <button
                className="w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base
                text-[#85EDFF] bg-white/10 backdrop-blur-xl border border-white/20
                shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300
                hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:text-white"
              >
                <Phone className="w-4 h-4" />
                Call Candidate
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base
                text-[#85EDFF] bg-white/10 backdrop-blur-xl border border-white/20
                shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300
                hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:text-white"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              {selectedCandidate?.linkedin && (
                <a
                  href={`https://${selectedCandidate.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base
                  text-[#85EDFF] bg-white/10 backdrop-blur-xl border border-white/20
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300
                  hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:text-white"
                >
                  <Linkedin className="w-4 h-4" />
                  View LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelEmail}
          ></div>

          {/* Modal */}
          <div className="relative w-full max-w-2xl backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Send Email
                </h2>
                <p className="text-gray-300 text-sm">
                  To: {selectedCandidate?.name || "Candidate"} (
                  {selectedCandidate?.email || "No email"})
                </p>
              </div>
              <button
                onClick={handleCancelEmail}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Email Form */}
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Subject</label>
                <input
                  type="text"
                  defaultValue={`Interview Opportunity - ${
                    selectedCandidate?.name || "Candidate"
                  }`}
                  className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder={`Hi ${
                    selectedCandidate?.name || "there"
                  },\n\nI hope this email finds you well. I came across your resume and was impressed by your background and experience.\n\nWould you be interested in discussing a potential opportunity with our team? I'd love to schedule a brief call to learn more about your career goals and share details about the position.\n\nLooking forward to hearing from you!\n\nBest regards,`}
                  rows={8}
                  className="w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelEmail}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base
    text-[#85EDFF] bg-white/10 backdrop-blur-xl border border-white/20
    shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-300
    hover:bg-white/15 hover:border-white/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:text-white"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetailPage;
