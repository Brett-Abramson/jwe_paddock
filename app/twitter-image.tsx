import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, ogImageElement } from "./og-image-content";

export const alt = "Paddock Atlas — Jurassic World Evolution 3 park planner";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(ogImageElement(), size);
}
