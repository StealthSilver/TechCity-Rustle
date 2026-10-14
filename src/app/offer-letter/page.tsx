import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { OfferLetterEditor } from "@/components/offer-letter-editor";

export const metadata: Metadata = {
  title: "Offer letter — TechCity",
  description:
    "Fill the TechCity offer letter template and download it as a PDF.",
};

export default function OfferLetterPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar current="offer-letter" />
      <OfferLetterEditor />
    </div>
  );
}
