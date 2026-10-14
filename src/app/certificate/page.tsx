import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Certificate",
  description: "Techcity Studio certificates are coming soon.",
};

export default function CertificatePage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar current="certificate" />
      <ComingSoon label="Certificate" />
    </div>
  );
}
