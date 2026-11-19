// 무무클래스 앱 갤러리용 썸네일(1280×800 webp)을 실제 홈 화면에서 찍는다.
// 실행: 개발 서버를 띄운 뒤  node scripts/thumb.mjs http://localhost:5173/  (playwright·sharp는 무무클래스 저장소 것을 빌려 쓴다)
import { createRequire } from 'node:module'
const req = createRequire('D:/mumuclass/mumuclass/package.json')
const { chromium } = req('playwright')
const sharp = req('sharp')

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge' }) // 컴퓨터에 깔린 엣지를 쓴다
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(3500) // 제목·띠가 다 들어올 때까지
// 열린 첫 띠를 접어 여덟 색 띠가 모두 보이게 하고, 제목부터 띠 더미까지 한 화면에 담는다
await page.click('#area-files .band-bar')
await page.mouse.move(5, 5) // 띠 위에 마우스가 있으면 다시 펼쳐진다
await page.waitForTimeout(1200)
await page.evaluate(() => { document.querySelector('.topbar').style.visibility = 'hidden'; document.body.style.zoom = '0.6'; const h = document.querySelector('.hero h1'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 46) })
await page.waitForTimeout(800)
const png = await page.screenshot()
await browser.close()
const out = await sharp(png).resize(1280, 800).webp({ quality: 80 }).toBuffer()
await (await import('node:fs/promises')).writeFile('public/thumb.webp', out)
console.log('public/thumb.webp', Math.round(out.length / 1024), 'KB')
