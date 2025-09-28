import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '$env/static/private';
import { saveAIInsights } from './dataStore.js';
import { getStudentId } from './auth.js';


// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
