export interface PixelShift {
  x: number;
  y: number;
}

const SAFE_OFFSETS = [-4, -2, 0, 2, 4] as const;

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function pixelShiftForEpoch(epoch: number): PixelShift {
  const safeEpoch = Number.isFinite(epoch) ? Math.trunc(epoch) : 0;
  const xIndex = positiveModulo(safeEpoch, SAFE_OFFSETS.length);
  const yIndex = positiveModulo(safeEpoch * 2 + 2, SAFE_OFFSETS.length);

  return {
    x: SAFE_OFFSETS[xIndex],
    y: SAFE_OFFSETS[yIndex],
  };
}
