/**
 * Google Places API Search Mode Diagnostic Tool
 *
 * RESULTS OF TYPE VS KEYWORD COMPARISON (Tested June 17, 2026):
 *
 * 1. Valid Supported Place Type ("dentist"):
 *    - Keyword Search (keyword="dentist"): Returned 20 relevant dental practices.
 *    - Type Search (type="dentist"): Returned 20 relevant dental practices.
 *    - Conclusion: Both modes work well for strict, matching place types.
 *
 * 2. Loose Supported Place Type ("coworking" -> type="coworking_space"):
 *    - Keyword Search (keyword="coworking"): Returned 20 legitimate coworking spaces (e.g. Firmspace, Capital Factory).
 *    - Type Search (type="coworking_space"): Returned 20 results containing hotels, lodging, and cities.
 *    - Conclusion: Google's categorization for some Place Types is too broad/liberal. Keyword is far more accurate here.
 *
 * 3. Unrecognized/Custom Place Type ("software company" -> type="software company"):
 *    - Keyword Search (keyword="software company"): Returned 20 actual software companies.
 *    - Type Search (type="software company"): Returned generic location results (hotels, city center) because
 *      Google ignored the invalid type constraint.
 *    - Conclusion: Arbitrary user search queries must use keyword mode to prevent silent query degradation.
 *
 * KEY FINDING:
 * - Always use `keyword` for Competitor Discovery since user input (businessType + niche) is free-form.
 * - Only use `type` for Demand Signals when matching predefined, verified Google Place Types (e.g. school, hospital).
 */

import { nearbySearch } from './src/services/googlePlacesService.js';
import { env } from './src/config/env.js';

async function runTest() {
  const coordinates = { lat: 30.2672, lng: -97.7431 }; // Austin, TX
  const radius = 5000;

  const testCases = [
    { businessType: 'dentist', niche: '', searchType: undefined }, // keyword: 'dentist'
    { businessType: 'dentist', niche: '', searchType: 'dentist' }, // type: 'dentist' (valid Google Place Type)
    { businessType: 'coworking', niche: '', searchType: undefined }, // keyword: 'coworking'
    { businessType: 'coworking', niche: '', searchType: 'coworking_space' }, // type: 'coworking_space' (valid Google Place Type)
    { businessType: 'software company', niche: '', searchType: undefined }, // keyword: 'software company'
    { businessType: 'software company', niche: '', searchType: 'software company' }, // type: 'software company' (invalid Google Place Type)
  ];

  for (const tc of testCases) {
    console.log(`\n==================================================`);
    console.log(`Testing Case:`);
    console.log(`  businessType: "${tc.businessType}"`);
    console.log(`  searchType (type parameter): "${tc.searchType}"`);
    console.log(`  keyword: ${tc.searchType ? 'undefined' : tc.businessType}`);
    
    try {
      const result = await nearbySearch({
        coordinates,
        businessType: tc.businessType,
        searchType: tc.searchType,
        niche: tc.niche,
        radius,
        maxPages: 1
      });
      
      console.log(`Status: ${result.status}`);
      console.log(`Total results: ${result.results.length}`);
      if (result.results.length > 0) {
        console.log(`First 3 results:`);
        result.results.slice(0, 3).forEach((r, idx) => {
          console.log(`  ${idx + 1}. ${r.name} (${r.vicinity}) | Types: ${JSON.stringify(r.types)}`);
        });
      }
    } catch (err) {
      console.error(`Error encountered:`, err.message || err);
      if (err.details) {
        console.error(`Details:`, JSON.stringify(err.details));
      }
    }
  }
}

runTest();
