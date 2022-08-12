export const isFloat = (n: any) => !Number.isNaN(n) && n % 1 !== 0;

type Options = Partial<{ max: number }>;

const populateIntervals = (intervals: number[], options?: Options) => {
  const { max = 2 } = options ?? {};
  const formatted: string[] = [];
  const literals = ["w", "d", "h", "m", "s"];

  intervals.forEach((part, i) => {
    if (part && formatted.length <= max - 1)
      formatted.push(`${part}${literals[i]}`);
  });

  return formatted.join(" ");
};

const prepareIntervals = (value: number) => {
  const getIntervalValues = (
    interval: number,
    length: number
  ): [number, number] => {
    const amount = parseInt(String(interval / length), 10);
    const leftover = interval - amount * length;

    return [amount, leftover];
  };

  if (value === -1) return "no delay";

  const [w, leftD] = getIntervalValues(value, 604800);
  const [d, leftH] = getIntervalValues(leftD, 86400);
  const [h, leftM] = getIntervalValues(leftH, 3600);
  const [m, s] = getIntervalValues(leftM, 60);

  return [w, d, h, m, s];
};

export const expirationTimeToInterval = (
  expirationTime: number | undefined,
  tif: number
) => {
  if (!expirationTime) return tif;

  let delta = expirationTime * 1e3 - Date.now();
  delta = delta <= 0 ? 0 : Number((delta / 1e3).toFixed(0));

  return delta;
};

export const formatIntervalTillS = (value: number) => {
  const parts = prepareIntervals(value);

  if (!Array.isArray(parts)) return parts;

  return populateIntervals(parts);
};

export const formatIntervalTillM = (value: number) => {
  const parts = prepareIntervals(value);

  if (!Array.isArray(parts)) return parts;

  const [w, d, h, m, s] = parts;

  return populateIntervals([w, d, h, s > 30 ? m + 1 : m, 0]);
};

export const formatInterval = formatIntervalTillM;
