<script>
	import { onMount } from 'svelte';
	import { getStudentId } from '$lib/auth.js';
	import { parseStudyHabitsData, formatDuration, formatTerm } from '$lib/parse_study_habits.js';
	
	/** @type {any} */
	let studentData = null;
	let loading = false;
	/** @type {string | null} */
	let error = null;
	let hasLoaded = false;
	/** @type {any} */
	let studyHabitsData = null;

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
		
		console.log("Starting load process");
		loading = true;
		error = null;
		
		// Get the student ID from the cookie
		const studentId = getStudentId();
		
		if (!studentId) {
			error = 'No student ID found. Please log in again.';
			loading = false;
			hasLoaded = true;
			return;
		}

		try {
			console.log("Loading study habits data for student ID: ", studentId);
			const response = await fetch(`/api/students/${studentId}`);
			const data = await response.json();
			console.log("DATA: ");
			console.log(data);
			
			if (response.ok) {
				// Parse the student data to extract study habits information
				studyHabitsData = parseStudyHabitsData([data.studentData]);
				console.log("Parsed study habits data:", studyHabitsData);
			} else {
				error = data.error || 'Failed to fetch student data';
				studyHabitsData = null;
			}
		} catch (/** @type {unknown} */ err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
			studyHabitsData = null;
		} finally {
			loading = false;
			hasLoaded = true;
		}
	}

	function handleAnalyzeHabits() {
		// TODO: Implement AI analysis of studying habits
		console.log("Analyze studying habits clicked");
		alert("Study habits analysis feature coming soon!");
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
	<div class="container mx-auto px-4 py-8">
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
								class="btn btn-primary analyze-button"
								on:click={handleAnalyzeHabits}
							>
								Analyze studying habits
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Overall Statistics -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
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
