import { standardizePatentNumber } from './patentUtils.js';

// Test cases for standardizePatentNumber function
console.log('Testing standardizePatentNumber function...');

// Regular patent numbers
const test1 = standardizePatentNumber('US8125463B2');
console.log('US8125463B2 -> ', test1);
console.assert(test1 === 'US-8125463-B2', `Expected US-8125463-B2 but got ${test1}`);

const test2 = standardizePatentNumber('US-8125463-B2');
console.log('US-8125463-B2 -> ', test2);
console.assert(test2 === 'US-8125463-B2', `Expected US-8125463-B2 but got ${test2}`);

const test3 = standardizePatentNumber('EP1234567A1');
console.log('EP1234567A1 -> ', test3);
console.assert(test3 === 'EP-1234567-A1', `Expected EP-1234567-A1 but got ${test3}`);

// Japanese era-based patent numbers
const test4 = standardizePatentNumber('JPH1012345A');
console.log('JPH1012345A -> ', test4);
console.assert(test4 === 'JP-199812345-A', `Expected JP-199812345-A but got ${test4}`);

const test5 = standardizePatentNumber('JPS6012345A');
console.log('JPS6012345A -> ', test5);
console.assert(test5 === 'JP-198512345-A', `Expected JP-198512345-A but got ${test5}`);

const test6 = standardizePatentNumber('JPR0112345A');
console.log('JPR0112345A -> ', test6);
console.assert(test6 === 'JP-201912345-A', `Expected JP-201912345-A but got ${test6}`);

// Patent with spaces and hyphens
const test7 = standardizePatentNumber('US 8125463 B2');
console.log('US 8125463 B2 -> ', test7);
console.assert(test7 === 'US-8125463-B2', `Expected US-8125463-B2 but got ${test7}`);

// Patent with non-alphanumeric characters
const test8 = standardizePatentNumber('US-8,125,463-B2');
console.log('US-8,125,463-B2 -> ', test8);
console.assert(test8 === 'US-8125463-B2', `Expected US-8125463-B2 but got ${test8}`);

// Invalid pattern should return original
const test9 = standardizePatentNumber('InvalidPatent123');
console.log('InvalidPatent123 -> ', test9);
console.assert(test9 === 'InvalidPatent123', `Expected InvalidPatent123 but got ${test9}`);

console.log('All tests completed!'); 