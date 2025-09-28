# Neo4j Query Examples

This document provides examples of common Neo4j queries you can use with this SvelteKit application.

## Basic Setup

The Neo4j integration is already set up in `src/lib/neo4j.js`. You can use the `runQuery` function to execute Cypher queries.

## Example Queries

### 1. Count All Students
```javascript
const result = await runQuery('MATCH (s:Student) RETURN count(s) as studentCount');
const count = result[0].studentCount;
```

### 2. Get All Students
```javascript
const result = await runQuery(`
    MATCH (s:Student) 
    RETURN s.id as id, s.name as name, s.email as email, s.major as major
    ORDER BY s.name
`);
```

### 3. Find Students by Major
```javascript
const major = 'Computer Science';
const result = await runQuery(`
    MATCH (s:Student {major: $major}) 
    RETURN s.name as name, s.email as email
`, { major });
```

### 4. Create a New Student
```javascript
const studentData = {
    id: '6',
    name: 'John Doe',
    email: 'john@example.com',
    major: 'Engineering'
};

await runQuery(`
    CREATE (s:Student {
        id: $id,
        name: $name,
        email: $email,
        major: $major
    })
`, studentData);
```

### 5. Update Student Information
```javascript
const studentId = '1';
const newEmail = 'alice.new@example.com';

await runQuery(`
    MATCH (s:Student {id: $id})
    SET s.email = $email
`, { id: studentId, email: newEmail });
```

### 6. Delete a Student
```javascript
const studentId = '5';

await runQuery(`
    MATCH (s:Student {id: $id})
    DELETE s
`, { id: studentId });
```

### 7. Find Students by Pattern Matching
```javascript
// Find students whose name starts with 'A'
const result = await runQuery(`
    MATCH (s:Student)
    WHERE s.name STARTS WITH 'A'
    RETURN s.name as name, s.major as major
`);
```

### 8. Count Students by Major
```javascript
const result = await runQuery(`
    MATCH (s:Student)
    RETURN s.major as major, count(s) as count
    ORDER BY count DESC
`);
```

### 9. Create Relationships Between Students
```javascript
// Create a "FRIENDS_WITH" relationship
await runQuery(`
    MATCH (s1:Student {id: '1'}), (s2:Student {id: '2'})
    CREATE (s1)-[:FRIENDS_WITH]->(s2)
`);
```

### 10. Find Students and Their Friends
```javascript
const result = await runQuery(`
    MATCH (s:Student)-[:FRIENDS_WITH]->(friend:Student)
    RETURN s.name as student, friend.name as friend
`);
```

## Using in SvelteKit

### In Server-Side Code (API Routes)
```javascript
// src/routes/api/students/+server.js
import { runQuery } from '$lib/neo4j.js';

export async function GET() {
    const result = await runQuery('MATCH (s:Student) RETURN count(s) as count');
    return json({ count: result[0].count });
}
```

### In Client-Side Code (Svelte Components)
```javascript
// In a .svelte file
async function fetchStudents() {
    const response = await fetch('/api/students');
    const data = await response.json();
    return data;
}
```

## Environment Variables

Make sure to set up your Neo4j connection in a `.env` file:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

## Error Handling

Always wrap your queries in try-catch blocks:

```javascript
try {
    const result = await runQuery('MATCH (s:Student) RETURN s');
    return result;
} catch (error) {
    console.error('Database error:', error);
    throw new Error('Failed to query database');
}
```
