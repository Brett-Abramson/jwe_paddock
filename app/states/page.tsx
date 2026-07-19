import type { Metadata } from "next";
import { StatesGallery } from "@/components/states-gallery";

export const metadata: Metadata = {
  title: "Paddock Atlas — §9 states",
  description: "Live reference of every state the Paddock Atlas build has to handle.",
};

export default function StatesPage() {
  return <StatesGallery />;
}
