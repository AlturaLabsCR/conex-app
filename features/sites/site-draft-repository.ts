import AsyncStorage from '@react-native-async-storage/async-storage';

const SITE_DRAFT_KEY_PREFIX = 'conex.siteDraft';
const DRAFT_CHUNK_SIZE = 100_000;

function getSiteDraftKey(sub: number, path: string) {
  return `${SITE_DRAFT_KEY_PREFIX}.${sub}.${path}`;
}

function getSiteDraftManifestKey(sub: number, path: string) {
  return `${getSiteDraftKey(sub, path)}.manifest`;
}

function getSiteDraftChunkKey(sub: number, path: string, index: number) {
  return `${getSiteDraftKey(sub, path)}.chunk.${index}`;
}

async function getChunkCount(sub: number, path: string) {
  const manifest = await AsyncStorage.getItem(getSiteDraftManifestKey(sub, path));

  if (!manifest) {
    return 0;
  }

  const chunkCount = Number(manifest);

  return Number.isInteger(chunkCount) && chunkCount > 0 ? chunkCount : 0;
}

async function deleteChunkedSiteDraft(sub: number, path: string) {
  const chunkCount = await getChunkCount(sub, path);
  const keys = [getSiteDraftManifestKey(sub, path)];

  for (let index = 0; index < chunkCount; index += 1) {
    keys.push(getSiteDraftChunkKey(sub, path, index));
  }

  await AsyncStorage.multiRemove(keys);
}

export const siteDraftRepository = {
  async getSiteDraft(sub: number, path: string) {
    const chunkCount = await getChunkCount(sub, path);

    if (chunkCount > 0) {
      const chunkKeys = Array.from({ length: chunkCount }, (_value, index) =>
        getSiteDraftChunkKey(sub, path, index)
      );
      const chunks = await AsyncStorage.multiGet(chunkKeys);

      return chunks.map(([_key, value]) => value ?? '').join('');
    }

    try {
      return await AsyncStorage.getItem(getSiteDraftKey(sub, path));
    } catch {
      await AsyncStorage.removeItem(getSiteDraftKey(sub, path));
      return null;
    }
  },

  async saveSiteDraft(sub: number, path: string, contentHtml: string) {
    await deleteChunkedSiteDraft(sub, path);

    const chunks = contentHtml.match(new RegExp(`.{1,${DRAFT_CHUNK_SIZE}}`, 'gs')) ?? [''];
    const entries: [string, string][] = chunks.map((chunk, index) => [
      getSiteDraftChunkKey(sub, path, index),
      chunk,
    ]);

    await AsyncStorage.multiSet([
      [getSiteDraftManifestKey(sub, path), String(chunks.length)],
      ...entries,
    ]);
    await AsyncStorage.removeItem(getSiteDraftKey(sub, path));
  },

  async deleteSiteDraft(sub: number, path: string) {
    await deleteChunkedSiteDraft(sub, path);
    await AsyncStorage.removeItem(getSiteDraftKey(sub, path));
  },
};
