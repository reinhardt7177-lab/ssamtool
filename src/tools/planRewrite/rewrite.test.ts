// 실행: node src/tools/planRewrite/rewrite.test.ts
import assert from 'node:assert'
import { findChanges, mostYear } from './rewrite.ts'

const text = `2026학년도 운영 계획
1. 기간: 2026. 11. 26.(목) ~ 11. 27.(금)
2. 근거: 교원연수 규정(2026.5.22.개정)
3. 작년(2025학년도) 결과 반영`
assert.equal(mostYear(text), 2026)
const c = findChanges(text, 2026, 2027)
const get = (f: string) => c.find(x => x.from === f)
assert.equal(get('2026. 11. 26.(목)')?.to, '2027. 11. 26.(금)')
assert.equal(get('11. 27.(금)')?.to, '11. 27.(토)')
assert.equal(get('2026학년도 운영')?.to, '2027학년도 운영')
assert.equal(c.find(x => x.from.startsWith('2026.5'))?.on, false)
assert.equal(c.find(x => x.from.startsWith('2025학년도'))?.to.startsWith('2026학년도'), true)
// 다른 해 날짜의 꼬리는 건드리지 않고, 다음 해 2월은 함께 올린다
const d = findChanges(`2026학년도 계획
규정(2024. 5. 22.(수) 개정)
졸업식: 2027. 2. 12.(금)
개학 2. 3.(화)`, 2026, 2027)
assert.equal(d.some(x => x.from.includes('5. 22.')), false)
assert.equal(d.find(x => x.from.startsWith('2027. 2. 12.'))?.to, '2028. 2. 12.(토)')
assert.equal(d.find(x => x.from === '2. 3.(화)')?.to, '2. 3.(목)')
console.log('ok', c.map(x => `${x.from} → ${x.to}${x.on ? '' : ' (끔)'}`))

