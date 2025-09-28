<script>
	import { onMount } from 'svelte';
	import { getStudentId } from '$lib/auth.js';
	import { goto } from '$app/navigation';
	import { studentDataStore, loadingStore, errorStore, loadRawStudentData } from '$lib/dataStore.js';
	
	
	/** @type {{name?: string, id?: string, major?: string, studentScore?: number} | null} */
	let studentData = null;
	let loading = false;
	/** @type {string | null} */
	let error = null;
	let hasLoaded = false;

	// Subscribe to stores
	$: loading = $loadingStore.rawData;
	$: error = $errorStore.rawData;
	$: {
		// Extract student data from raw data when available
		if ($studentDataStore.rawData && $studentDataStore.studentId === getStudentId()) {
			const student_props = $studentDataStore.rawData.s.properties;
			studentData = {
				name: student_props.name,
				id: student_props.id,
				major: student_props?.major,
				studentScore: student_props?.studentScore,
			};
			hasLoaded = true;
		} else if ($studentDataStore.studentId !== getStudentId()) {
			// Different student, clear data
			studentData = null;
			hasLoaded = false;
		}
	}

	onMount(async () => {
		await loadStudentData();
	});

	async function loadStudentData() {
		console.log("Loading student data");
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

		// Use the data store to load data
		const result = await loadRawStudentData(studentId);
		if (!result.success) {
			error = result.error;
			hasLoaded = true;
		}
	}

	function navigateToPage(path) {
		goto(path);
	}

	// Note: Data loading is handled in onMount
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<!-- Hero Section -->
<div class="hero-section">
	<div class="hero-content">
		{#if loading}
			<div class="loading-container">
				<div class="loading-spinner"></div>
				<p>Loading your dashboard...</p>
			</div>
		{:else if error}
			<div class="error-container">
				<div class="error-icon">⚠️</div>
				<h2>Oops! Something went wrong</h2>
				<p>{error}</p>
				<button class="retry-btn" on:click={loadStudentData}>Try Again</button>
			</div>
		{:else if studentData}
			<div class="welcome-card">
				<div class="welcome-header">
					<div class="welcome-text">
						<h1>Welcome back, {studentData.name || 'Student'}!</h1>
						{#if studentData.major}
							<p class="major-text">{studentData.major}</p>
						{/if}
						{#if studentData.studentScore !== undefined}
							<div class="score-badge">
								<span class="score-label">Academic Score</span>
								<span class="score-value">{studentData.studentScore}</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="welcome-card">
				<h1>Welcome to Your Student Dashboard</h1>
				<p>Track your academic performance and study habits</p>
			</div>
		{/if}
	</div>
</div>

<!-- Features Section -->
<div class="features-section">
	<div class="features-header">
		<h2>Explore Your Academic Journey</h2>
		<p>Discover insights and track your progress across different areas</p>
	</div>
	
	<div class="features-grid">
		<!-- Academic Performance Card -->
		<div class="feature-card performance-card" on:click={() => navigateToPage('/performance')} role="button" tabindex="0">
			<div class="card-icon performance-icon">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
				</svg>
			</div>
			<div class="card-content">
				<h3>Academic Performance</h3>
				<p>Track your grades, analyze trends, and get insights into your academic progress over time.</p>
				<div class="card-features">
					<span class="feature-tag">📊 Analytics</span>
					<span class="feature-tag">📈 Trends</span>
					<span class="feature-tag">🎯 Goals</span>
				</div>
			</div>
			<div class="card-arrow">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6"/>
				</svg>
			</div>
		</div>

		<!-- Study Habits Card -->
		<div class="feature-card study-card" on:click={() => navigateToPage('/studying')} role="button" tabindex="0">
			<div class="card-icon study-icon">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
					<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
				</svg>
			</div>
			<div class="card-content">
				<h3>Study Habits</h3>
				<p>Analyze your study patterns, track study time, and get personalized recommendations for better learning.</p>
				<div class="card-features">
					<span class="feature-tag">⏰ Time Tracking</span>
					<span class="feature-tag">📚 Patterns</span>
					<span class="feature-tag">💡 Tips</span>
				</div>
			</div>
			<div class="card-arrow">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6"/>
				</svg>
			</div>
		</div>

		
	</div>
</div>

<style>
	/* Hero Section */
	.hero-section {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 3rem 1rem;
		margin: -1rem -1rem 2rem -1rem;
		color: white;
		position: relative;
		overflow: hidden;
	}

	.hero-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
		opacity: 0.3;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 1200px;
		margin: 0 auto;
	}

	.loading-container, .error-container {
		text-align: center;
		padding: 2rem;
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-container {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		backdrop-filter: blur(10px);
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.retry-btn {
		background: white;
		color: #667eea;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s;
		margin-top: 1rem;
	}

	.retry-btn:hover {
		transform: translateY(-2px);
	}

	.welcome-card {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1.5rem;
		padding: 2rem;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.welcome-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.avatar-initial {
		color: white;
	}

	.welcome-text h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.major-text {
		font-size: 1.2rem;
		opacity: 0.9;
		margin: 0 0 1rem 0;
	}

	.score-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.5rem 1rem;
		border-radius: 2rem;
		font-size: 0.9rem;
	}

	.score-label {
		opacity: 0.8;
	}

	.score-value {
		font-weight: 700;
		font-size: 1.1rem;
	}

	/* Features Section */
	.features-section {
		padding: 3rem 0;
		width: 100%;
	}

	.features-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.features-header h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.features-header p {
		font-size: 1.2rem;
		color: #6b7280;
		margin: 0;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.feature-card {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		border: 1px solid #e5e7eb;
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.feature-card:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
	}

	.performance-card {
		border-left: 4px solid #3b82f6;
	}

	.study-card {
		border-left: 4px solid #10b981;
	}

	.stats-card {
		border-left: 4px solid #f59e0b;
	}

	.card-icon {
		width: 4rem;
		height: 4rem;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.performance-icon {
		background: linear-gradient(135deg, #3b82f6, #1d4ed8);
		color: white;
	}

	.study-icon {
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
	}

	.stats-icon {
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: white;
	}

	.card-content h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.card-content p {
		color: #6b7280;
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.card-features {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.feature-tag {
		background: #f3f4f6;
		color: #374151;
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.card-arrow {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		color: #9ca3af;
		transition: all 0.3s ease;
	}

	.feature-card:hover .card-arrow {
		color: #667eea;
		transform: translateX(4px);
	}

	.quick-stats {
		background: #f9fafb;
		border-radius: 0.75rem;
		padding: 1rem;
		margin-top: 1rem;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.stat-item:not(:last-child) {
		border-bottom: 1px solid #e5e7eb;
	}

	.stat-label {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.stat-value {
		color: #1f2937;
		font-weight: 600;
	}

	/* Call to Action Section */
	.cta-section {
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		padding: 3rem 1rem;
		margin: 2rem -1rem -1rem -1rem;
		border-radius: 1rem 1rem 0 0;
	}

	.cta-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.cta-content h3 {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.cta-content p {
		font-size: 1.1rem;
		color: #6b7280;
		margin: 0 0 2rem 0;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-primary, .btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		border: none;
		text-decoration: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px 0 rgba(102, 126, 234, 0.6);
	}

	.btn-secondary {
		background: white;
		color: #374151;
		border: 2px solid #e5e7eb;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary:hover {
		transform: translateY(-2px);
		border-color: #d1d5db;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.hero-section {
			padding: 2rem 1rem;
		}

		.welcome-header {
			flex-direction: column;
			text-align: center;
		}

		.welcome-text h1 {
			font-size: 2rem;
		}

		.features-header h2 {
			font-size: 2rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.feature-card {
			padding: 1.5rem;
		}

		.cta-buttons {
			flex-direction: column;
			align-items: center;
		}

		.btn-primary, .btn-secondary {
			width: 100%;
			max-width: 300px;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.welcome-text h1 {
			font-size: 1.75rem;
		}

		.features-header h2 {
			font-size: 1.75rem;
		}

		.feature-card {
			padding: 1rem;
		}

		.card-content h3 {
			font-size: 1.25rem;
		}
	}
</style>
