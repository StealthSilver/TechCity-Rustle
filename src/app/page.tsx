import { DocumentSheet } from "@/components/document-sheet";
import { BrandMark, Navbar } from "@/components/navbar";

const documents = [
  {
    id: "certificate",
    kind: "certificate",
    label: "Certificate",
    title: "Recognition that holds its shape.",
    body: "Issue completions, participation, and other recognition from the certificate template. The border, seal, and wording stay put. The recipient and the program change.",
    href: "/certificate",
    soon: true,
    fields: ["Recipient", "Program", "Date", "Signatory"],
  },
  {
    id: "offer-letter",
    kind: "offer",
    label: "Offer letter",
    title: "An offer, in the approved form.",
    body: "Prepare an offer without rebuilding the letterhead. Role, start date, location, and the rest of the terms follow the template TechCity already uses.",
    href: "/offer-letter",
    fields: ["Name", "College", "Salary", "Date"],
  },
  {
    id: "appreciation-letter",
    kind: "appreciation",
    label: "Appreciation letter",
    title: "Appreciation, on the record.",
    body: "Send a formal note of thanks after a training engagement. The letterhead stays consistent. The trainer, role, institution, and dates are what you fill.",
    href: "/appreciation",
    fields: ["Trainer", "Role", "Institution", "Date"],
  },
] as const;

export default function Home() {
  return (
    <div id="top" className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-paper text-ink">
      <Navbar />
      <main>
        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:px-8 md:py-16 lg:gap-16 lg:py-20">
            <div className="min-w-0">
              <p className="text-sm text-muted">Admin studio</p>
              <h1 className="mt-3 max-w-xl text-3xl leading-[1.08] font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Official documents, from the template.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
                TechCity is where admins generate certificates, offer letters,
                and appreciation letters. The template holds the layout. You
                supply the details.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.href}
                    className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink"
                  >
                    {document.label}
                  </a>
                ))}
              </div>
            </div>

            <div aria-hidden="true" className="relative mx-auto hidden w-full lg:block">
              <div className="relative mx-auto aspect-[5/6] w-full max-w-[440px]">
                <DocumentSheet
                  kind="appreciation"
                  className="absolute top-[10%] left-[6%] w-[48%] -rotate-6"
                />
                <DocumentSheet
                  kind="offer"
                  className="absolute top-[6%] right-[6%] w-[48%] rotate-[4deg]"
                />
                <DocumentSheet
                  kind="certificate"
                  className="absolute top-[24%] left-1/2 z-10 w-[52%] -translate-x-1/2"
                />
              </div>
            </div>
            <div className="mx-auto w-full min-w-0 max-w-sm md:max-w-none lg:hidden">
              <DocumentSheet kind="certificate" />
            </div>
          </div>
        </section>

        {documents.map((document, index) => (
          <section
            key={document.id}
            id={document.id}
            className={`scroll-mt-20 border-t border-line ${
              index % 2 === 1 ? "bg-card" : "bg-paper"
            }`}
          >
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-10 md:px-8 md:py-20 lg:gap-20 lg:py-28">
              <div className={`min-w-0 ${index % 2 === 1 ? "md:order-2" : ""}`}>
                <p className="text-sm text-muted">{document.label}</p>
                <h2 className="mt-2 max-w-md text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
                  {document.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                  {document.body}
                </p>
                <ul className="mt-6 flex max-w-md flex-wrap gap-2">
                  {document.fields.map((field) => (
                    <li
                      key={field}
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-sm text-ink"
                    >
                      {field}
                    </li>
                  ))}
                </ul>
                <a
                  href={document.href}
                  className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm text-white"
                >
                  {"soon" in document ? "Coming soon" : "Open editor"}
                </a>
              </div>
              <figure className={`min-w-0 ${index % 2 === 1 ? "md:order-1" : ""}`}>
                <div aria-hidden="true">
                  <DocumentSheet
                    kind={document.kind}
                    className="mx-auto w-full max-w-[380px]"
                  />
                </div>
                <figcaption className="mt-4 text-center text-xs text-muted">
                  Sample preview
                </figcaption>
              </figure>
            </div>
          </section>
        ))}

        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:py-20">
            <h2 className="max-w-lg text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
              Three steps. The template does the rest.
            </h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-x-6 lg:mt-10 lg:grid-cols-3">
              <Step
                number="01"
                title="Choose the document"
                body="Certificate, offer letter, or appreciation letter."
              />
              <Step
                number="02"
                title="Open the template"
                body="Letterhead, layout, and approved wording stay as they are."
              />
              <Step
                number="03"
                title="Fill and generate"
                body="Enter the recipient details and produce the document."
              />
            </ol>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
          <BrandMark className="text-[2.85rem]" />
          <p className="text-sm text-muted">Admin document generation.</p>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="border-t border-line pt-5">
      <p className="text-xs text-muted">{number}</p>
      <h3 className="mt-2 text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
    </li>
  );
}
