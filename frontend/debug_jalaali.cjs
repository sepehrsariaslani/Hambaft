const { toJalaali, toGregorian } = require('jalaali-js');

// Check what the library actually returns for the failing cases
console.log('toJalaali(2024, 9, 6):', JSON.stringify(toJalaali(2024, 9, 6)));
console.log('toGregorian(1403, 6, 15):', JSON.stringify(toGregorian(1403, 6, 15)));

// The task says 1403/06/15 should be 2024-09-06
// Let's check what 1403/06/15 actually is
console.log();
console.log('Expected: 1403/06/15 = 2024-09-06');
console.log('Actual:   1403/06/15 =', toGregorian(1403, 6, 15).gy + '-' + String(toGregorian(1403, 6, 15).gm).padStart(2, '0') + '-' + String(toGregorian(1403, 6, 15).gd).padStart(2, '0'));
console.log();
console.log('Expected: 2024-09-06 = 1403/06/15');
const j = toJalaali(2024, 9, 6);
console.log('Actual:   2024-09-06 = ' + j.jy + '/' + String(j.jm).padStart(2, '0') + '/' + String(j.jd).padStart(2, '0'));
