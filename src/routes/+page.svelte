<script>
	import { onMount } from 'svelte';
	import { getStudentId } from '$lib/auth.js';
	
	
	/** @type {{name?: string, id?: string, major?: string, studentScore?: number} | null} */
	let studentData = null;
	let loading = false;
	/** @type {string | null} */
	let error = null;
	let hasLoaded = false;

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
			console.log("Loading student data for student ID: ", studentId);
			const response = await fetch(`/api/students/${studentId}`);
			const data = await response.json();
			console.log("DATA: ");
			console.log(data);
			
			if (response.ok) {
				let student_props = data.studentData.s.properties;
				studentData = {
					name: student_props.name,
					id: student_props.id,
					// may not exist
					major: student_props?.major,
					studentScore: student_props?.studentScore,
				}
			} else {
				error = data.error || 'Failed to fetch student data';
				studentData = null;
			}
		} catch (/** @type {unknown} */ err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
			studentData = null;
		} finally {
			loading = false;
			hasLoaded = true;
		}
	}

	// Note: Data loading is handled in onMount
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	
	<!-- Student Count Display -->
	<div class="card w-96 bg-base-100 shadow-xl mb-8">
		<div class="card-body">
			{#if loading}
				<div class="flex items-center justify-center">
					<span class="loading loading-spinner loading-md"></span>
					<span class="ml-2">Loading student count...</span>
				</div>
			{:else if error}
				<div class="alert alert-error">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>{error}</span>
				</div>
			{:else if studentData}
				<div class="text-center">
					<div class="text-6xl font-bold text-green-600 mb-2">{studentData.name || 'Unknown Student'}</div>
					{#if studentData.major}
						<p class="text-md text-gray-500">Major: {studentData.major}</p>
					{/if}
					{#if studentData.studentScore !== undefined}
						<p class="text-md text-gray-500">Score: {studentData.studentScore}</p>
					{/if}
				</div>
			{:else}
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-500 mb-2">No Student Data</div>
					<p class="text-lg text-gray-400">Unable to load student information</p>
				</div>
			{/if}
		</div>
	</div>

</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 1;
	}

</style>
