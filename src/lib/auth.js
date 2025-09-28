import { browser } from '$app/env';

const STUDENT_ID_COOKIE = 'student_id';

/**
 * Get the student ID from the cookie
 * @returns {string | null} The student ID or null if not found
 */
export function getStudentId() {
	if (!browser) return null;
	
	const cookies = document.cookie.split(';');
	const studentCookie = cookies.find(cookie => 
		cookie.trim().startsWith(`${STUDENT_ID_COOKIE}=`)
	);
	
	if (studentCookie) {
		return studentCookie.split('=')[1];
	}
	
	return null;
}

/**
 * Set the student ID in a cookie
 * @param {string} studentId - The student ID to store
 * @param {number} days - Number of days until cookie expires (default: 30)
 */
export function setStudentId(studentId, days = 30) {
	if (!browser) return;
	
	const expires = new Date();
	expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
	
	document.cookie = `${STUDENT_ID_COOKIE}=${studentId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Clear the student ID cookie
 */
export function clearStudentId() {
	if (!browser) return;
	
	document.cookie = `${STUDENT_ID_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Check if a student is currently logged in
 * @returns {boolean} True if student is logged in
 */
export function isLoggedIn() {
	return getStudentId() !== null;
}

/**
 * Redirect to login page
 */
export function redirectToLogin() {
	if (browser) {
		window.location.href = '/login';
	}
}

/**
 * Validate if a student exists in the database
 * @param {string} studentId - The student ID to validate
 * @returns {Promise<{exists: boolean, studentData?: any, error?: string}>}
 */
export async function validateStudent(studentId) {
	if (!studentId || !studentId.trim()) {
		return { exists: false, error: 'Student ID is required' };
	}

	try {
		const response = await fetch(`/api/students/${studentId.trim()}`);
		const data = await response.json();

		if (response.ok && data.studentData) {
			return { exists: true, studentData: data.studentData };
		} else {
			return { exists: false, error: data.error || 'Student not found' };
		}
	} catch (error) {
		return { 
			exists: false, 
			error: 'Network error: ' + (error instanceof Error ? error.message : String(error))
		};
	}
}