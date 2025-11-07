// server.js 
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const app = express();
const PORT = 5000;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

// ============================================
// OCR Queue Manager for Parallel Processing
// ============================================
class OCRQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency; // Process 3 OCR requests at a time
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next item in queue
    }
  }
}

// Create global OCR queue (allows 3 parallel OCR requests)
const ocrQueue = new OCRQueue(3);

// ============================================
// Try text extraction first
// ============================================
async function extractPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    // Check if PDF has enough extractable text
    const textLength = data.text.trim().length;

    if (textLength > 100) {
      console.log("PDF has extractable text");
      return {
        text: data.text,
        method: "pdf-parse",
        pages: data.numpages,
      };
    }

    // PDF is image-based - use OCR with queue
    console.log("PDF appears to be image-based. Queuing for OCR...");
    return await ocrQueue.add(() => extractPDFWithOCR(filePath));
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

// ============================================
// OCR with Error Handling & Retry
// ============================================
async function extractPDFWithOCR(filePath, retryCount = 0) {
  const maxRetries = 2;
  console.log(
    `Starting OCR via OCR.space API... (Attempt ${retryCount + 1}/${
      maxRetries + 1
    })`
  );

  try {
    const fileBuffer = await fs.readFile(filePath);

    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: "document.pdf",
      contentType: "application/pdf",
    });
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    //Timeout to 90 seconds
    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          apikey: 'YOUR_OCR_API_KEY', //Get your ocr key
        },
        timeout: 90000, // 90 seconds
      }
    );

    if (response.data.IsErroredOnProcessing) {
      const errorMsg =
        response.data.ErrorMessage?.[0] || "OCR processing failed";

      // RETRY on timeout or rate limit errors
      if (
        (errorMsg.includes("timeout") || errorMsg.includes("rate limit")) &&
        retryCount < maxRetries
      ) {
        console.log(`OCR error: ${errorMsg}. Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await extractPDFWithOCR(filePath, retryCount + 1);
      }

      throw new Error(errorMsg);
    }

    if (
      !response.data.ParsedResults ||
      response.data.ParsedResults.length === 0
    ) {
      throw new Error("No text found in document");
    }

    // Combine text from all pages
    const fullText = response.data.ParsedResults.map(
      (result, index) => `--- Page ${index + 1} ---\n${result.ParsedText}`
    ).join("\n\n");

    console.log("OCR completed successfully");

    return {
      text: fullText.trim(),
      method: "ocr-api",
      pages: response.data.ParsedResults.length,
      warning: "Text extracted using OCR - accuracy may vary",
    };
  } catch (error) {
    console.error("OCR API error:", error.message);

    // RETRY on network timeout errors
    if (error.code === "ECONNABORTED" && retryCount < maxRetries) {
      console.log(
        `Network timeout. Retrying in 3 seconds... (${
          retryCount + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await extractPDFWithOCR(filePath, retryCount + 1);
    }

    // Final fallback after all retries
    return {
      text: "OCR extraction unavailable. Please ensure the PDF contains selectable text or try a different file.",
      method: "ocr-failed",
      error: error.message,
      warning:
        "Could not extract text from image-based PDF. Please upload a text-based PDF or reduce file size.",
    };
  }
}

// ============================================
// Extract text from Word
// ============================================
async function extractWord(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  return {
    text: result.value,
    method: "mammoth",
  };
}

// ============================================
// Extract text from TXT
// ============================================
async function extractTextFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return {
    text: content,
    method: "text",
  };
}

// ============================================
// Extract text from images with queue
// ============================================
async function extractImage(filePath) {
  console.log("Queuing image for OCR via API...");
  return await ocrQueue.add(() => extractImageWithOCR(filePath));
}

async function extractImageWithOCR(filePath, retryCount = 0) {
  const maxRetries = 2;
  console.log(
    `Performing OCR on image... (Attempt ${retryCount + 1}/${
      maxRetries + 1
    })`
  );

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".tiff": "image/tiff",
      ".bmp": "image/bmp",
    };

    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: `image${ext}`,
      contentType: contentTypes[ext] || "image/jpeg",
    });
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          apikey: 'YOUR_OCR_API_KEY',  //Get your ocr key
        },
        timeout: 60000,
      }
    );

    if (response.data.IsErroredOnProcessing) {
      const errorMsg =
        response.data.ErrorMessage?.[0] || "OCR processing failed";

      if (
        (errorMsg.includes("timeout") || errorMsg.includes("rate limit")) &&
        retryCount < maxRetries
      ) {
        console.log(`OCR error: ${errorMsg}. Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await extractImageWithOCR(filePath, retryCount + 1);
      }

      throw new Error(errorMsg);
    }

    const text = response.data.ParsedResults?.[0]?.ParsedText || "";

    console.log("OCR completed successfully");

    return {
      text,
      method: "ocr-api",
      confidence: "N/A (API does not provide confidence score)",
    };
  } catch (error) {
    console.error("OCR API error:", error.message);

    if (error.code === "ECONNABORTED" && retryCount < maxRetries) {
      console.log(`Network timeout. Retrying in 3 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await extractImageWithOCR(filePath, retryCount + 1);
    }

    throw new Error(`Image OCR failed: ${error.message}`);
  }
}

// ============================================
// Main extraction endpoint
// ============================================
app.post("/api/extract", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  console.log(`\nProcessing: ${originalName} (${ext})`);

  try {
    let result;

    if (ext === ".pdf") {
      result = await extractPDF(filePath);
    } else if (ext === ".docx") {
      result = await extractWord(filePath);
    } else if (ext === ".txt") {
      result = await extractTextFile(filePath);
    } else if ([".png", ".jpg", ".jpeg", ".tiff", ".bmp"].includes(ext)) {
      result = await extractImage(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Clean up uploaded file
    await fs.unlink(filePath);

    console.log(`Successfully extracted ${result.text.length} characters`);

    res.json({
      success: true,
      filename: originalName,
      ...result,
    });
  } catch (error) {
    console.error("Extraction error:", error.message);

    // Clean up on error
    try {
      await fs.unlink(filePath);
    } catch {}

    res.status(500).json({
      error: error.message,
      filename: originalName,
    });
  }
});

// ============================================
// Queue status endpoint
// ============================================
app.get("/api/queue-status", (req, res) => {
  res.json({
    running: ocrQueue.running,
    pending: ocrQueue.queue.length,
    concurrency: ocrQueue.concurrency,
  });
});

// ============================================
// Health check endpoint
// ============================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "File extraction server with parallel OCR processing",
    features: ["pdf", "docx", "txt", "images", "parallel-ocr", "retry-logic"],
    ocrProvider: "OCR.space (free tier)",
    concurrency: ocrQueue.concurrency,
    queueStatus: {
      running: ocrQueue.running,
      pending: ocrQueue.queue.length,
    },
  });
});

// ============================================
// Create directories
// ============================================
const initServer = async () => {
  try {
    await fs.mkdir("./uploads", { recursive: true });
    console.log("Upload directory created");
  } catch (error) {
    console.error("Error creating directory:", error);
  }
};

// ============================================
// Start server
// ============================================
initServer().then(() => {
  app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`Supported formats: PDF (with OCR), DOCX, TXT, Images`);
    console.log(
      `OCR: Cloud-based with parallel processing (3 concurrent requests)`
    );
    console.log(`Retry logic: Automatic retry on timeout/rate limit`);
    console.log(`Windows-friendly (no native dependencies!)\n`);
  });
});

// ============================================
// Error handling
// ============================================
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
