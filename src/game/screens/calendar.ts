import type { SaveData } from '../save';
import { STRINGS } from '../strings';
import { addMonths, buildMonthGrid, canPageBack, canPageForward, monthIdFromDateKey, type MonthId } from './calendarMonth';

/**
 * The Garden Calendar (ปฏิทินสวน) — a month grid of the Daily Garden's
 * blooms. Every past-or-today cell is playable forever (ADR-0005); future
 * cells are rendered dimmed and inert. No red, no "missed" — an unbloomed
 * day is just a blank cell (ADR-0003).
 */
export function renderCalendar(
  container: HTMLElement,
  save: SaveData,
  todayKey: string,
  onSelectDay: (dateKey: string) => void,
  onBack: () => void,
  onSettings: () => void,
): void {
  const todayMonthId = monthIdFromDateKey(todayKey);
  let viewedMonthId: MonthId = todayMonthId;

  function render(): void {
    container.innerHTML = '';

    const backButton = document.createElement('button');
    backButton.className = 'calendar-back-button';
    backButton.textContent = '◀';
    backButton.setAttribute('aria-label', STRINGS.calendarBackLabel);
    backButton.addEventListener('click', onBack);

    const settingsButton = document.createElement('button');
    settingsButton.className = 'gear-button';
    settingsButton.textContent = '⚙️';
    settingsButton.setAttribute('aria-label', STRINGS.settingsGearLabel);
    settingsButton.addEventListener('click', onSettings);

    const scroll = document.createElement('div');
    scroll.className = 'calendar-scroll';

    const header = document.createElement('div');
    header.className = 'calendar-header';

    const prevButton = document.createElement('button');
    prevButton.className = 'calendar-nav-button';
    prevButton.textContent = '‹';
    prevButton.setAttribute('aria-label', STRINGS.calendarPrevMonth);
    prevButton.disabled = !canPageBack(viewedMonthId);
    prevButton.addEventListener('click', () => {
      viewedMonthId = addMonths(viewedMonthId, -1);
      render();
    });

    const heading = document.createElement('h2');
    heading.className = 'calendar-month-heading';
    heading.textContent = STRINGS.calendarMonthYear(viewedMonthId.month, viewedMonthId.year);

    const nextButton = document.createElement('button');
    nextButton.className = 'calendar-nav-button';
    nextButton.textContent = '›';
    nextButton.setAttribute('aria-label', STRINGS.calendarNextMonth);
    nextButton.disabled = !canPageForward(viewedMonthId, todayMonthId);
    nextButton.addEventListener('click', () => {
      viewedMonthId = addMonths(viewedMonthId, 1);
      render();
    });

    header.append(prevButton, heading, nextButton);

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-weekday-row';
    for (const label of STRINGS.calendarWeekdaysShort) {
      const cell = document.createElement('div');
      cell.className = 'calendar-weekday';
      cell.textContent = label;
      weekdayRow.appendChild(cell);
    }

    const dayGrid = document.createElement('div');
    dayGrid.className = 'calendar-day-grid';

    const bloomedSet = new Set(save.dailyBlooms);
    const cells = buildMonthGrid(viewedMonthId, todayKey, bloomedSet);
    for (const cell of cells) {
      if (!cell) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day calendar-day-empty';
        dayGrid.appendChild(empty);
        continue;
      }

      const dayButton = document.createElement('button');
      dayButton.className = 'calendar-day';
      if (cell.isToday) dayButton.classList.add('is-today');
      if (cell.isFuture) dayButton.classList.add('is-future');
      dayButton.disabled = !cell.playable;
      dayButton.setAttribute('aria-label', STRINGS.calendarDayLabel(cell.day, cell.bloomed));

      if (cell.bloomed && cell.flowerGlyph) {
        const flower = document.createElement('span');
        flower.className = 'calendar-day-flower';
        flower.textContent = cell.flowerGlyph;
        dayButton.appendChild(flower);
      }

      const number = document.createElement('span');
      number.className = 'calendar-day-number';
      number.textContent = String(cell.day);
      dayButton.appendChild(number);

      if (cell.playable) {
        dayButton.addEventListener('click', () => onSelectDay(cell.dateKey));
      }

      dayGrid.appendChild(dayButton);
    }

    scroll.append(header, weekdayRow, dayGrid);
    container.append(backButton, settingsButton, scroll);
  }

  render();
}
