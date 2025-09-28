<script>
	import { onMount } from 'svelte';
	import { getStudentId } from '$lib/auth.js';
	import { parseStudyHabitsData, formatDuration, formatTerm } from '$lib/parse_study_habits.js';
	import { studentDataStore, loadingStore, errorStore, getStudyHabitsData } from '$lib/dataStore.js';
	import { generateStudyInsights } from '$lib/geminiClient.js';
	
	/** @type {any} */
	let studentData = null;
	let loading = false;
	/** @type {string | null} */
	let error = null;
	let hasLoaded = false;
	/** @type {any} */
	let studyHabitsData = null;
	
	// AI Insights state
	/** @type {any} */
	let insights = null;
	let insightsLoading = false;
	/** @type {string | null} */
	let insightsError = null;
	let showInsights = false;
	let insightsMinimized = false;

	// Subscribe to stores
	$: loading = $loadingStore.studyHabitsData;
	$: error = $errorStore.studyHabitsData;
	$: {
		// Extract study habits data when available
		if ($studentDataStore.studyHabitsData && $studentDataStore.studentId === getStudentId()) {
			studyHabitsData = $studentDataStore.studyHabitsData;
			hasLoaded = true;
		} else if ($studentDataStore.studentId !== getStudentId()) {
			// Different student, clear data
			studyHabitsData = null;
			hasLoaded = false;
		}
		
		// Load AI insights from store - reactive to store changes
		const currentStudentId = getStudentId();
		
		if (currentStudentId && $studentDataStore.studentId === currentStudentId) {
			if ($studentDataStore.aiInsights) {
				console.log('Loading AI insights from store:', $studentDataStore.aiInsights);
				insights = $studentDataStore.aiInsights;
				showInsights = true;
			} else {
				console.log('No AI insights in store for current student');
				insights = null;
				showInsights = false;
			}
		} else {
			console.log('Student ID mismatch or no current student');
			insights = null;
			showInsights = false;
		}
	}

	onMount(async () => {
		await loadStudyHabitsData();
	});

	async function loadStudyHabitsData() {
		console.log("Loading study habits data");
		// Prevent multiple simultaneous calls
		if (loading) {
			console.log("Already loading, skipping...");
			return;
		}
		
		// Get the student ID from the cookie
		const studentId = getStudentId();
		
		if (!studentId) {
			error = 'No student ID found. Please log in again.';
			hasLoaded = true;
			return;
		}

		// Use the data store to load study habits data
		const result = await getStudyHabitsData(studentId, parseStudyHabitsData);
		if (!result.success) {
			error = result.error;
			hasLoaded = true;
		}
	}


	async function handleAnalyzeHabits() {
		if (!studyHabitsData) {
			insightsError = 'No study habits data available for analysis';
			return;
		}

		// Check if we already have insights
		if (insights) {
			console.log("Using existing AI insights");
			showInsights = true;
			return;
		}

		insightsLoading = true;
		insightsError = null;
		showInsights = true;

		try {
			console.log("Analyzing study habits with AI...");
			console.log("Study habits data:", studyHabitsData);
			
			// Call Gemini directly from client
			const result = await generateStudyInsights(studyHabitsData);
			
			insights = result.insights;
			console.log("AI insights generated:", result.insights);
		} catch (err) {
			insightsError = `Failed to generate insights: ${err.message}`;
			console.error("Error analyzing study habits:", err);
		} finally {
			insightsLoading = false;
		}
	}

	function getEffectivenessColor(effectiveness) {
		if (effectiveness >= 0.8) return 'text-green-600';
		if (effectiveness >= 0.6) return 'text-yellow-600';
		if (effectiveness >= 0.4) return 'text-orange-600';
		return 'text-red-600';
	}

	function getEffectivenessBackground(effectiveness) {
		if (effectiveness >= 0.8) return 'bg-green-100';
		if (effectiveness >= 0.6) return 'bg-yellow-100';
		if (effectiveness >= 0.4) return 'bg-orange-100';
		return 'bg-red-100';
	}

	function getGPAColor(gpa) {
		if (gpa >= 3.7) return 'text-green-600';
		if (gpa >= 3.3) return 'text-blue-600';
		if (gpa >= 3.0) return 'text-yellow-600';
		if (gpa >= 2.7) return 'text-orange-600';
		return 'text-red-600';
	}

	function getGPABackground(gpa) {
		if (gpa >= 3.7) return 'bg-green-100';
		if (gpa >= 3.3) return 'bg-blue-100';
		if (gpa >= 3.0) return 'bg-yellow-100';
		if (gpa >= 2.7) return 'bg-orange-100';
		return 'bg-red-100';
	}
</script>

<svelte:head>
	<title>Studying Habits</title>
	<meta name="description" content="View your studying habits and patterns across semesters" />
</svelte:head>

<section>
	<div class="w-full py-8">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-gray-800">Studying Habits</h1>
		</div>
		
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<span class="loading loading-spinner loading-lg"></span>
				<span class="ml-4 text-lg">Loading study habits data...</span>
			</div>
		{:else if error}
			<div class="alert alert-error max-w-md mx-auto">
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<span>{error}</span>
			</div>
		{:else if studyHabitsData}
			<!-- Current Term Progress -->
			{#if studyHabitsData.currentTerm}
				<div class="card bg-base-100 shadow-xl mb-8">
					<div class="card-body">
						<h2 class="card-title text-2xl mb-4 text-primary">Current Term: {formatTerm(studyHabitsData.currentTerm.term)}</h2>
						
						<!-- Current Term Stats -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
							<div class="stat bg-base-200 rounded-lg p-4">
								<div class="stat-title">Study Sessions</div>
								<div class="stat-value text-primary">{studyHabitsData.currentTerm.totalSessions}</div>
							</div>
							<div class="stat bg-base-200 rounded-lg p-4">
								<div class="stat-title">Total Time</div>
								<div class="stat-value text-secondary">{formatDuration(studyHabitsData.currentTerm.totalTimeSpent)}</div>
							</div>
							<div class="stat bg-base-200 rounded-lg p-4">
								<div class="stat-title">Avg Session</div>
								<div class="stat-value text-accent">{formatDuration(studyHabitsData.currentTerm.averageSessionDuration)}</div>
							</div>
							<div class="stat bg-base-200 rounded-lg p-4">
								<div class="stat-title">Effectiveness</div>
								<div class="stat-value text-success">{(studyHabitsData.currentTerm.averageEffectiveness * 100).toFixed(1)}%</div>
							</div>
						</div>

						<!-- Study Methods for Current Term -->
						{#if studyHabitsData.currentTerm.effectivenessByMethod && Object.keys(studyHabitsData.currentTerm.effectivenessByMethod).length > 0}
							<div class="mb-6">
								<h3 class="text-lg font-semibold mb-3">Study Methods This Term</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each Object.entries(studyHabitsData.currentTerm.effectivenessByMethod) as [method, data]}
										<div class="card bg-base-200 shadow">
											<div class="card-body p-4">
												<h4 class="font-semibold">{method}</h4>
												<div class="text-sm text-gray-600">
													<div>Sessions: {data.sessions}</div>
													<div class="flex items-center mt-1">
														<span class="mr-2">Effectiveness:</span>
														<span class="badge {getEffectivenessBackground(data.averageEffectiveness)} {getEffectivenessColor(data.averageEffectiveness)}">
															{(data.averageEffectiveness * 100).toFixed(1)}%
														</span>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Study Locations for Current Term -->
						{#if studyHabitsData.currentTerm.timeByLocation && Object.keys(studyHabitsData.currentTerm.timeByLocation).length > 0}
							<div class="mb-6">
								<h3 class="text-lg font-semibold mb-3">Study Locations This Term</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each Object.entries(studyHabitsData.currentTerm.timeByLocation) as [location, data]}
										<div class="card bg-base-200 shadow">
											<div class="card-body p-4">
												<h4 class="font-semibold">{location}</h4>
												<div class="text-sm text-gray-600">
													<div>Sessions: {data.sessions}</div>
													<div>Total Time: {formatDuration(data.totalTime)}</div>
													<div>Avg Time: {formatDuration(data.averageTime)}</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Analyze Button -->
						<div class="text-center pt-4 border-t border-gray-200">
							<button 
								class="btn btn-primary analyze-button {insights ? 'btn-disabled' : ''}"
								on:click={handleAnalyzeHabits}
								disabled={insightsLoading || insights}
							>
								{#if insightsLoading}
									<span class="loading loading-spinner loading-sm"></span>
									Analyzing...
								{:else if insights}
									✓ Analysis Complete
								{:else}
									Analyze studying habits
								{/if}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- AI Insights Section -->
			{#if showInsights}
				<div class="card bg-gradient-to-br from-purple-50 to-blue-50 shadow-xl mb-8 border border-purple-200">
					<div class="card-body">
						<div class="flex items-center justify-between mb-6">
							<h2 class="card-title text-2xl text-purple-800">
								<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
								</svg>
								Personalized Study Insights
							</h2>
							<div 
								class="cursor-pointer p-1 hover:bg-gray-100 rounded transition-colors"
								on:click={() => insightsMinimized = !insightsMinimized}
							>
								{#if insightsMinimized}
									<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
									</svg>
								{:else}
									<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
									</svg>
								{/if}
							</div>
						</div>

						{#if !insightsMinimized}
							{#if insightsLoading}
								<div class="flex items-center justify-center py-8">
									<span class="loading loading-spinner loading-lg text-purple-600"></span>
									<span class="ml-4 text-lg text-purple-700">Generating personalized insights...</span>
								</div>
							{:else if insightsError}
								<div class="alert alert-error">
									<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>{insightsError}</span>
								</div>
							{:else if insights}
							<div class="space-y-6">
								<!-- Study Strategy Insights -->
								{#if insights.studyStrategyInsights}
									<div class="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
										<h3 class="text-lg font-semibold text-purple-800 mb-4 flex items-center">
											<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
											</svg>
											Study Strategy Insights
										</h3>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											{#if insights.studyStrategyInsights.performancePrediction}
												<div class="p-4 bg-blue-50 rounded-lg">
													<h4 class="font-medium text-blue-800 mb-2">Performance Prediction</h4>
													<p class="text-blue-700 text-sm">{insights.studyStrategyInsights.performancePrediction}</p>
												</div>
											{/if}
											{#if insights.studyStrategyInsights.methodOptimization}
												<div class="p-4 bg-green-50 rounded-lg">
													<h4 class="font-medium text-green-800 mb-2">Method Optimization</h4>
													<p class="text-green-700 text-sm">{insights.studyStrategyInsights.methodOptimization}</p>
												</div>
											{/if}
											{#if insights.studyStrategyInsights.locationOptimization}
												<div class="p-4 bg-yellow-50 rounded-lg">
													<h4 class="font-medium text-yellow-800 mb-2">Location Optimization</h4>
													<p class="text-yellow-700 text-sm">{insights.studyStrategyInsights.locationOptimization}</p>
												</div>
											{/if}
											{#if insights.studyStrategyInsights.sessionLengthInsight}
												<div class="p-4 bg-purple-50 rounded-lg">
													<h4 class="font-medium text-purple-800 mb-2">Session Length Insight</h4>
													<p class="text-purple-700 text-sm">{insights.studyStrategyInsights.sessionLengthInsight}</p>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Academic Patterns -->
								{#if insights.academicPatterns}
									<div class="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
										<h3 class="text-lg font-semibold text-purple-800 mb-4 flex items-center">
											<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
											</svg>
											Academic Patterns
										</h3>
										<div class="space-y-3">
											{#if insights.academicPatterns.performanceTrend}
												<div class="p-4 bg-indigo-50 rounded-lg">
													<h4 class="font-medium text-indigo-800 mb-2">Performance Trend</h4>
													<p class="text-indigo-700 text-sm">{insights.academicPatterns.performanceTrend}</p>
												</div>
											{/if}
											{#if insights.academicPatterns.studyHabitEvolution}
												<div class="p-4 bg-teal-50 rounded-lg">
													<h4 class="font-medium text-teal-800 mb-2">Study Habit Evolution</h4>
													<p class="text-teal-700 text-sm">{insights.academicPatterns.studyHabitEvolution}</p>
												</div>
											{/if}
											{#if insights.academicPatterns.consistencyAnalysis}
												<div class="p-4 bg-orange-50 rounded-lg">
													<h4 class="font-medium text-orange-800 mb-2">Consistency Analysis</h4>
													<p class="text-orange-700 text-sm">{insights.academicPatterns.consistencyAnalysis}</p>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Course Success Predictions -->
								{#if insights.courseSuccessPredictions}
									<div class="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
										<h3 class="text-lg font-semibold text-purple-800 mb-4 flex items-center">
											<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
											</svg>
											Course Success Predictions
										</h3>
										<div class="space-y-3">
											{#if insights.courseSuccessPredictions.currentCourseInsight}
												<div class="p-4 bg-emerald-50 rounded-lg">
													<h4 class="font-medium text-emerald-800 mb-2">Current Course Insight</h4>
													<p class="text-emerald-700 text-sm">{insights.courseSuccessPredictions.currentCourseInsight}</p>
												</div>
											{/if}
											{#if insights.courseSuccessPredictions.studyTimeRecommendation}
												<div class="p-4 bg-cyan-50 rounded-lg">
													<h4 class="font-medium text-cyan-800 mb-2">Study Time Recommendation</h4>
													<p class="text-cyan-700 text-sm">{insights.courseSuccessPredictions.studyTimeRecommendation}</p>
												</div>
											{/if}
											{#if insights.courseSuccessPredictions.methodEffectiveness}
												<div class="p-4 bg-rose-50 rounded-lg">
													<h4 class="font-medium text-rose-800 mb-2">Method Effectiveness</h4>
													<p class="text-rose-700 text-sm">{insights.courseSuccessPredictions.methodEffectiveness}</p>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Personalized Recommendations -->
								{#if insights.personalizedRecommendations}
									<div class="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
										<h3 class="text-lg font-semibold text-purple-800 mb-4 flex items-center">
											<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
											</svg>
											Personalized Recommendations
										</h3>
										<div class="space-y-3">
											{#if insights.personalizedRecommendations.immediateActions}
												<div class="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
													<h4 class="font-medium text-red-800 mb-2">Immediate Actions</h4>
													{#if Array.isArray(insights.personalizedRecommendations.immediateActions)}
														<ul class="text-red-700 text-sm space-y-1">
															{#each insights.personalizedRecommendations.immediateActions as action}
																<li class="flex items-start">
																	<span class="text-red-500 mr-2">•</span>
																	<span>{action}</span>
																</li>
															{/each}
														</ul>
													{:else}
														<p class="text-red-700 text-sm">{insights.personalizedRecommendations.immediateActions}</p>
													{/if}
												</div>
											{/if}
											{#if insights.personalizedRecommendations.longTermStrategy}
												<div class="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
													<h4 class="font-medium text-blue-800 mb-2">Long-term Strategy</h4>
													{#if Array.isArray(insights.personalizedRecommendations.longTermStrategy)}
														<ul class="text-blue-700 text-sm space-y-1">
															{#each insights.personalizedRecommendations.longTermStrategy as strategy}
																<li class="flex items-start">
																	<span class="text-blue-500 mr-2">•</span>
																	<span>{strategy}</span>
																</li>
															{/each}
														</ul>
													{:else}
														<p class="text-blue-700 text-sm">{insights.personalizedRecommendations.longTermStrategy}</p>
													{/if}
												</div>
											{/if}
											{#if insights.personalizedRecommendations.riskAreas}
												<div class="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
													<h4 class="font-medium text-amber-800 mb-2">Risk Areas</h4>
													{#if Array.isArray(insights.personalizedRecommendations.riskAreas)}
														<ul class="text-amber-700 text-sm space-y-1">
															{#each insights.personalizedRecommendations.riskAreas as risk}
																<li class="flex items-start">
																	<span class="text-amber-500 mr-2">•</span>
																	<span>{risk}</span>
																</li>
															{/each}
														</ul>
													{:else}
														<p class="text-amber-700 text-sm">{insights.personalizedRecommendations.riskAreas}</p>
													{/if}
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
							{/if}
						{/if}
					</div>
				</div>
			{/if}

			<!-- Overall Statistics -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Total Sessions</div>
					<div class="stat-value text-primary">{studyHabitsData.overallStats.totalSessions}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Total Study Time</div>
					<div class="stat-value text-secondary">{formatDuration(studyHabitsData.overallStats.totalTimeSpent)}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Unique Locations</div>
					<div class="stat-value text-accent">{studyHabitsData.overallStats.uniqueLocations}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Study Methods</div>
					<div class="stat-value text-success">{studyHabitsData.overallStats.uniqueMethods}</div>
				</div>
			</div>

			<!-- Past Terms Study Habits -->
			{#if studyHabitsData.pastTerms && Object.keys(studyHabitsData.pastTerms).length > 0}
				<div class="space-y-6">
					<h2 class="text-3xl font-bold text-gray-800 mb-6">Past Terms Study Habits</h2>
					
					{#each Object.entries(studyHabitsData.pastTerms).sort(([a], [b]) => b.localeCompare(a)) as [term, termData]}
						<div class="card bg-base-100 shadow-xl">
							<div class="card-body">
								<div class="flex justify-between items-center mb-4">
									<h3 class="text-2xl font-bold text-primary">{formatTerm(term)}</h3>
									<div class="text-right">
										<div class="text-lg font-semibold">{termData.totalSessions} sessions</div>
										<div class="text-sm text-gray-600">{formatDuration(termData.totalTimeSpent)} total time</div>
										{#if termData.finalGPA !== null}
											<div class="text-sm font-medium text-black">GPA: {termData.finalGPA}</div>
										{/if}
									</div>
								</div>
								
								<!-- Term Stats Grid -->
								<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
									<div class="stat bg-base-200 rounded-lg p-4">
										<div class="stat-title text-sm">Avg Session</div>
										<div class="stat-value text-lg">{formatDuration(termData.averageSessionDuration)}</div>
									</div>
									<div class="stat bg-base-200 rounded-lg p-4">
										<div class="stat-title text-sm">Effectiveness</div>
										<div class="stat-value text-lg">{(termData.averageEffectiveness * 100).toFixed(1)}%</div>
									</div>
									<div class="stat bg-base-200 rounded-lg p-4">
										<div class="stat-title text-sm">Locations</div>
										<div class="stat-value text-lg">{termData.uniqueLocations}</div>
									</div>
									<div class="stat bg-base-200 rounded-lg p-4">
										<div class="stat-title text-sm">Group Study</div>
										<div class="stat-value text-lg">{termData.groupStudySessions}</div>
									</div>
									{#if termData.finalGPA !== null}
										<div class="stat {getGPABackground(termData.finalGPA)} rounded-lg p-4">
											<div class="stat-title text-sm">Final GPA</div>
											<div class="stat-value text-lg {getGPAColor(termData.finalGPA)}">{termData.finalGPA}</div>
										</div>
									{/if}
								</div>

								<!-- Study Methods for this term -->
								{#if termData.effectivenessByMethod && Object.keys(termData.effectivenessByMethod).length > 0}
									<div class="mb-4">
										<h4 class="text-lg font-semibold mb-3">Study Methods</h4>
										<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
											{#each Object.entries(termData.effectivenessByMethod) as [method, data]}
												<div class="flex justify-between items-center p-3 bg-base-200 rounded-lg">
													<span class="font-medium">{method}</span>
													<div class="text-sm text-gray-600">
														<span class="badge {getEffectivenessBackground(data.averageEffectiveness)} {getEffectivenessColor(data.averageEffectiveness)} mr-2">
															{(data.averageEffectiveness * 100).toFixed(1)}%
														</span>
														<span>({data.sessions} sessions)</span>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Study Locations for this term -->
								{#if termData.timeByLocation && Object.keys(termData.timeByLocation).length > 0}
									<div>
										<h4 class="text-lg font-semibold mb-3">Study Locations</h4>
										<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
											{#each Object.entries(termData.timeByLocation) as [location, data]}
												<div class="flex justify-between items-center p-3 bg-base-200 rounded-lg">
													<span class="font-medium">{location}</span>
													<div class="text-sm text-gray-600">
														<span>{formatDuration(data.totalTime)}</span>
														<span class="ml-2">({data.sessions} sessions)</span>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-12">
					<div class="text-6xl mb-4">📚</div>
					<h3 class="text-2xl font-bold text-gray-600 mb-2">No Study Session Data</h3>
					<p class="text-gray-500">You haven't logged any study sessions yet. Your study habits will appear here once you start tracking your study sessions.</p>
				</div>
			{/if}
		{:else}
			<div class="text-center py-12">
				<div class="text-6xl mb-4">❌</div>
				<h3 class="text-2xl font-bold text-gray-600 mb-2">No Study Habits Data</h3>
				<p class="text-gray-500">Unable to load your study habits data.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	section {
		min-height: 100vh;
		/* Background is now handled by the main layout */
	}

	.analyze-button {
		scale: 1.3;
		position: relative;
		overflow: hidden;
		background: linear-gradient(45deg, #8b5cf6, #7c3aed, #8b5cf6);
		background-size: 200% 200%;
		animation: gradientShift 3s ease-in-out infinite;
		box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
		transition: all 0.3s ease;
	}

	.analyze-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.3),
			transparent
		);
		animation: shine 5s ease-in-out infinite;
	}

	.analyze-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
	}

	.analyze-button:active {
		transform: translateY(0);
	}

	.analyze-button.btn-disabled {
		background: #9ca3af !important;
		background-size: 100% 100% !important;
		animation: none !important;
		box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3) !important;
		cursor: not-allowed !important;
		opacity: 0.8;
		color: #374151 !important;
		font-weight: 600;
	}

	.analyze-button.btn-disabled::before {
		display: none !important;
	}

	.analyze-button.btn-disabled:hover {
		transform: none !important;
		box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3) !important;
		background: #9ca3af !important;
	}

	@keyframes gradientShift {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	@keyframes shine {
		0% {
			left: -100%;
		}
		50% {
			left: 100%;
		}
		100% {
			left: 100%;
		}
	}
</style>
