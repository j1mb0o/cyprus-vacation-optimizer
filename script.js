
// --- Configuration ---
const MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK = 4;

// --- DOM Element References ---
let yearInput, ptoInput, generateButton, resultsArea, statusArea, publicHolidaysDisplay, publicHolidaysList, displayYearPh; // Added ptoInput

// --- Date Helper Functions ---
const addDays = (date, days) => {
    // Crucial Fix: Ensure UTC operations for adding days
    const result = new Date(date.getTime()); // Clone date by its UTC timestamp
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const formatDateKey = (date) => date.toISOString().split('T')[0];

// Orthodox Easter Calculation in JavaScript
const getOrthodoxEaster = (year) => {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day + 13));
};

const calculateOrthodoxEasterRelatedHolidays = (year) => {
    const orthodoxEasterSunday = getOrthodoxEaster(year);
    const holidays = {};

    holidays[formatDateKey(addDays(orthodoxEasterSunday, -48))] = "Clean Monday";
    holidays[formatDateKey(addDays(orthodoxEasterSunday, -2))] = "Orthodox Good Friday";
    holidays[formatDateKey(addDays(orthodoxEasterSunday, 1))] = "Orthodox Easter Monday";
    holidays[formatDateKey(addDays(orthodoxEasterSunday, 50))] = "Orthodox Whit Monday (Kataklysmos)";
    
    return holidays;
};

const getPublicHolidays = (year) => {
    const fixedHolidaysData = [
        { name: "New Year's Day", month: 0, day: 1 },
        { name: "Epiphany", month: 0, day: 6 },
        { name: "Greek Independence Day", month: 2, day: 25 },
        { name: "Cyprus National Day (EOKA Day)", month: 3, day: 1 },
        { name: "Labour Day / May Day", month: 4, day: 1 },
        { name: "Assumption Day", month: 7, day: 15 },
        { name: "Cyprus Independence Day", month: 9, day: 1 },
        { name: "Ochi Day (Greek National Day)", month: 9, day: 28 },
        { name: "Christmas Day", month: 11, day: 25 },
        { name: "Boxing Day", month: 11, day: 26 },
    ];

    const publicHolidays = {};
    fixedHolidaysData.forEach(h => {
        try {
            const date = new Date(Date.UTC(year, h.month, h.day));
            if (date.getUTCFullYear() === year) {
                 publicHolidays[formatDateKey(date)] = h.name;
            }
        } catch (e) {
            console.warn(`Could not create date for ${h.name} in ${year}: ${e.message}`);
        }
    });

    const easterHolidays = calculateOrthodoxEasterRelatedHolidays(year);
    Object.assign(publicHolidays, easterHolidays);
    return publicHolidays;
};

const isWeekend = (date) => {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
};

const isPH = (date, publicHolidaysForYear) => {
    const dateKey = formatDateKey(date);
    return !!publicHolidaysForYear[dateKey];
};

const isWorkdayJS = (date, publicHolidaysForYear) => {
    return !isWeekend(date) && !isPH(date, publicHolidaysForYear);
};

const getAllDaysInYearJS = (year) => {
    const days = [];
    const date = new Date(Date.UTC(year, 0, 1));
    while (date.getUTCFullYear() === year) {
        days.push(new Date(date.getTime())); 
        date.setUTCDate(date.getUTCDate() + 1);
    }
    return days;
};

const getNaturalFreeBlocksJS = (year, publicHolidaysForYear) => {
    const freeBlocks = [];
    const allDays = getAllDaysInYearJS(year);
    if (allDays.length === 0) return [];

    let currentBlockStart = null;
    allDays.forEach((day, i) => {
        if (isWeekend(day) || isPH(day, publicHolidaysForYear)) {
            if (currentBlockStart === null) {
                currentBlockStart = day;
            }
        } else {
            if (currentBlockStart !== null) {
                // Ensure allDays[i-1] exists; if i is 0, it means the year started with a workday
                // but currentBlockStart would be null. If currentBlockStart is not null, i must be > 0.
                freeBlocks.push({ start: currentBlockStart, end: allDays[i - 1] });
                currentBlockStart = null;
            }
        }
    });
    if (currentBlockStart !== null) { // If the year ends on a free block
        freeBlocks.push({ start: currentBlockStart, end: allDays[allDays.length - 1] });
    }
    return freeBlocks;
};

const generateVacationOpportunitiesJS = (year, naturalFreeBlocks, publicHolidaysForYear) => {
    let opportunities = [];
    const allDaysInYear = getAllDaysInYearJS(year);
    if (allDaysInYear.length === 0) return [];

    // Type 1: Bridging gaps
    for (let i = 0; i < naturalFreeBlocks.length - 1; i++) {
        const blockAEnd = naturalFreeBlocks[i].end;
        const blockBStart = naturalFreeBlocks[i+1].start;
        const dayAfterBlockA = addDays(blockAEnd, 1);
        const dayBeforeBlockB = addDays(blockBStart, -1);

        if (dayAfterBlockA.getTime() > dayBeforeBlockB.getTime()) continue;

        let gapDaysToTake = [];
        let currentGapDay = new Date(dayAfterBlockA.getTime());
        while (currentGapDay.getTime() <= dayBeforeBlockB.getTime()) {
            if (isWorkdayJS(currentGapDay, publicHolidaysForYear)) {
                gapDaysToTake.push(new Date(currentGapDay.getTime()));
            }
            currentGapDay = addDays(currentGapDay, 1);
        }

        if (gapDaysToTake.length > 0 && gapDaysToTake.length <= MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK) {
            const cost = gapDaysToTake.length;
            const resultingStart = naturalFreeBlocks[i].start;
            const resultingEnd = naturalFreeBlocks[i+1].end;
            const totalDaysOff = (resultingEnd.getTime() - resultingStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
            const efficiency = cost > 0 ? totalDaysOff / cost : Infinity;
            opportunities.push({
                vacation_days_to_take: gapDaysToTake.map(d => formatDateKey(d)),
                cost_vacation_days: cost,
                resulting_start_date: formatDateKey(resultingStart),
                resulting_end_date: formatDateKey(resultingEnd),
                total_days_off: Math.round(totalDaysOff),
                efficiency_score: efficiency,
            });
        }
    }

    // Type 2: Extending blocks or standalone
    allDaysInYear.forEach((potentialStartVacDay, dayIndex) => {
        if (!isWorkdayJS(potentialStartVacDay, publicHolidaysForYear)) return;

        for (let chunkSize = 1; chunkSize <= MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK; chunkSize++) {
            if (dayIndex + chunkSize > allDaysInYear.length) break;

            let vacationChunkDates = [];
            let isValidChunk = true;
            for (let k = 0; k < chunkSize; k++) {
                // This check should ideally not be needed if dayIndex + chunkSize is already checked,
                // but as a safeguard for array access:
                if (dayIndex + k >= allDaysInYear.length) {
                    isValidChunk = false; break;
                }
                const currentDayInChunk = allDaysInYear[dayIndex + k];
                if (!isWorkdayJS(currentDayInChunk, publicHolidaysForYear)) {
                    isValidChunk = false; break;
                }
                vacationChunkDates.push(new Date(currentDayInChunk.getTime()));
            }

            if (!isValidChunk) continue;

            let currentHolidayStart = new Date(vacationChunkDates[0].getTime());
            let currentHolidayEnd = new Date(vacationChunkDates[vacationChunkDates.length - 1].getTime());

            let tempDayBefore = addDays(currentHolidayStart, -1);
            // Ensure tempDayBefore does not go before the start of the year
            while (tempDayBefore.getTime() >= allDaysInYear[0].getTime() && (isWeekend(tempDayBefore) || isPH(tempDayBefore, publicHolidaysForYear))) {
                currentHolidayStart = new Date(tempDayBefore.getTime());
                tempDayBefore = addDays(tempDayBefore, -1);
            }

            let tempDayAfter = addDays(currentHolidayEnd, 1);
            // Ensure tempDayAfter does not go beyond the end of the year
            while (tempDayAfter.getTime() <= allDaysInYear[allDaysInYear.length - 1].getTime() && (isWeekend(tempDayAfter) || isPH(tempDayAfter, publicHolidaysForYear))) {
                currentHolidayEnd = new Date(tempDayAfter.getTime());
                tempDayAfter = addDays(tempDayAfter, 1);
            }
            
            const cost = vacationChunkDates.length;
            const totalDaysOff = (currentHolidayEnd.getTime() - currentHolidayStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
            const efficiency = cost > 0 ? totalDaysOff / cost : Infinity;
            
            opportunities.push({
                vacation_days_to_take: vacationChunkDates.map(d => formatDateKey(d)),
                cost_vacation_days: cost,
                resulting_start_date: formatDateKey(currentHolidayStart),
                resulting_end_date: formatDateKey(currentHolidayEnd),
                total_days_off: Math.round(totalDaysOff),
                efficiency_score: efficiency,
            });
        }
    });

    // Deduplication and Sorting
    const uniqueOpportunitiesMap = new Map();
    opportunities.forEach(op => {
        const signature = `${op.vacation_days_to_take.join(',')}-${op.resulting_start_date}-${op.resulting_end_date}`;
        // Keep the opportunity if it's new, or if it's better (more days off, or same days off but fewer vacation days used)
        const existingOp = uniqueOpportunitiesMap.get(signature);
        if (!existingOp || op.total_days_off > existingOp.total_days_off || (op.total_days_off === existingOp.total_days_off && op.cost_vacation_days < existingOp.cost_vacation_days) ) {
            uniqueOpportunitiesMap.set(signature, op);
        }
    });
    
    let uniqueOpportunities = Array.from(uniqueOpportunitiesMap.values());

    uniqueOpportunities.sort((a, b) => {
        if (b.total_days_off !== a.total_days_off) {
            return b.total_days_off - a.total_days_off;
        }
        return a.cost_vacation_days - b.cost_vacation_days; 
    });

    return uniqueOpportunities.slice(0, 30);
};


// --- DOM Manipulation and Event Handling ---
function displayPublicHolidays(holidays, year) {
    if (!holidays || Object.keys(holidays).length === 0) {
        publicHolidaysDisplay.classList.add('hidden');
        return;
    }
    displayYearPh.textContent = year;
    publicHolidaysList.innerHTML = ''; 

    const sortedHolidays = Object.entries(holidays)
        .map(([dateStr, name]) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return { date: new Date(Date.UTC(y, m - 1, d)), name }; // Create Date object using UTC
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    sortedHolidays.forEach(({ date, name }) => {
        const li = document.createElement('li');
        // Display date in user's locale, but based on the UTC date
        const formattedDate = date.toLocaleDateString(navigator.language || 'en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
        const weekday = date.toLocaleDateString(navigator.language || 'en-US', { timeZone: 'UTC', weekday: 'short' });
        li.textContent = `${formattedDate} (${weekday}) - ${name}`;
        publicHolidaysList.appendChild(li);
    });
    publicHolidaysDisplay.classList.remove('hidden');
}

function displayResults(opportunities, year) {
    resultsArea.innerHTML = ''; 

    if (!opportunities || opportunities.length === 0) {
        resultsArea.innerHTML = '<p class="text-gray-600 text-center">No specific high-value opportunities found with the current parameters.</p>';
        return;
    }
    
    const resultsHeader = document.createElement('h2');
    resultsHeader.className = "text-2xl font-semibold text-gray-800 mb-4 text-center";
    resultsHeader.textContent = `Top Vacation Opportunities for ${year}`;
    resultsArea.appendChild(resultsHeader);

    opportunities.forEach((op, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300';

        let vacationDaysHtml = op.vacation_days_to_take.map(dayStr => {
            const [y, m, d] = dayStr.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const dayName = dateObj.toLocaleDateString(navigator.language || 'en-US', { timeZone: 'UTC', weekday: 'short' });
            // Display only day and month for brevity, assuming year is known from context
            return `<li>${dateObj.toLocaleDateString(navigator.language || 'en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' })} (${dayName})</li>`;
        }).join('');
        
        const [sy, sm, sd] = op.resulting_start_date.split('-').map(Number);
        const startDateObj = new Date(Date.UTC(sy, sm - 1, sd));
        const [ey, em, ed] = op.resulting_end_date.split('-').map(Number);
        const endDateObj = new Date(Date.UTC(ey, em - 1, ed));
        const dateFormatOptions = { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };

        card.innerHTML = `
            <h3 class="text-xl font-semibold text-indigo-700 mb-2">Suggestion #${index + 1}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="font-medium text-gray-700">Take ${op.cost_vacation_days} Vacation Day(s):</p>
                    <ul class="list-disc list-inside text-gray-600 ml-4 mt-1 space-y-0.5">${vacationDaysHtml}</ul>
                </div>
                <div>
                    <p class="font-medium text-gray-700">Resulting Time Off:</p>
                    <p class="text-gray-600"><strong class="text-green-600">${op.total_days_off} continuous days</strong></p>
                    <p class="text-gray-500 text-xs">
                        From: ${startDateObj.toLocaleDateString(navigator.language || 'en-GB', dateFormatOptions)}<br />
                        To: ${endDateObj.toLocaleDateString(navigator.language || 'en-GB', dateFormatOptions)}
                    </p>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-indigo-500 font-medium">
                    Efficiency Score: ${typeof op.efficiency_score === 'number' ? op.efficiency_score.toFixed(2) : op.efficiency_score} (Total Off / Vacation Spent)
                </p>
            </div>
        `;
        resultsArea.appendChild(card);
    });
}

function handleGenerateClick() {
    const yearValue = parseInt(yearInput.value, 10);
    const ptoValue = parseInt(ptoInput.value, 10); // Get PTO value

    if (isNaN(yearValue) || yearValue < 1900 || yearValue > 2300) {
        statusArea.innerHTML = '<p class="text-red-500">Please enter a valid year (1900-2300).</p>';
        resultsArea.innerHTML = '';
        publicHolidaysDisplay.classList.add('hidden');
        return;
    }
    // Optional: Validate PTO value if needed, e.g., ptoValue < 0
    if (isNaN(ptoValue) || ptoValue < 0) {
        statusArea.innerHTML = '<p class="text-red-500">Please enter a valid number for PTO days (0 or more).</p>';
        resultsArea.innerHTML = '';
        publicHolidaysDisplay.classList.add('hidden');
        return;
    }


    statusArea.innerHTML = '<div class="loader"></div><p>Calculating suggestions...</p>';
    resultsArea.innerHTML = ''; 
    publicHolidaysDisplay.classList.add('hidden');
    publicHolidaysList.innerHTML = '';
    generateButton.disabled = true;

    setTimeout(() => {
        try {
            const ph = getPublicHolidays(yearValue);
            displayPublicHolidays(ph, yearValue);
            
            const freeBlocks = getNaturalFreeBlocksJS(yearValue, ph);
            const ops = generateVacationOpportunitiesJS(yearValue, freeBlocks, ph);
            displayResults(ops, yearValue);

            let message = `Showing suggestions for ${yearValue}.`;
            if (ops.length === 0) {
                message = `No specific high-value opportunities found for ${yearValue}.`;
            }
            // You can now use ptoValue if you want to display it or use it in further logic
            // For example: message += ` You have ${ptoValue} PTO days.`;
            statusArea.innerHTML = `<p>${message}</p>`;

        } catch (error) {
            console.error("Error generating suggestions:", error);
            statusArea.innerHTML = `<p class="text-red-600">Error: ${error.message || 'Could not generate suggestions.'}</p>`;
        } finally {
            generateButton.disabled = false;
        }
    }, 50); 
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    yearInput = document.getElementById('yearInput');
    ptoInput = document.getElementById('ptoInput'); // Get the new PTO input element
    generateButton = document.getElementById('generateButton');
    resultsArea = document.getElementById('resultsArea');
    statusArea = document.getElementById('statusArea');
    publicHolidaysDisplay = document.getElementById('publicHolidaysDisplay');
    publicHolidaysList = document.getElementById('publicHolidaysList');
    displayYearPh = document.getElementById('displayYearPh');

    statusArea.innerHTML = '<p>Enter a year and PTO days, then click "Generate".</p>'; // Updated initial message
    generateButton.addEventListener('click', handleGenerateClick);
});
