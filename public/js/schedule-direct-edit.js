/**
 * Planner PR B — Direct Day Editing.
 * Time is edited on the weekly-schedule row. Native type=time stays tappable
 * but hidden so iOS cannot paint the current clock on an empty field.
 * Saves through the existing PUT /api/schedules/:id/items/:itemId path.
 */
(function () {
  'use strict';

  function t(key, params) {
    if (window.ScheduleI18n) return ScheduleI18n.t(key, params);
    return window.pt ? window.pt(key, params) : key;
  }

  function escHtml(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function fmtTime(value) {
    if (window.ScheduleCore && typeof ScheduleCore.fmtTime === 'function') {
      return ScheduleCore.fmtTime(value);
    }
    return value ? String(value).substring(0, 5) : '';
  }

  function findItem(itemId) {
    return (typeof scheduleItems !== 'undefined' ? scheduleItems : [])
      .find((item) => String(item.id) === String(itemId)) || null;
  }

  function chipLabel(item) {
    const start = fmtTime(item.start_time);
    if (!start) return t('schedule.editor.addTime');
    const end = fmtTime(item.end_time);
    return end ? `${start}–${end}` : start;
  }

  function timeFieldHtml(itemId, which, value) {
    const labelKey = which === 'start'
      ? 'schedule.chrome.startTimePlaceholder'
      : 'schedule.chrome.endTimePlaceholder';
    const label = t(labelKey);
    const filled = Boolean(value);
    return `<label class="sde-time-field min-h-[44px] relative flex-1 flex items-center justify-center px-3 py-2 border-2 border-lavender rounded-xl">
      <span class="sde-time-value pointer-events-none text-sm font-semibold ${filled ? 'text-navy' : 'text-text-soft'}">${escHtml(filled ? value : label)}</span>
      <input type="time" value="${escHtml(value || '')}" data-sde-item="${escHtml(String(itemId))}" data-sde-which="${which}"
        onchange="ScheduleDirectEdit.setTime('${escHtml(String(itemId))}', '${which}', this.value)"
        class="sde-time-input absolute inset-0 w-full h-full cursor-pointer" aria-label="${escHtml(label)}" />
    </label>`;
  }

  function timeChipHtml(item) {
    if (item.is_once_task) {
      const start = fmtTime(item.start_time);
      return start
        ? `<div class="text-xs text-navy">${escHtml(start)}${item.end_time ? '–' + escHtml(fmtTime(item.end_time)) : ''}</div>`
        : '';
    }
    const start = fmtTime(item.start_time);
    const filled = Boolean(start);
    const aria = filled ? t('schedule.editor.editTime') : t('schedule.editor.addTimeAria');
    return `<button type="button" id="sde-chip-${item.id}" class="sde-time-chip min-h-[44px] px-2 -ml-2 rounded-lg text-xs font-semibold ${filled ? 'text-navy' : 'text-text-soft'} text-left"
      onclick="event.stopPropagation(); ScheduleDirectEdit.toggle('${item.id}')" aria-expanded="false" aria-controls="sde-editor-${item.id}" aria-label="${escHtml(aria)}">${escHtml(chipLabel(item))}</button>`;
  }

  function timeEditorHtml(item) {
    if (item.is_once_task) return '';
    const start = fmtTime(item.start_time);
    const end = fmtTime(item.end_time);
    return `<div id="sde-editor-${item.id}" class="sde-editor hidden mt-2">
      <div class="flex gap-2">
        ${timeFieldHtml(item.id, 'start', start)}
        ${timeFieldHtml(item.id, 'end', end)}
      </div>
    </div>`;
  }

  function closeEditorsExcept(itemId) {
    const keepEditor = itemId ? `sde-editor-${itemId}` : '';
    const keepChip = itemId ? `sde-chip-${itemId}` : '';
    document.querySelectorAll('.sde-editor').forEach((el) => {
      if (el.id !== keepEditor) el.classList.add('hidden');
    });
    document.querySelectorAll('.sde-time-chip').forEach((el) => {
      if (el.id !== keepChip) el.setAttribute('aria-expanded', 'false');
    });
  }

  function toggle(itemId) {
    const editor = document.getElementById(`sde-editor-${itemId}`);
    const chip = document.getElementById(`sde-chip-${itemId}`);
    if (!editor) return;
    const willOpen = editor.classList.contains('hidden');
    closeEditorsExcept(willOpen ? itemId : null);
    editor.classList.toggle('hidden', !willOpen);
    if (chip) chip.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }

  function restoreOpenEditor(itemId) {
    const editor = document.getElementById(`sde-editor-${itemId}`);
    if (!editor || !editor.classList.contains('hidden')) return;
    toggle(itemId);
  }

  async function putItemTimes(itemId, startTime, endTime) {
    const item = findItem(itemId);
    if (!item || !currentScheduleId) return { ok: false, error: 'missing-item' };
    if (startTime && endTime && endTime < startTime) {
      return { ok: false, error: 'end-before-start' };
    }
    const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        start_time: startTime || null,
        end_time: endTime || null,
        section: item.section,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'save-failed' };
    }
    return { ok: true };
  }

  let saveTail = Promise.resolve();

  function setTime(itemId, which, value) {
    saveTail = saveTail.then(() => persistTime(itemId, which, value)).catch(() => {});
    return saveTail;
  }

  async function persistTime(itemId, which, value) {
    const item = findItem(itemId);
    if (!item) return;
    const nextStart = which === 'start' ? value : fmtTime(item.start_time);
    const nextEnd = which === 'end' ? value : fmtTime(item.end_time);
    const result = await putItemTimes(itemId, nextStart, nextEnd);
    if (!result.ok) {
      if (result.error === 'end-before-start') {
        showToast(t('schedule.validation.endBeforeStart'), true);
      } else {
        showToast(result.error || t('schedule.validation.generic'), true);
      }
      return;
    }
    item.start_time = nextStart || null;
    item.end_time = nextEnd || null;
    showToast(t('schedule.toasts.saved'));
    if (typeof loadScheduleForDay === 'function') await loadScheduleForDay();
    restoreOpenEditor(itemId);
  }

  window.ScheduleDirectEdit = {
    timeChipHtml,
    timeEditorHtml,
    toggle,
    setTime,
    putItemTimes,
  };
})();
