import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '$env/static/private';
import { saveAIInsights, saveCourseRoadmap } from './dataStore.js';
import { getStudentId } from './auth.js';


// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generate personalized study insights using AI
 * @param {any} studyHabitsData - Student's study habits data
 * @returns {Promise<{insights: any}>} AI-generated insights
 */
export async function generateStudyInsights(studyHabitsData) {

	const prompt = `You are an intelligent academic advisor analyzing a student's study habits and academic performance data. Generate personalized insights that help the student understand their patterns and optimize their academic success.

## Input Data Structure
You will receive:
- currentTerm: Object containing current semester study habits and performance data
- pastTerms: Object containing historical semester data for comparison
- overallStats: Object with aggregated statistics across all terms

## Required JSON Response Format
Respond with ONLY a valid JSON object using these exact property names:

\`\`\`json
{
  "studyStrategyInsights": {
    "performancePrediction": "string - concise prediction about current term performance",
    "methodOptimization": "string - specific study method recommendation",
    "locationOptimization": "string - study location recommendation",
    "sessionLengthInsight": "string - optimal session duration insight"
  },
  "academicPatterns": {
    "performanceTrend": "string - brief trend analysis of academic performance",
    "studyHabitEvolution": "string - how study habits changed and impact",
    "consistencyAnalysis": "string - study consistency pattern analysis"
  },
  "courseSuccessPredictions": {
    "currentCourseInsight": "string - prediction about current courses",
    "studyTimeRecommendation": "string - specific study time recommendations",
    "methodEffectiveness": "string - most effective study methods for this student"
  },
  "personalizedRecommendations": {
    "immediateActions": "array - 2-3 specific actions to take now",
    "longTermStrategy": "array - 2-3 broader strategic recommendations", 
    "riskAreas": "array - 2-3 potential problem areas to watch"
  }
}
\`\`\`

## Analysis Guidelines
1. Compare current term data against past terms to identify patterns
2. Look for correlations between study methods, locations, and academic performance
3. Identify trends in effectiveness, session duration, and study frequency
4. Consider the student's GPA progression and grade distribution patterns
5. Focus on actionable insights rather than generic advice
6. Use specific percentages, timeframes, and concrete recommendations
7. Maintain an encouraging but honest tone
8. Base all insights on the actual data provided, not assumptions

## Response Requirements
- Keep ALL responses concise and direct (1-2 sentences max for strings, 2-3 items max for arrays)
- Be specific and data-driven with concrete numbers (percentages, hours, GPA points)
- Use "you" and "your" to make it personal
- Avoid wordy phrases like "consider", "might want to", "it appears that"
- Make recommendations concrete and actionable
- For arrays: use short, punchy bullet points
- If data is insufficient, use "Insufficient data for [specific insight]"

Generate insights that feel like personalized academic coaching rather than generic AI responses.

## Student Data:
${JSON.stringify(studyHabitsData, null, 2)}`;

	try {
		console.log('Sending request to Gemini AI...');
		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: prompt,
		});
		
		console.log('Received response from Gemini AI');
		console.log('Raw response:', response.text);
		
		// Extract JSON from markdown code blocks if present
		let jsonText = response.text || '{}';
		
		// Check if response is wrapped in markdown code blocks
		const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
		if (jsonMatch) {
			jsonText = jsonMatch[1];
			console.log('Extracted JSON from markdown:', jsonText);
		}
		
		// Parse the AI response as JSON
		const insights = JSON.parse(jsonText);
		console.log('Successfully parsed AI insights');
		
		// Save insights to data store
		const studentId = getStudentId();
		console.log('Saving AI insights for student:', studentId, insights);
		if (studentId) {
			saveAIInsights(studentId, insights);
		} else {
			console.warn('No student ID available for saving insights');
		}
		
		return { insights };
	} catch (error) {
		console.error("Failed to generate insights:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to generate insights: ${errorMessage}`);
	}
}

/**
 * Generate personalized graduation roadmap using AI
 * @param {any} studentData - Student's academic data and requirements
 * @returns {Promise<{roadmap: any}>} AI-generated graduation roadmap
 */
export async function generateGraduationRoadmap(studentData) {
	const prompt = `You are an intelligent academic advisor creating a personalized graduation roadmap for a student. Generate a comprehensive course plan that optimizes their path to graduation while considering prerequisites, course availability, and academic performance patterns.

## Input Data Structure
You will receive student data containing:
- Student information (ID, name, current year, expected graduation)
- Degree requirements (total credits, core credits, elective credits)
- Completed courses with grades and credits
- Current course load and academic standing
- Academic performance history

## Required JSON Response Format
Respond with ONLY a valid JSON object using these exact property names:

\`\`\`json
{
  "roadmapOverview": {
    "expectedGraduationTerm": "string - projected graduation term (e.g., 'Fall 2025')",
    "totalRemainingCredits": "number - credits needed to graduate",
    "estimatedTermsRemaining": "number - terms needed to complete degree",
    "graduationConfidence": "string - confidence level and reasoning for timeline"
  },
  "semesterPlan": [
    {
      "term": "string - term name (e.g., 'Fall 2024', 'Spring 2025')",
      "termOrder": "number - chronological order (1, 2, 3, etc.)",
      "courses": [
        {
          "courseCode": "string - course identifier (e.g., 'MATH 151')",
          "courseName": "string - full course name",
          "credits": "number - credit hours",
          "type": "string - 'core' or 'elective'",
          "prerequisites": "array - required prerequisite courses",
          "difficulty": "string - descriptive difficulty level (e.g., 'introductory', 'intermediate', 'advanced', 'challenging')",
          "priority": "string - 'critical', 'important', or 'flexible'",
          "reasoning": "string - why this course should be taken this term"
        }
      ],
      "totalCredits": "number - total credits for this term",
      "workloadAssessment": "string - assessment of term difficulty",
      "keyMilestones": "array - important academic milestones for this term"
    }
  ],
  "prerequisiteMapping": {
    "completedPrerequisites": "array - prerequisites already satisfied",
    "pendingPrerequisites": "array - prerequisites still needed",
    "prerequisiteConflicts": "array - potential scheduling conflicts"
  },
  "graduationStrategy": {
    "coreCourseStrategy": "string - approach to completing core requirements",
    "electiveStrategy": "string - approach to selecting and completing electives",
    "creditOptimization": "string - strategies to maximize credit efficiency",
    "riskMitigation": "array - potential risks and mitigation strategies"
  },
  "alternativePaths": [
    {
      "scenario": "string - alternative scenario (e.g., 'Accelerated Graduation', 'Study Abroad')",
      "description": "string - brief description of the alternative",
      "timeline": "string - how this affects graduation timeline",
      "requirements": "array - additional requirements or considerations"
    }
  ],
}
\`\`\`

## Analysis Guidelines
1. Analyze completed courses to identify patterns in academic performance
2. Map out prerequisite chains to ensure proper course sequencing
3. Consider course availability and typical scheduling patterns
4. Balance workload across terms to maintain academic success
5. Identify opportunities for credit optimization (AP, transfer credits, etc.)
6. Account for potential challenges (failed courses, course availability, etc.)
7. Provide realistic timelines based on typical course offerings
8. Consider the student's academic strengths and weaknesses

## Response Requirements
- Address the student directly using "you" and "your" throughout
- Create a realistic, semester-by-semester plan through graduation
- Include specific course codes and names when possible
- Provide clear reasoning for course placement and timing
- Consider prerequisite requirements and course availability
- Balance core and elective requirements appropriately
- Include alternative paths for different scenarios
- Make recommendations specific and actionable
- Use realistic credit loads (12-18 credits per term typically)
- Account for potential course failures or scheduling conflicts
- Use descriptive difficulty levels instead of generic "low/medium/high"

## Course Planning Principles
- Prerequisites must be completed before advanced courses
- Distribute difficult courses across multiple terms
- Consider course availability (some courses only offered certain terms)
- Maintain reasonable credit loads for academic success
- Include buffer time for potential course failures or changes
- Prioritize courses that unlock multiple future options

## Tone and Language
- Always address the student directly ("You need to take...", "Your graduation timeline...")
- Use encouraging but realistic language
- Be specific about why each course is recommended
- Explain the reasoning behind course sequencing
- Make the roadmap feel personalized and actionable

Generate a roadmap that feels like personalized academic planning rather than generic course recommendations.

## Student Data:
${JSON.stringify(studentData, null, 2)}`;

	try {
		console.log('Sending graduation roadmap request to Gemini AI...');
		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: prompt,
		});
		
		console.log('Received graduation roadmap response from Gemini AI');
		console.log('Raw response:', response.text);
		
		// Extract JSON from markdown code blocks if present
		let jsonText = response.text || '{}';
		
		// Check if response is wrapped in markdown code blocks
		const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
		if (jsonMatch) {
			jsonText = jsonMatch[1];
			console.log('Extracted JSON from markdown:', jsonText);
		}
		
		// Parse the AI response as JSON
		const roadmap = JSON.parse(jsonText);
		console.log('Successfully parsed graduation roadmap');
		
		// Save roadmap to data store
		const studentId = getStudentId();
		console.log('Saving graduation roadmap for student:', studentId, roadmap);
		if (studentId) {
			saveCourseRoadmap(studentId, roadmap);
		} else {
			console.warn('No student ID available for saving roadmap');
		}
		
		return { roadmap };
	} catch (error) {
		console.error("Failed to generate graduation roadmap:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to generate graduation roadmap: ${errorMessage}`);
	}
}
