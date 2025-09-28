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
	const driver = getDriver();
	const session = driver.session();
	
	try {
		const result = await session.run(query, parameters);
		return result.records.map(/** @param {any} record */ record => record.toObject());
	} finally {
		await session.close();
	}
}
