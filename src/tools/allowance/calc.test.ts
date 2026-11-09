// 실행: node src/tools/allowance/calc.test.ts
import assert from 'node:assert'
import { calc, taxOf } from './calc.ts'

assert.deepEqual(taxOf(125_000, 'other'), { income: 0, local: 0 }) // 과세 최저한
assert.deepEqual(taxOf(200_000, 'other'), { income: 16_000, local: 1_600 }) // 8.8%
assert.deepEqual(taxOf(150_000, 'biz'), { income: 4_500, local: 450 }) // 3.3%
assert.equal(calc({ kind: '강사 수당', who: '홍길동', qty: 2, unit: '시간', price: 100_000, tax: 'other' }).pay, 182_400)
console.log('ok')
