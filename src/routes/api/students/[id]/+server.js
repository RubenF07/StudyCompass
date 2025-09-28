import { json } from '@sveltejs/kit';
import { runQuery } from '$lib/neo4j.js';
export async function GET({ params }) {
	try {
		
		// Query to get the student with id from URL parameter and all of their relationships
		const STUDENT_ID = params.id;
		const result = await runQuery(
			`
			MATCH (s:Student {id: $studentId})
			OPTIONAL MATCH (s)-[r]->(n)
			RETURN s, collect({relationship: type(r), properties: properties(r), target: n}) as relationships
			`,
			{ studentId: STUDENT_ID }
		);

		// Check if student was found
		if (!result || result.length === 0) {
			return json({ 
				error: 'Student not found',
				studentData: null
			}, { status: 404 });
		}

		return json({ 
			studentData: result[0]
		});
	} catch (error) {
		console.error('Error querying students:', error);
		return json({ 
			error: 'Failed to query students',
			studentCount: 0 
		}, { status: 500 });
	}
}
