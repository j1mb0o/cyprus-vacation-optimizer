# Cyprus Vacation Optimizer 📅✈️

A web-based tool designed to help users in Cyprus maximize their vacation time by strategically planning Paid Time Off (PTO) around public holidays and weekends.

This application analyzes a given year, identifies all public holidays (including Orthodox Easter-related ones), and suggests optimal vacation periods. For each suggestion, it details the PTO days to take, the total continuous days off achieved, and an efficiency score.

## 🚀 Live Demo

You can try out the Cyprus Vacation Optimizer live at: **[https://j1mb0o.github.io/pages-temp-demo/](https://j1mb0o.github.io/pages-temp-demo/)**

## ✨ Features

*   **Cyprus Public Holiday Calculation:** Accurately calculates fixed and movable (Orthodox Easter-based) public holidays for any given year.
*   **Public Holiday Display:** Lists all public holidays for the selected year, including dates and day of the week.
*   **User Input:** Accepts the target year and the number of available PTO days from the user.
*   **Smart Vacation Suggestions:**
    *   Identifies opportunities to "bridge" small gaps (1-4 workdays) between weekends or public holidays.
    *   Suggests taking small chunks of PTO (1-4 days) to extend existing free periods or create standalone mini-vacations.
*   **Detailed Opportunity Breakdown:** For each suggestion, it shows:
    *   The specific PTO days to book off.
    *   The cost in terms of PTO days used.
    *   The total number of continuous days off you'll get.
    *   The start and end dates of the resulting vacation.
    *   An "efficiency score" (Total Days Off / PTO Days Spent) to help you choose the best value.
*   **Prioritized Results:** Suggestions are sorted to show the longest total days off first, and then by the fewest PTO days spent.
*   **User-Friendly Interface:** Clean and clear presentation of information with a loading state during calculations. Includes custom styling for the loader and enhanced scrollbars for better usability on larger screens.
*   **Custom Styling:** Utilizes Tailwind CSS utility classes for basic styling alongside custom CSS.

## ⚙️ How It Works

1.  **Holiday Data:** The script first compiles a list of all public holidays for the user-specified year. This includes:
    *   Fixed-date holidays (e.g., New Year's Day, Christmas).
    *   Variable holidays based on the Orthodox Easter calculation (e.g., Clean Monday, Orthodox Good Friday, Easter Monday, Whit Monday/Kataklysmos).
2.  **Identifying Free Time:** It then scans the entire year to identify "natural free blocks" – continuous periods composed of weekends and public holidays.
3.  **Generating Opportunities:** The core logic then explores two main types of vacation opportunities:
    *   **Bridging Gaps:** It looks for scenarios where taking a few workdays (1 to `MAX_CONSECUTIVE_VACATION_DAYS_TO_SUGGEST_AS_ONE_CHUNK`, currently 4) can connect two separate natural free blocks, resulting in a much longer continuous vacation.
    *   **Extending Blocks / Standalone:** It considers taking a small chunk of PTO (1 to 4 workdays) and calculates the total time off by including any adjacent weekends or public holidays.
4.  **Scoring & Ranking:** Each potential opportunity is evaluated. An efficiency score is calculated by dividing the total continuous days off by the number of PTO days used. Opportunities are then de-duplicated and sorted, prioritizing those that offer the most days off for the least PTO cost.
5.  **Display:** The calculated public holidays and the top vacation suggestions (currently limited to 30 for performance/clarity) are presented to the user in a clear, card-based format.

## 🛠️ Technology Stack

*   **HTML5**
*   **CSS3:** Custom styles for layout, loader, and scrollbars.
*   **Tailwind CSS:** Utilized for utility classes, particularly for typography and layout helpers.
*   **Vanilla JavaScript (ES6+):** For all logic, date calculations, DOM manipulation, and event handling.

## 🚀 How to Use

1.  Visit the live demo link: **https://j1mb0o.github.io/pages-temp-demo/**
    *   Alternatively, clone this repository or download the files and open the `web/index.html` file in your preferred web browser.
2.  Enter the **Year** you want to plan for (e.g., `2024`).
3.  Enter your available **PTO Days** (e.g., `20`). (Note: Currently, this input is for user reference and doesn't filter results, but it's good practice to input it for future enhancements).
4.  Click the **"Generate Suggestions"** button.
5.  The system will display:
    *   A list of all public holidays for that year.
    *   A set of cards, each representing a vacation opportunity.

## 🖼️ Screenshots

*(It would be great to add a couple of screenshots here showing the input form, the public holidays list, and the vacation suggestion cards!)*

**Example: Input Area**
```
------------------------------------
| Year: [ 2024 ]  PTO Days: [ 20 ] |
|        [Generate Suggestions]    |
------------------------------------
```

**Example: Suggestion Card**
```
--------------------------------------
| Suggestion #1                      |
| Take 1 Vacation Day(s):            |
|  - 26 Apr (Fri)                    |
| Resulting Time Off:                |
|  9 continuous days                 |
|  From: Sat, 20 Apr 2024            |
|  To:   Sun, 28 Apr 2024            |
| Efficiency Score: 9.00             |
--------------------------------------
```

## 🔮 Potential Future Enhancements

*   **PTO Budget Filtering:** Filter suggestions based on the user's actual available PTO days.
*   **Customizable Holidays:** Allow users to add personal important dates or deselect certain public holidays if they are not applicable.
*   **Persistence:** Save user preferences or past searches using local storage.
*   **Internationalization:** Adapt the tool for public holiday schedules in other countries.
*   **PWA:** Convert into a Progressive Web App for offline access and app-like experience.


## Disclaimer
Public holiday data is based on common Cyprus holidays. Always verify with official sources before making any travel plans. The script for Orthodox Easter calculation relies on the `dateutil` library's implementation.

The script was generated by Google Gemini 2.5 Pro, as a fun project
