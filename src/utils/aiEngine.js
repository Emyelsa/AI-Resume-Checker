import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

class AIEngine {
  constructor() {
    this.embedder = null;
    this.ner = null;
    this.isLoading = false;
    this.isInitialized = false;
    this.allScores = [];
  }

  async initialize(onProgress) {
    if (this.isInitialized) return;
    if (this.isLoading) {
      await this.waitForInitialization();
      return;
    }

    this.isLoading = true;
    console.log("Loading AI models from Hugging Face...");

    try {
      if (onProgress) onProgress("Loading embedding model...", 30);
      this.embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { quantized: true }
      );

      if (onProgress) onProgress("Loading NER model...", 70);
      this.ner = await pipeline(
        "token-classification",
        "Xenova/bert-base-NER",
        { quantized: true }
      );

      this.isInitialized = true;
      console.log("AI models loaded successfully!");
      if (onProgress) onProgress("Models ready!", 100);
    } catch (error) {
      console.error("Error loading models:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async waitForInitialization() {
    while (this.isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async getEmbedding(text) {
    await this.initialize();
    const result = await this.embedder(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(result.data);
  }

  async computeSemanticSimilarity(text1, text2) {
    const [embedding1, embedding2] = await Promise.all([
      this.getEmbedding(text1.slice(0, 512)),
      this.getEmbedding(text2.slice(0, 512)),
    ]);

    const dotProduct = embedding1.reduce(
      (sum, val, i) => sum + val * embedding2[i],
      0
    );
    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, val) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, val) => sum + val * val, 0)
    );

    return dotProduct / (magnitude1 * magnitude2);
  }

  extractKeywords(text, topN = 15) {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const freq = {};
    tokens.forEach((token) => {
      freq[token] = (freq[token] || 0) + 1;
    });

    const stopWords = new Set([
      "the", "and", "for", "with", "this", "that", "from", "have", "was",
      "were", "been", "are", "will", "can", "our", "you", "your", "all",
      "but", "not", "they", "about", "what", "which"
    ]);

    return Object.entries(freq)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  async extractContactInfo(text) {
    await this.initialize();

    const fallbackName = this.extractNameFallback(text);

    try {
      const entities = await this.ner(text.slice(0, 1000));

      const personEntities = entities.filter(
        (e) => e.entity.includes("PER") && e.score > 0.85
      );

      if (personEntities.length === 0) {
        return {
          name: fallbackName,
          email: this.extractEmail(text),
          phone: this.extractPhone(text),
          linkedin: this.extractLinkedIn(text),
        };
      }

      const firstPersonIndex = personEntities[0].index;
      let lastPersonIndex = personEntities[personEntities.length - 1].index;

      for (let i = lastPersonIndex + 1; i < entities.length; i++) {
        const token = entities[i];
        if (token.index > lastPersonIndex + 5) break;
        if (token.word.startsWith("##")) {
          lastPersonIndex = token.index;
        } else {
          break;
        }
      }

      const nameTokens = entities.filter(
        (e) => e.index >= firstPersonIndex && e.index <= lastPersonIndex
      );

      let fullName = "";
      for (let i = 0; i < nameTokens.length; i++) {
        const token = nameTokens[i].word;

        if (token.startsWith("##")) {
          fullName += token.substring(2);
        } else {
          if (fullName.length > 0) {
            fullName += " ";
          }
          fullName += token;
        }
      }

      fullName = fullName.trim();
      const nerName = fullName ? this.normalizeName(fullName) : "";

      let finalName = nerName;

      if (fallbackName && fallbackName !== "Unknown") {
        const fallbackWords = fallbackName.split(/\s+/).length;
        const nerWords = nerName.split(/\s+/).length;
        const fallbackLength = fallbackName.length;
        const nerLength = nerName.length;

        if (
          fallbackWords > nerWords ||
          fallbackLength > nerLength * 1.2 ||
          (nerName &&
            fallbackName.toLowerCase().includes(nerName.toLowerCase()))
        ) {
          finalName = fallbackName;
        }
      }

      return {
        name: finalName,
        email: this.extractEmail(text),
        phone: this.extractPhone(text),
        linkedin: this.extractLinkedIn(text),
      };
    } catch (error) {
      console.error("NER extraction error:", error);
      return {
        name: fallbackName,
        email: this.extractEmail(text),
        phone: this.extractPhone(text),
        linkedin: this.extractLinkedIn(text),
      };
    }
  }

  extractNameFallback(text) {
    const rawLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const candidateLines = rawLines.filter((line) => {
      if (/^[-–—]*\s*page\s*\d+\s*[-–—]*$/i.test(line)) return false;
      if (/^[-–—]{2,}\s*page\s*\d+\s*[-–—]{2,}$/i.test(line)) return false;
      if (/^---\s*page\s*\d+\s*---$/i.test(line)) return false;

      const lower = line.toLowerCase();
      if (
        lower.includes("curriculum vitae") ||
        lower === "cv" ||
        lower === "resume"
      )
        return false;
      if (
        lower.startsWith("email") ||
        lower.startsWith("phone") ||
        lower.includes("linkedin")
      )
        return false;

      if (/\d/.test(line)) return false;
      if (/@|https?:\/\//i.test(line)) return false;

      if (line.length < 3 || line.length > 60) return false;

      return true;
    });

    for (const line of candidateLines.slice(0, 15)) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2 && parts.length <= 4) {
        const looksNamed = parts.every((p) =>
          /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(p)
        );
        if (looksNamed) {
          return this.normalizeName(line);
        }
      }
    }

    const fallbackLine = candidateLines[0] || rawLines[0];
    return fallbackLine ? this.normalizeName(fallbackLine) : "Unknown";
  }

  normalizeName(name) {
    return name
      .split(/\s+/)
      .map((word) => {
        if (word.includes("-")) {
          return word
            .split("-")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("-");
        }
        if (word.includes("'")) {
          return word
            .split("'")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("'");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  extractEmail(text) {
    const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : "N/A";
  }

  extractPhone(text) {
    const phoneRegex =
      /(?:[\s-.()+])*(\d(?:[\s-.()+]*\d){9,14})(?:[\s-.()+])*/g;

    let allMatches = [];
    let match;

    while ((match = phoneRegex.exec(text)) !== null) {
      allMatches.push(match[0]);
    }

    const validPhones = allMatches
      .map((phone) => {
        const cleaned = phone.trim();
        const digitsOnly = cleaned.replace(/\D/g, "");

        if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
          return {
            original: cleaned,
            digits: digitsOnly,
            length: digitsOnly.length,
          };
        }
        return null;
      })
      .filter((phone) => phone !== null);

    const filteredPhones = validPhones.filter((phone) => {
      const digits = phone.digits;

      if (digits.match(/^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}$/)) {
        return false;
      }

      if (/^(\d)\1+$/.test(digits)) {
        return false;
      }

      const isSequential = digits.split("").every((digit, i, arr) => {
        if (i === 0) return true;
        return parseInt(digit) === parseInt(arr[i - 1]) + 1;
      });
      if (isSequential) {
        return false;
      }

      return true;
    });

    const withCountryCode = filteredPhones.find(
      (p) => p.original.startsWith("+") || p.original.startsWith("(+")
    );

    if (withCountryCode) {
      return this.normalizePhoneNumber(withCountryCode.original);
    }

    if (filteredPhones.length > 0) {
      return this.normalizePhoneNumber(filteredPhones[0].original);
    }

    return "N/A";
  }

  normalizePhoneNumber(phone) {
    let cleaned = phone.trim();

    if (cleaned.startsWith("+")) {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length >= 10) {
        return cleaned;
      }
    }

    if (cleaned.startsWith("(+")) {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length >= 10) {
        return cleaned;
      }
    }

    return cleaned.replace(/\s+/g, " ").trim();
  }

  extractLinkedIn(text) {
    const patterns = [/linkedin\.com\/in\/[\w-]+/i, /linkedin:?\s*([\w-]+)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].includes("linkedin.com")
          ? match[0]
          : `linkedin.com/in/${match[1]}`;
      }
    }
    return null;
  }

  resetScores() {
    this.allScores = [];
  }

  //  More strict skill matching
  isSkillPresent(resumeText, skill) {
    const resumeLower = resumeText.toLowerCase();
    const skillLower = skill.toLowerCase().trim();
    
    // Exact phrase match (best)
    if (resumeLower.includes(skillLower)) {
      return true;
    }
    
    // Word boundary match 
    const wordBoundaryRegex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordBoundaryRegex.test(resumeText)) {
      return true;
    }
    
    // Handle multi-word skills (e.g., "machine learning")
    if (skillLower.includes(' ')) {
      const skillWords = skillLower.split(/\s+/);
      const allWordsPresent = skillWords.every(word => {
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        return wordRegex.test(resumeText);
      });
      
      if (allWordsPresent) {
        // Check if words appear close together (within 50 characters)
        const firstWord = skillWords[0];
        const lastWord = skillWords[skillWords.length - 1];
        const firstIndex = resumeLower.indexOf(firstWord);
        const lastIndex = resumeLower.indexOf(lastWord, firstIndex);
        
        if (lastIndex - firstIndex < 50) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Main scoring with stricter logic
  async scoreResume(resumeText, jobDescription, criteria) {
    await this.initialize();

    const fullJobText = [
      criteria.jobTitle || "",
      jobDescription,
      ...(criteria.skills || []),
      criteria.requiredExperience || "",
      criteria.location || "",
    ].join(" ");

    const jdKeywords = this.extractKeywords(fullJobText, 20);
    const resumeKeywords = this.extractKeywords(resumeText, 25);

    // 1.SEMANTIC SIMILARITY
    const similarityScore = await this.computeSemanticSimilarity(
      resumeText,
      fullJobText
    );

    console.log("Semantic Similarity:", (similarityScore * 100).toFixed(1) + "%");

    // 2.CRITICAL SKILLS MATCHING (Strict)
    const skills = criteria.skills || [];
    const criticalSkills = skills.slice(0, Math.ceil(skills.length * 0.6));
    const niceToHaveSkills = skills.slice(Math.ceil(skills.length * 0.6));

    const criticalSkillsFound = criticalSkills.filter((skill) => 
      this.isSkillPresent(resumeText, skill)
    );

    const niceToHaveSkillsFound = niceToHaveSkills.filter((skill) =>
      this.isSkillPresent(resumeText, skill)
    );

    console.log("Critical Skills Found:", criticalSkillsFound);
    console.log("Critical Skills Missing:", criticalSkills.filter(s => !criticalSkillsFound.includes(s)));

    const criticalSkillScore =
      criticalSkills.length > 0
        ? criticalSkillsFound.length / criticalSkills.length
        : 1.0;

    const niceToHaveScore =
      niceToHaveSkills.length > 0
        ? niceToHaveSkillsFound.length / niceToHaveSkills.length
        : 1.0;

    // Combined skill score (80% critical, 20% nice-to-have) - MORE WEIGHT ON CRITICAL
    const overallSkillScore = criticalSkillScore * 0.8 + niceToHaveScore * 0.2;

    console.log("Skill Match Rate:", (overallSkillScore * 100).toFixed(1) + "%");

    // 3. EXPERIENCE MATCHING
    const expMatch = resumeText.match(/(\d+)\+?\s*(years?|yrs?)/i);
    const yearsExp = expMatch ? parseInt(expMatch[1]) : 0;
    const requiredYears = parseInt(criteria.requiredExperience) || 3;

    let expScore;
    if (yearsExp >= requiredYears) {
      const ratio = yearsExp / requiredYears;
      expScore =
        ratio <= 1.5 ? 1.0 : Math.min(1.0, 1.0 / Math.sqrt(ratio - 0.5));
    } else {
      expScore = yearsExp / requiredYears;
    }

    // 4. KEYWORD RELEVANCE 
    const contextualKeywords = jdKeywords.filter((kw) => {
      const kwIndex = resumeText.toLowerCase().indexOf(kw);
      if (kwIndex === -1) return false;

      const contextWindow = resumeText.toLowerCase().slice(
        Math.max(0, kwIndex - 50),
        Math.min(resumeText.length, kwIndex + kw.length + 50)
      );

      const hasContext = jdKeywords.some(
        (otherKw) => otherKw !== kw && contextWindow.includes(otherKw)
      );

      return hasContext || resumeKeywords.includes(kw);
    });

    const keywordScore =
      jdKeywords.length > 0 ? contextualKeywords.length / jdKeywords.length : 0;

    console.log("Keyword Match Rate:", (keywordScore * 100).toFixed(1) + "%");

    
    // More emphasis on skills and semantic similarity
    let finalScore =
      overallSkillScore * 0.45 +    // ⬆ Skills: 45% 
      similarityScore * 0.35 +       // ⬆ Semantic: 35% 
      keywordScore * 0.15 +          // ⬇ Keywords: 15% 
      expScore * 0.05;               // ⬇ Experience: 5% 

    console.log("Base Score:", (finalScore * 10).toFixed(1));

    
    // If missing >40% of critical skills, cap score at 5.0 (was 6.0)
    if (criticalSkillScore < 0.6) {
      console.log("Low critical skill match - capping score at 5.0");
      finalScore = Math.min(finalScore, 0.5);
    }

    // If semantic similarity is too low, cap score
    if (similarityScore < 0.4) {
      console.log("Low semantic similarity - capping score at 6.0");
      finalScore = Math.min(finalScore, 0.6);
    }

    // If both skills AND semantic are low, cap even lower
    if (criticalSkillScore < 0.5 && similarityScore < 0.5) {
      console.log("Both skills and similarity low - capping score at 4.0");
      finalScore = Math.min(finalScore, 0.4);
    }

    // BONUS: Reward candidates who excel in multiple areas
    const bonusThreshold = 0.75; // Slightly lower from 0.8
    const excellentAreas = [
      overallSkillScore > bonusThreshold,
      similarityScore > bonusThreshold,
      keywordScore > bonusThreshold,
      expScore > bonusThreshold,
    ].filter(Boolean).length;

    if (excellentAreas >= 3) {
      console.log("Bonus applied - excellent in 3+ areas");
      finalScore = Math.min(finalScore * 1.08, 1.0); // Reduced to 1.08
    }

    // Convert to 0-10 scale
    const score = Math.max(1, Math.min(10, finalScore * 10));

    console.log("Final Score:", score.toFixed(1));

    const allSkillsFound = [...criticalSkillsFound, ...niceToHaveSkillsFound];

    return {
      score: parseFloat(score.toFixed(1)),
      matchedKeywords: contextualKeywords,
      skillsFound: allSkillsFound,
      criticalSkillsFound,
      criticalSkillsMissing: criticalSkills.filter(
        (s) => !criticalSkillsFound.includes(s)
      ),
      yearsExp,
      similarityScore: (similarityScore * 100).toFixed(1),
      keywordMatchRate: (keywordScore * 100).toFixed(1),
      skillMatchRate: (overallSkillScore * 100).toFixed(1),
      criticalSkillMatchRate: (criticalSkillScore * 100).toFixed(1),
      justification: this.generateJustification(
        score,
        contextualKeywords,
        allSkillsFound,
        yearsExp,
        criticalSkillsFound.length,
        criticalSkills.length
      ),
      recommendation: this.generateRecommendation(
        score,
        allSkillsFound.length,
        yearsExp,
        criticalSkillScore
      ),
    };
  }

  generateJustification(
    score,
    keywords,
    skills,
    years,
    criticalSkillsCount,
    totalCriticalSkills
  ) {
    const parts = [];
    if (score >= 8) parts.push("🌟 Excellent match");
    else if (score >= 6) parts.push("✓ Good fit");
    else if (score >= 4) parts.push("⚠ Moderate match");
    else parts.push("❌ Weak match");

    if (criticalSkillsCount > 0) {
      parts.push(
        `${criticalSkillsCount}/${totalCriticalSkills} critical skills`
      );
    } else if (totalCriticalSkills > 0) {
      parts.push(`Missing critical skills`);
    }
    
    if (keywords.length > 0)
      parts.push(`Relevant: ${keywords.slice(0, 3).join(", ")}`);
    if (years > 0) parts.push(`${years}+ years exp`);

    return parts.join(" • ");
  }

  generateRecommendation(score, skillsCount, years, criticalSkillScore) {
    score = parseFloat(score);

    const hasCriticalSkills = criticalSkillScore >= 0.6; // Stricter

    if (score >= 7.5 && hasCriticalSkills)
      return {
        action: "High Priority - Schedule Interview ASAP",
        reason: "Exceptional candidate with strong alignment",
        shouldCall: true,
        priority: "urgent",
      };
    if (score >= 6 && hasCriticalSkills)
      return {
        action: "Recommended - Reach out within 48 hours",
        reason: "Strong match with most requirements met",
        shouldCall: true,
        priority: "high",
      };
    if (score >= 4.5)
      return {
        action: "Consider - Review and discuss with team",
        reason: "Good potential, may need skill development",
        shouldCall: false,
        priority: "medium",
      };
    return {
      action: "Hold - Keep in talent pool",
      reason:
        criticalSkillScore < 0.5
          ? "Missing critical required skills"
          : "Moderate fit, better candidates available",
      shouldCall: false,
      priority: "low",
    };
  }
}

export const aiEngine = new AIEngine();