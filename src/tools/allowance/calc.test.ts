// 실행: node src/tools/allowance/calc.test.ts
import assert from 'node:assert'
import { calcAll, taxOf } from './calc.ts'

assert.deepEqual(taxOf(125_000, 'other'), { income: 0, local: 0 }) // 과세 최저한
assert.deepEqual(taxOf(200_000, 'other'), { income: 16_000, local: 1_600 }) // 8.8%
assert.deepEqual(taxOf(150_000, 'biz'), { income: 4_500, local: 450 }) // 3.3%
const row = (who: string, qty: number, price: number) => ({ kind: '강사 수당', who, qty, unit: '시간', price, tax: 'other' as const })
assert.equal(calcAll([row('홍길동', 2, 100_000)])[0].pay, 182_400)
// 한 사람의 20만 + 5만은 25만으로 보고 22,000원을 뗀다. 10만씩 두 줄도 합치면 과세
const two = calcAll([row('홍길동', 2, 100_000), row('홍길동', 1, 50_000), row('김철수', 1, 100_000)])
assert.equal(two[0].income + two[0].local + two[1].income + two[1].local, 22_000)
assert.equal(two[2].pay, 100_000)
assert.equal(calcAll([row('가', 1, 100_000), row('가', 1, 100_000)]).reduce((s, x) => s + x.income + x.local, 0), 17_600)
console.log('ok')
