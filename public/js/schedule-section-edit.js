/**
 * Planner PR B2 — on-row section editing.
 * Section is changed on the weekly-schedule row. Saves through the existing
 * PUT /api/schedules/:id/items/:itemId path. Name stays behind name-tap / ⋯.
 */
(function () {
  'use strict';

  const SECTION_KEYS = ['morgon', 'dag', 'kvall', 'natt'];

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

  function sectionLabel(key) {
    const k = SECTION_KEYS.includes(key) ? key : 'dag';
    return t('schedule.sections.' + k);
  }

  function sectionChipHtml(item) {
    if (item.is_once_task) return '';
    const key = SECTION_KEYS.includes(item.section) ? item.section : 'dag';
    const aria = t('schedule.editor.editSection');
    return `<button type="button" id="sse-chip-${item.id}" class="sse-section-chip min-h-[44px] min-w-[44px] px-2 rounded-lg text-xs font-semibold text-navy text-left"
      onclick="event.stopPropagation(); ScheduleSectionEdit.toggle('${item.id}')" aria-expanded="false" aria-controls="sse-editor-${item.id}" aria-label="${escHtml(aria)}">${escHtml(sectionLabel(key))}</button>`;
  }

  function sectionEditorHtml(item) {
    if (item.is_once_task) return '';
    const current = SECTION_KEYS.includes(item.section) ? item.section : 'dag';
    const buttons = SECTION_KEYS.map((key) => {
      const pressed = key === current ? 'true' : 'false';
      const active = key === current ? 'sse-section-option--active border-navy text-navy' : 'border-lavender text-text-soft';
      return `<button type="button" class="sse-section-option min-h-[44px] flex-1 px-2 py-2 border-2 rounded-xl text-xs font-semibold ${active}"
        data-sse-item="${escHtml(String(item.id))}" data-sse-section="${key}" aria-pressed="${pressed}"
        onclick="event.stopPropagation(); ScheduleSectionEdit.setSection('${escHtml(String(item.id))}', '${key}')">${escHtml(sectionLabel(key))}</button>`;
    }).join('');
    return `<div id="sse-editor-${item.id}" class="sse-editor hidden mt-2">
      <div class="flex flex-wrap gap-2" role="group" aria-label="${escHtml(t('schedule.editor.editSection'))}">${buttons}</div>
    </div>`;
  }

  function closeTimeEditors() {
    document.querySelectorAll('.sde-editor').forEach((el) => el.classList.add('hidden'));
    document.querySelectorAll('.sde-time-chip').forEach((el) => el.setAttribute('aria-expanded', 'false'));
  }

  function closeEditorsExcept(itemId) {
    const keepEditor = itemId ? `sse-editor-${itemId}` : '';
    const keepChip = itemId ? `sse-chip-${itemId}` : '';
    document.querySelectorAll('.sse-editor').forEach((el) => {
      if (el.id !== keepEditor) el.classList.add('hidden');
    });
    document.querySelectorAll('.sse-section-chip').forEach((el) => {
      if (el.id !== keepChip) el.setAttribute('aria-expanded', 'false');
    });
    if (itemId) closeTimeEditors();
  }

  function toggle(itemId) {
    const editor = document.getElementById(`sse-editor-${itemId}`);
    const chip = document.getElementById(`sse-chip-${itemId}`);
    if (!editor) return;
    const willOpen = editor.classList.contains('hidden');
    closeEditorsExcept(willOpen ? itemId : null);
    editor.classList.toggle('hidden', !willOpen);
    if (chip) chip.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }

  function restoreOpenEditor(itemId) {
    const editor = document.getElementById(`sse-editor-${itemId}`);
    if (!editor || !editor.classList.contains('hidden')) return;
    toggle(itemId);
  }

  async function putItemSection(itemId, section) {
    const item = findItem(itemId);
    if (!item || !currentScheduleId) return { ok: false, error: 'missing-item' };
    if (!SECTION_KEYS.includes(section)) return { ok: false, error: 'invalid-section' };
    const res = await window.apiFetch(`/api/schedules/${currentScheduleId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        start_time: fmtTime(item.start_time) || null,
        end_time: fmtTime(item.end_time) || null,
        section,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'save-failed' };
    }
    return { ok: true };
  }

  let saveTail = Promise.resolve();

  function setSection(itemId, section) {
    saveTail = saveTail.then(() => persistSection(itemId, section)).catch(() => {});
    return saveTail;
  }

  async function persistSection(itemId, section) {
    const item = findItem(itemId);
    if (!item) return;
    if (item.section === section) {
      toggle(itemId);
      return;
    }
    const result = await putItemSection(itemId, section);
    if (!result.ok) {
      showToast(result.error || t('schedule.validation.generic'), true);
      return;
    }
    item.section = section;
    showToast(t('schedule.toasts.saved'));
    if (typeof loadScheduleForDay === 'function') await loadScheduleForDay();
    restoreOpenEditor(itemId);
  }

  window.ScheduleSectionEdit = {
    sectionChipHtml,
    sectionEditorHtml,
    toggle,
    setSection,
    putItemSection,
    SECTION_KEYS,
  };
})();
