import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedBuildView } from "@/components/shared-build-view";
import { OG_IMAGE_SIZE } from "../og-image-content";

const title = "Paddock Atlas — shared build";
const description = "A shared Jurassic World Evolution 3 enclosure build, live-scored.";
// Setting `openGraph`/`twitter` here replaces the root layout's entirely (Next merges
// metadata shallowly per top-level key) — including the image the root-level
// opengraph-image.tsx / twitter-image.tsx files would otherwise supply. Re-point at them
// explicitly so this page keeps a social preview image.
const images = [{ url: "/opengraph-image", ...OG_IMAGE_SIZE, alt: title }];

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: "/share", images },
  twitter: { title, description, images: [{ url: "/twitter-image", ...OG_IMAGE_SIZE, alt: title }] },
  // Every /share URL is a one-off user-generated build link, not a page worth indexing.
  robots: { index: false, follow: true },
};

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <SharedBuildView />
    </Suspense>
  );
}
