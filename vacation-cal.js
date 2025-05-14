import React, { useState, useCallback, useEffect } from 'react';

// Tailwind CSS is assumed to be available globally (e.g., via a CDN link in your main HTML file)
// <script src="https://cdn.tailwindcss.com"></script>

// --- Configuration (mirrors Python script) ---
const MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK = 4;

// --- Date Helper Functions (JavaScript) ---

// Helper to add days to a date (returns new Date object)
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Helper to check if two dates are the same day
const isSameDay = (date1, date2) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

// Orthodox Easter Calculation in JavaScript
// (Meeus/Jones/Butcher algorithm for Gregorian calendar, adapted for Orthodox)
const getOrthodoxEaster = (year) => {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    return new Date(year, month - 1, day + 13); // Add 13 days for Julian to Gregorian correction for Easter
};


const calculateOrthodoxEasterRelatedHolidays = (year) => {
    const orthodoxEasterSunday = getOrthodoxEaster(year);
    const holidays = {};

    // Helper to store date as YYYY-MM-DD string key
    const formatDateKey = (date) => date.toISOString().split('T')[0];

    // Clean Monday: 48 days before Orthodox Easter Sunday
    holidays[formatDateKey(addDays(orthodoxEasterSunday, -48))] = "Clean Monday";
    // Orthodox Good Friday: 2 days before Orthodox Easter Sunday
    holidays[formatDateKey(addDays(orthodoxEasterSunday, -2))] = "Orthodox Good Friday";
    // Orthodox Easter Monday: 1 day after Orthodox Easter Sunday
    holidays[formatDateKey(addDays(orthodoxEasterSunday, 1))] = "Orthodox Easter Monday";
    // Orthodox Whit Monday (Kataklysmos): 50 days after Orthodox Easter Sunday
    holidays[formatDateKey(addDays(orthodoxEasterSunday, 50))] = "Orthodox Whit Monday (Kataklysmos)";
    
    return holidays;
};

const getPublicHolidays = (year) => {
    const fixedHolidaysData = [
        { name: "New Year's Day", month: 0, day: 1 }, // Month is 0-indexed
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
    const formatDateKey = (date) => date.toISOString().split('T')[0];

    fixedHolidaysData.forEach(h => {
        try {
            const date = new Date(year, h.month, h.day);
            if (date.getFullYear() === year) { // Basic validation
                 publicHolidays[formatDateKey(date)] = h.name;
            }
        } catch (e) {
            console.warn(`Could not create date for ${h.name} in ${year}`);
        }
    });

    const easterHolidays = calculateOrthodoxEasterRelatedHolidays(year);
    Object.assign(publicHolidays, easterHolidays);
    return publicHolidays;
};

const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday (0) or Saturday (6)
};

const isPH = (date, publicHolidaysForYear) => {
    const dateKey = date.toISOString().split('T')[0];
    return !!publicHolidaysForYear[dateKey];
};

const isWorkdayJS = (date, publicHolidaysForYear) => {
    return !isWeekend(date) && !isPH(date, publicHolidaysForYear);
};

const getAllDaysInYearJS = (year) => {
    const days = [];
    const date = new Date(year, 0, 1);
    while (date.getFullYear() === year) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
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
                freeBlocks.push({ start: currentBlockStart, end: allDays[i - 1] });
                currentBlockStart = null;
            }
        }
    });
    if (currentBlockStart !== null) {
        freeBlocks.push({ start: currentBlockStart, end: allDays[allDays.length - 1] });
    }
    return freeBlocks; // No need to sort if iterating chronologically
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

        if (dayAfterBlockA > dayBeforeBlockB) continue;

        let gapDaysToTake = [];
        let currentGapDay = new Date(dayAfterBlockA);
        while (currentGapDay <= dayBeforeBlockB) {
            if (isWorkdayJS(currentGapDay, publicHolidaysForYear)) {
                gapDaysToTake.push(new Date(currentGapDay));
            }
            currentGapDay = addDays(currentGapDay, 1);
        }

        if (gapDaysToTake.length > 0 && gapDaysToTake.length <= MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK) {
            const cost = gapDaysToTake.length;
            const resultingStart = naturalFreeBlocks[i].start;
            const resultingEnd = naturalFreeBlocks[i+1].end;
            const totalDaysOff = (resultingEnd - resultingStart) / (1000 * 60 * 60 * 24) + 1;
            const efficiency = cost > 0 ? totalDaysOff / cost : Infinity;
            opportunities.push({
                vacation_days_to_take: gapDaysToTake.map(d => d.toISOString().split('T')[0]),
                cost_vacation_days: cost,
                resulting_start_date: resultingStart.toISOString().split('T')[0],
                resulting_end_date: resultingEnd.toISOString().split('T')[0],
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
            for (let i = 0; i < chunkSize; i++) {
                if (dayIndex + i >= allDaysInYear.length) {
                    isValidChunk = false; break;
                }
                const currentDayInChunk = allDaysInYear[dayIndex + i];
                if (!isWorkdayJS(currentDayInChunk, publicHolidaysForYear)) {
                    isValidChunk = false; break;
                }
                vacationChunkDates.push(new Date(currentDayInChunk));
            }

            if (!isValidChunk) continue;

            let currentHolidayStart = new Date(vacationChunkDates[0]);
            let currentHolidayEnd = new Date(vacationChunkDates[vacationChunkDates.length - 1]);

            let tempDayBefore = addDays(currentHolidayStart, -1);
            while (tempDayBefore >= allDaysInYear[0] && (isWeekend(tempDayBefore) || isPH(tempDayBefore, publicHolidaysForYear))) {
                currentHolidayStart = new Date(tempDayBefore);
                tempDayBefore = addDays(tempDayBefore, -1);
            }

            let tempDayAfter = addDays(currentHolidayEnd, 1);
            while (tempDayAfter <= allDaysInYear[allDaysInYear.length - 1] && (isWeekend(tempDayAfter) || isPH(tempDayAfter, publicHolidaysForYear))) {
                currentHolidayEnd = new Date(tempDayAfter);
                tempDayAfter = addDays(tempDayAfter, 1);
            }
            
            const cost = vacationChunkDates.length;
            const totalDaysOff = (currentHolidayEnd - currentHolidayStart) / (1000 * 60 * 60 * 24) + 1;
            const efficiency = cost > 0 ? totalDaysOff / cost : Infinity;
            
            opportunities.push({
                vacation_days_to_take: vacationChunkDates.map(d => d.toISOString().split('T')[0]),
                cost_vacation_days: cost,
                resulting_start_date: currentHolidayStart.toISOString().split('T')[0],
                resulting_end_date: currentHolidayEnd.toISOString().split('T')[0],
                total_days_off: Math.round(totalDaysOff),
                efficiency_score: efficiency,
            });
        }
    });

    // Deduplication and Sorting
    const uniqueOpportunitiesMap = new Map();
    opportunities.forEach(op => {
        const signature = `${op.vacation_days_to_take.join(',')}-${op.resulting_start_date}-${op.resulting_end_date}`;
        if (!uniqueOpportunitiesMap.has(signature) || 
            (uniqueOpportunitiesMap.has(signature) && op.total_days_off > uniqueOpportunitiesMap.get(signature).total_days_off)) {
            uniqueOpportunitiesMap.set(signature, op);
        }
    });
    
    let uniqueOpportunities = Array.from(uniqueOpportunitiesMap.values());

    uniqueOpportunities.sort((a, b) => {
        if (b.total_days_off !== a.total_days_off) {
            return b.total_days_off - a.total_days_off;
        }
        return a.cost_vacation_days - b.cost_vacation_days; // Fewer cost days is better
    });

    return uniqueOpportunities.slice(0, 30); // Return top 30
};


// --- React Components ---
const Loader = () => (
    <div className="loader border-5 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin mx-auto my-5"></div>
);

const App = () => {
    const [year, setYear] = useState(new Date().getFullYear() + 1); // Default to next year
    const [publicHolidays, setPublicHolidays] = useState({});
    const [opportunities, setOpportunities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Enter a year and click "Generate".');
    const [processedYear, setProcessedYear] = useState(null);


    const handleGenerateSuggestions = useCallback(() => {
        if (isNaN(year) || year < 1900 || year > 2300) {
            setStatusMessage("Please enter a valid year (1900-2300).");
            setPublicHolidays({});
            setOpportunities([]);
            setProcessedYear(null);
            return;
        }
        setIsLoading(true);
        setStatusMessage("Calculating suggestions...");
        setOpportunities([]); // Clear previous opportunities
        setPublicHolidays({}); // Clear previous public holidays

        // Simulate async operation for UI responsiveness
        setTimeout(() => {
            try {
                const ph = getPublicHolidays(year);
                setPublicHolidays(ph);
                const freeBlocks = getNaturalFreeBlocksJS(year, ph);
                const ops = generateVacationOpportunitiesJS(year, freeBlocks, ph);
                setOpportunities(ops);
                setProcessedYear(year);
                if (ops.length === 0) {
                    setStatusMessage(`No specific high-value opportunities found for ${year}.`);
                } else {
                    setStatusMessage(`Showing suggestions for ${year}.`);
                }
            } catch (error) {
                console.error("Error generating suggestions:", error);
                setStatusMessage(`Error: ${error.message || 'Could not generate suggestions.'}`);
                setOpportunities([]);
                setPublicHolidays({});
            } finally {
                setIsLoading(false);
            }
        }, 50); // Small timeout to allow UI update before heavy computation
    }, [year]);
    
    // Effect to generate suggestions when the component mounts with the default year
    useEffect(() => {
        handleGenerateSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount with the initial year

    const sortedPublicHolidays = Object.entries(publicHolidays)
        .map(([dateStr, name]) => ({ date: new Date(dateStr + 'T00:00:00'), name })) // Ensure date is parsed correctly for sorting
        .sort((a, b) => a.date - b.date);

    return (
        <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl">
                <header className="text-center mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                        Cyprus Holiday Optimizer
                    </h1>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">Maximize your time off in Cyprus! (React Version)</p>
                </header>

                <div className="mb-6">
                    <label htmlFor="yearInput" className="block text-sm font-medium text-gray-700 mb-1">Enter Year:</label>
                    <input
                        type="number"
                        id="yearInput"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., 2025"
                    />
                </div>

                <button
                    onClick={handleGenerateSuggestions}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating...' : 'Generate Suggestions'}
                </button>

                <div id="statusArea" className="mt-6 text-center text-gray-600">
                    {isLoading ? <Loader /> : <p>{statusMessage}</p>}
                </div>

                {processedYear && Object.keys(publicHolidays).length > 0 && !isLoading && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Public Holidays for {processedYear}:</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 max-h-48 overflow-y-auto">
                            {sortedPublicHolidays.map(({ date, name }) => (
                                <li key={date.toISOString()}>
                                    {date.toLocaleDateString(navigator.language || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} 
                                    ({date.toLocaleDateString(navigator.language || 'en-US', { weekday: 'short' })}) - {name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div id="resultsAreaWrapper" className="mt-8">
                    <div id="resultsArea" className="space-y-4">
                        {!isLoading && opportunities.length > 0 && (
                             <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                                Top Vacation Opportunities for {processedYear}
                            </h2>
                        )}
                        {!isLoading && opportunities.map((op, index) => {
                            const startDateObj = new Date(op.resulting_start_date + 'T00:00:00Z'); // Use T00:00:00Z to ensure UTC parsing
                            const endDateObj = new Date(op.resulting_end_date + 'T00:00:00Z');
                            const dateFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' };


                            return (
                                <div key={index} className="bg-white p-5 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                                    <h3 className="text-xl font-semibold text-indigo-700 mb-2">Suggestion #{index + 1}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-700">Take {op.cost_vacation_days} Vacation Day(s):</p>
                                            <ul className="list-disc list-inside text-gray-600 ml-4 mt-1 space-y-0.5">
                                                {op.vacation_days_to_take.map(dayStr => {
                                                    const dayDateObj = new Date(dayStr + 'T00:00:00Z');
                                                    return (
                                                        <li key={dayStr}>
                                                            {dayDateObj.toLocaleDateString(navigator.language || 'en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })} 
                                                            ({dayDateObj.toLocaleDateString(navigator.language || 'en-US', { weekday: 'short', timeZone: 'UTC' })})
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700">Resulting Time Off:</p>
                                            <p className="text-gray-600"><strong className="text-green-600">{op.total_days_off} continuous days</strong></p>
                                            <p className="text-gray-500 text-xs">
                                                From: {startDateObj.toLocaleDateString(navigator.language || 'en-GB', dateFormatOptions)}<br />
                                                To: {endDateObj.toLocaleDateString(navigator.language || 'en-GB', dateFormatOptions)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs text-indigo-500 font-medium">
                                            Efficiency Score: {typeof op.efficiency_score === 'number' ? op.efficiency_score.toFixed(2) : op.efficiency_score} (Total Off / Vacation Spent)
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <footer className="text-center mt-8 text-xs text-gray-500">
                <p>Calculations are based on Cyprus public holidays.</p>
                <p>Always verify holiday dates with official sources.</p>
            </footer>
        </div>
    );
};

export default App;

// To use this component, you would typically render it in your main application file (e.g., index.js or main.jsx):
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App'; // Assuming this file is App.jsx
// import './index.css'; // If you have a global CSS file for Tailwind base styles

// ReactDOM.create-root(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
