// 공문서 작성 규칙 검사. 기준: 행정업무운영 편람의 공문서 작성 방법
// - 날짜: 2026. 11. 1.  (연·월·일 글자 대신 마침표)
// - 시간: 24시각제, 시·분 글자 대신 쌍점 (14:30)
// - 금액: 금113,560원(금일십일만삼천오백육십원)
// - 항목 기호: 1. → 가. → 1) → 가) → (1) → (가) → ① → ㉮, 기호 뒤 한 칸
// - 본문 끝: 두 칸 띄우고 "끝."  / 붙임 표시: "붙임" 뒤 두 칸
// - 쌍점: 앞은 붙이고 뒤는 한 칸 (일시: 2026. 11. 1.)

export type Level = 'fix' | 'suggest'

export interface Issue {
  id: string
  rule: string
  level: Level
  line: number
  start: number
  end: number
  before: string
  after: string | null // null이면 자동으로 고칠 수 없음
  message: string
}

const HANGUL_SEQ = '가나다라마바사아자차카타파하'
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const CIRCLED_KO = '㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻'

const LEVELS: { re: RegExp; name: string; index: (m: string) => number }[] = [
  { re: /^(\d{1,2})\.(?!\s*\d+\.)/, name: '1.', index: m => parseInt(m) },
  { re: /^([가나다라마바사아자차카타파하])\./, name: '가.', index: m => HANGUL_SEQ.indexOf(m) + 1 },
  { re: /^(\d{1,2})\)/, name: '1)', index: m => parseInt(m) },
  { re: /^([가나다라마바사아자차카타파하])\)/, name: '가)', index: m => HANGUL_SEQ.indexOf(m) + 1 },
  { re: /^\((\d{1,2})\)/, name: '(1)', index: m => parseInt(m) },
  { re: /^\(([가나다라마바사아자차카타파하])\)/, name: '(가)', index: m => HANGUL_SEQ.indexOf(m) + 1 },
  { re: /^([①-⑳])/, name: '①', index: m => CIRCLED.indexOf(m) + 1 },
  { re: /^([㉮-㉻])/, name: '㉮', index: m => CIRCLED_KO.indexOf(m) + 1 },
]

const label = (level: number, n: number) => {
  const k = HANGUL_SEQ[n - 1] ?? '?'
  return [`${n}.`, `${k}.`, `${n})`, `${k})`, `(${n})`, `(${k})`, CIRCLED[n - 1] ?? '?', CIRCLED_KO[n - 1] ?? '?'][level]
}

// 행정 용어 순화 (국립국어원 행정 용어 순화 자료에서 학교 공문에 자주 나오는 것)
const PLAIN_WORDS: [RegExp, string][] = [
  [/익일/g, '다음 날'], [/금일(?![십백천만억원])/g, '오늘'], [/명일/g, '내일'], [/익월/g, '다음 달'],
  [/상기(?=\s|의|와|에)/g, '위'], [/하기(?=\s*와\s*같|의\s)/g, '아래'],
  [/송부/g, '보냄'], [/가일층/g, '더욱'], [/감안/g, '고려'], [/구비\s*서류/g, '갖출 서류'],
  [/적의\s*조치/g, '알맞게 조치'], [/시건/g, '잠금'], [/상이한/g, '서로 다른'], [/기\s+제출한/g, '이미 제출한'],
]

const DIGIT_KO = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

export function moneyToHangul(n: number): string {
  if (n === 0) return '영'
  const big = ['', '만', '억', '조']
  const small = ['', '십', '백', '천']
  let out = ''
  let group = 0
  while (n > 0) {
    const part = n % 10000
    if (part) {
      let s = ''
      String(part).padStart(4, '0').split('').forEach((d, i) => {
        const v = +d
        if (v) s += DIGIT_KO[v] + small[3 - i]
      })
      out = s + big[group] + out
    }
    n = Math.floor(n / 10000)
    group++
  }
  return out
}

function lineOf(text: string, offset: number) {
  let n = 1
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

export function check(text: string): Issue[] {
  const issues: Issue[] = []
  const push = (rule: string, level: Level, start: number, before: string, after: string | null, message: string) => {
    if (after === before) return
    issues.push({ id: `${rule}-${start}`, rule, level, line: lineOf(text, start), start, end: start + before.length, before, after, message })
  }

  // 날짜
  for (const m of text.matchAll(/(?<![\d.])(\d{4})\s*(?:년\s*|[.\-/]\s*)(\d{1,2})\s*(?:월\s*|[.\-/]\s*)(\d{1,2})(\s*일|\.(?!\d))?(?![\d])/g)) {
    const [all, y, mo, d] = m
    if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) continue
    push('날짜', 'fix', m.index!, all, `${y}. ${+mo}. ${+d}.`, '날짜는 연·월·일 글자 대신 마침표로 써요.')
  }

  // 시간
  for (const m of text.matchAll(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/g)) {
    let h = +m[2]
    if (m[1] === '오후' && h < 12) h += 12
    if (m[1] === '오전' && h === 12) h = 0
    const min = m[0].endsWith('반') ? 30 : m[3] ? +m[3] : 0
    push('시간', 'fix', m.index!, m[0], `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, '시간은 24시각제로, 시·분 대신 쌍점을 써요.')
  }
  for (const m of text.matchAll(/(?<![\d:])(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?(?![간군대작청설행수])/g)) {
    if (/(오전|오후)\s*$/.test(text.slice(Math.max(0, m.index! - 4), m.index!))) continue
    const h = +m[1]
    if (h > 24) continue
    push('시간', 'fix', m.index!, m[0], `${String(h).padStart(2, '0')}:${String(m[2] ? +m[2] : 0).padStart(2, '0')}`, '시간은 24시각제로, 시·분 대신 쌍점을 써요.')
  }
  for (const m of text.matchAll(/(\d{1,2}:\d{2})\s*분/g)) push('시간', 'fix', m.index!, m[0], m[1], '쌍점으로 쓴 시간 뒤에는 "분"을 붙이지 않아요.')

  // 금액
  for (const m of text.matchAll(/(금\s*)?(\d{1,3}(?:,\d{3})+|\d+)\s*원(\s*\(\s*금?([가-힣]+?)원?\s*\))?(?=$|[\s.,·)을를이가은는과와의에도]|으로)/gm)) {
    const n = Number(m[2].replace(/,/g, ''))
    if (!Number.isSafeInteger(n)) continue
    const ko = moneyToHangul(n)
    const want = `금${n.toLocaleString('ko-KR')}원(금${ko}원)`
    if (m[4] && m[4].replace(/^금/, '') !== ko) {
      push('금액', 'fix', m.index!, m[0], want, `괄호 속 한글 금액이 숫자와 달라요. ${n.toLocaleString('ko-KR')}원은 "금${ko}원"이에요.`)
    } else {
      push('금액', 'suggest', m.index!, m[0], want, '금액은 숫자로 쓰고 괄호 안에 한글을 함께 써요.')
    }
  }

  // 쌍점 띄어쓰기 (시각·주소는 제외)
  for (const m of text.matchAll(/([^\s\d:])(\s+):(\s*)(?!\/\/)(?=\S)/g)) {
    push('쌍점', 'fix', m.index!, m[0], `${m[1]}: `, '쌍점 앞은 붙이고 뒤는 한 칸 띄워요.')
  }
  for (const m of text.matchAll(/([가-힣a-zA-Z)]):(?!\/\/|\s|$)/gm)) {
    push('쌍점', 'fix', m.index!, m[0], `${m[1]}: `, '쌍점 앞은 붙이고 뒤는 한 칸 띄워요.')
  }

  // 붙임
  for (const m of text.matchAll(/^([ \t]*)(붙임|첨부)([ \t]*)(?=\S)/gm)) {
    const word = m[2]
    if (word === '첨부') push('붙임', 'suggest', m.index! + m[1].length, `${m[2]}${m[3]}`, '붙임  ', '공문에서는 "첨부" 대신 "붙임"을 써요.')
    else if (m[3] !== '  ') push('붙임', 'fix', m.index! + m[1].length, `${m[2]}${m[3]}`, '붙임  ', '"붙임" 뒤에는 두 칸을 띄워요.')
  }

  // 항목 기호
  const lines = text.split('\n')
  let offset = 0
  const stack: { level: number; n: number; indent: number }[] = []
  let inAttachments = false // 붙임 목록은 본문 항목과 번호를 따로 매기므로 검사에서 뺀다
  lines.forEach(raw => {
    const indent = raw.length - raw.trimStart().length
    const body = raw.trimStart()
    if (/^(붙임|첨부)/.test(body)) inAttachments = true
    if (inAttachments) { offset += raw.length + 1; return }
    const lv = LEVELS.findIndex(l => l.re.test(body))
    if (lv >= 0 && !/^(붙임|첨부)/.test(body)) {
      const mk = body.match(LEVELS[lv].re)!
      const n = LEVELS[lv].index(mk[1])
      const start = offset + indent
      // 기호 뒤 한 칸
      const after = body.slice(mk[0].length)
      if (lv < 6 && after.length && !after.startsWith(' ')) push('항목 기호', 'fix', start, mk[0], `${mk[0]} `, '항목 기호 뒤에는 한 칸 띄워요.')
      else if (after.startsWith('  ')) push('항목 기호', 'fix', start, mk[0] + after.match(/^ +/)![0], `${mk[0]} `, '항목 기호 뒤에는 한 칸만 띄워요.')

      while (stack.length && stack[stack.length - 1].level > lv) stack.pop()
      const top = stack[stack.length - 1]
      if (top && top.level === lv) {
        if (n !== top.n + 1) push('항목 순서', 'fix', start, mk[0], label(lv, top.n + 1), `${label(lv, top.n)} 다음은 ${label(lv, top.n + 1)} 차례예요.`)
        top.n = n === top.n + 1 ? n : top.n + 1
        top.indent = indent
      } else {
        const expectLevel = top ? top.level + 1 : 0
        if (lv !== expectLevel) {
          push('항목 순서', 'suggest', start, mk[0], null, top
            ? `${label(top.level, top.n)} 아래 항목은 ${LEVELS[expectLevel]?.name ?? '-'} 기호로 시작해요. (순서: 1. → 가. → 1) → 가) → (1) → (가) → ① → ㉮)`
            : `첫째 항목은 1. 기호로 시작해요.`)
        } else if (n !== 1) {
          push('항목 순서', 'fix', start, mk[0], label(lv, 1), `하위 항목은 ${label(lv, 1)}부터 시작해요.`)
        }
        if (top && top.level < lv && indent <= top.indent) {
          push('들여쓰기', 'suggest', offset, raw.slice(0, indent) || body.slice(0, 1), null, '하위 항목은 상위 항목보다 두 칸 오른쪽에서 시작해요.')
        }
        stack.push({ level: lv, n: n === 1 || lv !== expectLevel ? n : 1, indent })
      }
    }
    offset += raw.length + 1
  })

  // 끝 표시
  const trimmed = text.replace(/\s+$/, '')
  if (trimmed) {
    const lastLineStart = trimmed.lastIndexOf('\n') + 1
    const last = trimmed.slice(lastLineStart)
    const m = last.match(/(\s*)끝\s*\.?$/)
    if (!m) {
      push('끝 표시', 'fix', trimmed.length, '', '  끝.', '본문(또는 붙임)이 끝나면 두 칸 띄우고 "끝."을 써요.')
    } else if (m[0] !== '  끝.' && last.trim() !== '끝.') {
      push('끝 표시', 'fix', lastLineStart + last.length - m[0].length, m[0], '  끝.', '"끝." 앞은 두 칸 띄우고 마침표를 찍어요.')
    }
  }

  // 순화어
  for (const [re, word] of PLAIN_WORDS) {
    for (const m of text.matchAll(re)) push('쉬운 말', 'suggest', m.index!, m[0], word, `"${m[0]}" 대신 "${word}"가 읽기 쉬워요.`)
  }

  issues.sort((a, b) => a.start - b.start || (a.level === 'fix' ? -1 : 1))
  // 같은 자리를 두 규칙이 겹쳐 고치지 않도록 앞선 것만 남긴다
  const kept: Issue[] = []
  for (const x of issues) {
    const clash = kept.find(k => k.after !== null && x.after !== null && x.start < k.end && k.start < x.end && !(x.start === x.end || k.start === k.end))
    if (!clash) kept.push(x)
  }
  return kept
}

export function apply(text: string, list: Issue[]): string {
  const fixes = list.filter(i => i.after !== null).sort((a, b) => b.start - a.start)
  let out = text
  let guard = Infinity
  for (const f of fixes) {
    if (f.end > guard) continue
    out = out.slice(0, f.start) + f.after + out.slice(f.end)
    guard = f.start
  }
  return out
}
