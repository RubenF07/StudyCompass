# Neo4j Database Setup

This project includes Neo4j database integration to display student information.

## Prerequisites

1. Install Neo4j Desktop or Neo4j Community Edition
2. Start your Neo4j database instance

## Configuration

Create a `.env` file in the project root with the following variables:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password_here
```

## Default Configuration

If no environment variables are set, the application will use these defaults:
- URI: `bolt://localhost:7687`
- Username: `neo4j`
- Password: `password`

## Sample Data

The application automatically creates sample student data when you first access the API endpoint. This includes 5 sample students with different majors.

## Usage

1. Start your Neo4j database
2. Run the SvelteKit development server: `npm run dev`
3. Visit the home page to see the student count

## API Endpoints

- `GET /api/students` - Returns the count of students in the database
