const DATABASE_NAME = 'yugra18-browser-cache'
const STORE_NAME = 'snapshots'
const DATABASE_VERSION = 1

let databasePromise

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Не удалось открыть локальный кэш'))
    request.onblocked = () => reject(new Error('Локальный кэш занят другой вкладкой'))
  }).catch((error) => {
    databasePromise = null
    throw error
  })

  return databasePromise
}

async function encode(value) {
  const serialized = JSON.stringify(value)
  if (typeof CompressionStream === 'function' && typeof Response !== 'undefined') {
    try {
      const stream = new Blob([serialized]).stream().pipeThrough(new CompressionStream('gzip'))
      return { encoding: 'gzip', payload: await new Response(stream).blob() }
    } catch {
      // Older browsers can still use the uncompressed IndexedDB fallback.
    }
  }
  return { encoding: 'json', payload: serialized }
}

async function decode(record) {
  if (record.encoding === 'gzip') {
    if (typeof DecompressionStream !== 'function' || typeof Response === 'undefined') {
      throw new Error('Браузер не поддерживает распаковку локального кэша')
    }
    const stream = record.payload.stream().pipeThrough(new DecompressionStream('gzip'))
    return JSON.parse(await new Response(stream).text())
  }
  return JSON.parse(record.payload)
}

/**
 * IndexedDB survives page reloads and Vercel deployments.
 * Snapshots are gzip-compressed where the browser supports Compression Streams.
 */
export async function readPersistentCache(key) {
  try {
    const database = await openDatabase()
    if (!database) return null

    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error || new Error('Не удалось прочитать локальный кэш'))
    })
    if (!record) return null

    return { value: await decode(record), savedAt: record.savedAt || null }
  } catch (error) {
    console.warn('Локальный кэш недоступен:', error?.message || error)
    return null
  }
}

export async function writePersistentCache(key, value) {
  try {
    const database = await openDatabase()
    if (!database) return false

    const encoded = await encode(value)
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put({
        key,
        ...encoded,
        savedAt: Date.now(),
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('Не удалось сохранить локальный кэш'))
      transaction.onabort = () => reject(transaction.error || new Error('Сохранение локального кэша отменено'))
    })
    return true
  } catch (error) {
    // Quota/private-mode errors must never make the main application fail.
    console.warn('Не удалось сохранить локальный кэш:', error?.message || error)
    return false
  }
}
