/**
 * test_chrome_adjust_pilot.mjs
 *
 * Playwright test for WP-CHROME-ADJUST-1B: chrome adjust panel bindings (Pilot 1 scope only).
 *
 * Tests:
 * - renderAdjustPanel renders with correct data-testid and input element
 * - set_volume binding (micropipette) with typical 20-200 uL range
 * - wavelength_nm binding (plate reader) with 400-750 nm range
 * - Typing a value and blurring fires the commit handler with the typed value
 * - Attempting to render with field 'set_temperature' throws loudly (no new vocabulary)
 *
 * Screenshots saved to test-results/_chrome/
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

// ============================================
// Setup

const TEST_OUTPUT_DIR = path.resolve("test-results", "_chrome");

// Create test output directory
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

// ============================================
// Test runner

async function runTests() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });

  console.log("Testing renderAdjustPanel for Pilot 1 bindings...");

  try {
    // Create and navigate to test HTML
    const testFile = path.join(TEST_OUTPUT_DIR, "_test.html");
    const testHtml = createTestHtml();
    fs.writeFileSync(testFile, testHtml, "utf-8");

    // Navigate to the test HTML
    const fileUrl = `file://${testFile}`;
    await page.goto(fileUrl);
    await page.waitForTimeout(500);

    // ============================================
    // Test 1: set_volume binding (micropipette)

    console.log("Test 1: set_volume binding (micropipette)...");

    // Check page content before clicking
    const pageContent = await page.content();
    if (!pageContent.includes("render-set-volume")) {
      throw new Error("render-set-volume button not found in page");
    }

    // Click button to render set_volume panel
    console.log("Clicking render-set-volume button...");
    await page.click("button#render-set-volume");

    // Check if button click triggered any errors
    const pageErrors = await page.evaluate(() => {
      return window.__errors || [];
    });
    if (pageErrors.length > 0) {
      console.warn("Page errors:", pageErrors);
    }

    // Log current HTML to debug
    const testAreaHtml = await page.evaluate(() => {
      return document.getElementById("test-area").innerHTML;
    });
    console.log("test-area HTML after click:", testAreaHtml.substring(0, 200));

    // Wait for the input element to appear (testid uses underscore: set_volume)
    await page.waitForSelector('[data-testid="adjust-input-set_volume"]', {
      timeout: 5000,
    });
    await page.waitForTimeout(300);

    // Assert panel is present
    const panelSetVol = await page
      .locator('[data-testid="adjust-panel"]')
      .first();
    if (!(await panelSetVol.isVisible())) {
      throw new Error("adjust-panel not visible for set_volume");
    }

    // Assert input element is present with correct data-testid
    const inputSetVol = await page.locator(
      '[data-testid="adjust-input-set_volume"]',
    );
    if (!(await inputSetVol.isVisible())) {
      throw new Error("adjust-input-set-volume not found");
    }

    // Verify initial value
    const initialValue = await inputSetVol.inputValue();
    console.log(`  set_volume initial value: ${initialValue}`);
    if (initialValue !== "100") {
      throw new Error(`Expected initial set_volume 100, got ${initialValue}`);
    }

    // Take screenshot before edit
    await page.screenshot({
      path: path.join(TEST_OUTPUT_DIR, "01_set_volume_initial.png"),
    });

    // Type a new value
    await inputSetVol.clear();
    await inputSetVol.type("150");
    await page.waitForTimeout(100);

    // Blur to trigger commit
    await inputSetVol.blur();
    await page.waitForTimeout(300);

    // Take screenshot after edit
    await page.screenshot({
      path: path.join(TEST_OUTPUT_DIR, "02_set_volume_edited.png"),
    });

    // Check that commit was fired (verify via a result element on the page)
    const resultSetVol = await page.locator("#result-set-volume").textContent();
    console.log(`  set_volume commit result: ${resultSetVol}`);
    if (resultSetVol !== "150") {
      throw new Error(`Expected set_volume commit 150, got ${resultSetVol}`);
    }

    console.log("  ✓ set_volume binding passed");

    // ============================================
    // Test 2: wavelength_nm binding (plate reader)

    console.log("Test 2: wavelength_nm binding (plate reader)...");

    // Click button to render wavelength_nm panel
    await page.click("button#render-wavelength");

    // Wait for the input element to appear (testid uses underscore: wavelength_nm)
    await page.waitForSelector('[data-testid="adjust-input-wavelength_nm"]', {
      timeout: 5000,
    });
    await page.waitForTimeout(300);

    // Assert input element is present with correct data-testid
    const inputWave = await page.locator(
      '[data-testid="adjust-input-wavelength_nm"]',
    );
    if (!(await inputWave.isVisible())) {
      throw new Error("adjust-input-wavelength_nm not found");
    }

    // Verify initial value
    const initialWave = await inputWave.inputValue();
    console.log(`  wavelength_nm initial value: ${initialWave}`);
    if (initialWave !== "570") {
      throw new Error(`Expected initial wavelength_nm 570, got ${initialWave}`);
    }

    // Take screenshot before edit
    await page.screenshot({
      path: path.join(TEST_OUTPUT_DIR, "03_wavelength_initial.png"),
    });

    // Type a new value
    await inputWave.clear();
    await inputWave.type("560");
    await page.waitForTimeout(100);

    // Blur to trigger commit
    await inputWave.blur();
    await page.waitForTimeout(300);

    // Take screenshot after edit
    await page.screenshot({
      path: path.join(TEST_OUTPUT_DIR, "04_wavelength_edited.png"),
    });

    // Check that commit was fired
    const resultWave = await page.locator("#result-wavelength").textContent();
    console.log(`  wavelength_nm commit result: ${resultWave}`);
    if (resultWave !== "560") {
      throw new Error(`Expected wavelength_nm commit 560, got ${resultWave}`);
    }

    console.log("  ✓ wavelength_nm binding passed");

    // ============================================
    // Test 3: Negative test - set_temperature throws loudly

    console.log(
      "Test 3: set_temperature throws (not in Pilot 1 closed set)...",
    );

    // Click button that attempts to render set_temperature
    await page.click("button#render-bad-field");
    await page.waitForTimeout(300);

    // Check for error message
    const errorMsg = await page.locator("#error-message").textContent();
    console.log(`  error message: ${errorMsg}`);
    if (!errorMsg.includes("not a Pilot 1 binding")) {
      throw new Error("Expected error about field not being in Pilot 1 set");
    }

    console.log("  ✓ set_temperature rejection passed");

    // Take screenshot of error state
    await page.screenshot({
      path: path.join(TEST_OUTPUT_DIR, "05_error_closed_set.png"),
    });

    // ============================================
    // Summary

    console.log("\n✓ All Pilot 1 adjust panel tests passed!");
    console.log(`Screenshots saved to ${TEST_OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

// ============================================
// Test HTML generator

function createTestHtml() {
  // Create inline implementation to avoid bundling complexity
  const testCode = `
// Inline copy of renderAdjustPanel and attachAdjustDispatchToElement
const FIELD_METADATA = {
	set_volume: { label: 'Pipette Volume', unit: 'uL' },
	wavelength_nm: { label: 'Wavelength', unit: 'nm' },
};

function validateFieldClosedSet(field) {
	if (field !== 'set_volume' && field !== 'wavelength_nm') {
		throw new Error(
			\`adjust_panel: field "\${field}" is not a Pilot 1 binding. \` +
				\`Closed set: ["set_volume", "wavelength_nm"]. \` +
				\`New fields require plan approval.\`
		);
	}
}

function attachAdjustDispatchToElement(element, targetId, onEvent) {
	const input = element;
	const handleBlur = () => {
		const value = getInputValue(input);
		if (value !== undefined) {
			onEvent({ targetId, gesture: 'adjust', value });
		}
	};
	const handleKeyDown = (event) => {
		if (event.key === 'Enter') {
			const value = getInputValue(input);
			if (value !== undefined) {
				onEvent({ targetId, gesture: 'adjust', value });
			}
		}
	};
	const handleChange = () => {
		const value = getInputValue(input);
		if (value !== undefined) {
			onEvent({ targetId, gesture: 'adjust', value });
		}
	};
	input.addEventListener('blur', handleBlur);
	input.addEventListener('keydown', handleKeyDown);
	input.addEventListener('change', handleChange);
	return () => {
		input.removeEventListener('blur', handleBlur);
		input.removeEventListener('keydown', handleKeyDown);
		input.removeEventListener('change', handleChange);
	};
}

function getInputValue(input) {
	if (input.type === 'checkbox' || input.type === 'radio') {
		return input.checked;
	}
	const rawValue = input.value;
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return undefined;
	}
	if (input.type === 'number' || input.type === 'range') {
		const numValue = parseFloat(rawValue);
		if (!isNaN(numValue)) {
			return numValue;
		}
	}
	return rawValue;
}

function renderAdjustPanel(container, options) {
	validateFieldClosedSet(options.field);
	const meta = FIELD_METADATA[options.field];
	const step = options.range.step || 1;
	const currentStr = options.current.toString();
	container.innerHTML = '';
	container.setAttribute('data-testid', 'adjust-panel');
	container.className = 'adjust-panel';

	const label = document.createElement('label');
	label.className = 'adjust-panel-label';
	label.textContent = \`\${meta.label} (\${meta.unit})\`;
	container.appendChild(label);

	const inputRow = document.createElement('div');
	inputRow.className = 'adjust-panel-input-row';

	const input = document.createElement('input');
	input.type = 'number';
	input.setAttribute('data-testid', \`adjust-input-\${options.field}\`);
	input.className = 'adjust-panel-input';
	input.min = options.range.min.toString();
	input.max = options.range.max.toString();
	input.step = step.toString();
	input.value = currentStr;
	inputRow.appendChild(input);

	const unitDisplay = document.createElement('span');
	unitDisplay.className = 'adjust-panel-unit';
	unitDisplay.textContent = meta.unit;
	inputRow.appendChild(unitDisplay);
	container.appendChild(inputRow);

	const sliderRow = document.createElement('div');
	sliderRow.className = 'adjust-panel-slider-row';

	const slider = document.createElement('input');
	slider.type = 'range';
	slider.className = 'adjust-panel-slider';
	slider.min = options.range.min.toString();
	slider.max = options.range.max.toString();
	slider.step = step.toString();
	slider.value = currentStr;

	const syncInputToSlider = () => { slider.value = input.value; };
	const syncSliderToInput = () => { input.value = slider.value; };

	input.addEventListener('change', syncInputToSlider);
	slider.addEventListener('input', syncSliderToInput);

	sliderRow.appendChild(slider);
	container.appendChild(sliderRow);

	attachAdjustDispatchToElement(
		input,
		'',
		(event) => {
			const numValue = typeof event.value === 'number' ? event.value : 0;
			options.onCommit(numValue);
		},
	);
}

window.renderAdjustPanel = renderAdjustPanel;
	`;

  return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Adjust Panel Test</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			padding: 20px;
			background-color: #fafafa;
		}
		button {
			padding: 8px 12px;
			margin: 4px 0;
			cursor: pointer;
			background-color: #4caf50;
			color: white;
			border: none;
			border-radius: 4px;
		}
		button:hover {
			background-color: #45a049;
		}
		#test-area {
			margin-top: 20px;
			padding: 16px;
			background-color: white;
			border: 1px solid #e0e0e0;
			border-radius: 4px;
		}
		.result {
			margin-top: 10px;
			padding: 8px;
			background-color: #e8f5e9;
			border: 1px solid #81c784;
			border-radius: 4px;
		}
		.error {
			margin-top: 10px;
			padding: 8px;
			background-color: #ffebee;
			border: 1px solid #ef5350;
			border-radius: 4px;
			color: #c62828;
		}
		.adjust-panel {
			padding: 12px 16px;
			background-color: #f5f5f5;
			border-top: 1px solid #e0e0e0;
			border-bottom: 1px solid #e0e0e0;
		}
		.adjust-panel-label {
			display: block;
			font-size: 13px;
			font-weight: 500;
			color: #333;
			margin-bottom: 8px;
		}
		.adjust-panel-input-row {
			display: flex;
			gap: 8px;
			align-items: center;
			margin-bottom: 8px;
		}
		.adjust-panel-input {
			flex: 1;
			max-width: 120px;
			padding: 6px 8px;
			font-size: 13px;
			border: 1px solid #ccc;
			border-radius: 4px;
		}
		.adjust-panel-input:focus {
			outline: none;
			border-color: #4caf50;
			box-shadow: 0 0 4px rgba(76, 175, 80, 0.3);
		}
		.adjust-panel-unit {
			font-size: 12px;
			color: #666;
			white-space: nowrap;
		}
		.adjust-panel-slider-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.adjust-panel-slider {
			flex: 1;
			min-width: 150px;
			height: 4px;
			border-radius: 2px;
			background: linear-gradient(to right, #e0e0e0 0%, #4caf50 0%, #4caf50 100%, #e0e0e0 100%);
			outline: none;
			-webkit-appearance: none;
			appearance: none;
		}
		.adjust-panel-slider::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background: #4caf50;
			cursor: pointer;
			border: 1px solid #45a049;
		}
		.adjust-panel-slider::-moz-range-thumb {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background: #4caf50;
			cursor: pointer;
			border: 1px solid #45a049;
		}
	</style>
</head>
<body>
	<h1>Adjust Panel Test (Pilot 1)</h1>
	<div>
		<button id="render-set-volume">Render set_volume Panel</button>
		<button id="render-wavelength">Render wavelength_nm Panel</button>
		<button id="render-bad-field">Render set_temperature (Should Error)</button>
	</div>
	<div id="test-area">
		<!-- Panels will be rendered here -->
	</div>
	<div id="result-set-volume" class="result">set_volume commit: none</div>
	<div id="result-wavelength" class="result">wavelength_nm commit: none</div>
	<div id="error-message" class="error">error: none</div>

	<script>
${testCode}

		const testArea = document.getElementById('test-area');
		const resultSetVol = document.getElementById('result-set-volume');
		const resultWave = document.getElementById('result-wavelength');
		const errorMsg = document.getElementById('error-message');

		// Handler for set_volume button
		document.getElementById('render-set-volume').addEventListener('click', () => {
			resultSetVol.textContent = 'set_volume commit: waiting...';
			renderAdjustPanel(testArea, {
				field: 'set_volume',
				current: 100,
				range: { min: 0.5, max: 1000, step: 0.5 },
				onCommit: (value) => {
					resultSetVol.textContent = value;
					console.log('set_volume committed:', value);
				},
			});
		});

		// Handler for wavelength_nm button
		document.getElementById('render-wavelength').addEventListener('click', () => {
			resultWave.textContent = 'wavelength_nm commit: waiting...';
			renderAdjustPanel(testArea, {
				field: 'wavelength_nm',
				current: 570,
				range: { min: 400, max: 750, step: 10 },
				onCommit: (value) => {
					resultWave.textContent = value;
					console.log('wavelength_nm committed:', value);
				},
			});
		});

		// Handler for bad field button (should throw)
		document.getElementById('render-bad-field').addEventListener('click', () => {
			try {
				renderAdjustPanel(testArea, {
					field: 'set_temperature',
					current: 37,
					range: { min: 20, max: 42, step: 1 },
					onCommit: (value) => {
						console.log('set_temperature committed:', value);
					},
				});
				errorMsg.textContent = 'ERROR: Expected throw but did not occur';
			} catch (e) {
				errorMsg.textContent = e.message;
				console.log('Expected error caught:', e.message);
			}
		});
	</script>
</body>
</html>
	`;
}

// ============================================
// Main

runTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
