const { toJalaali, toGregorian, isValidJalaaliDate } = require('jalaali-js');

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; console.log('  PASS: ' + msg); } else { failed++; console.log('  FAIL: ' + msg); } }

console.log('=== toJalaali (Gregorian -> Jalali) ===');
const j1 = toJalaali(2024, 9, 6);
assert(j1.jy === 1403 && j1.jm === 6 && j1.jd === 15, '2024-09-06 -> 1403/06/15');

const j2 = toJalaali(2024, 9, 22);
assert(j2.jy === 1403 && j2.jm === 7 && j2.jd === 1, '2024-09-22 -> 1403/07/01');

const j3 = toJalaali(2025, 3, 20);
assert(j3.jy === 1403 && j3.jm === 12 && j3.jd === 30, '2025-03-20 -> 1403/12/30 (leap year)');

const j4 = toJalaali(1991, 3, 21);
assert(j4.jy === 1370 && j4.jm === 1 && j4.jd === 1, '1991-03-21 -> 1370/01/01');

console.log('=== toGregorian (Jalali -> Gregorian) ===');
const g1 = toGregorian(1403, 6, 15);
assert(g1.gy === 2024 && g1.gm === 9 && g1.gd === 6, '1403/06/15 -> 2024-09-06');

const g2 = toGregorian(1403, 7, 1);
assert(g2.gy === 2024 && g2.gm === 9 && g2.gd === 22, '1403/07/01 -> 2024-09-22');

const g3 = toGregorian(1403, 12, 30);
assert(g3.gy === 2025 && g3.gm === 3 && g3.gd === 20, '1403/12/30 -> 2025-03-20 (leap year)');

console.log('=== isValidJalaaliDate ===');
assert(isValidJalaaliDate(1403, 6, 15) === true, '1403/06/15 is valid');
assert(isValidJalaaliDate(1403, 12, 30) === true, '1403/12/30 is valid (leap year)');
assert(isValidJalaaliDate(1402, 12, 30) === false, '1402/12/30 is invalid (not leap year)');
assert(isValidJalaaliDate(1403, 13, 1) === false, '1403/13/01 is invalid (month 13)');
assert(isValidJalaaliDate(1403, 6, 31) === true, '1403/06/31 is valid (month 6 has 31 days)');
assert(isValidJalaaliDate(1403, 7, 31) === false, '1403/07/31 is valid (month 7 has 30 days)');

console.log('');
console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed+failed));
if (failed > 0) { console.log('SOME TESTS FAILED!'); process.exit(1); }
else { console.log('ALL TESTS PASSED!'); }
