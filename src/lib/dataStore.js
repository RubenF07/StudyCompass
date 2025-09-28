import { writable } from 'svelte/store';
import { getStudentId } from './auth.js';

// @ts-ignore

// Store for cached student data
export const studentDataStore = writable({
	rawData: null,
	performanceData: null,
	studyHabitsData: null,
	aiInsights: null,
	courseRoadmap: null,
	studentId: null,
	lastUpdated: null
});

// Load AI insights and course roadmap from localStorage on initialization
if (typeof window !== 'undefined') {
	const savedInsights = localStorage.getItem('aiInsights');
	const savedRoadmap = localStorage.getItem('courseRoadmap');
	const savedStudentId = localStorage.getItem('aiInsightsStudentId');
	const savedRoadmapStudentId = localStorage.getItem('courseRoadmapStudentId');
	
	if (savedInsights && savedStudentId) {
		try {
			const parsedInsights = JSON.parse(savedInsights);
		// @ts-ignore
		studentDataStore.update(store => ({
			...store,
			aiInsights: parsedInsights,
			// @ts-ignore
			studentId: savedStudentId
		}));
			console.log('Loaded AI insights from localStorage for student:', savedStudentId);
		} catch (error) {
			console.error('Failed to parse saved AI insights:', error);
			localStorage.removeItem('aiInsights');
			localStorage.removeItem('aiInsightsStudentId');
		}
	}
	
	if (savedRoadmap && savedRoadmapStudentId) {
		try {
			const parsedRoadmap = JSON.parse(savedRoadmap);
		// @ts-ignore
		studentDataStore.update(store => ({
			...store,
			courseRoadmap: parsedRoadmap,
			// @ts-ignore
			studentId: savedRoadmapStudentId
		}));
			console.log('Loaded course roadmap from localStorage for student:', savedRoadmapStudentId);
		} catch (error) {
			console.error('Failed to parse saved course roadmap:', error);
			localStorage.removeItem('courseRoadmap');
			localStorage.removeItem('courseRoadmapStudentId');
		}
	}
}

// Store for loading states
export const loadingStore = writable({
	rawData: false,
	performanceData: false,
	studyHabitsData: false,
	aiInsights: false,
	courseRoadmap: false
});

// Store for error states
export const errorStore = writable({
	rawData: null,
	performanceData: null,
	studyHabitsData: null,
	aiInsights: null,
	courseRoadmap: null
});

/**
 * Clear all cached data
 */
export function clearAllData() {
	// Clear localStorage
	if (typeof window !== 'undefined') {
		localStorage.removeItem('aiInsights');
		localStorage.removeItem('aiInsightsStudentId');
		localStorage.removeItem('courseRoadmap');
		localStorage.removeItem('courseRoadmapStudentId');
		console.log('Cleared AI insights and course roadmap from localStorage');
	}
	
	studentDataStore.set({
		rawData: null,
		performanceData: null,
		studyHabitsData: null,
		aiInsights: null,
		courseRoadmap: null,
		studentId: null,
		lastUpdated: null
	});
	
	loadingStore.set({
		rawData: false,
		performanceData: false,
		studyHabitsData: false,
		aiInsights: false,
		courseRoadmap: false
	});
	
	errorStore.set({
		rawData: null,
		performanceData: null,
		studyHabitsData: null,
		aiInsights: null,
		courseRoadmap: null
	});
}

/**
 * Check if we have valid cached data for the current student
 * @param {string} currentStudentId - The current student ID
 * @returns {boolean} True if we have valid cached data
 */
export function hasValidCachedData(currentStudentId) {
	let hasValidData = false;
	
	studentDataStore.subscribe(store => {
		hasValidData = store.studentId === currentStudentId && 
					  store.rawData !== null && 
					  store.lastUpdated !== null;
	})();
	
	return hasValidData;
}

/**
 * Load raw student data from API
 * @param {string} studentId - The student ID to load data for
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function loadRawStudentData(studentId) {
	if (!studentId) {
		return { success: false, error: 'No student ID provided' };
	}

	// Check if we already have valid cached data for this student
	if (hasValidCachedData(studentId)) {
		console.log('Using cached raw data for student:', studentId);
		return { success: true, data: null }; // Data is already in store
	}

	// Set loading state
	loadingStore.update(store => ({ ...store, rawData: true }));
	errorStore.update(store => ({ ...store, rawData: null }));

	try {
		console.log('Fetching raw data for student:', studentId);
		const response = await fetch(`/api/students/${studentId}`);
		const data = await response.json();
		
		if (response.ok) {
		// Update the store with new data
		// @ts-ignore
		studentDataStore.update(store => ({
			...store,
			rawData: data.studentData,
			// @ts-ignore
			studentId: studentId,
			// @ts-ignore
			lastUpdated: new Date().toISOString()
		}));
			
			console.log('Raw data loaded successfully for student:', studentId);
			return { success: true, data: data.studentData };
		} else {
			const errorMessage = data.error || 'Failed to fetch student data';
			// @ts-ignore
		errorStore.update(store => ({ ...store, rawData: errorMessage }));
			return { success: false, error: errorMessage };
		}
	} catch (err) {
		const errorMessage = 'Network error: ' + (err instanceof Error ? err.message : String(err));
		// @ts-ignore
		errorStore.update(store => ({ ...store, rawData: errorMessage }));
		return { success: false, error: errorMessage };
	} finally {
		loadingStore.update(store => ({ ...store, rawData: false }));
	}
}

/**
 * Get performance data, loading it if necessary
 * @param {string} studentId - The student ID
 * @param {Function} parseFunction - Function to parse raw data into performance data
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getPerformanceData(studentId, parseFunction) {
	if (!studentId) {
		return { success: false, error: 'No student ID provided' };
	}

	// Check if we already have cached performance data for this student
	let hasCachedPerformance = false;
	studentDataStore.subscribe(store => {
		hasCachedPerformance = store.studentId === studentId && store.performanceData !== null;
	})();

	if (hasCachedPerformance) {
		console.log('Using cached performance data for student:', studentId);
		return { success: true, data: null }; // Data is already in store
	}

	// First ensure we have raw data
	const rawDataResult = await loadRawStudentData(studentId);
	if (!rawDataResult.success) {
		return rawDataResult;
	}

	// Get the raw data from store
	let rawData = null;
	studentDataStore.subscribe(store => {
		rawData = store.rawData;
	})();

	if (!rawData) {
		return { success: false, error: 'No raw data available' };
	}

	// Set loading state for performance data
	loadingStore.update(store => ({ ...store, performanceData: true }));
	errorStore.update(store => ({ ...store, performanceData: null }));

	try {
		// Parse the performance data
		const performanceData = parseFunction([rawData]);
		
		// Update the store with parsed performance data
		// @ts-ignore
		studentDataStore.update(store => ({
			...store,
			performanceData: performanceData
		}));
		
		console.log('Performance data parsed and cached for student:', studentId);
		return { success: true, data: performanceData };
	} catch (err) {
		const errorMessage = 'Error parsing performance data: ' + (err instanceof Error ? err.message : String(err));
		// @ts-ignore
		errorStore.update(store => ({ ...store, performanceData: errorMessage }));
		return { success: false, error: errorMessage };
	} finally {
		loadingStore.update(store => ({ ...store, performanceData: false }));
	}
}

/**
 * Get study habits data, loading it if necessary
 * @param {string} studentId - The student ID
 * @param {Function} parseFunction - Function to parse raw data into study habits data
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getStudyHabitsData(studentId, parseFunction) {
	if (!studentId) {
		return { success: false, error: 'No student ID provided' };
	}

	// Check if we already have cached study habits data for this student
	let hasCachedStudyHabits = false;
	studentDataStore.subscribe(store => {
		hasCachedStudyHabits = store.studentId === studentId && store.studyHabitsData !== null;
	})();

	if (hasCachedStudyHabits) {
		console.log('Using cached study habits data for student:', studentId);
		return { success: true, data: null }; // Data is already in store
	}

	// First ensure we have raw data
	const rawDataResult = await loadRawStudentData(studentId);
	if (!rawDataResult.success) {
		return rawDataResult;
	}

	// Get the raw data from store
	let rawData = null;
	studentDataStore.subscribe(store => {
		rawData = store.rawData;
	})();

	if (!rawData) {
		return { success: false, error: 'No raw data available' };
	}

	// Set loading state for study habits data
	loadingStore.update(store => ({ ...store, studyHabitsData: true }));
	errorStore.update(store => ({ ...store, studyHabitsData: null }));

	try {
		// Parse the study habits data
		const studyHabitsData = parseFunction([rawData]);
		
		// Update the store with parsed study habits data
		// @ts-ignore
		studentDataStore.update(store => ({
			...store,
			studyHabitsData: studyHabitsData
		}));
		
		console.log('Study habits data parsed and cached for student:', studentId);
		return { success: true, data: studyHabitsData };
	} catch (err) {
		const errorMessage = 'Error parsing study habits data: ' + (err instanceof Error ? err.message : String(err));
		// @ts-ignore
		errorStore.update(store => ({ ...store, studyHabitsData: errorMessage }));
		return { success: false, error: errorMessage };
	} finally {
		loadingStore.update(store => ({ ...store, studyHabitsData: false }));
	}
}

/**
 * Save AI insights to the data store
 * @param {string} studentId - The student ID
 * @param {Object} insights - The AI insights data
 * @returns {void}
 */
export function saveAIInsights(studentId, insights) {
	// console.log('saveAIInsights called with:', { studentId, insights });
	
	if (!studentId || !insights) {
		console.warn('Cannot save AI insights: missing studentId or insights');
		return;
	}

	// Save to localStorage for persistence
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem('aiInsights', JSON.stringify(insights));
			localStorage.setItem('aiInsightsStudentId', studentId);
			console.log('Saved AI insights to localStorage for student:', studentId);
		} catch (error) {
			console.error('Failed to save AI insights to localStorage:', error);
		}
	}

	// Update the store with AI insights
	// @ts-ignore
	studentDataStore.update(store => {
		// console.log('Updating store. Current store state:', store);
		if (store.studentId === studentId) {
			const newStore = {
				...store,
				aiInsights: insights,
				// @ts-ignore
				lastUpdated: new Date().toISOString()
			};
			// console.log('Updated store with AI insights:', newStore);
			return newStore;
		}
		console.log('Student ID mismatch in store update');
		return store;
	});

	console.log('AI insights saved for student:', studentId);
}

/**
 * Get AI insights from the data store
 * @param {string} studentId - The student ID
 * @returns {Object|null} The AI insights or null if not found
 */
export function getAIInsights(studentId) {
	let insights = null;
	studentDataStore.subscribe(store => {
		if (store.studentId === studentId) {
			insights = store.aiInsights;
		}
	})();
	return insights;
}

/**
 * Save course roadmap to the data store
 * @param {string} studentId - The student ID
 * @param {Object} roadmap - The course roadmap data
 * @returns {void}
 */
export function saveCourseRoadmap(studentId, roadmap) {
	// console.log('saveCourseRoadmap called with:', { studentId, roadmap });
	
	if (!studentId || !roadmap) {
		console.warn('Cannot save course roadmap: missing studentId or roadmap');
		return;
	}

	// Save to localStorage for persistence
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem('courseRoadmap', JSON.stringify(roadmap));
			localStorage.setItem('courseRoadmapStudentId', studentId);
			console.log('Saved course roadmap to localStorage for student:', studentId);
		} catch (error) {
			console.error('Failed to save course roadmap to localStorage:', error);
		}
	}

	// Update the store with course roadmap
	// @ts-ignore
	studentDataStore.update(store => {
		// console.log('Updating store with course roadmap. Current store state:', store);
		if (store.studentId === studentId) {
			const newStore = {
				...store,
				courseRoadmap: roadmap,
				// @ts-ignore
				lastUpdated: new Date().toISOString()
			};
			// console.log('Updated store with course roadmap:', newStore);
			return newStore;
		}
		console.log('Student ID mismatch in store update');
		return store;
	});

	console.log('Course roadmap saved for student:', studentId);
}

/**
 * Get course roadmap from the data store
 * @param {string} studentId - The student ID
 * @returns {Object|null} The course roadmap or null if not found
 */
export function getCourseRoadmap(studentId) {
	let roadmap = null;
	studentDataStore.subscribe(store => {
		if (store.studentId === studentId) {
			roadmap = store.courseRoadmap;
		}
	})();
	return roadmap;
}

/**
 * Delete AI insights from the data store and localStorage
 * @param {string} studentId - The student ID
 * @returns {void}
 */
export function deleteAIInsights(studentId) {
	// console.log('deleteAIInsights called for student:', studentId);
	
	if (!studentId) {
		console.warn('Cannot delete AI insights: missing studentId');
		return;
	}

	// Remove from localStorage
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem('aiInsights');
			localStorage.removeItem('aiInsightsStudentId');
			console.log('Removed AI insights from localStorage');
		} catch (error) {
			console.error('Failed to remove AI insights from localStorage:', error);
		}
	}

	// Update the store to remove AI insights
	studentDataStore.update(store => {
		if (store.studentId === studentId) {
			const newStore = {
				...store,
				aiInsights: null
			};
			console.log('Removed AI insights from store');
			return newStore;
		}
		console.log('Student ID mismatch in store update');
		return store;
	});

	console.log('AI insights deleted for student:', studentId);
}

/**
 * Delete course roadmap from the data store and localStorage
 * @param {string} studentId - The student ID
 * @returns {void}
 */
export function deleteCourseRoadmap(studentId) {
	// console.log('deleteCourseRoadmap called for student:', studentId);
	
	if (!studentId) {
		console.warn('Cannot delete course roadmap: missing studentId');
		return;
	}

	// Remove from localStorage
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem('courseRoadmap');
			localStorage.removeItem('courseRoadmapStudentId');
			console.log('Removed course roadmap from localStorage');
		} catch (error) {
			console.error('Failed to remove course roadmap from localStorage:', error);
		}
	}

	// Update the store to remove course roadmap
	studentDataStore.update(store => {
		if (store.studentId === studentId) {
			const newStore = {
				...store,
				courseRoadmap: null
			};
			console.log('Removed course roadmap from store');
			return newStore;
		}
		console.log('Student ID mismatch in store update');
		return store;
	});

	console.log('Course roadmap deleted for student:', studentId);
}

/**
 * Force refresh all data for the current student
 * @param {string} studentId - The student ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function forceRefreshData(studentId) {
	console.log('Force refreshing data for student:', studentId);
	
	// Clear localStorage for AI insights and course roadmap when force refreshing
	if (typeof window !== 'undefined') {
		localStorage.removeItem('aiInsights');
		localStorage.removeItem('aiInsightsStudentId');
		localStorage.removeItem('courseRoadmap');
		localStorage.removeItem('courseRoadmapStudentId');
		console.log('Cleared AI insights and course roadmap from localStorage during force refresh');
	}
	
	// Clear existing data for this student
	studentDataStore.update(store => {
		if (store.studentId === studentId) {
			return {
				...store,
				rawData: null,
				performanceData: null,
				studyHabitsData: null,
				aiInsights: null,
				courseRoadmap: null,
				lastUpdated: null
			};
		}
		return store;
	});
	
	// Load fresh data
	return await loadRawStudentData(studentId);
}
