// app.js

/**
 * Automation Readiness Score Calculator
 * Production-ready vanilla JavaScript implementation
 */

// --- TYPE DEFINITIONS (JSDoc) ---

/**
 * @typedef {Object} Inputs
 * @property {number} processVolume
 * @property {number} variance
 * @property {number} exceptionRate
 * @property {number} dataQuality
 * @property {number} systemAccess
 * @property {number} complianceSensitivity
 */

/**
 * @typedef {Object} Blocker
 * @property {string} factor
 * @property {string} reason
 * @property {string} hint
 * @property {number} gap
 * @property {number} subscore
 */

/**
 * @typedef {Object} Output
 * @property {number} readinessScore
 * @property {"Red" | "Yellow" | "Green"} band
 * @property {Blocker[]} topBlockers
 * @property {string} narrative
 */

// --- CONSTANTS ---

const STORAGE_KEY = 'automationReadinessInputs';

const DEFAULT_INPUTS = {
  processVolume: 1000,
  variance: 20,
  exceptionRate: 10,
  dataQuality: 70,
  systemAccess: 60,
  complianceSensitivity: 30,
};

const WEIGHTS = {
  stableProcess: 0.2,
  lowExceptions: 0.2,
  dataQuality: 0.2,
  systemAccess: 0.15,
  lowComplianceRisk: 0.15,
  volumePotential: 0.1,
};

const BLOCKER_HINTS = {
  stableProcess: {
    reason: 'High Process Variance',
    hint: 'Standardize steps, document SOPs, and reduce branching or edge cases.',
  },
  lowExceptions: {
    reason: 'High Exception Rate',
    hint: 'Perform root-cause analysis on exceptions, add decision tables, or redesign inputs.',
  },
  dataQuality: {
    reason: 'Low Data Quality',
    hint: 'Add validation, enrichment layers, define golden records, or implement MDM.',
  },
  systemAccess: {
    reason: 'Low System Access',
    hint: 'Expose APIs, create service accounts, remove MFA for service principals, or use RPA as a last resort.',
  },
  lowComplianceRisk: {
    reason: 'High Compliance Sensitivity',
    hint: 'Minimize data usage, pseudonymize PII, add Human-in-the-Loop (HITL) checks, and enhance audit logging.',
  },
  volumePotential: {
    reason: 'Low Volume / Payoff',
    hint: 'A pilot is still possible. Consider combining adjacent processes to reach scale.',
  },
};

const INPUT_CONSTRAINTS = {
  processVolume: { min: 0, max: Infinity },
  variance: { min: 0, max: 100 },
  exceptionRate: { min: 0, max: 100 },
  dataQuality: { min: 0, max: 100 },
  systemAccess: { min: 0, max: 100 },
  complianceSensitivity: { min: 0, max: 100 },
};

// --- STATE ---

let lastInputs = {};
let lastOutput = {};

// --- DOM REFERENCES ---

const form = document.getElementById('readiness-form');
const outputValue = document.getElementById('score-value');
const outputBand = document.getElementById('score-band');
const outputNarrative = document.getElementById('score-narrative');
const outputBlockers = document.getElementById('blockers-list');
const scoreGauge = document.getElementById('score-gauge');
const btnCopy = document.getElementById('btn-copy');
const btnCsv = document.getElementById('btn-csv');
const btnShare = document.getElementById('btn-share');
const btnReset = document.getElementById('btn-reset');
const toast = document.getElementById('toast');
const tooltip = document.getElementById('tooltip');

// --- UTILITY FUNCTIONS ---

/**
 * Clamps a number between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Shows a toast notification
 * @param {string} message
 * @param {number} duration
 */
const showToast = (message, duration = 2000) => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
};

/**
 * Debounce function to limit execution rate
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// --- VALIDATION ---

/**
 * Validates a single input field
 * @param {string} name
 * @param {number} value
 * @returns {{valid: boolean, message: string}}
 */
function validateInput(name, value) {
  const constraints = INPUT_CONSTRAINTS[name];
  if (!constraints) {
    return { valid: true, message: '' };
  }

  if (Number.isNaN(value)) {
    return { valid: false, message: 'Please enter a valid number' };
  }

  if (value < constraints.min) {
    return {
      valid: false,
      message: `Value must be at least ${constraints.min}`,
    };
  }

  if (value > constraints.max) {
    return {
      valid: false,
      message: `Value must be at most ${constraints.max}`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Updates the UI to show validation errors
 * @param {string} fieldName
 * @param {string} message
 */
function showValidationError(fieldName, message) {
  const input = form.elements[fieldName];
  const errorElement = document.getElementById(`error-${fieldName.replace(/([A-Z])/g, '-$1').toLowerCase()}`);

  if (message) {
    input.classList.add('error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  } else {
    input.classList.remove('error');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }
}

// --- CORE CALCULATION LOGIC ---

/**
 * Calculates volume subscore using log scale
 * @param {number} processVolume
 * @returns {number}
 */
function volumeSubscore(processVolume) {
  if (processVolume <= 0) return 0;
  const v = Math.log10(processVolume + 1);
  const scaled = v * 31.5;
  return clamp(scaled, 0, 95);
}

/**
 * Calculates the readiness score and identifies blockers
 * @param {Inputs} inputs
 * @returns {Output}
 */
function calculateReadiness(inputs) {
  // Calculate subscores (higher is better)
  const subscores = {
    stableProcess: 100 - inputs.variance,
    lowExceptions: 100 - inputs.exceptionRate,
    dataQuality: inputs.dataQuality,
    systemAccess: inputs.systemAccess,
    lowComplianceRisk: 100 - inputs.complianceSensitivity,
    volumePotential: volumeSubscore(inputs.processVolume),
  };

  // Calculate weighted final score
  const score =
    subscores.stableProcess * WEIGHTS.stableProcess +
    subscores.lowExceptions * WEIGHTS.lowExceptions +
    subscores.dataQuality * WEIGHTS.dataQuality +
    subscores.systemAccess * WEIGHTS.systemAccess +
    subscores.lowComplianceRisk * WEIGHTS.lowComplianceRisk +
    subscores.volumePotential * WEIGHTS.volumePotential;

  const readinessScore = Math.round(score);

  // Determine band
  let band = 'Red';
  let narrative =
    'This process has significant blockers. Focus on fundamentals before automating.';

  if (readinessScore >= 75) {
    band = 'Green';
    narrative =
      'This process is a strong candidate for automation. Proceed with detailed analysis.';
  } else if (readinessScore >= 50) {
    band = 'Yellow';
    narrative =
      'This process shows potential but has clear blockers. Address top issues to improve readiness.';
  }

  // Identify top blockers
  const MIN_GAP_THRESHOLD = 15;
  const allBlockers = Object.entries(subscores).map(([key, subscore]) => {
    const maxScore = key === 'volumePotential' ? 95 : 100;
    const gap = maxScore - subscore;
    return {
      factor: key,
      reason: BLOCKER_HINTS[key].reason,
      hint: BLOCKER_HINTS[key].hint,
      gap,
      subscore,
    };
  });

  const topBlockers = allBlockers
    .filter((b) => b.gap > MIN_GAP_THRESHOLD)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4);

  return { readinessScore, band, topBlockers, narrative };
}

// --- UI RENDERING ---

/**
 * Draws a gauge visualization on canvas
 * @param {number} score
 * @param {string} band
 */
function drawGauge(score, band) {
  const ctx = scoreGauge.getContext('2d');
  const width = scoreGauge.width;
  const height = scoreGauge.height;
  const centerX = width / 2;
  const centerY = height - 10;
  const radius = height - 20;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
  ctx.lineWidth = 20;
  ctx.strokeStyle = '#e0e0e0';
  ctx.stroke();

  // Draw colored arc based on score
  const angle = Math.PI + (score / 100) * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, angle);
  ctx.lineWidth = 20;

  // Set color based on band
  if (band === 'Green') {
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-green')
      .trim();
  } else if (band === 'Yellow') {
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-yellow')
      .trim();
  } else {
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-red')
      .trim();
  }

  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Updates the output UI with calculation results
 * @param {Output} output
 */
function updateUI(output) {
  // Update score
  outputValue.textContent = output.readinessScore;

  // Update band
  outputBand.textContent = output.band;
  outputBand.className = `band-${output.band.toLowerCase()}`;

  // Update narrative
  outputNarrative.textContent = output.narrative;

  // Draw gauge
  drawGauge(output.readinessScore, output.band);

  // Update blockers
  outputBlockers.innerHTML = '';
  if (output.topBlockers.length === 0) {
    const li = document.createElement('li');
    li.innerHTML =
      '<strong>No significant blockers found!</strong><span>This process appears to be highly ready for automation.</span>';
    outputBlockers.appendChild(li);
  } else {
    output.topBlockers.forEach((blocker) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${blocker.reason}</strong><span>${blocker.hint}</span>`;
      outputBlockers.appendChild(li);
    });
  }
}

// --- STATE MANAGEMENT ---

/**
 * Reads inputs from form with validation
 * @returns {Inputs}
 */
function getInputsFromForm() {
  const data = new FormData(form);
  const inputs = {};
  let hasErrors = false;

  Object.keys(DEFAULT_INPUTS).forEach((key) => {
    const value = parseInt(data.get(key), 10) || 0;
    const constraints = INPUT_CONSTRAINTS[key];
    const clampedValue = clamp(
      value,
      constraints.min,
      constraints.max === Infinity ? value : constraints.max
    );

    inputs[key] = Math.round(clampedValue);

    // Validate
    const validation = validateInput(key, inputs[key]);
    if (!validation.valid) {
      hasErrors = true;
      showValidationError(key, validation.message);
    } else {
      showValidationError(key, '');
    }
  });

  return inputs;
}

/**
 * Sets form values from inputs object
 * @param {Inputs} inputs
 */
function setInputsToForm(inputs) {
  Object.entries(inputs).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

/**
 * Reads state from URL query parameters
 * @returns {Partial<Inputs>}
 */
function getStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const inputs = {};

  const mapping = {
    pv: 'processVolume',
    v: 'variance',
    e: 'exceptionRate',
    dq: 'dataQuality',
    sa: 'systemAccess',
    c: 'complianceSensitivity',
  };

  Object.entries(mapping).forEach(([param, key]) => {
    if (params.has(param)) {
      const value = parseInt(params.get(param), 10);
      if (!Number.isNaN(value)) {
        inputs[key] = value;
      }
    }
  });

  return inputs;
}

/**
 * Writes state to URL query parameters
 * @param {Inputs} inputs
 */
function setStateToURL(inputs) {
  const params = new URLSearchParams();
  params.set('pv', inputs.processVolume);
  params.set('v', inputs.variance);
  params.set('e', inputs.exceptionRate);
  params.set('dq', inputs.dataQuality);
  params.set('sa', inputs.systemAccess);
  params.set('c', inputs.complianceSensitivity);

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newURL);
}

/**
 * Reads state from localStorage
 * @returns {Partial<Inputs> | null}
 */
function getStateFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Could not parse localStorage state', e);
    return null;
  }
}

/**
 * Writes state to localStorage
 * @param {Inputs} inputs
 */
function setStateToLocalStorage(inputs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

// --- MAIN CALCULATION RUNNER ---

/**
 * Main calculation function
 */
function runCalculation() {
  const inputs = getInputsFromForm();
  const output = calculateReadiness(inputs);

  // Update global state
  lastInputs = inputs;
  lastOutput = output;

  // Update UI
  updateUI(output);

  // Persist state
  setStateToLocalStorage(inputs);
  setStateToURL(inputs);

  // Ensure form values are clamped
  setInputsToForm(inputs);
}

// Debounced version for input events
const debouncedCalculation = debounce(runCalculation, 300);

// --- EVENT HANDLERS ---

/**
 * Handles copy JSON button
 */
function handleCopyJson() {
  const dataToCopy = {
    inputs: lastInputs,
    output: {
      readinessScore: lastOutput.readinessScore,
      band: lastOutput.band,
      narrative: lastOutput.narrative,
      topBlockers: lastOutput.topBlockers.map((b) => ({
        reason: b.reason,
        hint: b.hint,
        gap: b.gap,
      })),
    },
  };

  navigator.clipboard
    .writeText(JSON.stringify(dataToCopy, null, 2))
    .then(() => showToast('✓ Copied JSON to clipboard!'))
    .catch((err) => {
      console.error('Failed to copy JSON:', err);
      showToast('✗ Failed to copy');
    });
}

/**
 * Handles download CSV button
 */
function handleDownloadCsv() {
  const headers = [
    'processVolume',
    'variance',
    'exceptionRate',
    'dataQuality',
    'systemAccess',
    'complianceSensitivity',
    'readinessScore',
    'band',
    'topBlockers',
  ];

  const blockersText = lastOutput.topBlockers
    .map((b) => `${b.reason}: ${b.hint}`)
    .join('; ');

  const row = [
    lastInputs.processVolume,
    lastInputs.variance,
    lastInputs.exceptionRate,
    lastInputs.dataQuality,
    lastInputs.systemAccess,
    lastInputs.complianceSensitivity,
    lastOutput.readinessScore,
    lastOutput.band,
    `"${blockersText}"`,
  ];

  const csvContent = [headers.join(','), row.join(',')].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'automation-readiness-score.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('✓ CSV downloaded!');
}

/**
 * Handles share link button
 */
function handleShareLink() {
  const url = window.location.href;
  navigator.clipboard
    .writeText(url)
    .then(() => showToast('✓ Link copied to clipboard!'))
    .catch((err) => {
      console.error('Failed to copy link:', err);
      showToast('✗ Failed to copy link');
    });
}

/**
 * Handles reset button
 */
function handleReset(e) {
  e.preventDefault();

  // Clear storage
  localStorage.removeItem(STORAGE_KEY);

  // Reset URL
  window.history.replaceState(null, '', window.location.pathname);

  // Reset form to defaults
  setInputsToForm(DEFAULT_INPUTS);

  // Recalculate
  runCalculation();

  showToast('✓ Reset to defaults');
}

// --- TOOLTIP HANDLING ---

let tooltipTimeout;

/**
 * Shows tooltip for help icons
 * @param {MouseEvent} e
 */
function showTooltip(e) {
  const button = e.currentTarget;
  const text = button.getAttribute('data-tooltip');

  if (!text) return;

  clearTimeout(tooltipTimeout);

  tooltip.textContent = text;
  tooltip.classList.add('show');

  const rect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  const top = rect.top - tooltipRect.height - 10;

  // Keep tooltip within viewport
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Hides tooltip
 */
function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    tooltip.classList.remove('show');
  }, 100);
}

// --- INITIALIZATION ---

/**
 * Initializes the application
 */
function init() {
  // Layer state: Defaults < LocalStorage < URL
  const urlState = getStateFromURL();
  const localState = getStateFromLocalStorage();

  const initialInputs = {
    ...DEFAULT_INPUTS,
    ...(localState || {}),
    ...(urlState || {}),
  };

  // Set form values
  setInputsToForm(initialInputs);

  // Run initial calculation
  runCalculation();

  // Add event listeners
  form.addEventListener('input', debouncedCalculation);
  form.addEventListener('change', runCalculation); // Immediate on blur/change

  btnCopy.addEventListener('click', handleCopyJson);
  btnCsv.addEventListener('click', handleDownloadCsv);
  btnShare.addEventListener('click', handleShareLink);
  btnReset.addEventListener('click', handleReset);

  // Tooltip listeners
  document.querySelectorAll('.help-icon').forEach((icon) => {
    icon.addEventListener('mouseenter', showTooltip);
    icon.addEventListener('mouseleave', hideTooltip);
    icon.addEventListener('focus', showTooltip);
    icon.addEventListener('blur', hideTooltip);
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const urlInputs = getStateFromURL();
    if (Object.keys(urlInputs).length > 0) {
      setInputsToForm({ ...DEFAULT_INPUTS, ...urlInputs });
      runCalculation();
    }
  });

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.warn('Service Worker registration failed:', err));
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateReadiness,
    volumeSubscore,
    clamp,
    validateInput,
  };
}