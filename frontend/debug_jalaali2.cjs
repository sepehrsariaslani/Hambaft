const { toJalaali, toGregorian } = require('jalaali-js');

console.log('=== Verify all task test cases ===');
console.log();

// Test case 1: Create flow
console.log('1. Create: 1403/06/15 should be 2024-09-06 per task');
const g1 = toGregorian(1403, 6, 15);
console.log('   Actual: 1403/06/15 = ' + g1.gy + '-' + String(g1.gm).padStart(2,'0') + '-' + String(g1.gd).padStart(2,'0'));
console.log('   MISMATCH: task says 2024-09-06, actual is 2024-09-05');
console.log();

// Test case 2: Edit flow
console.log('2. Edit: 1403/07/01 should be 2024-09-22 per task');
const g2 = toGregorian(1403, 7, 1);
console.log('   Actual: 1403/07/01 = ' + g2.gy + '-' + String(g2.gm).padStart(2,'0') + '-' + String(g2.gd).padStart(2,'0'));
console.log('   ' + (g2.gy === 2024 && g2.gm === 9 && g2.gd === 22 ? 'MATCH' : 'MISMATCH'));
console.log();

// Test case 4a: Leap year
console.log('4a. Leap: 1403/12/30 should be 2025-03-20 per task');
const g3 = toGregorian(1403, 12, 30);
console.log('   Actual: 1403/12/30 = ' + g3.gy + '-' + String(g3.gm).padStart(2,'0') + '-' + String(g3.gd).padStart(2,'0'));
console.log('   ' + (g3.gy === 2025 && g3.gm === 3 && g3.gd === 20 ? 'MATCH' : 'MISMATCH'));
console.log();

// Test case 4b: Year boundary
console.log('4b. Year boundary: 1403/12/29 -> 1404/01/01 per task');
const g4a = toGregorian(1403, 12, 29);
console.log('   Actual: 1403/12/29 = ' + g4a.gy + '-' + String(g4a.gm).padStart(2,'0') + '-' + String(g4a.gd).padStart(2,'0'));
const g4b = toGregorian(1404, 1, 1);
console.log('   Actual: 1404/01/01 = ' + g4b.gy + '-' + String(g4b.gm).padStart(2,'0') + '-' + String(g4b.gd).padStart(2,'0'));
console.log('   Task says 1403/12/29 = 1404/01/01 which is wrong - they are different dates');
console.log();

// Test case 4c: Far past
console.log('4c. Far past: 1370/01/01');
const g5 = toGregorian(1370, 1, 1);
console.log('   Actual: 1370/01/01 = ' + g5.gy + '-' + String(g5.gm).padStart(2,'0') + '-' + String(g5.gd).padStart(2,'0'));
