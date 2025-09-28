/**
 * Parse study habits data from the student endpoint response
 * @param {Array} studentDataArray - Array of student data objects from the API
 * @returns {Object} Parsed study habits data
 */
export function parseStudyHabitsData(studentDataArray) {
	if (!studentDataArray || studentDataArray.length === 0) {
		return {
			currentTerm: null,
			pastTerms: {},
			overallStats: {
				totalSessions: 0,
				totalTimeSpent: 0,
				averageSessionDuration: 0,
				averageEffectiveness: 0,
				uniqueLocations: 0,
				uniqueMethods: 0,
				groupStudySessions: 0
			}
		};
	}

	const studentData = studentDataArray[0];
	const relationships = studentData.relationships || [];
	
	// Filter study sessions from relationships
	const studySessions = relationships
		.filter(rel => rel.relationship === 'ATTENDED' && rel.target.labels.includes('StudySession'))
		.map(rel => ({
			...rel.target.properties,
			termId: rel.target.properties.termId
		}));

	// Filter completed courses from relationships
	const completedCourses = relationships
		.filter(rel => rel.relationship === 'COMPLETED' && rel.target.labels.includes('Course'))
		.map(rel => ({
			...rel.target.properties,
			...rel.properties, // Include relationship properties (grade, term, etc.)
			courseId: rel.target.properties.id,
			courseName: rel.target.properties.name,
			credits: rel.target.properties.credits?.low || 0
		}));

	// Group sessions by term
	const sessionsByTerm = {};
	studySessions.forEach(session => {
		const term = session.termId;
		if (!sessionsByTerm[term]) {
			sessionsByTerm[term] = [];
		}
		sessionsByTerm[term].push(session);
	});

	// Group completed courses by term
	const coursesByTerm = {};
	completedCourses.forEach(course => {
		const term = course.term;
		if (!coursesByTerm[term]) {
			coursesByTerm[term] = [];
		}
		coursesByTerm[term].push(course);
	});

	// Get current term (most recent term with sessions)
	const terms = Object.keys(sessionsByTerm).sort((a, b) => {
		// Sort by year first, then by season
		const aYear = parseInt(a.match(/\d{4}/)?.[0] || '0');
		const bYear = parseInt(b.match(/\d{4}/)?.[0] || '0');
		if (aYear !== bYear) return bYear - aYear;
		
		// If same year, sort by season
		const seasonOrder = { 'Spring': 1, 'Summer': 2, 'Fall': 3, 'Winter': 4 };
		const aSeason = a.match(/^(Spring|Summer|Fall|Winter)/)?.[0] || '';
		const bSeason = b.match(/^(Spring|Summer|Fall|Winter)/)?.[0] || '';
		return (seasonOrder[bSeason] || 0) - (seasonOrder[aSeason] || 0);
	});

	const currentTerm = terms[0] || null;
	const pastTerms = {};

	// Process each term
	terms.forEach(term => {
		const sessions = sessionsByTerm[term];
		const courses = coursesByTerm[term] || [];
		const termData = processTermSessions(sessions, term, courses);
		
		if (term === currentTerm) {
			// This will be handled separately as current term
		} else {
			pastTerms[term] = termData;
		}
	});

	// Calculate overall stats
	const allSessions = studySessions;
	const overallStats = calculateOverallStats(allSessions);

	// Get current term data
	const currentTermData = currentTerm ? processTermSessions(sessionsByTerm[currentTerm], currentTerm, coursesByTerm[currentTerm] || []) : null;

	return {
		currentTerm: currentTerm ? {
			term: currentTerm,
			...currentTermData
		} : null,
		pastTerms,
		overallStats
	};
}

/**
 * Calculate GPA for a term based on completed courses
 * @param {Array} courses - Array of completed courses for the term
 * @returns {Object} GPA data including finalGPA and course details
 */
function calculateTermGPA(courses) {
	if (!courses || courses.length === 0) {
		return {
			finalGPA: null,
			totalCredits: 0,
			courseCount: 0,
			gradeDistribution: {}
		};
	}

	// Grade point mapping (same as in parse_student_data.js)
	const gradePoints = {
		'A+': 4.0, 'A': 4.0, 'A-': 3.7,
		'B+': 3.3, 'B': 3.0, 'B-': 2.7,
		'C+': 2.3, 'C': 2.0, 'C-': 1.7,
		'D+': 1.3, 'D': 1.0, 'D-': 0.7,
		'F': 0.0
	};

	let totalGradePoints = 0;
	let totalCredits = 0;
	const gradeDistribution = {};

	courses.forEach(course => {
		const grade = course.grade;
		const credits = course.credits || 0;
		
		// Count grade distribution
		gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
		
		// Calculate grade points
		const points = gradePoints[grade] || 0;
		totalGradePoints += points * credits;
		totalCredits += credits;
	});

	const finalGPA = totalCredits > 0 ? parseFloat((totalGradePoints / totalCredits).toFixed(2)) : null;

	return {
		finalGPA,
		totalCredits,
		courseCount: courses.length,
		gradeDistribution
	};
}

/**
 * Process study sessions for a specific term
 * @param {Array} sessions - Array of study sessions for the term
 * @param {string} term - Term identifier
 * @param {Array} courses - Array of completed courses for the term
 * @returns {Object} Processed term data
 */
function processTermSessions(sessions, term, courses = []) {
	// Calculate GPA for this term
	const gpaData = calculateTermGPA(courses);

	if (!sessions || sessions.length === 0) {
		return {
			term,
			totalSessions: 0,
			totalTimeSpent: 0,
			averageSessionDuration: 0,
			averageEffectiveness: 0,
			uniqueLocations: 0,
			uniqueMethods: 0,
			groupStudySessions: 0,
			effectivenessByMethod: {},
			timeByLocation: {},
			sessionsByMonth: {},
			weeklyPattern: {},
			studyMethods: [],
			locations: [],
			// GPA data
			finalGPA: gpaData.finalGPA,
			totalCredits: gpaData.totalCredits,
			courseCount: gpaData.courseCount,
			gradeDistribution: gpaData.gradeDistribution
		};
	}

	// Basic stats
	const totalSessions = sessions.length;
	const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.duration?.low || 0), 0);
	const averageSessionDuration = totalTimeSpent / totalSessions;
	const averageEffectiveness = sessions.reduce((sum, session) => sum + (session.effectiveness || 0), 0) / totalSessions;

	// Unique locations and methods
	const locations = [...new Set(sessions.map(s => s.location).filter(Boolean))];
	const methods = [...new Set(sessions.map(s => s.method).filter(Boolean))];
	const uniqueLocations = locations.length;
	const uniqueMethods = methods.length;

	// Group study sessions
	const groupStudySessions = sessions.filter(s => s.method === 'Group Study').length;

	// Effectiveness by method
	const effectivenessByMethod = {};
	sessions.forEach(session => {
		const method = session.method || 'Unknown';
		if (!effectivenessByMethod[method]) {
			effectivenessByMethod[method] = {
				sessions: 0,
				totalEffectiveness: 0,
				averageEffectiveness: 0
			};
		}
		effectivenessByMethod[method].sessions++;
		effectivenessByMethod[method].totalEffectiveness += session.effectiveness || 0;
	});

	// Calculate averages
	Object.keys(effectivenessByMethod).forEach(method => {
		const data = effectivenessByMethod[method];
		data.averageEffectiveness = data.totalEffectiveness / data.sessions;
	});

	// Time by location
	const timeByLocation = {};
	sessions.forEach(session => {
		const location = session.location || 'Unknown';
		if (!timeByLocation[location]) {
			timeByLocation[location] = {
				sessions: 0,
				totalTime: 0,
				averageTime: 0
			};
		}
		timeByLocation[location].sessions++;
		timeByLocation[location].totalTime += session.duration?.low || 0;
	});

	// Calculate averages
	Object.keys(timeByLocation).forEach(location => {
		const data = timeByLocation[location];
		data.averageTime = data.totalTime / data.sessions;
	});

	// Sessions by month (if we can extract month from startTime)
	const sessionsByMonth = {};
	sessions.forEach(session => {
		if (session.startTime && session.startTime.month) {
			const month = session.startTime.month.low;
			if (!sessionsByMonth[month]) {
				sessionsByMonth[month] = 0;
			}
			sessionsByMonth[month]++;
		}
	});

	// Weekly pattern (if we can extract day of week from startTime)
	const weeklyPattern = {};
	sessions.forEach(session => {
		if (session.startTime) {
			// This would require more complex date calculation
			// For now, we'll skip this or use a simplified approach
		}
	});

	return {
		term,
		totalSessions,
		totalTimeSpent,
		averageSessionDuration,
		averageEffectiveness,
		uniqueLocations,
		uniqueMethods,
		groupStudySessions,
		effectivenessByMethod,
		timeByLocation,
		sessionsByMonth,
		weeklyPattern,
		studyMethods: methods,
		locations,
		// GPA data
		finalGPA: gpaData.finalGPA,
		totalCredits: gpaData.totalCredits,
		courseCount: gpaData.courseCount,
		gradeDistribution: gpaData.gradeDistribution
	};
}

/**
 * Calculate overall statistics across all terms
 * @param {Array} allSessions - All study sessions
 * @returns {Object} Overall statistics
 */
function calculateOverallStats(allSessions) {
	if (!allSessions || allSessions.length === 0) {
		return {
			totalSessions: 0,
			totalTimeSpent: 0,
			averageSessionDuration: 0,
			averageEffectiveness: 0,
			uniqueLocations: 0,
			uniqueMethods: 0,
			groupStudySessions: 0
		};
	}

	const totalSessions = allSessions.length;
	const totalTimeSpent = allSessions.reduce((sum, session) => sum + (session.duration?.low || 0), 0);
	const averageSessionDuration = totalTimeSpent / totalSessions;
	const averageEffectiveness = allSessions.reduce((sum, session) => sum + (session.effectiveness || 0), 0) / totalSessions;

	const locations = [...new Set(allSessions.map(s => s.location).filter(Boolean))];
	const methods = [...new Set(allSessions.map(s => s.method).filter(Boolean))];
	const uniqueLocations = locations.length;
	const uniqueMethods = methods.length;

	const groupStudySessions = allSessions.filter(s => s.method === 'Group Study').length;

	return {
		totalSessions,
		totalTimeSpent,
		averageSessionDuration,
		averageEffectiveness,
		uniqueLocations,
		uniqueMethods,
		groupStudySessions
	};
}

/**
 * Format time duration in minutes to human readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
	if (minutes < 60) {
		return `${Math.round(minutes)}m`;
	} else {
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = Math.round(minutes % 60);
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
}

/**
 * Format term name for display
 * @param {string} term - Term identifier like "Spring2024"
 * @returns {string} Formatted term name
 */
export function formatTerm(term) {
	if (!term) return term;
	
	// Handle format like "Spring2024", "Summer2024", "Fall2024"
	const seasonMatch = term.match(/^(Spring|Summer|Fall|Winter)(\d{4})$/);
	if (seasonMatch) {
		const [, season, year] = seasonMatch;
		return `${season} ${year}`;
	}
	
	// Fallback for other formats
	return term;
}
