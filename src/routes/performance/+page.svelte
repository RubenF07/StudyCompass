<script>
	import { onMount } from 'svelte';
	import { getStudentId } from '$lib/auth.js';
	import { parseAllStudentData } from '$lib/parse_student_data.js';
	
	/** @type {any} */
	let studentData = null;
	let loading = false;
	/** @type {string | null} */
	let error = null;
	let hasLoaded = false;
	/** @type {any} */
	let performanceData = null;

	onMount(async () => {
		await loadPerformanceData();
	});

	async function loadPerformanceData() {
		console.log("Loading performance data");
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
			console.log("Loading performance data for student ID: ", studentId);
			const response = await fetch(`/api/students/${studentId}`);
			const data = await response.json();
			console.log("DATA: ");
			console.log(data);
			
			if (response.ok) {
				// Parse the student data to extract performance information
				performanceData = parseAllStudentData([data.studentData]);
				console.log("Parsed performance data:", performanceData);
			} else {
				error = data.error || 'Failed to fetch student data';
				performanceData = null;
			}
		} catch (/** @type {unknown} */ err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
			performanceData = null;
		} finally {
			loading = false;
			hasLoaded = true;
		}
	}

	function getGradeColor(grade) {
		const gradeColors = {
			'A+': 'text-green-600',
			'A': 'text-green-600',
			'A-': 'text-green-500',
			'B+': 'text-blue-600',
			'B': 'text-blue-500',
			'B-': 'text-blue-400',
			'C+': 'text-yellow-600',
			'C': 'text-yellow-500',
			'C-': 'text-yellow-400',
			'D+': 'text-orange-600',
			'D': 'text-orange-500',
			'D-': 'text-orange-400',
			'F': 'text-red-600'
		};
		return gradeColors[grade] || 'text-gray-600';
	}

	function getGradeBackground(grade) {
		const gradeBackgrounds = {
			'A+': 'bg-green-100',
			'A': 'bg-green-100',
			'A-': 'bg-green-50',
			'B+': 'bg-blue-100',
			'B': 'bg-blue-100',
			'B-': 'bg-blue-50',
			'C+': 'bg-yellow-100',
			'C': 'bg-yellow-100',
			'C-': 'bg-yellow-50',
			'D+': 'bg-orange-100',
			'D': 'bg-orange-100',
			'D-': 'bg-orange-50',
			'F': 'bg-red-100'
		};
		return gradeBackgrounds[grade] || 'bg-gray-100';
	}

	function formatTerm(term) {
		// Convert term format like "Summer2024" to "Summer 2024"
		if (!term) return term;
		
		// Handle format like "Summer2024", "Spring2024", "Fall2024"
		const seasonMatch = term.match(/^(Summer|Spring|Fall|Winter)(\d{4})$/);
		if (seasonMatch) {
			const [, season, year] = seasonMatch;
			return `${season} ${year}`;
		}
		
		// Fallback for other formats
		return term;
	}
</script>

<svelte:head>
	<title>Academic Performance</title>
	<meta name="description" content="View your academic performance across semesters" />
</svelte:head>

<section>
	<div class="container mx-auto px-4 py-8">
		<h1 class="text-4xl font-bold text-gray-800 mb-8 text-center">Academic Performance</h1>
		
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<span class="loading loading-spinner loading-lg"></span>
				<span class="ml-4 text-lg">Loading performance data...</span>
			</div>
		{:else if error}
			<div class="alert alert-error max-w-md mx-auto">
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<span>{error}</span>
			</div>
		{:else if performanceData && performanceData.pastSemesterSummary}
			<!-- Overall Performance Summary -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Total Semesters</div>
					<div class="stat-value text-primary">{performanceData.pastSemesterSummary.totalSemesters}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Total Courses</div>
					<div class="stat-value text-secondary">{performanceData.pastSemesterSummary.totalCourses}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">Total Credits</div>
					<div class="stat-value text-accent">{performanceData.pastSemesterSummary.totalCredits}</div>
				</div>
				<div class="stat bg-base-100 shadow rounded-lg p-6">
					<div class="stat-title">GPA</div>
					<div class="stat-value text-success">{performanceData.pastSemesterSummary.averageGrade.toFixed(2)}</div>
				</div>
			</div>

			<!-- Grade Distribution Chart -->
			{#if performanceData.pastSemesterSummary.gradeDistribution && Object.keys(performanceData.pastSemesterSummary.gradeDistribution).length > 0}
				<div class="card bg-base-100 shadow-xl mb-8">
					<div class="card-body">
						<h2 class="card-title text-2xl mb-4">Grade Distribution</h2>
						<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
							{#each Object.entries(performanceData.pastSemesterSummary.gradeDistribution) as [grade, count]}
								<div class="text-center">
									<div class="text-3xl font-bold {getGradeColor(grade)}">{grade}</div>
									<div class="text-sm text-gray-600">{count} course{count !== 1 ? 's' : ''}</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Semester-by-Semester Performance -->
			{#if performanceData.pastSemesters && Object.keys(performanceData.pastSemesters).length > 0}
				<div class="space-y-6">
					<h2 class="text-3xl font-bold text-gray-800 mb-6">Semester Performance</h2>
					
					{#each Object.entries(performanceData.pastSemesters).sort(([a], [b]) => b.localeCompare(a)) as [term, semesterData]}
						<div class="card bg-base-100 shadow-xl">
							<div class="card-body">
								<div class="flex justify-between items-center mb-4">
									<h3 class="text-2xl font-bold text-primary">{formatTerm(term)}</h3>
									<div class="text-right">
										<div class="text-lg font-semibold">GPA: {performanceData.pastSemesterSummary.semesterBreakdown[term]?.averageGrade?.toFixed(2) || 'N/A'}</div>
										<div class="text-sm text-gray-600">{semesterData.courses.length} course{semesterData.courses.length !== 1 ? 's' : ''} • {semesterData.courses.reduce((sum, course) => sum + course.credits, 0)} credits</div>
									</div>
								</div>
								
								<div class="overflow-x-auto">
									<table class="table table-zebra w-full">
										<thead>
											<tr>
												<th>Course</th>
												<th>Department</th>
												<th>Credits</th>
												<th>Grade</th>
												<th>Difficulty</th>
												<th>Enjoyment</th>
											</tr>
										</thead>
										<tbody>
											{#each semesterData.courses as course}
												<tr>
													<td>
														<div class="font-semibold">{course.name}</div>
														<div class="text-sm text-gray-500">{course.id}</div>
													</td>
													<td>{course.department}</td>
													<td>{course.credits}</td>
													<td>
														<span class="badge {getGradeBackground(course.grade)} {getGradeColor(course.grade)} font-bold">
															{course.grade}
														</span>
													</td>
													<td>
														<div class="flex items-center">
															<div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
																<div class="bg-blue-600 h-2 rounded-full" style="width: {(course.difficulty / 5) * 100}%"></div>
															</div>
															<span class="text-sm">{course.difficulty}/5</span>
														</div>
													</td>
													<td>
														<div class="flex items-center">
															<div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
																<div class="bg-green-600 h-2 rounded-full" style="width: {(course.enjoyment === true ? 4 : 1) / 5 * 100}%"></div>
															</div>
															<span class="text-sm">{course.enjoyment === true ? '4' : '1'}/5</span>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-12">
					<div class="text-6xl mb-4">📚</div>
					<h3 class="text-2xl font-bold text-gray-600 mb-2">No Previous Semesters</h3>
					<p class="text-gray-500">You haven't completed any courses yet. Your performance will appear here once you finish your first semester.</p>
				</div>
			{/if}
		{:else}
			<div class="text-center py-12">
				<div class="text-6xl mb-4">❌</div>
				<h3 class="text-2xl font-bold text-gray-600 mb-2">No Performance Data</h3>
				<p class="text-gray-500">Unable to load your academic performance data.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	section {
		min-height: 100vh;
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
	}
</style>
