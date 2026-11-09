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
console.log('ok', c.map(x => `${x.from} → ${x.to}${x.on ? '' : ' (끔)'}`))

