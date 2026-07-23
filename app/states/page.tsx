import type { Metadata } from "next";
import { StatesGallery } from "@/components/states-gallery";
import { OG_IMAGE_SIZE } from "../og-image-content";

const title = "Paddock Atlas — §9 states";
const description = "Live reference of every state the Paddock Atlas build has to handle.";
// Setting `openGraph`/`twitter` here replaces the root layout's entirely (Next merges
// metadata shallowly per top-level key) — including the image the root-level
// opengraph-image.tsx / twitter-image.tsx files would otherwise supply. Re-point at them
// explicitly so this page keeps a social preview image.
const images = [{ url: "/opengraph-image", ...OG_IMAGE_SIZE, alt: title }];

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: "/states", images },
  twitter: { title, description, images: [{ url: "/twitter-image", ...OG_IMAGE_SIZE, alt: title }] },
};

export default function StatesPage() {
  return <StatesGallery />;
}
