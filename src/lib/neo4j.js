import neo4j from 'neo4j-driver';

// Neo4j connection configuration
const NEO4J_URI = 'bolt://localhost:7687';
const NEO4J_USERNAME = 'neo4j';
const NEO4J_PASSWORD = 'Cerbumbc5!';

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
