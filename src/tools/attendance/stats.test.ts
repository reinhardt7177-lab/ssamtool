// 실행: node src/tools/attendance/stats.test.ts
import assert from 'node:assert'
import { count, toRecords } from './stats.ts'

const recs = toRecords(['번호', '이름', '일자', '출결구분', '사유'], [
  ['1', '김하늘', '2026-03-04', '결석', '질병'],
  ['2', '이도윤', '2026.4.2.', '지각', '미인정'],
  ['1', '김하늘', '4/15', '결석', '인정(체험학습)'],
  ['3', '박서연', '2026-04-20', '출석', ''],
])
assert.equal(recs.length, 3)
assert.equal(recs[1].reason, '미인정')
assert.equal(recs[2].reason, '인정')
assert.equal(count(recs, r => `${r.month}`).get('4'), 2)
console.log('ok')
