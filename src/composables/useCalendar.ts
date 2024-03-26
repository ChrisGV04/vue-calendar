/*
 * Adapted from Radix Vue
 */

import { type DateValue, endOfMonth, isSameDay, isSameMonth, startOfMonth } from '@internationalized/date';
import { type MaybeRefOrGetter, type Ref, computed, ref, toValue, watch } from 'vue';
import {
  type DayOfWeek,
  type Matcher,
  type MonthGrid,
  type WeekDayFormat,
  createMonths,
  isAfter,
  isBefore,
  toDate,
} from '../utils';
import { useDateFormatter } from './useDateFormatter';

export type UseCalendarProps = {
  locale: string;
  weekStartsOn: DayOfWeek; // TODO: Evaluate if needed
  /** Intl.DateTimeFormat option for `weekday` */
  weekdayFormat: WeekDayFormat;
  /** Number of months to display at once */
  numberOfMonths: number;
  /** The minimum date that can be selected */
  minValue: MaybeRefOrGetter<DateValue | undefined>;
  /** The maximum date that can be selected */
  maxValue: MaybeRefOrGetter<DateValue | undefined>;
  /** Disable calendar interactivity */
  disabled: MaybeRefOrGetter<boolean>;
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks: boolean;
  /** When `true`, next/prev navigates by the number of months displayed. When `false`, navigates by one month at a time */
  pagedNavigation: boolean;
  /** Function that returns whether or not a date is disabled */
  isDateDisabled?: Matcher;
  /** Function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher;
  /** Date used to control which month is in view */
  dateCursor: Ref<DateValue>;
};

export type UseCalendarStateProps = {
  /** Function that returns whether or not a date is disabled */
  isDateDisabled: Matcher;
  /** Function that returns whether or not a date is unavailable */
  isDateUnavailable: Matcher;
  /** The currently selected date or array of dates */
  selection: MaybeRefOrGetter<DateValue | DateValue[] | undefined>;
};

/** Creates utilities to check the state of dates inside of a calendar */
export function useCalendarState(props: UseCalendarStateProps) {
  function isDateSelected(dateObj: DateValue) {
    const _selected = toValue(props.selection);
    if (Array.isArray(_selected)) return _selected.some((d) => isSameDay(d, dateObj));
    if (!_selected) return false;
    return isSameDay(_selected, dateObj);
  }

  const isInvalid = computed(() => {
    const _selected = toValue(props.selection);

    if (Array.isArray(_selected)) {
      if (!_selected.length) return false;
      for (const dateObj of _selected) {
        if (props.isDateDisabled?.(dateObj)) return true;
        if (props.isDateUnavailable?.(dateObj)) return true;
      }
    } else {
      if (!_selected) return false;
      if (props.isDateDisabled?.(_selected)) return true;
      if (props.isDateUnavailable?.(_selected)) return true;
    }
    return false;
  });

  return {
    isDateSelected,
    isInvalid,
  };
}

export function useCalendar(props: UseCalendarProps) {
  const formatter = useDateFormatter(props.locale);
  const dateCursor = toValue(props.dateCursor).copy();
  const minValue = toValue(props.minValue) ? dateCursor.set({ ...toValue(props.minValue) }) : undefined;
  const maxValue = toValue(props.maxValue) ? dateCursor.set({ ...toValue(props.maxValue) }) : undefined;

  const months = ref<MonthGrid<DateValue>[]>(
    createMonths({
      dateObj: dateCursor,
      locale: props.locale,
      fixedWeeks: props.fixedWeeks,
      weekStartsOn: props.weekStartsOn,
      numberOfMonths: props.numberOfMonths,
    }),
  );

  const visibleMonths = computed(() => months.value.map((month) => month.month));

  function isOutsideVisibleView(date: DateValue) {
    return !visibleMonths.value.some((month) => isSameMonth(date, month as DateValue));
  }

  const isNextButtonDisabled = computed(() => {
    if (!maxValue || !months.value.length) return false;
    if (toValue(props.disabled)) return true;

    const lastMontInView = months.value[months.value.length - 1].month;
    const firstDayOfNextPage = startOfMonth(lastMontInView.add({ months: 1 }));
    return isAfter(firstDayOfNextPage, maxValue);
  });

  const isPrevButtonDisabled = computed(() => {
    if (!minValue || !months.value.length) return false;
    if (toValue(props.disabled)) return true;

    const firstMonthInView = months.value[0].month;
    const lastDayOfPrevPage = endOfMonth(firstMonthInView.subtract({ months: 1 }));
    return isBefore(lastDayOfPrevPage, minValue);
  });

  function isDateDisabled(dateObj: DateValue) {
    if (props.isDateDisabled?.(dateObj) || toValue(props.disabled)) return true;
    if (maxValue && isAfter(dateObj, maxValue)) return true;
    if (minValue && isBefore(dateObj, minValue)) return true;
    return false;
  }

  const isDateUnavailable = (date: DateValue) => {
    if (props.isDateUnavailable?.(date)) return true;
    return false;
  };

  const weekdays = computed(() => {
    if (!months.value.length) return [];

    const names: string[] = [];
    for (let idx = 0; idx < 7; idx++) {
      names.push(formatter.dayOfWeek(toDate(months.value[0].dates[idx] as DateValue), props.weekdayFormat));
    }

    return names;
  });

  const nextPage = () => {
    const firstMonth = months.value[0].month;

    const newMonths = createMonths({
      locale: props.locale,
      fixedWeeks: props.fixedWeeks,
      weekStartsOn: props.weekStartsOn,
      numberOfMonths: props.numberOfMonths,
      dateObj: firstMonth.add({ months: props.pagedNavigation ? props.numberOfMonths : 1 }),
    });

    months.value = newMonths;
    props.dateCursor.value = startOfMonth(newMonths[0].month);
  };

  const prevPage = () => {
    const firstMonth = months.value[0].month;

    const newMonths = createMonths({
      locale: props.locale,
      fixedWeeks: props.fixedWeeks,
      weekStartsOn: props.weekStartsOn,
      numberOfMonths: props.numberOfMonths,
      dateObj: firstMonth.subtract({ months: props.pagedNavigation ? props.numberOfMonths : 1 }),
    });

    props.dateCursor.value = startOfMonth(newMonths[0].month);
  };

  // Watch for controlled dateCursor changes
  watch(props.dateCursor, (value, oldValue) => {
    if (!isSameMonth(dateCursor.set({ ...value }), dateCursor.set({ ...oldValue }))) {
      months.value = createMonths({
        locale: props.locale,
        fixedWeeks: props.fixedWeeks,
        weekStartsOn: props.weekStartsOn,
        numberOfMonths: props.numberOfMonths,
        dateObj: dateCursor.set({ ...value }),
      });
    }
  });

  const headingValue = computed(() => {
    if (!months.value.length) return '';

    if (props.locale !== formatter.getLocale()) formatter.setLocale(props.locale);

    if (months.value.length === 1) {
      const month = toDate(months.value[0].month as DateValue);
      return formatter.fullMonthAndYear(month);
    }

    const startMonth = toDate(months.value[0].month as DateValue);
    const endMonth = toDate(months.value[months.value.length - 1].month as DateValue);

    const startMonthName = formatter.fullMonth(startMonth);
    const endMonthName = formatter.fullMonth(endMonth);
    const startMonthYear = formatter.fullYear(startMonth);
    const endMonthYear = formatter.fullYear(endMonth);

    const content =
      startMonthYear === endMonthYear
        ? `${startMonthName} - ${endMonthName} ${endMonthYear}`
        : `${startMonthName} ${startMonthYear} - ${endMonthName} ${endMonthYear}`;

    return content;
  });

  return {
    months,
    isDateDisabled,
    isDateUnavailable,
    isNextButtonDisabled,
    isPrevButtonDisabled,
    weekdays,
    visibleMonths,
    isOutsideVisibleView,
    formatter,
    nextPage,
    prevPage,
    headingValue,
  };
}
