// Tire Size Data from tyresize.txt
const TIRE_DATA = {
    "205/40R18": 621.2,
    "215/40R18": 629.2,
    "225/40R18": 637.2,
    "235/40R18": 645.2,
    "245/40R18": 653.2,
    "255/40R18": 661.2,
    "265/40R18": 669.2,
    "205/40R17": 595.8,
    "215/40R17": 603.8,
    "225/40R17": 611.8,
    "235/40R17": 619.8,
    "245/40R17": 627.8,
    "255/40R17": 635.8,
    "265/40R17": 643.8
};

let parsedTireData = [];

function parseTireData() {
    parsedTireData = Object.keys(TIRE_DATA).map(key => {
        // key format: "205/40R18"
        const match = key.match(/(\d+)\/(\d+)R(\d+)/);
        if (match) {
            return {
                key: key,
                width: parseInt(match[1]),
                ratio: parseInt(match[2]),
                rim: parseInt(match[3]),
                diameter: TIRE_DATA[key]
            };
        }
        return null;
    }).filter(item => item !== null);
}

// State
let currentSettings = {
    tireSize: "",
    tireDiameter: 0
};

let measurements = {
    front: { fore: 0, aft: 0 },
    rear: { fore: 0, aft: 0 }
};

// DOM Elements
const els = {
    navBtns: document.querySelectorAll('.nav-btn'),
    sections: document.querySelectorAll('section'),
    wheelSelect: document.getElementById('wheel-select'),
    widthSelect: document.getElementById('width-select'),
    ratioSelect: document.getElementById('ratio-select'),
    currentDiameter: document.getElementById('current-diameter'),
    inputs: {
        frontFore: document.getElementById('front-fore'),
        frontAft: document.getElementById('front-aft'),
        rearFore: document.getElementById('rear-fore'),
        rearAft: document.getElementById('rear-aft')
    },
    results: {
        front: document.getElementById('front-toe-result'),
        rear: document.getElementById('rear-toe-result')
    },
    wheels: {
        fl: document.getElementById('wheel-fl'),
        fr: document.getElementById('wheel-fr'),
        rl: document.getElementById('wheel-rl'),
        rr: document.getElementById('wheel-rr')
    },
    clearBtn: document.getElementById('clear-data-btn')
};

// Initialization
function init() {
    loadData();
    parseTireData();
    populateWheelSelect();
    setupEventListeners();
    updateUI();
}

// Data Management
function loadData() {
    const savedSettings = localStorage.getItem('alignment_settings');
    if (savedSettings) {
        currentSettings = JSON.parse(savedSettings);
    }

    const savedMeasurements = localStorage.getItem('alignment_measurements');
    if (savedMeasurements) {
        measurements = JSON.parse(savedMeasurements);
    }
}

function saveData() {
    localStorage.setItem('alignment_settings', JSON.stringify(currentSettings));
    localStorage.setItem('alignment_measurements', JSON.stringify(measurements));
}

function clearData() {
    localStorage.removeItem('alignment_settings');
    localStorage.removeItem('alignment_measurements');
    currentSettings = { tireSize: "", tireDiameter: 0 };
    els.wheelSelect.value = "";
    els.widthSelect.innerHTML = '<option value="">Select Width</option>';
    els.widthSelect.disabled = true;
    els.ratioSelect.innerHTML = '<option value="">Select Ratio</option>';
    els.ratioSelect.disabled = true;
    measurements = { front: { fore: 0, aft: 0 }, rear: { fore: 0, aft: 0 } };
    updateUI();
    alert('Data cleared');
}

// UI Updates
function populateWheelSelect() {
    const rims = [...new Set(parsedTireData.map(d => d.rim))].sort((a, b) => a - b);
    els.wheelSelect.innerHTML = '<option value="">Select Inch</option>';
    rims.forEach(rim => {
        const option = document.createElement('option');
        option.value = rim;
        option.textContent = `${rim} inch`;
        els.wheelSelect.appendChild(option);
    });
}

function populateWidthSelect(rim) {
    const widths = [...new Set(parsedTireData.filter(d => d.rim == rim).map(d => d.width))].sort((a, b) => a - b);
    els.widthSelect.innerHTML = '<option value="">Select Width</option>';
    widths.forEach(width => {
        const option = document.createElement('option');
        option.value = width;
        option.textContent = width;
        els.widthSelect.appendChild(option);
    });
    els.widthSelect.disabled = false;
}

function populateRatioSelect(rim, width) {
    const ratios = [...new Set(parsedTireData.filter(d => d.rim == rim && d.width == width).map(d => d.ratio))].sort((a, b) => a - b);
    els.ratioSelect.innerHTML = '<option value="">Select Ratio</option>';
    ratios.forEach(ratio => {
        const option = document.createElement('option');
        option.value = ratio;
        option.textContent = ratio;
        els.ratioSelect.appendChild(option);
    });
    els.ratioSelect.disabled = false;
}

function updateUI() {
    // Settings
    if (currentSettings.tireSize) {
        // Parse current setting to populate dropdowns
        const match = currentSettings.tireSize.match(/(\d+)\/(\d+)R(\d+)/);
        if (match) {
            const width = match[1];
            const ratio = match[2];
            const rim = match[3];

            els.wheelSelect.value = rim;
            populateWidthSelect(rim);
            els.widthSelect.value = width;
            populateRatioSelect(rim, width);
            els.ratioSelect.value = ratio;
        }
    }
    els.currentDiameter.textContent = currentSettings.tireDiameter ? `${currentSettings.tireDiameter} mm` : '--- mm';

    // Inputs
    els.inputs.frontFore.value = measurements.front.fore || '';
    els.inputs.frontAft.value = measurements.front.aft || '';
    els.inputs.rearFore.value = measurements.rear.fore || '';
    els.inputs.rearAft.value = measurements.rear.aft || '';

    calculateAndDisplay();
}

// Calculation & Visuals
function calculateAndDisplay() {
    if (!currentSettings.tireDiameter) return;

    const diameter = currentSettings.tireDiameter;

    // Front
    const fFore = parseFloat(measurements.front.fore) || 0;
    const fAft = parseFloat(measurements.front.aft) || 0;
    let fAngle = 0;

    if (fFore && fAft) {
        // Diff: Aft - Fore. Positive = Toe In (Front is narrower), Negative = Toe Out
        // Wait, Toe In means Front < Rear.
        // Toe Angle = asin((Rear - Front) / Diameter)
        // Note: This calculates TOTAL toe if measuring across axle.
        // Usually DIY is measuring track width difference.
        // Let's assume the input is the distance between L and R tires.
        const diff = fAft - fFore;
        // Angle in radians
        const angleRad = Math.asin(diff / diameter); // Approximation for small angles
        // Convert to degrees
        fAngle = angleRad * (180 / Math.PI);
    }

    // Rear
    const rFore = parseFloat(measurements.rear.fore) || 0;
    const rAft = parseFloat(measurements.rear.aft) || 0;
    let rAngle = 0;

    if (rFore && rAft) {
        const diff = rAft - rFore;
        const angleRad = Math.asin(diff / diameter);
        rAngle = angleRad * (180 / Math.PI);
    }

    // Display Results
    els.results.front.textContent = formatAngle(fAngle);
    els.results.rear.textContent = formatAngle(rAngle);

    // Update Visuals
    updateWheelVisuals(fAngle, rAngle);
}

function formatAngle(deg) {
    if (isNaN(deg)) return "0.00°";
    const sign = deg > 0 ? "+" : ""; // + for Toe In
    return `${sign}${deg.toFixed(2)}°`;
}

function updateWheelVisuals(fAngle, rAngle) {
    // Exaggerate for visual: Max 5 degrees visual rotation
    // But user said "5 degrees upper limit exaggerated".
    // Let's scale it. Say 1 degree actual = 5 degrees visual?
    // Or just clamp.
    // Let's try a multiplier of 5 for visibility, clamped at 25 visual degrees.

    const VISUAL_SCALE = 5;
    const MAX_VISUAL = 25;

    let fVisual = fAngle * VISUAL_SCALE;
    let rVisual = rAngle * VISUAL_SCALE;

    // Clamp visual rotation to keep it looking sane (e.g. max 30 degrees visual)
    const CLAMP_LIMIT = 30;
    fVisual = Math.max(Math.min(fVisual, CLAMP_LIMIT), -CLAMP_LIMIT);
    rVisual = Math.max(Math.min(rVisual, CLAMP_LIMIT), -CLAMP_LIMIT);

    // Toe In (Positive Angle): Front of tires point IN.
    // Left Wheel: Rotates Clockwise (+). Right Wheel: Rotates Counter-Clockwise (-).
    // Wait.
    // Toe In: / \
    // Left Wheel: Points Right (Clockwise). Right Wheel: Points Left (Counter-Clockwise).

    // Apply transforms
    // Front Left
    els.wheels.fl.style.transform = `rotate(${fVisual}deg)`;
    // Front Right (Mirror)
    els.wheels.fr.style.transform = `rotate(${-fVisual}deg)`;

    // Rear Left
    els.wheels.rl.style.transform = `rotate(${rVisual}deg)`;
    // Rear Right
    els.wheels.rr.style.transform = `rotate(${-rVisual}deg)`;

    // Color indication?
    // Maybe change color if extreme? For now just rotation.
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    els.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;

            // Update Nav
            els.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Section
            els.sections.forEach(s => {
                s.classList.remove('active-section');
                if (s.id === targetId) s.classList.add('active-section');
            });
        });
    });

    // Settings
    els.wheelSelect.addEventListener('change', (e) => {
        const rim = e.target.value;
        els.widthSelect.innerHTML = '<option value="">Select Width</option>';
        els.widthSelect.disabled = true;
        els.ratioSelect.innerHTML = '<option value="">Select Ratio</option>';
        els.ratioSelect.disabled = true;

        if (rim) {
            populateWidthSelect(rim);
        }
        updateCurrentSelection();
    });

    els.widthSelect.addEventListener('change', (e) => {
        const width = e.target.value;
        const rim = els.wheelSelect.value;
        els.ratioSelect.innerHTML = '<option value="">Select Ratio</option>';
        els.ratioSelect.disabled = true;

        if (width && rim) {
            populateRatioSelect(rim, width);
        }
        updateCurrentSelection();
    });

    els.ratioSelect.addEventListener('change', (e) => {
        updateCurrentSelection();
    });

    function updateCurrentSelection() {
        const rim = els.wheelSelect.value;
        const width = els.widthSelect.value;
        const ratio = els.ratioSelect.value;

        if (rim && width && ratio) {
            const key = `${width}/${ratio}R${rim}`;
            if (TIRE_DATA[key]) {
                currentSettings.tireSize = key;
                currentSettings.tireDiameter = TIRE_DATA[key];
                saveData();
                els.currentDiameter.textContent = `${currentSettings.tireDiameter} mm`;
                calculateAndDisplay(); // Recalculate with new diameter
            }
        } else {
            els.currentDiameter.textContent = '--- mm';
        }
    }

    // Inputs
    const inputHandler = (type, key) => (e) => {
        measurements[type][key] = e.target.value;
        saveData();
        calculateAndDisplay();
    };

    els.inputs.frontFore.addEventListener('input', inputHandler('front', 'fore'));
    els.inputs.frontAft.addEventListener('input', inputHandler('front', 'aft'));
    els.inputs.rearFore.addEventListener('input', inputHandler('rear', 'fore'));
    els.inputs.rearAft.addEventListener('input', inputHandler('rear', 'aft'));

    // Clear
    els.clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all data?')) {
            clearData();
        }
    });
}

// Run
init();
