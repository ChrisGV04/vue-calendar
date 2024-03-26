/*
 * Implementation ported from Radix Vue
 */

import type { DateValue } from '@internationalized/date';

// Days of the week, starting with Sunday
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Matcher = (date: DateValue) => boolean;

export type MonthGrid<T> = {
  /**
   * A `DateValue` used to represent the month. Since days
   * from the previous and next months may be included in the
   * calendar grid, we need a source of truth for the value
   * the grid is representing.
   */
  month: DateValue;

  /**
   * An array of all the dates in the current month, including dates from
   * the previous and next months that are used to fill out the calendar grid.
   * This array is useful for rendering the calendar grid in a customizable way,
   * as it provides all the dates that should be displayed in the grid in a flat
   * array.
   */
  dates: T[];
};
