<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setStudentId, isLoggedIn, validateStudent, getStudentId } from '$lib/auth.js';
	import { clearAllData, forceRefreshData } from '$lib/dataStore.js';


	let studentId = '';
	let loading = false;
	let error = '';

	// Redirect if already logged in
	onMount(() => {
		if (isLoggedIn()) {
			goto('/');
		}
	});

	async function handleLogin(/** @type {Event} */ event) {
		event.preventDefault();
		loading = true;
		error = '';

		if (!studentId.trim()) {
			error = 'Please enter a student ID';
			loading = false;
			return;
		}

		try {
			// Validate the student ID by checking if it exists in the database
			console.log('Validating student ID:', studentId.trim());
			const validation = await validateStudent(studentId.trim());
			console.log('Validation result:', validation);

			if (validation.exists) {
				// Check if this is a different student than currently logged in
				const currentStudentId = getStudentId();
				const newStudentId = studentId.trim();
				
				if (currentStudentId && currentStudentId !== newStudentId) {
					// Different student, clear all cached data
					console.log('Different student detected, clearing cached data');
					clearAllData();
				}
				
				// Student exists, set cookie and redirect
				console.log('Student found, logging in:', validation.studentData);
				setStudentId(newStudentId);
				
				// Force refresh data for the new student
				await forceRefreshData(newStudentId);
				
				goto('/');
			} else {
				// Student not found or validation error
				error = validation.error || 'Student ID not found. Please check your ID and try again.';
				console.log('Student validation failed:', validation.error);
			}
		} catch (err) {
			console.error('Login error:', err);
			error = 'An unexpected error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - StudyCompass</title>
	<meta name="description" content="Login to access student dashboard" />
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1>🎓 StudyCompass</h1>
			<p class="login-subtitle">Student Login</p>
		</div>

		<form on:submit={handleLogin} class="login-form">
			<div class="form-group">
				<label for="studentId" class="form-label">Student ID</label>
				<input
					id="studentId"
					type="text"
					bind:value={studentId}
					placeholder="Enter your student ID"
					class="form-input"
					disabled={loading}
					required
				/>
			</div>

			{#if error}
				<div class="error-message">
					<svg xmlns="http://www.w3.org/2000/svg" class="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			{/if}

			<button type="submit" class="login-button" disabled={loading}>
				{#if loading}
					<span class="loading-spinner"></span>
					Logging in...
				{:else}
					Login
				{/if}
			</button>
		</form>

		<div class="login-footer">
			<p>Enter your student ID to access your dashboard</p>
		</div>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 1rem;
	}

	.login-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		padding: 2rem;
		width: 100%;
		max-width: 400px;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.login-subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-input {
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input:disabled {
		background-color: #f9fafb;
		cursor: not-allowed;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.error-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.login-button {
		background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
		color: white;
		border: none;
		padding: 0.875rem 1.5rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.login-button:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
		transform: translateY(-1px);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.login-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.login-footer {
		text-align: center;
		margin-top: 1.5rem;
	}

	.login-footer p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	@media (max-width: 480px) {
		.login-container {
			padding: 0.5rem;
		}

		.login-card {
			padding: 1.5rem;
		}

		.login-header h1 {
			font-size: 1.75rem;
		}
	}
</style>
