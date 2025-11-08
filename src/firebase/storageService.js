import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './config';

// Upload resume file to Firebase Storage
export const uploadResumeFile = async (file, jobId, candidateId) => {
  try {
    const fileName = `${candidateId}_${file.name}`;
    const storageRef = ref(storage, `resumes/${jobId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      fileName: file.name
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Delete resume file from Firebase Storage
export const deleteResumeFile = async (filePath) => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw - file might already be deleted
  }
};

// Get all resume files for a job
export const getResumesByJobId = async (jobId) => {
  try {
    const listRef = ref(storage, `resumes/${jobId}`);
    const result = await listAll(listRef);
    
    const urlPromises = result.items.map(itemRef => 
      getDownloadURL(itemRef).then(url => ({
        name: itemRef.name,
        url: url,
        path: itemRef.fullPath
      }))
    );
    
    return await Promise.all(urlPromises);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return [];
  }
};

// Get all resume files from root level of Firebase Storage
export const getAllResumesFromRoot = async () => {
  try {
    const listRef = ref(storage, '/'); // Root level reference
    const result = await listAll(listRef);
    
    // Filter only resume formats
    const resumeItems = result.items.filter(item => 
      item.name.endsWith('.pdf') || 
      item.name.endsWith('.docx') || 
      item.name.endsWith('.doc')
    );
    
    const urlPromises = resumeItems.map(itemRef => 
      getDownloadURL(itemRef).then(url => ({
        name: itemRef.name,
        url: url,
        path: itemRef.fullPath
      }))
    );
    
    return await Promise.all(urlPromises);
  } catch (error) {
    console.error('Error fetching resumes from root:', error);
    return [];
  }
};

// Fetch and convert resume file to text for AI processing
export const fetchResumeAsFile = async (url, fileName) => {
  try {
    // Fetch through backend to avoid CORS
    const response = await fetch(`/api/fetchResume?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch resume: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error('Error fetching resume file:', error);
    throw error;
  }
};