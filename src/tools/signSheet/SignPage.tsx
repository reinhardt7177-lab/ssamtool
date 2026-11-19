import { useEffect, useRef, useState } from 'react'
import { SignPad, type SignPadHandle } from '../../components/SignPad'
import { addSign, getSheet, type AddResult, type SheetInfo } from '../../lib/sign'
import './sign.css'

// 이 폰에서 지난번에 적은 이름·소속을 기억해 다음 서명부에서 다시 적지 않게 한다 (폰 안에만 저장)
const ME = 'ssamtool.signer.v1'
const loadMe = (): { name: string; info: Record<string, string> } => {
  try { return { name: '', info: {}, ...JSON.parse(localStorage.getItem(ME) ?? '{}') } } catch { return { name: '', info: {} } }
}

const WHY: Record<Exclude<AddResult, 'ok'>, string> = {
  expired: '서명 받기가 끝났거나 기한이 지난 서명부예요.',
  not_listed: '명단에 없는 이름이에요. 이름을 다시 골라 주세요.',
  duplicate: '이미 서명한 이름이에요. 본인이 한 게 아니라면 서명부를 만든 선생님께 알려 주세요.',
  full: '서명부가 가득 찼어요.',
  bad_info: '적은 내용이 너무 길어요. 40자 안으로 줄여 주세요.',
}

// 참석자가 폰으로 여는 화면: 책상 위 서류 한 장에 이름을 고르고 서명한다
export function SignPage({ id }: { id: string }) {
  const [sheet, setSheet] = useState<SheetInfo | null | 'loading' | 'error'>('loading')
  const me = useRef(loadMe()).current
  const [name, setName] = useState(me.name)
  const [info, setInfo] = useState<Record<string, string>>(me.info)
  const [ink, setInk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState('')
  const [find, setFind] = useState('')
  const pad = useRef<SignPadHandle>(null)

  useEffect(() => { getSheet(id).then(setSheet, () => setSheet('error')) }, [id])
  useEffect(() => { document.title = typeof sheet === 'object' && sheet ? `${sheet.title} · 서명` : '서명부' }, [sheet])

  if (sheet === 'loading') return <main className="sg"><p className="sg-wait">서명부를 여는 중…</p></main>
  if (!sheet || sheet === 'error') return (
    <main className="sg"><article className="sg-sheet sg-gone">
      <div className="sg-kicker">SIGN-IN SHEET</div>
      <h1>{sheet === 'error' ? '서명부를 열지 못했어요' : '닫힌 서명부예요'}</h1>
      <p>{sheet === 'error' ? '인터넷 연결을 확인하고 다시 열어 주세요.' : '서명 받기가 끝났거나 7일이 지나 지워졌어요. 서명부를 만든 선생님께 새 링크를 받아 주세요.'}</p>
    </article></main>
  )

  const listed = sheet.names.length > 0
  const until = new Date(sheet.expires_at)
  const ready = !!name.trim() && ink && !busy && (!listed || sheet.names.includes(name)) && !sheet.signed.includes(name.trim())

  const send = async () => {
    const image = pad.current?.toPng()
    if (!image) return
    setBusy(true); setMsg('')
    const clean = Object.fromEntries(sheet.fields.map(f => [f, (info[f] ?? '').trim()]).filter(([, v]) => v))
    try {
      const r = await addSign(id, name.trim(), clean, image)
      if (r === 'ok') {
        try { localStorage.setItem(ME, JSON.stringify({ name: name.trim(), info: clean })) } catch { /* 기억 못 해도 서명은 끝났다 */ }
        setDone(image)
      } else {
        setMsg(WHY[r])
        if (r === 'duplicate') { setSheet({ ...sheet, signed: [...sheet.signed, name.trim()] }); if (listed) setName('') }
      }
    } catch { setMsg('보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 쓴 서명은 그대로 있어요.') }
    setBusy(false)
  }

  if (done) return (
    <main className="sg"><article className="sg-sheet sg-done">
      <div className="sg-kicker">SIGNED · {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
      <h1>{sheet.title}</h1>
      <div className="sg-proof">
        <span className="sg-proof-name">{name.trim()}</span>
        <img src={done} alt={`${name.trim()}의 서명`} />
        <span className="sg-stamp" aria-hidden="true">서명<br />완료</span>
      </div>
      <p>서명이 전달됐어요. 이 창은 닫아도 돼요.</p>
    </article></main>
  )

  let step = 0
  const no = () => String(++step).padStart(2, '0')
  return (
    <main className="sg">
      <article className="sg-sheet">
        <div className="sg-kicker">SIGN-IN SHEET<span>{sheet.signed.length}{listed ? ` / ${sheet.names.length}` : ''}명 서명</span></div>
        <h1>{sheet.title}</h1>

        <section>
          <h2><span>{no()}</span>이름</h2>
          {listed ? (
            <>
            {/* 명단이 길면 버튼에서 찾기 힘들다: 한두 글자만 쳐도 그 이름만 남긴다 */}
            {sheet.names.length > 10 && <input className="sg-input sg-find" type="search" value={find} placeholder={`이름 찾기 (${sheet.names.length}명)`} aria-label="이름 찾기" enterKeyHint="search" onChange={e => setFind(e.target.value.trim())} />}
            <div className="sg-names" role="radiogroup" aria-label="이름 고르기">
              {sheet.names.filter(n => n.includes(find) || n === name).map(n => {
                const signed = sheet.signed.includes(n)
                return <button key={n} role="radio" aria-checked={name === n} disabled={signed} className={name === n ? 'on' : undefined} onClick={() => setName(n)}>{n}{signed && <small>서명함</small>}</button>
              })}
              {find && !sheet.names.some(n => n.includes(find)) && <p className="sg-none">"{find}"이 든 이름이 명단에 없어요.</p>}
            </div>
            </>
          ) : (
            <input className="sg-input" value={name} maxLength={20} autoComplete="name" enterKeyHint="next" placeholder="이름" aria-label="이름" onChange={e => setName(e.target.value)} />
          )}
        </section>

        {sheet.fields.length > 0 && (
          <section>
            <h2><span>{no()}</span>{sheet.fields.join(' · ')}</h2>
            <div className="sg-fields">
              {sheet.fields.map(f => (
                <label key={f}>{f}
                  <input className="sg-input" value={info[f] ?? ''} maxLength={40} enterKeyHint="next" inputMode={/연락처|전화|번호/.test(f) ? 'tel' : 'text'} onChange={e => setInfo({ ...info, [f]: e.target.value })} />
                </label>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2><span>{no()}</span>서명<button className="sg-redo" disabled={!ink} onClick={() => pad.current?.clear()}>다시 쓰기</button></h2>
          <div className={`sg-pad${ink ? ' inked' : ''}`}>
            <SignPad ref={pad} onInk={setInk} />
            <span className="sg-pad-hint" aria-hidden="true">여기에 손가락으로 서명해 주세요</span>
          </div>
        </section>

        <p className="sg-consent">
          이름{sheet.fields.length ? `·${sheet.fields.join('·')}` : ''}과 서명은 이 서명부를 만든 선생님에게만 전달돼요.
          서버에는 늦어도 {until.getMonth() + 1}월 {until.getDate()}일까지만 보관한 뒤 지워요.
        </p>
        {msg && <p className="sg-msg" role="alert">{msg}</p>}
        <button className="sg-send" disabled={!ready} onClick={send}>{busy ? '보내는 중…' : !name.trim() ? (listed ? '이름을 먼저 골라 주세요' : '이름을 먼저 적어 주세요') : !ink ? '서명을 써 주세요' : `${name.trim()} 이름으로 서명 내기`}</button>
      </article>
      <p className="sg-foot">쌤툴 서명부</p>
    </main>
  )
}
