<script>
  import { onMount } from 'svelte';
  import { webVitals } from '$lib/vitals';
  import { browser } from '$app/env';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { clearStudentId, getStudentId, isLoggedIn } from '$lib/auth.js';
  import { clearAllData } from '$lib/dataStore.js';
  import '../app.css';


  let analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  let sidebarOpen = false;
  let sidebarMinimized = false;
  let isAuthenticated = false;
  let currentStudentId = '';
  let authChecked = false;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  function toggleSidebarMinimized() {
    sidebarMinimized = !sidebarMinimized;
    if (sidebarMinimized) {
      sidebarOpen = false;
    }
  }

  function handleLogout() {
    clearStudentId();
    clearAllData(); // Clear all cached data on logout
    isAuthenticated = false;
    currentStudentId = '';
    goto('/login');
  }

  onMount(() => {
    // Check authentication status
    if (browser) {
      checkAuth();
    }
  });

  function checkAuth() {
    const loggedIn = isLoggedIn();
    const studentId = getStudentId() || '';
    
    isAuthenticated = loggedIn;
    currentStudentId = studentId;
    authChecked = true;

    // Redirect to login if not authenticated and not already on login page
    if (!loggedIn && $page.url.pathname !== '/login') {
      goto('/login');
    }
  }

  // Re-check authentication when the page changes (but only if we're not already on login)
  $: if (browser && authChecked && $page.url.pathname !== '/login') {
    // Only re-check if we're not already authenticated
    if (!isAuthenticated) {
      checkAuth();
    }
  }

  $: if (browser && analyticsId) {
    webVitals({
      path: $page.url.pathname,
      params: $page.params,
      analyticsId
    })
  }
</script>

{#if !authChecked}
  <div class="auth-loading">
    <div class="loading-spinner"></div>
    <p>Loading...</p>
  </div>
{:else if isAuthenticated}
  <div class="layout" class:sidebar-open={sidebarOpen} class:sidebar-minimized={sidebarMinimized}>
    <!-- Sidebar -->
    <aside class="sidebar" class:open={sidebarOpen} class:minimized={sidebarMinimized}>
      <div class="sidebar-header">
        <h2 class:minimized={sidebarMinimized}>Navigation</h2>
        <div class="sidebar-controls">
          <button class="minimize-btn" on:click={toggleSidebarMinimized} aria-label="Minimize sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          <button class="close-btn" on:click={closeSidebar} aria-label="Close sidebar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <nav class="sidebar-nav">
        <ul>
        <li class:active={$page.url.pathname === '/'}>
          <a href="/" on:click={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span class:minimized={sidebarMinimized}>Home</span>
          </a>
        </li>
        <li class:active={$page.url.pathname === '/performance'}>
          <a href="/performance" on:click={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <span class:minimized={sidebarMinimized}>Academic Performance</span>
          </a>
        </li>
        <li class:active={$page.url.pathname === '/studying'}>
          <a href="/studying" on:click={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <span class:minimized={sidebarMinimized}>Studying Habits</span>
          </a>
        </li>
        <li class:active={$page.url.pathname === '/graduation'}>
          <a href="/graduation" on:click={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span class:minimized={sidebarMinimized}>Graduation</span>
          </a>
        </li>
        </ul>
      </nav>
    </aside>

    <!-- Overlay for mobile -->
  {#if sidebarOpen}
    <div class="sidebar-overlay" on:click={closeSidebar} on:keydown={(e) => e.key === 'Enter' && closeSidebar()} tabindex="0" role="button" aria-label="Close sidebar"></div>
  {/if}

    <!-- Main content area -->
    <div class="main-content" class:sidebar-minimized={sidebarMinimized}>
      <header class="top-header">
        <div class="header-left">
          {#if sidebarMinimized}
            <button class="expand-btn" on:click={toggleSidebarMinimized} aria-label="Expand sidebar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          {:else}
            <button class="menu-btn" on:click={toggleSidebar} aria-label="Open sidebar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          {/if}
          <h1><img src="/StudyCompassLogo.png" alt="StudyCompass" class="header-logo" /> StudyCompass</h1>
        </div>
        {#if isAuthenticated && currentStudentId}
          <div class="header-right">
            <span class="student-info">Student: {currentStudentId}</span>
            <button class="logout-btn" on:click={handleLogout} aria-label="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        {/if}
      </header>

      <main>
        <slot />
      </main>
    </div>
  </div>
{:else if $page.url.pathname === '/login'}
  <!-- Login page without navigation - full screen -->
  <div class="login-layout">
    <slot />
  </div>
{/if}

<style>
	.auth-loading {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.auth-loading .loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.auth-loading p {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0;
	}

	.layout {
		display: flex;
		min-height: 100vh;
		position: relative;
	}

	.sidebar {
		position: fixed;
		top: 0;
		left: -300px;
		width: 300px;
		height: 100vh;
		background: var(--color-bg-2, #f8f9fa);
		border-right: 1px solid var(--color-border, #e9ecef);
		transition: left 0.3s ease, width 0.3s ease;
		z-index: 1002; /* Higher than header */
		overflow-y: auto;
	}

	.sidebar.open {
		left: 0;
	}

	/* When sidebar is open, adjust header position */
	.layout.sidebar-open .top-header {
		left: 300px;
	}

	.sidebar.minimized {
		left: 0;
		width: 60px;
	}

	/* When sidebar is minimized, adjust header position */
	.layout.sidebar-minimized .top-header {
		left: 60px;
	}

	.sidebar.minimized .sidebar-header h2.minimized {
		display: none;
	}

	.sidebar.minimized .sidebar-nav span.minimized {
		display: none;
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border, #e9ecef);
		background: var(--color-bg-1, #ffffff);
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text, #333);
		transition: opacity 0.3s ease;
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.minimize-btn, .close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.25rem;
		color: var(--color-text, #333);
		transition: background-color 0.2s;
	}

	.minimize-btn:hover, .close-btn:hover {
		background-color: var(--color-bg-2, #f8f9fa);
	}

	.sidebar.minimized .close-btn {
		display: none;
	}

	.sidebar-nav {
		padding: 1rem 0;
	}

	.sidebar-nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.sidebar-nav li {
		margin: 0;
		height: 3rem; /* Fixed height to match navigation links */
		min-height: 3rem;
	}

	.sidebar-nav a {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		color: var(--color-text, #333);
		text-decoration: none;
		transition: background-color 0.2s, color 0.2s;
		border-left: 3px solid transparent;
		white-space: nowrap;
		overflow: hidden;
		height: 3rem; /* Fixed height to prevent icon shifting */
		min-height: 3rem;
	}

	.sidebar-nav a svg {
		flex-shrink: 0;
	}

	.sidebar-nav a span {
		transition: opacity 0.3s ease;
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-nav a:hover {
		background-color: var(--color-bg-2, #f8f9fa);
		color: #5e81ac;
	}

	.sidebar-nav li.active a {
		background-color: #5e81ac;
		color: white;
		border-left-color: var(--color-text, #333);
	}

	.sidebar-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-left: 0;
		margin-top: 80px; /* Account for fixed header height */
		transition: margin-left 0.3s ease;
	}

	/* Adjust main content when sidebar is open */
	.layout.sidebar-open .main-content {
		margin-left: 300px;
	}

	/* Adjust main content when sidebar is minimized */
	.layout.sidebar-minimized .main-content {
		margin-left: 60px;
	}


	.top-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1001;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--color-bg-1, #ffffff);
		border-bottom: 1px solid var(--color-border, #e9ecef);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.student-info {
		font-size: 0.875rem;
		color: var(--color-text, #333);
		background: var(--color-bg-2, #f8f9fa);
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		font-weight: 500;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, transform 0.2s;
	}

	.logout-btn:hover {
		background: #b91c1c;
		transform: translateY(-1px);
	}

	.menu-btn, .expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		margin-right: 1rem;
		border-radius: 0.25rem;
		color: var(--color-text, #333);
		transition: background-color 0.2s;
	}

	.menu-btn:hover, .expand-btn:hover {
		background-color: var(--color-bg-2, #f8f9fa);
	}

	.top-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text, #333);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-logo {
		height: 1.5rem;
		width: auto;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 2rem;
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		box-sizing: border-box;
		height: calc(100vh - 80px); /* Full height minus header */
		overflow-y: auto;
		background: 
			radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
			radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
			linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		background-attachment: fixed;
		position: relative;
	}


	main > * {
		position: relative;
		z-index: 1;
	}

	.login-layout {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 40px;
		background: var(--color-bg-1, #ffffff);
		border-top: 1px solid var(--color-border, #e9ecef);
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 768px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			width: 250px;
			height: 100vh;
		}

		.sidebar.open {
			left: 0;
		}

		.sidebar.minimized {
			width: 60px;
		}

		/* Desktop: sidebar is always visible, so adjust header and main content */
		.top-header {
			left: 250px;
		}

		.layout.sidebar-minimized .top-header {
			left: 60px;
		}

		.main-content {
			margin-left: 250px;
		}

		.layout.sidebar-minimized .main-content {
			margin-left: 60px;
		}

		.sidebar-overlay {
			display: none;
		}

		.menu-btn, .expand-btn {
			display: none;
		}

		.close-btn {
			display: none;
		}
	}

	@media (min-width: 480px) {
		footer {
			padding: 40px 0;
		}
	}
</style>
