// @ts-nocheck

/**
 * Helper function to safely get numeric values from Neo4j properties
 * Handles both {low: value} format and direct value format
 * @param {any} value - The value to extract
 * @returns {number} The numeric value
 */
function getNumericValue(value) {
	if (typeof value === 'number') {
		return value;
	}
	if (value && typeof value === 'object' && typeof value.low === 'number') {
		return value.low;
	}
	return 0;
}

/**
 * Helper function to safely get string values from Neo4j properties
 * @param {any} value - The value to extract
 * @returns {string} The string value
 */
function getStringValue(value) {
	if (typeof value === 'string') {
		return value;
	}
	return value || '';
}

/**
 * Extracts past semester data from Neo4j query result format
 * @param {Array<any>} neo4jData - Array containing Neo4j query results in the format of test.json
 * @returns {Object} Object containing past semester data organized by term
 */
export function getPastSemesterData(neo4jData) {
    if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
      return {};
    }
  
    const studentData = neo4jData[0];
    const relationships = studentData.relationships || [];
    
    // Filter for completed courses
    const completedCourses = relationships.filter(/** @param {any} rel */ rel => rel.relationship === 'COMPLETED');
    
    // Group courses by semester
    /** @type {Record<string, any>} */
    const semesterData = {};
    
    completedCourses.forEach(/** @param {any} courseRel */ courseRel => {
      const course = courseRel.target;
      const properties = courseRel.properties;
      
      const term = properties.term;
      if (!term) return;
      
      if (!semesterData[term]) {
        semesterData[term] = {
          term: term,
          courses: []
        };
      }
      
      // Extract course information
      const courseInfo = {
        id: getStringValue(course.properties.id),
        name: getStringValue(course.properties.name),
        department: getStringValue(course.properties.department),
        credits: getNumericValue(course.properties.credits),
        level: getNumericValue(course.properties.level),
        grade: getStringValue(properties.grade),
        difficulty: getNumericValue(properties.difficulty),
        timeSpent: getNumericValue(properties.timeSpent),
        instructionMode: getStringValue(properties.instructionMode),
        enjoyment: properties.enjoyment,
        tags: course.properties.tags || [],
        termAvailability: course.properties.termAvailability || [],
        instructionModes: course.properties.instructionModes || []
      };
      
      semesterData[term].courses.push(courseInfo);
    });
    
    // Sort courses within each semester by course ID for consistency
    Object.keys(semesterData).forEach(term => {
      semesterData[term].courses.sort((/** @param {any} a */ a, /** @param {any} b */ b) => a.id.localeCompare(b.id));
    });
    
    return semesterData;
  }

/**
 * Extracts currently enrolled courses from Neo4j query result format
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Array<any>} Array of currently enrolled courses
 */
export function getEnrolledCourses(neo4jData) {
  if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
    return [];
  }

  const studentData = neo4jData[0];
  const relationships = studentData.relationships || [];
  
  // Filter for enrolled courses
  const enrolledCourses = relationships.filter(/** @param {any} rel */ rel => rel.relationship === 'ENROLLED_IN');
  
  return enrolledCourses.map(/** @param {any} courseRel */ courseRel => {
    const course = courseRel.target;
    
    return {
      id: course.properties.id,
      name: course.properties.name,
      department: course.properties.department,
      credits: course.properties.credits?.low || 0,
      level: course.properties.level?.low || 0,
      avgDifficulty: course.properties.avgDifficulty?.low || 0,
      avgTimeCommitment: course.properties.avgTimeCommitment?.low || 0,
      tags: course.properties.tags || [],
      termAvailability: course.properties.termAvailability || [],
      instructionModes: course.properties.instructionModes || [],
      // Learning style success rates
      auditoryLearnerSuccess: course.properties.auditoryLearnerSuccess || 0,
      readingLearnerSuccess: course.properties.readingLearnerSuccess || 0,
      kinestheticLearnerSuccess: course.properties.kinestheticLearnerSuccess || 0,
      visualLearnerSuccess: course.properties.visualLearnerSuccess || 0
    };
  });
}

/**
 * Extracts degree information from Neo4j query result format
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Array<any>} Array of degrees the student is pursuing
 */
export function getDegrees(neo4jData) {
  if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
    return [];
  }

  const studentData = neo4jData[0];
  const relationships = studentData.relationships || [];
  
  // Filter for degree relationships
  const degreeRelationships = relationships.filter(/** @param {any} rel */ rel => rel.relationship === 'PURSUING');
  
  // Remove duplicates based on degree ID
  /** @type {Map<string, any>} */
  const uniqueDegrees = new Map();
  
  degreeRelationships.forEach(/** @param {any} degreeRel */ degreeRel => {
    const degree = degreeRel.target;
    const degreeId = degree.properties.id;
    
    if (!uniqueDegrees.has(degreeId)) {
      uniqueDegrees.set(degreeId, {
        id: degree.properties.id,
        name: degree.properties.name,
        department: degree.properties.department,
        type: degree.properties.type,
        totalCreditsRequired: degree.properties.totalCreditsRequired?.low || 0,
        coreCreditsRequired: degree.properties.coreCreditsRequired?.low || 0,
        electiveCreditsRequired: degree.properties.electiveCreditsRequired?.low || 0
      });
    }
  });
  
  return Array.from(uniqueDegrees.values());
}

/**
 * Extracts similar students from Neo4j query result format
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Array<any>} Array of similar students with similarity scores
 */
export function getSimilarStudents(neo4jData) {
  if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
    return [];
  }

  const studentData = neo4jData[0];
  const relationships = studentData.relationships || [];
  
  // Filter for similar learning style relationships
  const similarStudents = relationships.filter(/** @param {any} rel */ rel => rel.relationship === 'SIMILAR_LEARNING_STYLE');
  
  return similarStudents.map(/** @param {any} studentRel */ studentRel => {
    const student = studentRel.target;
    const properties = studentRel.properties;
    
    return {
      id: student.properties.id,
      name: student.properties.name,
      learningStyle: student.properties.learningStyle,
      preferredCourseLoad: student.properties.preferredCourseLoad?.low || 0,
      preferredInstructionMode: student.properties.preferredInstructionMode,
      workHoursPerWeek: student.properties.workHoursPerWeek?.low || 0,
      financialAidStatus: student.properties.financialAidStatus,
      preferredPace: student.properties.preferredPace,
      enrollmentDate: student.properties.enrollmentDate,
      expectedGraduation: student.properties.expectedGraduation,
      similarity: properties.similarity || 0
    };
  }).sort((/** @param {any} a */ a, /** @param {any} b */ b) => b.similarity - a.similarity); // Sort by similarity score descending
}

/**
 * Extracts basic student information from Neo4j query result format
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Object} Student information object
 */
export function getStudentInfo(neo4jData) {
  if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
    return {};
  }

  const studentData = neo4jData[0];
  const student = studentData.s;
  
  return {
    id: getStringValue(student.properties.id),
    name: getStringValue(student.properties.name),
    learningStyle: getStringValue(student.properties.learningStyle),
    preferredCourseLoad: getNumericValue(student.properties.preferredCourseLoad),
    preferredInstructionMode: getStringValue(student.properties.preferredInstructionMode),
    workHoursPerWeek: getNumericValue(student.properties.workHoursPerWeek),
    financialAidStatus: getStringValue(student.properties.financialAidStatus),
    preferredPace: getStringValue(student.properties.preferredPace),
    enrollmentDate: getStringValue(student.properties.enrollmentDate),
    expectedGraduation: getStringValue(student.properties.expectedGraduation)
  };
}
  
/**
 * Gets a summary of past semester performance
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Object} Summary statistics of past performance
 */
export function getPastSemesterSummary(neo4jData) {
  const semesterData = getPastSemesterData(neo4jData);
  
  /** @type {Record<string, any>} */
  const summary = {
    totalSemesters: Object.keys(semesterData).length,
    totalCourses: 0,
    averageGrade: 0,
    totalCredits: 0,
    gradeDistribution: {},
    semesterBreakdown: {}
  };
  
  let totalGradePoints = 0;
  let totalCourses = 0;
  
  // Grade point mapping
  const gradePoints = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };
  
  Object.keys(semesterData).forEach(term => {
    const semester = /** @type {any} */ (semesterData[term]);
    /** @type {Record<string, any>} */
    const semesterSummary = {
      term: term,
      courseCount: semester.courses.length,
      credits: semester.courses.reduce((/** @param {any} sum */ sum, /** @param {any} course */ course) => sum + course.credits, 0),
      averageGrade: 0,
      gradeDistribution: {}
    };
    
    let semesterGradePoints = 0;
    let semesterCourses = 0;
    
    semester.courses.forEach(/** @param {any} course */ course => {
      const grade = course.grade;
      const credits = course.credits;
      
      // Update grade distribution
      summary.gradeDistribution[grade] = (summary.gradeDistribution[grade] || 0) + 1;
      semesterSummary.gradeDistribution[grade] = (semesterSummary.gradeDistribution[grade] || 0) + 1;
      
      // Calculate grade points
      const points = /** @type {any} */ (gradePoints)[grade] || 0;
      totalGradePoints += points * credits;
      semesterGradePoints += points * credits;
      
      totalCourses++;
      semesterCourses++;
      summary.totalCredits += credits;
    });
    
    if (semesterCourses > 0) {
      semesterSummary.averageGrade = parseFloat((semesterGradePoints / semester.courses.reduce((/** @param {any} sum */ sum, /** @param {any} course */ course) => sum + course.credits, 0)).toFixed(2));
    }
    
    summary.semesterBreakdown[term] = semesterSummary;
  });
  
  summary.totalCourses = totalCourses;
  if (summary.totalCredits > 0) {
    summary.averageGrade = parseFloat((totalGradePoints / summary.totalCredits).toFixed(2));
  }
  
  return summary;
}

/**
 * Comprehensive parser that extracts all student data from Neo4j query results
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Object} Complete student data object with all parsed information
 */
export function parseAllStudentData(neo4jData) {
  if (!Array.isArray(neo4jData) || neo4jData.length === 0) {
    return {
      studentInfo: {},
      degrees: [],
      enrolledCourses: [],
      pastSemesters: {},
      pastSemesterSummary: {},
      similarStudents: []
    };
  }

  try {
    return {
      studentInfo: getStudentInfo(neo4jData),
      degrees: getDegrees(neo4jData),
      enrolledCourses: getEnrolledCourses(neo4jData),
      pastSemesters: getPastSemesterData(neo4jData),
      pastSemesterSummary: getPastSemesterSummary(neo4jData),
      similarStudents: getSimilarStudents(neo4jData)
    };
  } catch (/** @type {any} */ error) {
    console.error('Error parsing student data:', error);
    return {
      studentInfo: {},
      degrees: [],
      enrolledCourses: [],
      pastSemesters: {},
      pastSemesterSummary: {},
      similarStudents: [],
      error: error.message
    };
  }
}

/**
 * Validates Neo4j data structure
 * @param {Array<any>} neo4jData - Array containing Neo4j query results
 * @returns {Object} Validation result with isValid flag and any errors
 */
export function validateNeo4jData(neo4jData) {
  const errors = [];
  
  if (!Array.isArray(neo4jData)) {
    errors.push('Data must be an array');
    return { isValid: false, errors };
  }
  
  if (neo4jData.length === 0) {
    errors.push('Data array is empty');
    return { isValid: false, errors };
  }
  
  const studentData = neo4jData[0];
  
  if (!studentData || typeof studentData !== 'object') {
    errors.push('Student data object is missing or invalid');
    return { isValid: false, errors };
  }
  
  if (!studentData.s || !studentData.s.properties) {
    errors.push('Student properties are missing');
  }
  
  if (!Array.isArray(studentData.relationships)) {
    errors.push('Relationships array is missing or invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}