import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Appreciation letter — TechCity",
  description: "TechCity appreciation letters are coming soon.",
};

export default function AppreciationPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar current="appreciation-letter" />
      <ComingSoon label="Appreciation letter" />
    </div>
  );
}
