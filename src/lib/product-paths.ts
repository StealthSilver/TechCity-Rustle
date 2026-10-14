export const PRODUCT_PATHS = [
  "/certificate",
  "/offer-letter",
  "/appreciation",
] as const;

export type ProductPath = (typeof PRODUCT_PATHS)[number];

export function isProductPath(path: string): path is ProductPath {
  return (PRODUCT_PATHS as readonly string[]).includes(path);
}
