import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedBuildView } from "@/components/shared-build-view";

export const metadata: Metadata = {
  title: "Paddock Atlas — shared build",
  description: "A shared Jurassic World Evolution 3 enclosure build, live-scored.",
};

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <SharedBuildView />
    </Suspense>
  );
}
