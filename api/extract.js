// api/extract.js - Vercel Serverless Function (with OCR Queue)
const multiparty = require('multiparty');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

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
// Helper: Parse multipart form data
// ============================================
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// ============================================
// OCR with retry logic
// ============================================
async function extractPDFWithOCR(filePath, retryCount = 0) {
  const maxRetries = 2;
  const OCR_API_KEY = process.env.OCR_API_KEY || 'YOUR_OCR_API_KEY';
  
  console.log(`Starting OCR via OCR.space API... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
  
  try {
    const fileBuffer = await fs.readFile(filePath);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'document.pdf',
      contentType: 'application/pdf'
    });
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    
    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'apikey': OCR_API_KEY
        },
        timeout: 90000
      }
    );

    if (response.data.IsErroredOnProcessing) {
      const errorMsg = response.data.ErrorMessage?.[0] || 'OCR processing failed';
      
      if ((errorMsg.includes('timeout') || errorMsg.includes('rate limit')) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await extractPDFWithOCR(filePath, retryCount + 1);
      }
      
      throw new Error(errorMsg);
    }

    if (!response.data.ParsedResults || response.data.ParsedResults.length === 0) {
      throw new Error('No text found in document');
    }

    const fullText = response.data.ParsedResults
      .map((result, index) => `--- Page ${index + 1} ---\n${result.ParsedText}`)
      .join('\n\n');
    
    return {
      text: fullText.trim(),
      method: 'ocr-api',
      pages: response.data.ParsedResults.length,
      warning: 'Text extracted using OCR - accuracy may vary'
    };
    
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return {
        text: '[IMAGE-BASED PDF] OCR rate limit exceeded. Please get a free API key from https://ocr.space/ocrapi',
        method: 'ocr-rate-limited',
        error: 'Rate limit exceeded',
        warning: 'This resume is image-based and could not be processed due to OCR rate limits.'
      };
    }
    
    if (error.code === 'ECONNABORTED' && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await extractPDFWithOCR(filePath, retryCount + 1);
    }
    
    return {
      text: 'OCR extraction unavailable. Please ensure the PDF contains selectable text.',
      method: 'ocr-failed',
      error: error.message,
      warning: 'Could not extract text from image-based PDF.'
    };
  }
}

// ============================================
// Extract PDF
// ============================================
async function extractPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    const textLength = data.text.trim().length;
    
    if (textLength > 100) {
      console.log('PDF has extractable text');
      return { 
        text: data.text, 
        method: 'pdf-parse',
        pages: data.numpages 
      };
    }
    
    // PDF is image-based - use OCR with queue
    console.log('PDF appears to be image-based. Queuing for OCR...');
    return await ocrQueue.add(() => extractPDFWithOCR(filePath));
    
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

// ============================================
// Extract Word
// ============================================
async function extractWord(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  return { 
    text: result.value,
    method: 'mammoth'
  };
}

// ============================================
// Extract Text
// ============================================
async function extractTextFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return { 
    text: content, 
    method: 'text' 
  };
}

// ============================================
// Extract Image
// ============================================
async function extractImage(filePath) {
  console.log('Queuing image for OCR via API...');
  return await ocrQueue.add(() => extractImageWithOCR(filePath));
}

async function extractImageWithOCR(filePath, retryCount = 0) {
  const maxRetries = 2;
  const OCR_API_KEY = process.env.OCR_API_KEY || 'YOUR_OCR_API_KEY';
  
  console.log(`Performing OCR on image... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
  
  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.tiff': 'image/tiff',
      '.bmp': 'image/bmp'
    };
    
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: `image${ext}`,
      contentType: contentTypes[ext] || 'image/jpeg'
    });
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');
    
    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'apikey': OCR_API_KEY
        },
        timeout: 60000
      }
    );

    if (response.data.IsErroredOnProcessing) {
      const errorMsg = response.data.ErrorMessage?.[0] || 'OCR processing failed';
      
      if ((errorMsg.includes('timeout') || errorMsg.includes('rate limit')) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await extractImageWithOCR(filePath, retryCount + 1);
      }
      
      throw new Error(errorMsg);
    }

    const text = response.data.ParsedResults?.[0]?.ParsedText || '';
    
    return {
      text,
      method: 'ocr-api',
      confidence: 'N/A'
    };
    
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return {
        text: '[IMAGE-BASED PDF] OCR rate limit exceeded.',
        method: 'ocr-rate-limited',
        error: 'Rate limit exceeded',
        warning: 'OCR rate limit reached.'
      };
    }
    
    if (error.code === 'ECONNABORTED' && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await extractImageWithOCR(filePath, retryCount + 1);
    }
    
    throw new Error(`Image OCR failed: ${error.message}`);
  }
}

// ============================================
// Main Serverless Function Handler
// ============================================
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    
    if (!files || !files.file || files.file.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file[0];
    const filePath = file.path;
    const originalName = file.originalFilename;
    const ext = path.extname(originalName).toLowerCase();

    console.log(`Processing: ${originalName} (${ext})`);

    let result;

    if (ext === '.pdf') {
      result = await extractPDF(filePath);
    } else if (ext === '.docx') {
      result = await extractWord(filePath);
    } else if (ext === '.txt') {
      result = await extractTextFile(filePath);
    } else if (['.png', '.jpg', '.jpeg', '.tiff', '.bmp'].includes(ext)) {
      result = await extractImage(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    try {
      await fs.unlink(filePath);
    } catch {}

    console.log(`Extracted ${result.text.length} characters`);

    res.status(200).json({
      success: true,
      filename: originalName,
      ...result
    });

  } catch (error) {
    console.error('Extraction error:', error);
    
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
};