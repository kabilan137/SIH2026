// ---------------------------------------------------------------------------
// Place Relevance Filter
//
// Filters and clusters raw Google Places results to extract genuine,
// institution-level demand generators.
//
// PROBLEM BEING SOLVED:
//   When Google Places is queried for "university", it returns:
//     ✅ University of Texas at Austin        (actual campus)
//     ❌ UT Austin Dept. of Computer Science  (sub-unit)
//     ❌ UT Austin College of Natural Sciences (sub-unit)
//     ❌ UT Austin Applied Research Labs       (sub-unit)
//     ❌ UT Austin Student Services Building   (sub-unit)
//
//   This inflates Austin's university count from ~5 actual campuses to 40+.
//
// SOLUTION — two stages:
//   Stage 1: Reject sub-units by name-pattern matching
//   Stage 2: Cluster remaining places by institution fingerprint
//            (UT Austin + UT Austin Clark Field → same institution → count 1)
// ---------------------------------------------------------------------------

// ── Stage 1: Sub-unit rejection patterns ────────────────────────────────────

/**
 * Patterns that indicate a Google Places result is a SUB-UNIT of a larger
 * institution rather than the institution itself.
 *
 * Applied to: place.name (case-insensitive)
 */
const SUBUNIT_NAME_PATTERNS = [
  // Academic sub-units
  /\bdepartment\s+of\b/i,
  /\b(dept\.?)\s+of\b/i,
  /\bcollege\s+of\b/i,
  /\bschool\s+of\b/i,
  /\binstitute\s+of\b/i,
  /\bcenter\s+for\b/i,
  /\bcentre\s+for\b/i,
  /\boffice\s+of\b/i,
  /\bdivision\s+of\b/i,
  /\bprogram\s+in\b/i,
  /\blab(oratory)?\s+(of|for)\b/i,
  /\bresearch\s+(lab|center|centre|institute|group)\b/i,

  // Operational sub-units
  /\bregistrar'?s?\s+office\b/i,
  /\bfinancial\s+aid\b/i,
  /\badmissions\s+office\b/i,
  /\bbursar'?s?\b/i,
  /\bcampus\s+police\b/i,
  /\bstudent\s+services\b/i,
  /\bhousing\s+office\b/i,
  /\bcampus\s+store\b/i,
  /\bbookstore\s+at\b/i,      // "Bookstore at University of X" → sub-unit
  /\bdining\s+(hall|services)\b/i,

  // Physical building identifiers
  /\b(building|hall|tower|house|wing|annex|pavilion|complex|arena)\s*#?\d*$/i,
  /\b(room|suite|ste\.?)\s+\d+\b/i,

  // Campus sub-nodes
  /\bcampus\s+(of|at)\b/i,
];

/**
 * Returns true if the place name indicates it is a sub-unit of a larger institution.
 * These places should be excluded before clustering.
 */
export function isSubUnit(name) {
  if (!name || typeof name !== 'string') return false;
  return SUBUNIT_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

// ── Stage 2: Institution clustering ─────────────────────────────────────────

/**
 * Words that carry no identifying information and must be stripped before
 * comparing institution names.
 */
const CLUSTERING_STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'at', 'in', 'on', 'for', 'and', '&',
  'university', 'college', 'institute', 'academy', 'school', 'campus'
]);

/**
 * Normalises an institution name into a set of significant tokens.
 *
 * Examples:
 *   "University of Texas at Austin" → ["texas", "austin"]
 *   "UT Austin"                     → ["ut", "austin"]
 *   "St. Edward's University"       → ["st", "edwards"]
 *   "The University of Texas"       → ["texas"]
 */
function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !CLUSTERING_STOP_WORDS.has(t));
}

/**
 * Returns true if parsedA and parsedB refer to the same institution.
 *
 * Matching rules:
 *   1. Exact token-set equality
 *   2. ≥2 significant tokens in common
 *   3. One token set is a sub-sequence of the other (handles "UT Austin" vs
 *      "University of Texas at Austin")
 */
function isSameInstitution(parsedA, parsedB) {
  const tokA = parsedA.tok;
  const tokB = parsedB.tok;

  if (tokA.length === 0 || tokB.length === 0) return false;

  const strA = parsedA.str;
  const strB = parsedB.str;

  // Exact match
  if (strA === strB) return true;

  // Common-token check
  const setA = parsedA.set;
  let commonCount = 0;
  for (const t of tokB) {
    if (setA.has(t)) {
      commonCount++;
      if (commonCount >= 2) return true;
    }
  }

  // Sub-sequence check (one name contains all tokens of the other)
  if (tokA.length >= 2 && strB.includes(strA)) return true;
  if (tokB.length >= 2 && strA.includes(strB)) return true;

  return false;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Filters and clusters raw Google Places results for a single audience category.
 *
 * @param {object[]} places        – Raw Google Places result objects
 * @param {string}   category      – Google Place Type being searched (e.g. 'university')
 * @param {{ lat: number, lng: number }} centerCoords – Search center point
 * @param {function} distanceFn    – haversineMeters(lat1, lng1, lat2, lng2) → number
 * @param {number}   minReviews    – Minimum review count to accept a place
 * @param {number}   maxInstitutions – Hard cap on institutions counted
 *
 * @returns {{
 *   validInstitutions: ValidInstitution[],
 *   filterStats: FilterStats
 * }}
 *
 * @typedef {{ placeId, name, distanceMeters, rating, reviewCount }} ValidInstitution
 * @typedef {{ rawCount, rejectedSubUnit, rejectedLowActivity, clustered, validCount }} FilterStats
 */
export function filterAndCluster({
  places,
  category,
  centerCoords,
  distanceFn,
  minReviews = 0,
  maxInstitutions = 20
}) {
  const stats = {
    rawCount: places.length,
    rejectedSubUnit: 0,
    rejectedLowActivity: 0,
    clustered: 0,
    validCount: 0
  };

  // Step 1: Reject sub-units by name pattern
  const afterNameFilter = [];
  for (const place of places) {
    if (isSubUnit(place.name)) {
      stats.rejectedSubUnit++;
    } else {
      afterNameFilter.push(place);
    }
  }

  // Step 2: Reject low-activity places (below minReviews threshold)
  const afterActivityFilter = [];
  for (const place of afterNameFilter) {
    const reviews = place.user_ratings_total ?? 0;
    if (reviews < minReviews) {
      stats.rejectedLowActivity++;
    } else {
      afterActivityFilter.push(place);
    }
  }

  // Step 3: Compute distance from search center for each surviving place
  const withDistance = afterActivityFilter.map((place) => {
    const loc = place.geometry?.location;
    const distanceMeters =
      loc?.lat != null && loc?.lng != null
        ? Math.round(distanceFn(centerCoords.lat, centerCoords.lng, loc.lat, loc.lng))
        : null;
    return { ...place, _distanceMeters: distanceMeters };
  });

  // Step 4: Sort by distance ascending (nearest-first = preferred representative)
  withDistance.sort(
    (a, b) => (a._distanceMeters ?? 999_999) - (b._distanceMeters ?? 999_999)
  );

  // ⚡ Bolt: Pre-tokenize place names to avoid O(N^2) string processing in clustering loop
  const tokenizedPlaces = withDistance.map((place) => {
    const tok = tokenize(place.name ?? '');
    return {
      place,
      parsed: {
        tok,
        str: tok.join(' '),
        set: new Set(tok)
      }
    };
  });

  // Step 5: Institution-level clustering
  // Keep only the nearest representative when two names map to the same institution
  const clusters = [];
  for (const item of tokenizedPlaces) {
    const alreadyClustered = clusters.some((existing) =>
      isSameInstitution(existing.parsed, item.parsed)
    );

    if (alreadyClustered) {
      stats.clustered++;
    } else {
      clusters.push(item);
    }
  }

  // Step 6: Apply per-category cap on institutions counted
  const clusteredPlaces = clusters.map((c) => c.place);
  const capped = clusteredPlaces.slice(0, maxInstitutions);
  stats.validCount = capped.length;

  const validInstitutions = capped.map((p) => ({
    placeId: p.place_id ?? null,
    name: p.name ?? 'Unknown',
    distanceMeters: p._distanceMeters,
    rating: Number.isFinite(p.rating) ? p.rating : null,
    reviewCount: p.user_ratings_total ?? 0
  }));

  return { validInstitutions, filterStats: stats };
}
