# StudyCompass - AI-Powered Academic Planning

A SvelteKit application for personalized academic planning and study insights, powered by AI with an example deployed to Vercel.

## Features

- **AI-Powered Study Insights**: Personalized recommendations based on study habits
- **Graduation Roadmap**: AI-generated course planning and degree completion timelines
- **Academic Performance Tracking**: Monitor grades and academic progress
- **Study Habits Analysis**: Understand and optimize your study patterns

## Try Now!

[Try StudyCompass on Vercel](https://studycompass.vercel.app)

The app uses a generated database with fabricated data

### Example Student IDS to try

- IS91351
- JM67808
- NC59222
- NP94595
- NQ78891
- PQ37065
- QM87698
- SZ67045

*more can be found in the /lib/db_emulator.json*

## Local Setup

To set up StudyCompass locally:

1. **Install dependencies**  
   Run the following command in the project root to install all required npm packages:
   ```
   npm install
   ```

2. **Configure environment variables**  
   Create a `.env` file in the project root and add your Gemini API key:
   ```
   GEMINI_API_KEY=gemini_api_key
   ```

   **Note:** If no NEO4J_URI is found, the app will use the db_emulator.json

3. **(Optional) Connect to your own Neo4j database**  
   - By default, the app uses a generated database emulator (`/lib/db_emulator.json`).
   - To connect to your own Neo4j instance, update the following environment variables in your `.env` file:
     ```
     NEO4J_URI=your_neo4j_connection_string (e.g., bolt://localhost:7687)
     NEO4J_USERNAME=your_username
     NEO4J_PASSWORD=your_password
     ```

4. **Run the development server**  
   ```
   npm run dev
   ```

The app will be available at [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).

> **Note:** The data used in the Neo4j database (and the generated `/lib/db_emulator.json`) is based on the sample student data generation from [this repository](https://github.com/jasonpaluck/hackumbc-2025). The data has been adapted and expanded for demonstration purposes in StudyCompass.
