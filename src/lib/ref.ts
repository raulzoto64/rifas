function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(input: string): string {
  let base = input.replace(/-/g, '+').replace(/_/g, '/')
  while (base.length % 4 !== 0) base += '='
  const bin = atob(base)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Ofusca el token del familiar para que no se vea como un número en la URL
export function encodeRefToken(token: string): string {
  return encodeBase64Url(`Raf-${token}`)
}

export function decodeRefToken(encoded: string): string {
  try {
    const raw = decodeBase64Url(encoded)
    return raw.startsWith('Raf-') ? raw.slice(4) : raw
  } catch {
    return encoded
  }
}