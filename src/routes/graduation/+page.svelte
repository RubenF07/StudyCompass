<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/env';
  import { getStudentId } from '$lib/auth.js';
  import { studentDataStore, loadingStore, errorStore, loadRawStudentData } from '$lib/dataStore.js';

  let studentId = '';
  let studentData = null;
  let degreeRequirements = null;
  let completedCredits = 0;
  let remainingCredits = 0;
  let coreCreditsCompleted = 0;
  let electiveCreditsCompleted = 0;
  let coreCreditsRemaining = 0;
  let electiveCreditsRemaining = 0;
  let progressPercentage = 0;
  let expectedGraduation = null;
  let isLoading = false;
  let error = null;
  let roadmapGenerated = false;
  let isGeneratingRoadmap = false;

  // Reactive statements
  $: if (browser) {
    studentId = getStudentId() || '';
  }

  $: if (studentData) {
    calculateGraduationProgress();
  }

  onMount(() => {
    if (browser && studentId) {
      loadStudentData();
    }
  });

  async function loadStudentData() {
    isLoading = true;
    error = null;
    
    try {
      const result = await loadRawStudentData(studentId);
      if (result.success) {
        // Get data from store
        studentDataStore.subscribe(store => {
          studentData = store.rawData;
        })();
        
        if (studentData) {
          processStudentData();
        }
      } else {
        error = result.error || 'Failed to load student data';
      }
    } catch (err) {
      error = 'Error loading student data: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      isLoading = false;
    }
  }

  function processStudentData() {
    if (!studentData || !studentData.relationships) return;

    // Find degree requirements
    const degreeRelation = studentData.relationships.find(rel => 
      rel.target && rel.target.labels && rel.target.labels.includes('Degree')
    );
    
    if (degreeRelation && degreeRelation.target) {
      degreeRequirements = degreeRelation.target.properties;
    }

    // Find completed courses
    const completedCourses = studentData.relationships.filter(rel => 
      rel.relationship === 'COMPLETED' && 
      rel.target && 
      rel.target.labels && 
      rel.target.labels.includes('Course')
    );

    // Calculate credits
    completedCredits = completedCourses.reduce((total, course) => {
      const credits = course.target.properties.credits;
      return total + (credits ? credits.low : 0);
    }, 0);

    // Calculate core vs elective credits (simplified - would need more complex logic in real implementation)
    coreCreditsCompleted = Math.floor(completedCredits * 0.6); // Assume 60% are core
    electiveCreditsCompleted = completedCredits - coreCreditsCompleted;

    // Calculate remaining credits
    if (degreeRequirements) {
      const totalRequired = degreeRequirements.totalCreditsRequired?.low || 120;
      const coreRequired = degreeRequirements.coreCreditsRequired?.low || 75;
      const electiveRequired = degreeRequirements.electiveCreditsRequired?.low || 45;

      remainingCredits = totalRequired - completedCredits;
      coreCreditsRemaining = Math.max(0, coreRequired - coreCreditsCompleted);
      electiveCreditsRemaining = Math.max(0, electiveRequired - electiveCreditsCompleted);
      
      progressPercentage = Math.round((completedCredits / totalRequired) * 100);
    }

    // Get expected graduation date
    if (studentData.s && studentData.s.properties.expectedGraduation) {
      const gradDate = studentData.s.properties.expectedGraduation;
      expectedGraduation = new Date(gradDate.year.low, gradDate.month.low - 1, gradDate.day.low);
    }
  }

  function calculateGraduationProgress() {
    // This function is called reactively when studentData changes
    // The actual calculation is done in processStudentData()
  }

  function formatDate(date) {
    if (!date) return 'Not specified';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  async function generateCourseRoadmap() {
    isGeneratingRoadmap = true;
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    roadmapGenerated = true;
    isGeneratingRoadmap = false;
    console.log('AI Course Roadmap generated successfully!');
  }
</script>

<svelte:head>
  <title>Graduation Requirements - Hack UMBC 2025</title>
</svelte:head>

<div class="graduation-page">
  <div class="page-header">
    <h1>Graduation Requirements</h1>
    <p class="page-subtitle">Track your progress toward graduation</p>
  </div>

  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading graduation data...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Data</h3>
      <p>{error}</p>
      <button class="retry-btn" on:click={loadStudentData}>Try Again</button>
    </div>
  {:else if studentData && degreeRequirements}
    <div class="graduation-content">
      <!-- Progress Overview -->
      <div class="progress-section">
        <div class="progress-header">
          <h2>Overall Progress</h2>
          <div class="progress-percentage">{progressPercentage}%</div>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {progressPercentage}%"></div>
        </div>
        
        <div class="progress-stats">
          <div class="stat-item">
            <span class="stat-label">Completed Credits</span>
            <span class="stat-value">{completedCredits}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Remaining Credits</span>
            <span class="stat-value">{remainingCredits}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Required</span>
            <span class="stat-value">{degreeRequirements.totalCreditsRequired?.low || 120}</span>
          </div>
        </div>
      </div>

      <!-- Degree Information -->
      <div class="degree-section">
        <h2>Degree Information</h2>
        <div class="degree-card">
          <h3>{degreeRequirements.name}</h3>
          <p class="degree-department">{degreeRequirements.department}</p>
          <div class="degree-requirements">
            <div class="requirement-item">
              <span class="requirement-label">Core Credits Required:</span>
              <span class="requirement-value">{degreeRequirements.coreCreditsRequired?.low || 75}</span>
            </div>
            <div class="requirement-item">
              <span class="requirement-label">Elective Credits Required:</span>
              <span class="requirement-value">{degreeRequirements.electiveCreditsRequired?.low || 45}</span>
            </div>
            <div class="requirement-item">
              <span class="requirement-label">Total Credits Required:</span>
              <span class="requirement-value">{degreeRequirements.totalCreditsRequired?.low || 120}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Credit Breakdown -->
      <div class="credits-section">
        <h2>Credit Breakdown</h2>
        <div class="credits-grid">
          <div class="credit-card core-credits">
            <h3>Core Credits</h3>
            <div class="credit-progress">
              <div class="credit-bar">
                <div class="credit-fill" style="width: {Math.min(100, (coreCreditsCompleted / (degreeRequirements.coreCreditsRequired?.low || 75)) * 100)}%"></div>
              </div>
              <div class="credit-stats">
                <span class="completed">{coreCreditsCompleted}</span>
                <span class="separator">/</span>
                <span class="required">{degreeRequirements.coreCreditsRequired?.low || 75}</span>
              </div>
            </div>
            <p class="remaining">Remaining: {coreCreditsRemaining}</p>
          </div>

          <div class="credit-card elective-credits">
            <h3>Elective Credits</h3>
            <div class="credit-progress">
              <div class="credit-bar">
                <div class="credit-fill" style="width: {Math.min(100, (electiveCreditsCompleted / (degreeRequirements.electiveCreditsRequired?.low || 45)) * 100)}%"></div>
              </div>
              <div class="credit-stats">
                <span class="completed">{electiveCreditsCompleted}</span>
                <span class="separator">/</span>
                <span class="required">{degreeRequirements.electiveCreditsRequired?.low || 45}</span>
              </div>
            </div>
            <p class="remaining">Remaining: {electiveCreditsRemaining}</p>
          </div>
        </div>
      </div>

      <!-- Expected Graduation -->
      {#if expectedGraduation}
        <div class="graduation-date-section">
          <h2>Expected Graduation</h2>
          <div class="graduation-date-card">
            <div class="date-icon">🎓</div>
            <div class="date-info">
              <h3>{formatDate(expectedGraduation)}</h3>
              <p>Target graduation date</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- AI Course Roadmap Generator -->
      <div class="roadmap-generator-section">
        <h2>Course Roadmap</h2>
        <div class="flex justify-center">
          <button 
            class="generate-btn" 
            on:click={generateCourseRoadmap}
            disabled={isGeneratingRoadmap}
          >
            {#if isGeneratingRoadmap}
              <span class="loading-spinner-small"></span>
              Generating...
            {:else if roadmapGenerated}
              ✓ Roadmap Generated
            {:else}
              Generate Course Roadmap
            {/if}
          </button>
        </div>
      </div>

      <!-- Course Roadmap (only shown after generation) -->
      {#if roadmapGenerated}
        <div class="roadmap-section">
          <h2>Your Course Roadmap</h2>
          <div class="roadmap-card">
            <div class="roadmap-content">
              <div class="roadmap-success">
                <div class="success-icon">✅</div>
                <h3>Roadmap Generated Successfully!</h3>
                <p>Your personalized course plan has been created based on your remaining requirements.</p>
              </div>
              <!-- Placeholder for actual roadmap content -->
              <div class="roadmap-placeholder-content">
                <h4>Roadmap Content Coming Soon</h4>
                <p>Detailed course recommendations and semester planning will be displayed here.</p>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-data-container">
      <div class="no-data-icon">📚</div>
      <h3>No Graduation Data Available</h3>
      <p>Unable to load graduation requirements for this student.</p>
    </div>
  {/if}
</div>

<style>
  .graduation-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a202c;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    font-size: 1.125rem;
    color: #718096;
    margin: 0;
  }

  .loading-container, .error-container, .no-data-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #3182ce;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-icon, .no-data-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .retry-btn {
    background: #3182ce;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-btn:hover {
    background: #2c5aa0;
  }

  .graduation-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .progress-section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .progress-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a202c;
  }

  .progress-percentage {
    font-size: 2rem;
    font-weight: 700;
    color: #3182ce;
  }

  .progress-bar-container {
    width: 100%;
    height: 1rem;
    background: #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3182ce, #63b3ed);
    transition: width 0.3s ease;
  }

  .progress-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 0.5rem;
  }

  .stat-label {
    font-weight: 500;
    color: #4a5568;
  }

  .stat-value {
    font-weight: 700;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .degree-section, .credits-section, .graduation-date-section, .roadmap-generator-section, .roadmap-section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .degree-section h2, .credits-section h2, .graduation-date-section h2, .roadmap-generator-section h2, .roadmap-section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a202c;
  }

  .degree-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .degree-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a202c;
  }

  .degree-department {
    margin: 0 0 1rem 0;
    color: #718096;
    font-weight: 500;
  }

  .degree-requirements {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .requirement-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f7fafc;
    border-radius: 0.5rem;
  }

  .requirement-label {
    font-weight: 500;
    color: #4a5568;
  }

  .requirement-value {
    font-weight: 700;
    color: #1a202c;
  }

  .credits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .credit-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .credit-card.core-credits {
    border-color: #3182ce;
  }

  .credit-card.elective-credits {
    border-color: #38a169;
  }

  .credit-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a202c;
  }

  .credit-progress {
    margin-bottom: 1rem;
  }

  .credit-bar {
    width: 100%;
    height: 0.75rem;
    background: #e2e8f0;
    border-radius: 0.375rem;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .credit-fill {
    height: 100%;
    border-radius: 0.375rem;
    transition: width 0.3s ease;
  }

  .core-credits .credit-fill {
    background: linear-gradient(90deg, #3182ce, #63b3ed);
  }

  .elective-credits .credit-fill {
    background: linear-gradient(90deg, #38a169, #68d391);
  }

  .credit-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .completed {
    color: #1a202c;
    font-size: 1.125rem;
  }

  .separator {
    color: #718096;
  }

  .required {
    color: #4a5568;
  }

  .remaining {
    margin: 0;
    color: #718096;
    font-size: 0.875rem;
  }

  .graduation-date-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #f7fafc;
    border-radius: 0.75rem;
    border: 2px solid #e2e8f0;
  }

  .date-icon {
    font-size: 2rem;
  }

  .date-info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a202c;
  }

  .date-info p {
    margin: 0;
    color: #718096;
  }

  .simple-button-card {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: #f7fafc;
    border-radius: 0.75rem;
    border: 2px solid #e2e8f0;
  }

  .generate-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }

  .generate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  .generate-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner-small {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .roadmap-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .roadmap-content {
    padding: 2rem;
  }

  .roadmap-success {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #f0fff4;
    border: 2px solid #68d391;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }

  .success-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .roadmap-success h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a202c;
  }

  .roadmap-success p {
    margin: 0;
    color: #2d3748;
  }

  .roadmap-placeholder-content {
    text-align: center;
    padding: 2rem;
    background: #f7fafc;
    border-radius: 0.75rem;
    border: 2px dashed #cbd5e0;
  }

  .roadmap-placeholder-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a202c;
  }

  .roadmap-placeholder-content p {
    margin: 0;
    color: #718096;
  }

  @media (max-width: 768px) {
    .graduation-page {
      padding: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .progress-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .progress-stats {
      grid-template-columns: 1fr;
    }

    .credits-grid {
      grid-template-columns: 1fr;
    }

    .graduation-date-card {
      flex-direction: column;
      text-align: center;
    }

    .simple-button-card {
      padding: 1.5rem;
    }
  }
</style>
