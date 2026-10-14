function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function sheetClass(className?: string) {
  const isAbsolute = className?.split(/\s+/).includes("absolute");

  return cx(
    "@container aspect-[3/4] overflow-hidden bg-card shadow-[0_28px_50px_-32px_rgba(22,24,29,0.55)] ring-1 ring-ink/10",
    isAbsolute ? "absolute" : "relative",
    className,
  );
}

type DocumentKind = "certificate" | "offer" | "appreciation";

export function DocumentSheet({
  kind,
  className,
}: {
  kind: DocumentKind;
  className?: string;
}) {
  if (kind === "certificate") return <CertificateSheet className={className} />;
  if (kind === "offer") return <OfferSheet className={className} />;
  return <AppreciationSheet className={className} />;
}

function CertificateSheet({ className }: { className?: string }) {
  return (
    <article className={sheetClass(className)}>
      <div className="pointer-events-none absolute inset-[4.5cqi] border border-ink/25" />
      <div className="pointer-events-none absolute inset-[6.5cqi] border border-ink/10" />
      <div className="flex h-full flex-col items-center px-[9cqi] pt-[12cqi] pb-[8cqi] text-center">
        <p className="text-[2.4cqi] tracking-[0.34em] text-ink/45">TECHCITY</p>
        <p className="mt-[7cqi] font-serif text-[7.2cqi] leading-none tracking-tight text-ink">
          Certificate
        </p>
        <p className="mt-[1.5cqi] font-serif text-[3.4cqi] text-muted italic">
          of completion
        </p>
        <div className="mt-[5cqi] h-px w-[18cqi] bg-ink/30" />
        <p className="mt-[6cqi] text-[2.6cqi] tracking-[0.14em] text-muted uppercase">
          This certifies that
        </p>
        <p className="mt-[2cqi] font-serif text-[5.6cqi] text-ink">Priya Nair</p>
        <p className="mt-[4cqi] max-w-[34cqi] text-[2.8cqi] leading-relaxed text-muted">
          has completed Frontend Foundations and met the requirements set by TechCity.
        </p>
        <div className="mt-auto flex w-full items-end justify-between pt-[6cqi]">
          <div className="text-left">
            <div className="mb-[1.4cqi] h-px w-[16cqi] bg-ink/25" />
            <p className="text-[2cqi] tracking-[0.16em] text-muted">SIGNATORY</p>
          </div>
          <div className="grid size-[14cqi] place-items-center rounded-full border border-ink/35 text-ink/55">
            <div className="grid size-[10.5cqi] place-items-center rounded-full border border-dashed border-ink/25">
              <span className="font-serif text-[3cqi]">TC</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-serif text-[2.8cqi] text-ink">14 Oct 2026</p>
            <p className="mt-[1.2cqi] text-[2cqi] tracking-[0.16em] text-muted">DATE</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function OfferSheet({ className }: { className?: string }) {
  return (
    <article className={sheetClass(className)}>
      <div className="h-[1.1cqi] bg-ink" />
      <div className="flex h-[calc(100%-1.1cqi)] flex-col px-[7.5cqi] pt-[6cqi] pb-[6cqi]">
        <div className="flex items-start justify-between border-b border-line pb-[4cqi]">
          <div>
            <p className="font-serif text-[5cqi] leading-none text-ink">TechCity</p>
            <p className="mt-[1.6cqi] text-[2.1cqi] tracking-[0.22em] text-muted">
              PEOPLE TEAM
            </p>
          </div>
          <p className="text-[2.1cqi] tracking-[0.18em] text-ink/45">OFFER</p>
        </div>
        <p className="mt-[5cqi] text-[2.5cqi] text-muted">14 October 2026</p>
        <p className="mt-[3cqi] font-serif text-[5.4cqi] leading-tight text-ink">
          Offer of employment
        </p>
        <p className="mt-[4cqi] text-[2.9cqi] leading-relaxed text-ink">Dear Priya Nair,</p>
        <p className="mt-[2.4cqi] text-[2.9cqi] leading-relaxed text-muted">
          We are pleased to offer you the role of Product Designer, beginning 2 November 2026.
        </p>
        <dl className="mt-[5cqi] space-y-[2cqi] border-t border-line pt-[4cqi]">
          <Row label="Role" value="Product Designer" />
          <Row label="Location" value="Bengaluru" />
          <Row label="Start" value="2 November 2026" />
        </dl>
        <div className="mt-auto pt-[5cqi]">
          <div className="mb-[1.5cqi] h-px w-[22cqi] bg-ink/25" />
          <p className="text-[2.1cqi] tracking-[0.16em] text-muted">PEOPLE TEAM</p>
        </div>
      </div>
    </article>
  );
}

function AppreciationSheet({ className }: { className?: string }) {
  return (
    <article className={sheetClass(className)}>
      <div className="flex h-full flex-col px-[8cqi] py-[8cqi]">
        <div className="flex items-center justify-between">
          <p className="text-[2.2cqi] tracking-[0.28em] text-muted">TECHCITY</p>
          <span className="size-[2cqi] rounded-full bg-accent" />
        </div>
        <p className="mt-[8cqi] max-w-[28cqi] font-serif text-[7cqi] leading-[0.95] text-ink italic">
          With appreciation
        </p>
        <div className="mt-[5cqi] h-px w-[14cqi] bg-ink/30" />
        <p className="mt-[6cqi] text-[3cqi] text-ink">Dear Priya Nair,</p>
        <p className="mt-[3cqi] text-[2.9cqi] leading-relaxed text-muted">
          Thank you for the care you brought to this season’s cohort. This note records our appreciation, on letterhead, from the approved template.
        </p>
        <p className="mt-[5cqi] font-serif text-[3.4cqi] text-ink italic">
          — The TechCity team
        </p>
        <div className="mt-auto border-t border-line pt-[4cqi]">
          <p className="text-[2.2cqi] tracking-[0.16em] text-muted">
            APPRECIATION · 14 OCT 2026
          </p>
        </div>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[3cqi] text-[2.6cqi]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
