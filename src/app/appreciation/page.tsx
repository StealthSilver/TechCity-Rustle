import type { Metadata } from "next";
import { AppreciationLetterEditor } from "@/components/appreciation-letter-editor";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Appreciation letter",
  description:
    "Fill the Techcity Studio appreciation letter template and download it as a PDF.",
};

export default function AppreciationPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar current="appreciation-letter" />
      <AppreciationLetterEditor />
    </div>
  );
}
