(function () {
  'use strict';
  function t(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }
  function activityCount(n) {
    return Number(n) === 1 ? t('schedule.activityCount.one') : t('schedule.activityCount.other', { count: n });
  }
  function sentenceCase(value) {
    const s = String(value || '');
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function recurrenceRemoveCopy(dayIndex, activityName) {
    const dayPlural = t('schedule.daysPlural.' + dayIndex);
    const fallbackName = t('schedule.modals.recurrence.activityFallback');
    const name = activityName == null || activityName === '' ? fallbackName : String(activityName);
    return {
      title: t('schedule.modals.recurrence.deleteTitle'),
      activityName: name,
      activityQuoted: '"' + name + '"',
      onceLbl: t('schedule.modals.recurrence.onceLblRemove'),
      onceDesc: t('schedule.modals.recurrence.onceDescRemove'),
      weeklyLbl: t('schedule.modals.recurrence.weeklyDeleteLbl', { day: sentenceCase(dayPlural) }),
      weeklyDesc: t('schedule.modals.recurrence.weeklyDescRemove', { day: dayPlural }),
      allDaysLbl: t('schedule.modals.recurrence.allDaysLbl'),
      allDaysDesc: t('schedule.modals.recurrence.allDaysDesc'),
      cancel: t('schedule.modals.common.cancel'),
      dayName: t('schedule.days.' + dayIndex),
      dayPlural: dayPlural,
    };
  }
  window.ScheduleI18n = {
    t: t,
    activityCount: activityCount,
    recurrenceRemoveCopy: recurrenceRemoveCopy,
  };
})();
