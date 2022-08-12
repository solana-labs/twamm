export function fetchJSONFromAPI2<APIType>(api: APIType) {
  return async function fetchFromAPI<T>(
    method: keyof APIType,
    ...args: any
  ): Promise<T> {
    const fn = api[method];
    // FIXME: V
    // @ts-ignore
    const resp = await fn.apply(api, args);
    return resp.json();
  };
}
