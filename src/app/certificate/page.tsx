import type { Metadata } from "next";
import { CertificateEditor } from "@/components/certificate-editor";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Certificate",
  description:
    "Fill the Techcity Studio certificate template and download it as a PDF.",
};

export default function CertificatePage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar current="certificate" />
      <CertificateEditor />
    </div>
  );
}
