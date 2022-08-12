const ENABLED_VALUE = "1";

export const sanidateURL = (addr: string | undefined): string | Error => {
  const error = new Error("Address should be a http(s) URL");

  if (!addr) return error;

  const address = addr.trim();

  let result;
  try {
    const url = new URL(address);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
    result = url.href;
  } catch (e) {
    return error;
  }

  return result;
};

export const sanidateString = (str: string | undefined): number | Error => {
  const error = new Error("Wrong value");

  if (!str) return error;

  const value = str.trim();

  let result;
  try {
    const number = Number(value);

    if (Number.isNaN(number)) {
      throw new Error();
    }
    result = number;
  } catch (e) {
    return error;
  }

  return result;
};

export default function storage({
  key,
  enabled,
  sanidate,
}: {
  key: string;
  enabled: string;
  sanidate: (arg0: string | undefined) => any | Error;
}) {
  const STORAGE_KEY = key;
  const ENABLE_STORAGE_KEY = enabled;

  const self = {
    disable(): void {
      if (global.localStorage) {
        global.localStorage.removeItem(ENABLE_STORAGE_KEY);
        global.localStorage.removeItem(STORAGE_KEY);
      }
    },
    enable(): void {
      if (global.localStorage) {
        global.localStorage.setItem(ENABLE_STORAGE_KEY, ENABLED_VALUE);
      }
    },
    enabled(): boolean {
      if (global.localStorage) {
        return (
          global.localStorage.getItem(ENABLE_STORAGE_KEY) === ENABLED_VALUE
        );
      }

      return false;
    },
    get<T>(): T | undefined {
      if (global.localStorage) {
        const addr = global.localStorage.getItem(STORAGE_KEY);

        if (!addr) return undefined;

        const valueOrError = sanidate(decodeURI(addr));

        if (valueOrError instanceof Error) {
          self.disable();
          return undefined;
        }

        return valueOrError;
      }
      return undefined;
    },
    set(value: string | undefined): undefined | Error {
      if (!value) return new Error("Absent value");
      const valueOrError = sanidate(encodeURI(value));

      if (valueOrError instanceof Error) return valueOrError;

      if (globalThis.localStorage) {
        self.enable();
        globalThis.localStorage.setItem(STORAGE_KEY, valueOrError);
        return undefined;
      }
      return new Error("Value is set but not stored");
    },
  };

  return self;
}
