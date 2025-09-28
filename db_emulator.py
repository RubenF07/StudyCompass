import os
import json
import sys
from typing import Dict, Any, List
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('.env', override=True)
print('NEO4J_URI:', repr(os.getenv('NEO4J_URI')))
print('NEO4J_USERNAME:', repr(os.getenv('NEO4J_USERNAME')))
print('NEO4J_PASSWORD:', repr(os.getenv('NEO4J_PASSWORD')))

class Neo4jDatabaseEmulator:
    def __init__(self):
        """Initialize the Neo4j database connection."""
        self.uri = os.getenv('NEO4J_URI')
        self.username = os.getenv('NEO4J_USERNAME')
        self.password = os.getenv('NEO4J_PASSWORD')
        
        
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            print("Successfully connected to Neo4j database")
        except Exception as e:
            print(f"Failed to connect to Neo4j database: {e}")
            sys.exit(1)
    
    def get_all_student_ids(self) -> List[str]:
        """Get all student IDs from the database."""
        query = "MATCH (s:Student) RETURN s.id as studentId ORDER BY s.id"
        
        with self.driver.session() as session:
            result = session.run(query)
            student_ids = [record["studentId"] for record in result]
        
        print(f"Found {len(student_ids)} students in the database")
        return student_ids
    
    def get_student_data(self, student_id: str) -> Dict[str, Any]:
        """
        Get student data for a specific student ID.
        This mimics the behavior of the API endpoint /api/students/[id]
        """
        query = """
        MATCH (s:Student {id: $studentId})
        OPTIONAL MATCH (s)-[r]->(n)
        RETURN s, collect({relationship: type(r), properties: properties(r), target: n}) as relationships
        """
        
        with self.driver.session() as session:
            result = session.run(query, studentId=student_id)
            records = list(result)
            
            if not records:
                return {
                    "error": "Student not found",
                    "studentData": None
                }
            
            # Convert Neo4j record to dictionary format
            record = records[0]
            student_data = {
                "s": dict(record["s"]),
                "relationships": record["relationships"]
            }
            
            return {
                "studentData": student_data
            }
    
    def create_database_emulator(self) -> Dict[str, Any]:
        """
        Create the database emulator JSON structure.
        Each key is a student ID and the value is the API response for that student.
        """
        print("Fetching all student IDs...")
        student_ids = self.get_all_student_ids()
        
        if not student_ids:
            print("No students found in the database")
            return {}
        
        db_emulator = {}
        
        print("Fetching data for each student...")
        for i, student_id in enumerate(student_ids, 1):
            print(f"  Processing student {i}/{len(student_ids)}: {student_id}")
            
            try:
                student_data = self.get_student_data(student_id)
                db_emulator[student_id] = student_data
            except Exception as e:
                print(f"    Error fetching data for student {student_id}: {e}")
                db_emulator[student_id] = {
                    "error": f"Failed to fetch data: {str(e)}",
                    "studentData": None
                }
        
        return db_emulator
    
    def save_to_file(self, data: Dict[str, Any], filename: str = "src/lib/db_emulator.json"):
        """Save the database emulator data to a JSON file."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            print(f"Database emulator saved to {filename}")
            print(f"File size: {os.path.getsize(filename)} bytes")
        except Exception as e:
            print(f"Failed to save file {filename}: {e}")
            sys.exit(1)
    
    def close(self):
        """Close the database connection."""
        if hasattr(self, 'driver'):
            self.driver.close()
            print("Database connection closed")

def main():
    print("Starting Database Emulator Script")
    
    # Initialize the emulator
    emulator = Neo4jDatabaseEmulator()
    
    try:
        # Create the database emulator data
        db_data = emulator.create_database_emulator()
        
        if not db_data:
            print("No data to save")
            return
        
        # Save to file
        emulator.save_to_file(db_data)
        
        # Print summary
        print("\nSummary:")
        print(f"  Total students processed: {len(db_data)}")
        
        # Count successful vs failed
        successful = sum(1 for data in db_data.values() if "error" not in data)
        failed = len(db_data) - successful
        
        print(f"  Successful queries: {successful}")
        print(f"  Failed queries: {failed}")
        
        if failed > 0:
            print("\nFailed student IDs:")
            for student_id, data in db_data.items():
                if "error" in data:
                    print(f"    - {student_id}: {data['error']}")
    
    except KeyboardInterrupt:
        print("\nScript interrupted by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        emulator.close()

if __name__ == "__main__":
    main()
