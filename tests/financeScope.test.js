import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesCampusFinance } from '../src/utils/financeHelpers.js';

test('matchesCampusFinance: Central matches central and empty/legacy, rejects other campuses', () => {
  const centralCampus = { id: 'central-seed', slug: 'sedecentral', name: 'Sede Central' };

  assert.equal(matchesCampusFinance('central', centralCampus), true);
  assert.equal(matchesCampusFinance('sedecentral', centralCampus), true);
  assert.equal(matchesCampusFinance('', centralCampus), true);
  assert.equal(matchesCampusFinance(null, centralCampus), true);

  assert.equal(matchesCampusFinance('las-heras', centralCampus), false);
  assert.equal(matchesCampusFinance('lasheras', centralCampus), false);
  assert.equal(matchesCampusFinance('apostoles', centralCampus), false);
});

test('matchesCampusFinance: Las Heras only matches its own sede and rejects central or legacy', () => {
  const lasHerasCampus = { id: 'las-heras-seed', slug: 'las-heras', name: 'Las Heras' };

  assert.equal(matchesCampusFinance('las-heras', lasHerasCampus), true);
  assert.equal(matchesCampusFinance('lasheras', lasHerasCampus), true);
  assert.equal(matchesCampusFinance('Sede Las Heras', lasHerasCampus), true);

  assert.equal(matchesCampusFinance('central', lasHerasCampus), false);
  assert.equal(matchesCampusFinance('', lasHerasCampus), false);
  assert.equal(matchesCampusFinance(null, lasHerasCampus), false);
  assert.equal(matchesCampusFinance('apostoles', lasHerasCampus), false);
});

test('matchesCampusFinance: Apóstoles only matches its own sede and rejects central or legacy', () => {
  const apostolesCampus = { id: 'apostoles-seed', slug: 'apostoles', name: 'Apóstoles' };

  assert.equal(matchesCampusFinance('apostoles', apostolesCampus), true);
  assert.equal(matchesCampusFinance('Sede Apóstoles', apostolesCampus), true);

  assert.equal(matchesCampusFinance('central', apostolesCampus), false);
  assert.equal(matchesCampusFinance('', apostolesCampus), false);
  assert.equal(matchesCampusFinance(null, apostolesCampus), false);
  assert.equal(matchesCampusFinance('las-heras', apostolesCampus), false);
});
