// 서명부 서버 (Supabase bookday 프로젝트, 서울). 쌤툴에서 유일하게 브라우저 밖으로 자료가 나가는 곳이다.
// 표는 직접 읽을 수 없고 아래 함수 다섯 개로만 다룬다. 서명부 번호(uuid)를 아는 사람만 서명할 수 있고,
// 만든 사람의 열쇠(key)가 있어야 모인 서명을 읽거나 지울 수 있다. 7일 뒤 서버에서 자동으로 지워진다.
const API = 'https://zxcobnsabdaodnvdmtry.supabase.co/rest/v1/rpc/'
const KEY = 'sb_publishable_6dg1SnuKvbP9ZSeYNRE7hA_-ffxh_MK' // 공개용 키

export interface Entry { name: string; info: Record<string, string>; image: string; at: string }
export interface SheetInfo { title: string; fields: string[]; names: string[]; signed: string[]; expires_at: string }
export type AddResult = 'ok' | 'expired' | 'not_listed' | 'duplicate' | 'full' | 'bad_info'

async function rpc<T>(fn: string, args: object): Promise<T> {
  const res = await fetch(API + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { message?: string }).message ?? `서버 오류 ${res.status}`)
  return res.json() as Promise<T>
}

const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('')

// 열쇠는 이 브라우저에서 만들고, 서버에는 그 해시만 보낸다
export async function createSheet(title: string, fields: string[], names: string[]): Promise<{ id: string; key: string }> {
  const key = hex(crypto.getRandomValues(new Uint8Array(24)))
  const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))))
  const id = await rpc<string>('ssam_sign_create', { p_title: title, p_fields: fields, p_names: names, p_owner_hash: hash })
  return { id, key }
}

export const getSheet = (id: string) => rpc<SheetInfo | null>('ssam_sign_get', { p_id: id })
export const addSign = (id: string, name: string, info: Record<string, string>, image: string) =>
  rpc<AddResult>('ssam_sign_add', { p_id: id, p_name: name, p_info: info, p_image: image })
export const listSigns = (id: string, key: string) => rpc<Entry[]>('ssam_sign_list', { p_id: id, p_owner_key: key })
// name을 주면 그 사람 서명만(다시 받을 때), 안 주면 서명부 전체를 서버에서 지운다
export const removeSign = (id: string, key: string, name?: string) =>
  rpc<boolean>('ssam_sign_remove', { p_id: id, p_owner_key: key, p_name: name ?? null })

export const signLink = (id: string) => `${location.origin}${location.pathname}#/sign/${id}`
