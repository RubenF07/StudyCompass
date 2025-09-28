# StudyCompass - AI-Powered Academic Planning

A SvelteKit application for personalized academic planning and study insights, powered by AI and deployed to Vercel.

## Features

- **AI-Powered Study Insights**: Personalized recommendations based on study habits
- **Graduation Roadmap**: AI-generated course planning and degree completion timelines
- **Academic Performance Tracking**: Monitor grades and academic progress
- **Study Habits Analysis**: Understand and optimize your study patterns

## Environment Variables

This application requires the following environment variables to be configured:

### Required for AI Features
- `GEMINI_API_KEY`: Your Google Gemini AI API key
  - Get it from: https://makersuite.google.com/app/apikey
  - Required for AI-powered insights and roadmap generation

### Optional for Database Features
- `NEO4J_URI`: Neo4j database connection string (default: bolt://localhost:7687)
- `NEO4J_USERNAME`: Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Neo4j password

### Setting up Environment Variables

#### For Local Development
Create a `.env` file in the project root:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password_here
```

#### For Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NEO4J_URI`: Your Neo4j connection string (if using)
   - `NEO4J_USERNAME`: Your Neo4j username (if using)
   - `NEO4J_PASSWORD`: Your Neo4j password (if using)

**Note**: Without the `GEMINI_API_KEY`, AI features will be disabled and the app will show placeholder content.

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fvercel%2Ftree%2Fmain%2Fexamples%2Fsveltekit&project-name=sveltekit-vercel&repository-name=sveltekit-vercel&demo-title=SvelteKit%20%2B%20Vercel&demo-description=A%20SvelteKit%20app%20optimized%20Edge-first.&demo-url=https%3A%2F%2Fsveltekit-template.vercel.app%2F)

_Live Example: https://sveltekit-template.vercel.app_

## Developing

Once you've installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```bash
pnpm run build
```

You can preview the production build with `npm run preview`.
