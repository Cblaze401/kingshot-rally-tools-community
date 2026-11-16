
/*
 * Reference for the supplied Kingshot client's NORMAL-WORLD PvP march preview.
 * This is not an implementation of verified fractional server time.
 * No dependencies, network access, DOM access, or game-code execution.
 * Browser: MarchCalculation.calculateFromVisible({...})
 * Node: require('./march-calculation-reference.js')
 * Verification: node march-calculation-reference.js --verify
 */
const MarchCalculation = (() => {
  'use strict';
  const CENTRAL = Object.freeze({ x1: 552, y1: 552, x2: 647, y2: 647 });
  const PRESETS = Object.freeze({
    castle: Object.freeze({ name: 'Castle', visible: [597, 597], center: [600, 600] }),
    south: Object.freeze({ name: 'South Turret', visible: [594, 594], center: [595, 595] }),
    west: Object.freeze({ name: 'West Turret', visible: [594, 604], center: [595, 605] }),
    east: Object.freeze({ name: 'East Turret', visible: [604, 594], center: [605, 595] }),
    north: Object.freeze({ name: 'North Turret', visible: [604, 604], center: [605, 605] })
  });
  const OFFSETS = Object.freeze({ point: 0, town: 1, tower: 1, castle: 3 });
  function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
    return value;
  }
  function point(value, name) {
    if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name} must be [x, y]`);
    return [finite(value[0], `${name}.x`), finite(value[1], `${name}.y`)];
  }
  function center(position, anchor) {
    if (!Object.hasOwn(OFFSETS, anchor)) throw new RangeError('Anchor must be point, town, tower, or castle');
    const p = point(position, 'position'), offset = OFFSETS[anchor];
    return [p[0] + offset, p[1] + offset];
  }
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const squaredDistance = (a, b) => Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2);
  const distance = (a, b) => Math.pow(squaredDistance(a, b), 0.5);
  const nearest = value => Math.floor(value + 0.5); // Matches client boundary-delta rounding, including negatives.
  const inside = p => CENTRAL.x1 <= p[0] && p[0] <= CENTRAL.x2 && CENTRAL.y1 <= p[1] && p[1] <= CENTRAL.y2;
  const cross = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]);
  const onSegment = (value, a, b, p) => value === 0 && (p[0] - a[0]) * (p[0] - b[0]) <= 0 && (p[1] - a[1]) * (p[1] - b[1]) <= 0;

  // Arithmetic and branch order translated from world_march_util prototype 5.
  function intersection(a, b, c, d) {
    const s1 = cross(a, b, c);
    if (onSegment(s1, a, b, c)) return c;
    const s2 = cross(a, b, d);
    if (onSegment(s2, a, b, d)) return d;
    if (s1 * s2 > 0) return null;
    const s3 = cross(c, d, a);
    if (onSegment(s3, c, d, a)) return a;
    const s4 = s3 + s1 - s2;
    if (onSegment(s4, c, d, b)) return b;
    if (s3 * s4 > 0) return null;
    const fraction = s3 / (s2 - s1);
    return [a[0] + nearest(fraction * (b[0] - a[0])), a[1] + nearest(fraction * (b[1] - a[1]))];
  }

  // Preserves the client order: bottom edge, left edge, top edge, right edge.
  function insideSegment(a, b) {
    let first = inside(a) ? a : null;
    let last = inside(b) ? b : null;
    if (first && last) return [first, last];
    const { x1, y1, x2, y2 } = CENTRAL;
    const bl = [x1, y1], br = [x2, y1], tl = [x1, y2], tr = [x2, y2];
    for (const [c, d] of [[bl, br], [bl, tl], [tl, tr], [br, tr]]) {
      if (first && last) break;
      const hit = intersection(a, b, c, d);
      if (hit) {
        if (!first) first = hit;
        else if (!same(hit, first)) {
          last = hit;
          if (squaredDistance(a, first) > squaredDistance(a, last)) [first, last] = [last, first];
        }
      }
    }
    return first && last ? [first, last] : null;
  }

  function terrainSegments(from, to) {
    const a = point(from, 'from'), b = point(to, 'to');
    if (same(a, b)) throw new RangeError('Same-point routes are unsupported; no game behavior is asserted');
    const inner = insideSegment(a, b);
    if (!inner) return [{ start: a, end: b, terrainMultiplier: 1 }];
    const [first, last] = inner, out = [];
    if (!same(a, first)) out.push({ start: a, end: first, terrainMultiplier: 1 });
    // Deliberately retain a zero-length inner segment if this client branch creates it.
    out.push({ start: first, end: last, terrainMultiplier: 0.5 });
    if (!same(last, b)) out.push({ start: last, end: b, terrainMultiplier: 1 });
    return out;
  }

  function calculateCenters({ from, to, baseSpeed = 11, normalBonusPercent = 0, petEnabled = false, petBonusPercent = 0 }) {
    finite(baseSpeed, 'baseSpeed'); finite(normalBonusPercent, 'normalBonusPercent'); finite(petBonusPercent, 'petBonusPercent');
    if (baseSpeed <= 0 || normalBonusPercent < 0 || petBonusPercent < 0) throw new RangeError('Base speed must be positive and bonuses nonnegative');
    if (typeof petEnabled !== 'boolean') throw new TypeError('petEnabled must be a boolean');
    const effectiveSpeed = baseSpeed * (1 + normalBonusPercent / 100 + (petEnabled ? petBonusPercent / 100 : 0));
    if (!Number.isFinite(effectiveSpeed)) throw new RangeError('Effective speed overflow');
    const segments = terrainSegments(from, to).map(segment => {
      const d = distance(segment.start, segment.end);
      if (!Number.isFinite(d)) throw new RangeError('Coordinate distance overflow');
      const adjustedDistance = d * 1300 / (1300 + d);
      // Preserve the client's operation order for the actual time calculation.
      const factor = 1300 / (d + 1300) * 30;
      const unroundedSeconds = 5 + d * factor / (effectiveSpeed * segment.terrainMultiplier);
      if (!Number.isFinite(unroundedSeconds)) throw new RangeError('March-time calculation exceeds numeric precision');
      return { ...segment, distance: d, adjustedDistance, unroundedSeconds, previewSeconds: Math.ceil(unroundedSeconds) };
    });
    const totalSegmentDistance = segments.reduce((total, s) => total + s.distance, 0);
    if (!(totalSegmentDistance > 0) || !Number.isFinite(totalSegmentDistance)) throw new RangeError('Route distance exceeds numeric precision');
    for (const segment of segments) {
      segment.distanceShareBasisPointsNearest = nearest(10000 * segment.distance / totalSegmentDistance);
    }
    return {
      scope: 'supplied-client-preview', from: point(from, 'from'), to: point(to, 'to'), effectiveSpeed, segments,
      unroundedModelSeconds: segments.reduce((total, s) => total + s.unroundedSeconds, 0),
      clientPreviewSeconds: segments.reduce((total, s) => total + s.previewSeconds, 0)
    };
  }

  function calculateFromVisible({ town, target, customTarget, ...speedInputs }) {
    let to;
    if (target === 'custom') {
      if (!customTarget || !Object.hasOwn(customTarget, 'anchor')) throw new TypeError('Custom targets require an explicit anchor');
      to = center(customTarget.position, customTarget.anchor);
    } else {
      if (!Object.hasOwn(PRESETS, target)) throw new RangeError('Choose castle, south, west, east, north, or custom');
      to = PRESETS[target].center;
    }
    return calculateCenters({ ...speedInputs, from: center(town, 'town'), to });
  }

  return { CENTRAL, PRESETS, center, terrainSegments, calculateCenters, calculateFromVisible };
})();
globalThis.MarchCalculation = MarchCalculation;


const MarchTypes = (() => {
  'use strict';

  // Only the caller-verified normal-world catalog, plus qualified auto hunting.
  const DIRECT_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24, 25, 100, 102, 103, 104, 105, 106, 107, 108, 109, 110, 302, 411, 501, 502, 503, 504]);
  const PARENTS = new Set([100, 102, 103, 104, 105, 106, 107, 108, 109, 411, 501, 503]);
  const SCOUTS = new Set([1, 7, 8, 9, 11, 14, 16, 18, 22, 23]);
  const HUNTING = new Set([3, 24, 25, 102, 302, 411, 501, 502, 503, 504]);
  const MERCENARIES = new Set([502, 503, 504]);
  const EXTRA = Object.freeze({ 1: 2, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 2, 9: 2, 11: 2,
    14: 2, 16: 2, 18: 2, 25: 3, 302: 3 });
  // Config defaults are resolved here. Nullish fallback preserves valid zero values.
  const PARAMETERS = Object.freeze({
    3: [20, 0], 24: [20, 0], 25: [20, 0], 102: [20, 10], 302: [10, 0],
    411: [20, 10], 501: [20, 10], 502: [20, 0], 503: [20, 10], 504: [20, 0]
  });

  function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
    return value;
  }
  function point(value, name) {
    if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name} must be [x, y]`);
    return [finite(value[0], `${name}.x`), finite(value[1], `${name}.y`)];
  }
  function centerFromCorner(position, size) {
    const p = point(position, 'position'), dimensions = point(size, 'size');
    if (dimensions.some(value => value <= 0)) throw new RangeError('Object dimensions must be positive');
    return [finite(p[0] + dimensions[0] / 2, 'center.x'), finite(p[1] + dimensions[1] / 2, 'center.y')];
  }
  function resolveProfile(marchType, parentType = null) {
    if (!Number.isInteger(marchType) || (marchType !== 99 && !DIRECT_IDS.has(marchType))) {
      throw new RangeError('Unsupported normal-world march type');
    }
    if (marchType === 99) {
      if (!Number.isInteger(parentType) || !PARENTS.has(parentType)) throw new RangeError('Joining requires a supported parent rally type');
    } else if (parentType !== null && parentType !== undefined && parentType !== 0) {
      throw new RangeError('A parent rally type is only valid for joining a rally');
    }
    const speedType = marchType === 99 ? parentType : marchType;
    return Object.freeze({
      marchType, actualType: marchType, parentType: marchType === 99 ? parentType : null, speedType,
      extraSeconds: EXTRA[marchType] ?? 5,
      timeParameter: marchType === 99 ? (PARAMETERS[parentType]?.[1] ?? 30) : (PARAMETERS[marchType]?.[0] ?? 30),
      usesHuntingBonus: HUNTING.has(speedType),
      fixedScoutBonusPercent: SCOUTS.has(speedType) ? 400 : 0,
      fixedMercenaryBonusPercent: MERCENARIES.has(speedType) ? 2000 : 0,
      fixedBaseSpeed: SCOUTS.has(speedType) ? 11 : null
    });
  }
  function calculateCenters({ from, to, marchType, parentType = null, baseSpeed = 11,
    normalBonusPercent = 0, petEnabled = false, petBonusPercent = 0, huntingBonusPercent = 0, activityId = null }) {
    const profile = resolveProfile(marchType, parentType);
    const start = point(from, 'from'), finish = point(to, 'to');
    finite(baseSpeed, 'baseSpeed');
    for (const [name, value] of Object.entries({ normalBonusPercent, petBonusPercent, huntingBonusPercent })) {
      finite(value, name);
      if (value < 0) throw new RangeError('March bonuses must be nonnegative');
    }
    if (baseSpeed <= 0) throw new RangeError('Base speed must be positive');
    if (typeof petEnabled !== 'boolean') throw new TypeError('petEnabled must be a boolean');
    if (activityId !== null && (!Number.isSafeInteger(activityId) || activityId <= 0)) throw new RangeError('Activity ID must be a positive integer or null');
    const generic = normalBonusPercent / 100 + (petEnabled ? petBonusPercent / 100 : 0);
    const hunting = profile.usesHuntingBonus ? huntingBonusPercent / 100 : 0;
    const base = profile.fixedBaseSpeed ?? baseSpeed;
    // Source order: base * (1 + hunting + generic + scout + mercenary).
    const effectiveSpeed = base * (1 + hunting + generic + profile.fixedScoutBonusPercent / 100 + profile.fixedMercenaryBonusPercent / 100);
    if (!Number.isFinite(effectiveSpeed) || effectiveSpeed <= 0) throw new RangeError('Effective speed exceeds numeric precision');
    const geometry = globalThis.MarchCalculation;
    if (!geometry || typeof geometry.terrainSegments !== 'function') throw new Error('MarchCalculation geometry engine is required');
    const segments = geometry.terrainSegments(start, finish).map(segment => {
      const dx = segment.end[0] - segment.start[0], dy = segment.end[1] - segment.start[1];
      const d = Math.pow(Math.pow(dx, 2) + Math.pow(dy, 2), 0.5);
      if (!Number.isFinite(d)) throw new RangeError('Coordinate distance overflow');
      const adjustedDistance = d * 1300 / (1300 + d);
      const factor = 1300 / (1300 + d) * profile.timeParameter;
      const unroundedSeconds = profile.extraSeconds + d * factor / (effectiveSpeed * segment.terrainMultiplier);
      if (!Number.isFinite(unroundedSeconds)) throw new RangeError('March-time calculation exceeds numeric precision');
      return { ...segment, distance: d, adjustedDistance, unroundedSeconds, previewSeconds: Math.ceil(unroundedSeconds) };
    });
    const totalDistance = segments.reduce((total, segment) => total + segment.distance, 0);
    if (!(totalDistance > 0) || !Number.isFinite(totalDistance)) throw new RangeError('Route distance exceeds numeric precision');
    for (const segment of segments) segment.distanceShareBasisPointsNearest = Math.floor(10000 * segment.distance / totalDistance + 0.5);
    const unroundedModelSeconds = segments.reduce((total, segment) => total + segment.unroundedSeconds, 0);
    const uncappedPreviewSeconds = segments.reduce((total, segment) => total + segment.previewSeconds, 0);
    if (!Number.isFinite(unroundedModelSeconds) || !Number.isSafeInteger(uncappedPreviewSeconds)) throw new RangeError('Total march time exceeds numeric precision');
    const capActive = marchType === 25 && activityId === 2940001;
    const capSeconds = capActive ? 30 : null;
    const clientPreviewSeconds = capActive ? Math.min(uncappedPreviewSeconds, capSeconds) : uncappedPreviewSeconds;
    return {
      scope: 'supplied-client-preview', from: start, to: finish, effectiveSpeed, segments,
      unroundedModelSeconds, clientPreviewSeconds, profile, uncappedPreviewSeconds,
      capActive, capApplied: clientPreviewSeconds < uncappedPreviewSeconds, capSeconds
    };
  }
  return Object.freeze({ calculateCenters, resolveProfile, centerFromCorner });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MarchTypes;
globalThis.MarchTypes = MarchTypes;
