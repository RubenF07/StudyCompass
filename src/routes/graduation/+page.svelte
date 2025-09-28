<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { getStudentId } from '$lib/auth.js';
	import { studentDataStore, loadingStore, errorStore, loadRawStudentData, getCourseRoadmap, deleteCourseRoadmap } from '$lib/dataStore.js';
	import { generateGraduationRoadmap } from '$lib/geminiClient.js';

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
  let roadmap = null;
  let roadmapError = null;

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
      // Check for existing roadmap
      const existingRoadmap = getCourseRoadmap(studentId);
      if (existingRoadmap) {
        roadmap = existingRoadmap;
        roadmapGenerated = true;
        console.log('Loaded existing course roadmap from dataStore');
      }
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

  // Helper function to safely get numeric values from Neo4j properties
  function getNumericValue(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (value && typeof value === 'object' && typeof value.low === 'number') {
      return value.low;
    }
    return 0;
  }

  // Helper function to safely get string values from Neo4j properties
  function getStringValue(value) {
    if (typeof value === 'string') {
      return value;
    }
    return value || '';
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

    // Calculate credits using helper function
    completedCredits = completedCourses.reduce((total, course) => {
      const credits = course.target.properties.credits;
      return total + getNumericValue(credits);
    }, 0);

    // Calculate core vs elective credits (simplified - would need more complex logic in real implementation)
    coreCreditsCompleted = Math.floor(completedCredits * 0.6); // Assume 60% are core
    electiveCreditsCompleted = completedCredits - coreCreditsCompleted;

    // Calculate remaining credits using helper functions
    if (degreeRequirements) {
      const totalRequired = getNumericValue(degreeRequirements.totalCreditsRequired) || 120;
      const coreRequired = getNumericValue(degreeRequirements.coreCreditsRequired) || 75;
      const electiveRequired = getNumericValue(degreeRequirements.electiveCreditsRequired) || 45;

      remainingCredits = totalRequired - completedCredits;
      coreCreditsRemaining = Math.max(0, coreRequired - coreCreditsCompleted);
      electiveCreditsRemaining = Math.max(0, electiveRequired - electiveCreditsCompleted);
      
      progressPercentage = Math.round((completedCredits / totalRequired) * 100);
    }

    // Get expected graduation date - handle different date formats
    if (studentData.s && studentData.s.properties.expectedGraduation) {
      const gradDate = studentData.s.properties.expectedGraduation;
      
      // Handle string date format (e.g., "2029-10-20")
      if (typeof gradDate === 'string') {
        expectedGraduation = new Date(gradDate);
      }
      // Handle Neo4j date object format
      else if (gradDate && typeof gradDate === 'object') {
        const year = getNumericValue(gradDate.year) || new Date().getFullYear();
        const month = getNumericValue(gradDate.month) || 1;
        const day = getNumericValue(gradDate.day) || 1;
        expectedGraduation = new Date(year, month - 1, day);
      }
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
    if (!studentData) {
      roadmapError = 'No student data available for roadmap generation';
      return;
    }

    // Check if we already have a roadmap for this student
    const existingRoadmap = getCourseRoadmap(studentId);
    if (existingRoadmap) {
      roadmap = existingRoadmap;
      roadmapGenerated = true;
      console.log('Using existing course roadmap from dataStore');
      return;
    }

    isGeneratingRoadmap = true;
    roadmapError = null;
    roadmapGenerated = false;
    roadmap = null;

    try {
      console.log('Generating graduation roadmap with AI...');
      const result = await generateGraduationRoadmap(studentData);
      
      roadmap = result.roadmap;
      roadmapGenerated = true;
      // console.log('AI Course Roadmap generated successfully!', roadmap);
    } catch (err) {
      roadmapError = `Failed to generate roadmap: ${err.message}`;
      console.error('Error generating roadmap:', err);
    } finally {
      isGeneratingRoadmap = false;
    }
  }

  function deleteRoadmap() {
    if (!studentId) {
      console.warn('Cannot delete roadmap: no student ID');
      return;
    }

    // Delete from store and localStorage
    deleteCourseRoadmap(studentId);
    
    // Reset local state
    roadmap = null;
    roadmapGenerated = false;
    roadmapError = null;
    
    console.log('Roadmap deleted and reset for regeneration');
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
            <span class="stat-value">{getNumericValue(degreeRequirements.totalCreditsRequired) || 120}</span>
          </div>
        </div>
      </div>

      <!-- Degree Information & Credit Breakdown -->
      <div class="degree-credits-section">
        <h2>Degree Information & Credit Breakdown</h2>
        
        <!-- Degree Info Card -->
        <div class="degree-card">
          <h3>{degreeRequirements.name}</h3>
          <p class="degree-department">{degreeRequirements.department}</p>
        </div>

        <!-- Credit Progress Grid -->
        <div class="credits-grid">
          <div class="credit-card core-credits">
            <h3>Core Credits</h3>
            <div class="credit-progress">
              <div class="credit-bar">
                <div class="credit-fill" style="width: {Math.min(100, (coreCreditsCompleted / (getNumericValue(degreeRequirements.coreCreditsRequired) || 75)) * 100)}%"></div>
              </div>
              <div class="credit-stats">
                <span class="completed">{coreCreditsCompleted}</span>
                <span class="separator">/</span>
                <span class="required">{getNumericValue(degreeRequirements.coreCreditsRequired) || 75}</span>
              </div>
            </div>
            <p class="remaining">Remaining: {coreCreditsRemaining}</p>
          </div>

          <div class="credit-card elective-credits">
            <h3>Elective Credits</h3>
            <div class="credit-progress">
              <div class="credit-bar">
                <div class="credit-fill" style="width: {Math.min(100, (electiveCreditsCompleted / (getNumericValue(degreeRequirements.electiveCreditsRequired) || 45)) * 100)}%"></div>
              </div>
              <div class="credit-stats">
                <span class="completed">{electiveCreditsCompleted}</span>
                <span class="separator">/</span>
                <span class="required">{getNumericValue(degreeRequirements.electiveCreditsRequired) || 45}</span>
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
            <div class="date-icon scale-120">🎓</div>
            <div class="date-info">
              <h3>{formatDate(expectedGraduation)}</h3>
            </div>
          </div>
        </div>
      {/if}

      <!-- AI Course Roadmap Generator -->
      <div class="roadmap-generator-section">
        <h2>Course Roadmap</h2>
        <div class="text-center">
          <button 
            class="btn btn-primary analyze-button {roadmapGenerated ? 'btn-disabled' : ''}" 
            on:click={generateCourseRoadmap}
            disabled={isGeneratingRoadmap || roadmapGenerated}
          >
            {#if isGeneratingRoadmap}
              <span class="loading loading-spinner loading-sm"></span>
              Generating...
            {:else if roadmapGenerated}
              ✓ Roadmap Generated
            {:else}
              Generate Course Roadmap
            {/if}
          </button>
        </div>
        
        <!-- Generated Roadmap Content -->
        {#if roadmapError}
          <div class="roadmap-error">
            <div class="error-icon">⚠️</div>
            <h3>Roadmap Generation Failed</h3>
            <p>{roadmapError}</p>
            <button class="retry-btn" on:click={generateCourseRoadmap}>Try Again</button>
          </div>
        {:else if roadmapGenerated && roadmap}
          <div class="roadmap-content">
            <!-- <div class="roadmap-success">
              <div class="success-icon">✅</div>
              <h3>Roadmap Generated Successfully!</h3>
              <p>Your personalized course plan has been created based on your remaining requirements.</p>
            </div>
            
            <!-- Roadmap Overview -->
            {#if roadmap.roadmapOverview}
              <div class="roadmap-overview">
                <h3>Graduation Overview</h3>
                <div class="overview-grid">
                  <div class="overview-item">
                    <span class="overview-label">Expected Graduation:</span>
                    <span class="overview-value">{roadmap.roadmapOverview.expectedGraduationTerm}</span>
                  </div>
                  <div class="overview-item">
                    <span class="overview-label">Remaining Credits:</span>
                    <span class="overview-value">{roadmap.roadmapOverview.totalRemainingCredits}</span>
                  </div>
                  <div class="overview-item">
                    <span class="overview-label">Terms Remaining:</span>
                    <span class="overview-value">{roadmap.roadmapOverview.estimatedTermsRemaining}</span>
                  </div>
                </div>
                <div class="confidence-note">
                  <strong>Confidence:</strong> {roadmap.roadmapOverview.graduationConfidence}
                </div>
              </div>
            {/if}

            <!-- Semester Plan -->
            {#if roadmap.semesterPlan && roadmap.semesterPlan.length > 0}
              <div class="semester-plan">
                <h3>Semester-by-Semester Plan</h3>
                <div class="semester-list">
                  {#each roadmap.semesterPlan as semester}
                    <div class="semester-card">
                      <div class="semester-header">
                        <h4>{semester.term}</h4>
                        <div class="semester-credits">{semester.totalCredits} credits</div>
                      </div>
                      
                      <div class="workload-assessment">
                        <strong>Workload:</strong> {semester.workloadAssessment}
                      </div>

                      <!-- Courses for this semester -->
                      <div class="courses-list">
                        <h5>Courses:</h5>
                        {#each semester.courses as course}
                          <div class="course-item {course.type}">
                            <div class="course-header">
                              <span class="course-code">{course.courseCode}</span>
                              <span class="course-credits">{course.credits} credits</span>
                              <span class="course-difficulty {course.difficulty}">{course.difficulty}</span>
                              <span class="course-priority {course.priority}">{course.priority}</span>
                            </div>
                            <div class="course-name">{course.courseName}</div>
                            <div class="course-reasoning">{course.reasoning}</div>
                            {#if course.prerequisites && course.prerequisites.length > 0}
                              <div class="course-prerequisites">
                                <strong>Prerequisites:</strong> {course.prerequisites.join(', ')}
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>

                      <!-- Key Milestones -->
                      {#if semester.keyMilestones && semester.keyMilestones.length > 0}
                        <div class="milestones">
                          <h5><strong>Key Milestones:</strong></h5>
                          <ul>
                            {#each semester.keyMilestones as milestone}
                              <li><strong>{milestone}</strong></li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Prerequisite Mapping -->
            {#if roadmap.prerequisiteMapping}
              <div class="prerequisite-mapping">
                <h3>Prerequisite Analysis</h3>
                <div class="prereq-grid">
                  <div class="prereq-section completed-section">
                    <h4>Completed</h4>
                    <div class="prereq-list">
                      {#each roadmap.prerequisiteMapping.completedPrerequisites as prereq}
                        <div class="prereq-item completed-prereq">
                          <span class="prereq-icon">✓</span>
                          <span class="prereq-text">{prereq}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                  <div class="prereq-section pending-section">
                    <h4>Pending</h4>
                    <div class="prereq-list">
                      {#each roadmap.prerequisiteMapping.pendingPrerequisites as prereq}
                        <div class="prereq-item pending-prereq">
                          <span class="prereq-icon">⏳</span>
                          <span class="prereq-text">{prereq}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
                {#if roadmap.prerequisiteMapping.prerequisiteConflicts && roadmap.prerequisiteMapping.prerequisiteConflicts.length > 0}
                  <div class="conflicts">
                    <h4>⚠️ Potential Conflicts</h4>
                    <div class="conflict-list">
                      {#each roadmap.prerequisiteMapping.prerequisiteConflicts as conflict}
                        <div class="conflict-item">
                          <span class="conflict-icon">⚠️</span>
                          <span class="conflict-text">{conflict}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Graduation Strategy -->
            {#if roadmap.graduationStrategy}
              <div class="graduation-strategy">
                <h3>Graduation Strategy</h3>
                <div class="strategy-grid">
                  <div class="strategy-item">
                    <h4>Core Course Strategy</h4>
                    <p>{roadmap.graduationStrategy.coreCourseStrategy}</p>
                  </div>
                  <div class="strategy-item">
                    <h4>Elective Strategy</h4>
                    <p>{roadmap.graduationStrategy.electiveStrategy}</p>
                  </div>
                  <div class="strategy-item">
                    <h4>Credit Optimization</h4>
                    <p>{roadmap.graduationStrategy.creditOptimization}</p>
                  </div>
                </div>
                {#if roadmap.graduationStrategy.riskMitigation && roadmap.graduationStrategy.riskMitigation.length > 0}
                  <div class="risk-mitigation">
                    <h4><strong>Risk Mitigation</strong></h4>
                    <ul>
                      {#each roadmap.graduationStrategy.riskMitigation as risk}
                        <li><strong>{risk}</strong></li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Alternative Paths -->
            {#if roadmap.alternativePaths && roadmap.alternativePaths.length > 0}
              <div class="alternative-paths">
                <h3>Alternative Paths</h3>
                <div class="alternatives-list">
                  {#each roadmap.alternativePaths as alternative}
                    <div class="alternative-card">
                      <h4>{alternative.scenario}</h4>
                      <p>{alternative.description}</p>
                      <div class="alternative-timeline">
                        <strong>Timeline Impact:</strong> {alternative.timeline}
                      </div>
                      {#if alternative.requirements && alternative.requirements.length > 0}
                        <div class="alternative-requirements">
                          <strong>Requirements:</strong>
                          <ul>
                            {#each alternative.requirements as req}
                              <li><strong>{req}</strong></li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Delete Roadmap Button -->
            <div class="roadmap-delete-section">
              <button 
                class="btn btn-error delete-roadmap-btn" 
                on:click={deleteRoadmap}
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Delete Roadmap
              </button>
            </div>

          </div>
        {/if}
      </div>

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
    width: 100%;
    padding: 0;
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


  @keyframes spin {
    to { transform: rotate(360deg); }
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
    width: 100%;
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

  .degree-credits-section, .graduation-date-section, .roadmap-generator-section, .roadmap-section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .degree-credits-section h2, .graduation-date-section h2, .roadmap-generator-section h2, .roadmap-section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a202c;
  }

  .degree-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
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
    margin-bottom: 1.5rem;
  }

  .requirements-summary {
    background: #f7fafc;
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
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




  .roadmap-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .roadmap-content {
    margin-top: 2rem;
    padding: 0;
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

  .roadmap-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: #fef2f2;
    border: 2px solid #fecaca;
    border-radius: 0.75rem;
    text-align: center;
  }

  .roadmap-error .error-icon {
    font-size: 2rem;
  }

  .roadmap-error h3 {
    margin: 0;
    color: #dc2626;
    font-size: 1.25rem;
  }

  .roadmap-error p {
    margin: 0;
    color: #7f1d1d;
  }

  .roadmap-overview {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .roadmap-overview h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .overview-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .overview-label {
    font-weight: 500;
    color: #4a5568;
  }

  .overview-value {
    font-weight: 700;
    color: #1a202c;
  }

  .confidence-note {
    padding: 0.75rem;
    background: #e6fffa;
    border: 1px solid #81e6d9;
    border-radius: 0.5rem;
    color: #234e52;
  }

  .semester-plan {
    margin-bottom: 2rem;
  }

  .semester-plan h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    color: #1a202c;
  }

  .semester-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .semester-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .semester-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .semester-header h4 {
    margin: 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .semester-credits {
    background: #3182ce;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .workload-assessment {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f7fafc;
    border-radius: 0.5rem;
    color: #4a5568;
  }

  .courses-list h5 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #1a202c;
  }

  .course-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .course-item.core {
    border-left: 4px solid #3182ce;
  }

  .course-item.elective {
    border-left: 4px solid #38a169;
  }

  .course-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .course-code {
    font-weight: 700;
    color: #1a202c;
    font-size: 1rem;
  }

  .course-credits {
    background: #e2e8f0;
    color: #4a5568;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .course-difficulty {
    background: #f3f4f6;
    color: #374151;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .course-difficulty.low {
    background: #d1fae5;
    color: #065f46;
  }

  .course-difficulty.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .course-difficulty.high {
    background: #fee2e2;
    color: #991b1b;
  }

  .course-difficulty.introductory {
    background: #d1fae5;
    color: #065f46;
  }

  .course-difficulty.intermediate {
    background: #fef3c7;
    color: #92400e;
  }

  .course-difficulty.advanced {
    background: #fed7aa;
    color: #9a3412;
  }

  .course-difficulty.challenging {
    background: #fee2e2;
    color: #991b1b;
  }

  .course-priority {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .course-priority.critical {
    background: #fecaca;
    color: #991b1b;
  }

  .course-priority.important {
    background: #fed7aa;
    color: #9a3412;
  }

  .course-priority.flexible {
    background: #d1fae5;
    color: #065f46;
  }

  .course-name {
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 0.5rem;
  }

  .course-reasoning {
    color: #4a5568;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .course-prerequisites {
    color: #718096;
    font-size: 0.875rem;
  }

  .milestones {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .milestones h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .milestones ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .milestones li {
    color: #4a5568;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .prerequisite-mapping {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .prerequisite-mapping h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .prereq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .prereq-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #1a202c;
  }

  .prereq-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prereq-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .prereq-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .prereq-text {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .completed-prereq {
    border-left: 4px solid #10b981;
    background: #f0fdf4;
  }

  .completed-prereq .prereq-text {
    color: #065f46;
  }

  .pending-prereq {
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
  }

  .pending-prereq .prereq-text {
    color: #92400e;
  }

  .conflicts h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #dc2626;
  }

  .conflict-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .conflict-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    border-left: 4px solid #dc2626;
  }

  .conflict-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .conflict-text {
    color: #991b1b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .graduation-strategy {
    background: #f0f9ff;
    border: 2px solid #0ea5e9;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .graduation-strategy h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .strategy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .strategy-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .strategy-item h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #1a202c;
  }

  .strategy-item p {
    margin: 0;
    color: #4a5568;
    font-size: 0.875rem;
  }

  .risk-mitigation {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .risk-mitigation h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #dc2626;
  }

  .risk-mitigation ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .risk-mitigation li {
    color: #4a5568;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .alternative-paths {
    background: #fefce8;
    border: 2px solid #eab308;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .alternative-paths h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .alternatives-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .alternative-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .alternative-card h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #1a202c;
  }

  .alternative-card p {
    margin: 0 0 0.75rem 0;
    color: #4a5568;
    font-size: 0.875rem;
  }

  .alternative-timeline {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: #4a5568;
  }

  .alternative-requirements {
    font-size: 0.875rem;
    color: #4a5568;
  }

  .alternative-requirements ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
  }

  .alternative-requirements li {
    margin-bottom: 0.25rem;
  }

  .roadmap-delete-section {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #e2e8f0;
  }

  .delete-roadmap-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .delete-roadmap-btn:hover {
    background: #b91c1c;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .delete-roadmap-btn:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    .graduation-page {
      padding: 0;
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

    .overview-grid {
      grid-template-columns: 1fr;
    }

    .prereq-grid {
      grid-template-columns: 1fr;
    }

    .strategy-grid {
      grid-template-columns: 1fr;
    }

    .alternatives-list {
      grid-template-columns: 1fr;
    }


    .course-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .semester-header {
      flex-direction: column;
      gap: 0.75rem;
      text-align: center;
    }
  }
</style>
