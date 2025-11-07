import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

// ==================== JOB POSTS ====================

export const createJobPost = async (jobData) => {
  try {
    const docRef = await addDoc(collection(db, 'jobPosts'), {
      ...jobData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...jobData };
  } catch (error) {
    console.error('Error creating job post:', error);
    throw error;
  }
};

export const updateJobPost = async (jobId, jobData) => {
  try {
    const jobRef = doc(db, 'jobPosts', jobId);
    await updateDoc(jobRef, {
      ...jobData,
      updatedAt: serverTimestamp()
    });
    return { id: jobId, ...jobData };
  } catch (error) {
    console.error('Error updating job post:', error);
    throw error;
  }
};

export const deleteJobPost = async (jobId) => {
  try {
    await deleteDoc(doc(db, 'jobPosts', jobId));
    // Also delete all candidates for this job
    const candidatesQuery = query(
      collection(db, 'candidates'),
      where('jobId', '==', jobId)
    );
    const candidatesSnapshot = await getDocs(candidatesQuery);
    const deletePromises = candidatesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting job post:', error);
    throw error;
  }
};

export const getAllJobPosts = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'jobPosts'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toLocaleString(),
      updatedAt: doc.data().updatedAt?.toDate().toLocaleString()
    }));
  } catch (error) {
    console.error('Error fetching job posts:', error);
    throw error;
  }
};

// ==================== CANDIDATES ====================

export const createCandidate = async (candidateData) => {
  try {
    const docRef = await addDoc(collection(db, 'candidates'), {
      ...candidateData,
      uploadDate: serverTimestamp()
    });
    return { id: docRef.id, ...candidateData };
  } catch (error) {
    console.error('Error creating candidate:', error);
    throw error;
  }
};

export const createMultipleCandidates = async (candidatesArray) => {
  try {
    const promises = candidatesArray.map(candidate => 
      addDoc(collection(db, 'candidates'), {
        ...candidate,
        uploadDate: serverTimestamp()
      })
    );
    const results = await Promise.all(promises);
    return results.map((docRef, index) => ({
      id: docRef.id,
      ...candidatesArray[index]
    }));
  } catch (error) {
    console.error('Error creating multiple candidates:', error);
    throw error;
  }
};

export const updateCandidate = async (candidateId, candidateData) => {
  try {
    const candidateRef = doc(db, 'candidates', candidateId);
    await updateDoc(candidateRef, candidateData);
    return { id: candidateId, ...candidateData };
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw error;
  }
};

export const deleteCandidate = async (candidateId) => {
  try {
    await deleteDoc(doc(db, 'candidates', candidateId));
  } catch (error) {
    console.error('Error deleting candidate:', error);
    throw error;
  }
};

export const getCandidatesByJobId = async (jobId) => {
  try {
    const q = query(
      collection(db, 'candidates'),
      where('jobId', '==', jobId),
      orderBy('score', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadDate: doc.data().uploadDate?.toDate().toLocaleString()
    }));
  } catch (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }
};

export const deleteCandidatesByJobId = async (jobId) => {
  try {
    const q = query(collection(db, 'candidates'), where('jobId', '==', jobId));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting candidates:', error);
    throw error;
  }
};

// ==================== ACTIVITY LOGS ====================

export const createActivityLog = async (logData) => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      ...logData,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Don't throw - logging should not break the app
  }
};

export const getActivityLogs = async (limit = 50) => {
  try {
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toLocaleString()
      }));
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
};