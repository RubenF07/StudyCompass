import { json } from '@sveltejs/kit';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function GET() {
	return json({ 
		message: 'Study habits insights API is working',
		status: 'ok'
	});
}

export async function POST({ request }) {
	console.log('=== POST REQUEST RECEIVED ===');
	console.log('POST request received for study habits insights');
	console.log('Request headers:', Object.fromEntries(request.headers.entries()));
	
	try {
		
		// Check if request has a body
		const contentType = request.headers.get('content-type');
		console.log('Content-Type:', contentType);
		
		if (!contentType || !contentType.includes('application/json')) {
			console.error('Invalid content type:', contentType);
			return json({ 
				error: 'Content-Type must be application/json'
			}, { status: 400 });
		}
		
		// Parse the request body using SvelteKit's built-in method
		let requestBody;
		try {
			requestBody = await request.json();
			console.log('Request body parsed successfully:', Object.keys(requestBody));
		} catch (parseError) {
			console.error('Failed to parse request body:', parseError);
			return json({ 
				error: 'Invalid request body - must be valid JSON'
			}, { status: 400 });
		}

		const { studyHabitsData } = requestBody;
		
		if (!studyHabitsData) {
			console.error('No studyHabitsData in request body:', requestBody);
			return json({ 
				error: 'No study habits data provided'
			}, { status: 400 });
		}
		
		console.log('Study habits data received, keys:', Object.keys(studyHabitsData));

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
    "performancePrediction": "string - prediction about current term performance based on patterns",
    "methodOptimization": "string - specific recommendation about study methods",
    "locationOptimization": "string - recommendation about study locations",
    "sessionLengthInsight": "string - insight about optimal session duration"
  },
  "academicPatterns": {
    "performanceTrend": "string - trend analysis of academic performance over time",
    "studyHabitEvolution": "string - how study habits have changed and impact",
    "consistencyAnalysis": "string - analysis of study consistency patterns"
  },
  "courseSuccessPredictions": {
    "currentCourseInsight": "string - prediction about current courses based on historical data",
    "studyTimeRecommendation": "string - specific study time recommendations",
    "methodEffectiveness": "string - which study methods work best for this student's course types"
  },
  "personalizedRecommendations": {
    "immediateActions": "string - specific actions to take right now",
    "longTermStrategy": "string - broader strategic recommendations",
    "riskAreas": "string - potential problem areas to watch"
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
- Each string should be 1-3 sentences maximum
- Be specific and data-driven
- Use "you" and "your" to make it personal
- Include specific numbers when available (percentages, hours, GPA points)
- Avoid generic phrases like "consider" or "might want to"
- Make recommendations concrete and actionable
- If data is insufficient for a specific insight, use "Insufficient data to determine [specific insight]"

Generate insights that feel like personalized academic coaching rather than generic AI responses.

## Student Data:
${JSON.stringify(studyHabitsData, null, 2)}`;

		console.log('Sending request to Gemini AI...');
		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: prompt,
		});
		
		console.log('Received response from Gemini AI');
		
		try {
			const insights = JSON.parse(response.text || '{}');
			console.log('Successfully parsed AI insights');
			return json({ insights });
		} catch (parseError) {
			console.error("Failed to parse AI response as JSON:", parseError);
			console.error("Raw response:", response.text);
			return json({
				error: "Failed to generate insights",
				rawResponse: response.text
			}, { status: 500 });
		}
	} catch (error) {
		console.error('=== ERROR IN POST HANDLER ===');
		console.error('Error generating AI insights:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
		return json({ 
			error: 'Failed to generate AI insights',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
}
