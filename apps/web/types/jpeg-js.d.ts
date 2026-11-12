declare module "jpeg-js" {
  export type Bitmap = {
    data: Uint8Array;
    width: number;
    height: number;
  };

  export function decode(
    jpeg: Uint8Array | Buffer,
    options?: { useTArray?: boolean; formatAsRGBA?: boolean },
  ): Bitmap;

  export function encode(image: Bitmap, quality?: number): { data: Uint8Array; width: number; height: number };
}
