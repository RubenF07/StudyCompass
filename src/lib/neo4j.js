import neo4j from 'neo4j-driver';

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

// Log configuration (without password for security)
console.log('Neo4j Configuration:', {
	uri: NEO4J_URI,
	username: NEO4J_USERNAME,
	passwordSet: !!process.env.NEO4J_PASSWORD,
	envVars: {
		NEO4J_URI: process.env.NEO4J_URI,
		NEO4J_USERNAME: process.env.NEO4J_USERNAME,
		NEO4J_PASSWORD: process.env.NEO4J_PASSWORD
	}
});

/** @type {import('neo4j-driver').Driver | null} */
let driver = null;

export function getDriver() {
	if (!driver) {
		driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
	}
	return driver;
}

export async function closeDriver() {
	if (driver) {
		await driver.close();
		driver = null;
	}
}

// Helper function to run queries
/**
 * @param {string} query
 * @param {Record<string, any>} parameters
 */
export async function runQuery(query, parameters = {}) {
	//! Use when connected to the database
	// const driver = getDriver();
	// const session = driver.session();
	
	// try {
	// 	const result = await session.run(query, parameters);
	// 	return result.records.map(/** @param {any} record */ record => record.toObject());
	// } finally {
	// 	await session.close();
	// }

	// For demo: Return the student data from db_emulator.json if available
	const fs = await import('fs/promises');
	try {
		const dbEmulatorRaw = await fs.readFile('db_emulator.json', 'utf-8');
		const dbEmulator = JSON.parse(dbEmulatorRaw);

		// Use the id as passed in parameters
		let studentId = parameters.studentId;

		if (!studentId) {
			throw new Error('No studentId provided in parameters');
		}

		const studentData = dbEmulator[studentId]["studentData"];
		if (!studentData) {
			throw new Error(`Student ID ${studentId} not found in db_emulator.json`);
		}

		// Convert emulator format to Neo4j driver format for compatibility
		const neo4jFormat = convertToNeo4jFormat(studentData);
		return [neo4jFormat];
	} catch (err) {
		console.error('Error reading db_emulator.json or finding student:', err);
		throw err;
	}
}

/**
 * Convert emulator format to Neo4j driver format
 * @param {any} studentData - Student data in emulator format
 * @returns {any} Student data in Neo4j driver format
 */
function convertToNeo4jFormat(studentData) {
	// Convert student node - handle nested properties
	let studentProperties = studentData.s.properties;
	while (studentProperties && studentProperties.properties) {
		studentProperties = studentProperties.properties;
	}
	
	const studentNode = {
		identity: { low: 1, high: 0 },
		labels: ['Student'],
		properties: studentProperties
	};

	// Convert relationships
	const relationships = studentData.relationships.map((rel, index) => ({
		relationship: rel.relationship,
		properties: rel.properties,
		target: {
			identity: { low: index + 2, high: 0 },
			labels: rel.target.labels,
			properties: rel.target.properties
		}
	}));

	return {
		s: studentNode,
		relationships: relationships
	};
}
