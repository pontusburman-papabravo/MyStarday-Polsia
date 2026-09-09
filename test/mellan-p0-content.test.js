'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getGoalBySlug, getGoalsForLocale } = require('../src/lib/for-dig-config');

test('school onboarding preview ends on reading, not bedtime story', () => {
  const sv = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/i18n/onboarding-sv-SE.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/i18n/onboarding-en-GB.json'), 'utf8'));
  const svSchool = sv.templateGroups.previewFallback.skola;
  const enSchool = en.templateGroups.previewFallback.skola;
  assert.equal(svSchool[svSchool.length - 1], 'Läsa');
  assert.equal(enSchool[enSchool.length - 1], 'Reading');
  assert.ok(!svSchool.includes('Sagostund'));
  assert.ok(!enSchool.includes('Bedtime story'));
});

test('skolansvar covers 9–12 without becoming a teen goal', () => {
  const goal = getGoalBySlug('skolansvar');
  assert.equal(goal.ageMin, 6);
  assert.equal(goal.ageMax, 12);
});

test('new 9–12 goals activate existing library activities, not pocket money', () => {
  const screen = getGoalBySlug('skarmtid-avtal');
  const leisure = getGoalBySlug('fritid-traning');
  assert.deepEqual(screen.activityNames, ['Läxa', 'Ledig tid']);
  assert.deepEqual(leisure.activityNames, ['Leka utomhus', 'Kvällsaktivitet']);
  assert.equal(screen.primaryAction, 'explore');
  assert.match(screen.tagline, /inte veckopeng/);
});

test('English overlays exist for new 9–12 goals', () => {
  const en = getGoalsForLocale('en-GB');
  const screen = en.find((g) => g.slug === 'skarmtid-avtal');
  const leisure = en.find((g) => g.slug === 'fritid-traning');
  assert.match(screen.headline, /screen time/i);
  assert.match(leisure.headline, /training|free time/i);
  assert.notEqual(screen.headline, getGoalBySlug('skarmtid-avtal').headline);
});
