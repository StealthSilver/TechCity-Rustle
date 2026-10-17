import { Drawer, Format, Keyboard } from "@lucasmarkes/hairline/react";
import type { CSSProperties } from "react";
import { DocumentSheet } from "@/components/document-sheet";
import { BrandMark, Navbar } from "@/components/navbar";
import { ProductLink } from "@/components/product-link";

const actionClass =
  "inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm whitespace-nowrap text-white transition-colors duration-200 ease-out hover:bg-[#3a3a3a]";

const documents = [
  {
    id: "certificate",
    kind: "certificate",
    index: "01",
    label: "Certificate",
    body: "Issue a completion certificate from the approved template. The candidate, the training, and the college logo change. The border stays put.",
    href: "/certificate",
    available: true,
    action: "Open editor",
  },
  {
    id: "offer-letter",
    kind: "offer",
    index: "02",
    label: "Offer letter",
    body: "Prepare an offer without rebuilding the letterhead. Role, start, and terms stay in the approved template.",
    href: "/offer-letter",
    available: true,
    action: "Open editor",
  },
  {
    id: "appreciation-letter",
    kind: "appreciation",
    index: "03",
    label: "Appreciation letter",
    body: "Send a formal note after a training engagement. You fill the trainer, role, institution, and dates.",
    href: "/appreciation",
    available: true,
    action: "Open editor",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Choose the document",
    body: "Certificate, offer letter, or appreciation letter.",
    Figure: Drawer,
    label: "A cabinet of drawers. One slides open.",
  },
  {
    number: "02",
    title: "Fill only the details that change",
    body: "Letterhead, borders, and approved wording stay locked.",
    Figure: Keyboard,
    label: "A keyboard. The key under the pointer sinks.",
  },
  {
    number: "03",
    title: "Download the PDF",
    body: "The finished document uses the template Techcity Studio already issues.",
    Figure: Format,
    label: "A file of lines snapping square into the template.",
  },
] as const;

export default function Home() {
  return (
    <div id="top" className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar />
      <main>
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:border-r lg:border-line lg:py-20">
              <h1 className="max-w-xl font-serif text-[2.55rem] leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-[3.35rem]">
                Official documents, from the template.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
                Certificates, offer letters, and appreciation letters are filled
                into approved templates, then downloaded as PDFs.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {documents.map((document) => (
                  <ProductLink key={document.id} href={document.href} className={actionClass}>
                    {document.label}
                  </ProductLink>
                ))}
              </div>
            </div>

            <div className="border-t border-line px-4 py-10 sm:px-6 md:px-8 lg:border-t-0 lg:py-16">
              <div aria-hidden="true" className="relative hidden h-[440px] lg:block">
                <DocumentSheet
                  kind="appreciation"
                  className="absolute top-10 left-0 w-[48%] -rotate-2"
                />
                <DocumentSheet
                  kind="offer"
                  className="absolute top-2 right-0 w-[48%] rotate-1"
                />
                <DocumentSheet
                  kind="certificate"
                  className="absolute top-20 left-[24%] z-10 w-[50%]"
                />
              </div>
              <div className="w-full max-w-[280px] lg:hidden">
                <DocumentSheet kind="certificate" />
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:py-24">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Documents</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
              Certificate, offer letter, appreciation letter.
            </h2>
            <ul className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-3">
              {documents.map((document) => (
                <li key={document.id} className="flex h-full flex-col bg-paper p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs tracking-[0.16em] text-muted">{document.index}</p>
                    {"available" in document ? (
                      <p className="text-xs tracking-[0.14em] text-ink">Available</p>
                    ) : (
                      <p className="text-xs tracking-[0.14em] text-muted">Coming soon</p>
                    )}
                  </div>
                  <div aria-hidden="true" className="mt-6 w-full max-w-[200px]">
                    <DocumentSheet kind={document.kind} />
                  </div>
                  <h3 className="mt-6 font-serif text-2xl tracking-tight">{document.label}</h3>
                  <p className="mt-2 max-w-sm flex-1 text-sm leading-relaxed text-muted">
                    {document.body}
                  </p>
                  <ProductLink href={document.href} className={`mt-6 w-fit ${actionClass}`}>
                    {document.action}
                  </ProductLink>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:py-24">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Process</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {steps.map((step) => (
                <Step key={step.number} {...step} />
              ))}
            </ol>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between md:px-8">
          <BrandMark className="text-[2.4rem] sm:text-[2.85rem]" />
          <div className="flex flex-col gap-4 md:items-end">
            <a
              href="https://www.techcityskills.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              https://www.techcityskills.com/
            </a>
            <nav aria-label="Documents" className="flex flex-wrap gap-x-5 gap-y-2">
            {documents.map((document) => (
              <ProductLink
                key={document.id}
                href={document.href}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {document.label}
              </ProductLink>
            ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  body,
  Figure,
  label,
}: {
  number: string;
  title: string;
  body: string;
  Figure: typeof Drawer;
  label: string;
}) {
  return (
    <li className="border-t border-line pt-5">
      <div
        className="max-w-sm bg-white"
        style={{ "--hairline-plate": "#ffffff" } as CSSProperties}
      >
        <Figure theme="light" intensity={0.45} label={label} />
      </div>
      <p className="mt-5 text-xs tracking-[0.16em] text-muted">{number}</p>
      <h3 className="mt-3 text-base font-medium">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
    </li>
  );
}
