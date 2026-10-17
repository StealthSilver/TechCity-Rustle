"use client";

import { useEffect, useRef, useState } from "react";
import {
  certificateFileName,
  certificateTemplates,
  certificateTraining,
  emptyCertificate,
  isCertificateComplete,
  isHttpUrl,
  type CertificateTemplate,
  type CertificateValues,
} from "@/lib/certificate";
import { removeLogoBackground } from "@/lib/remove-logo-background";

type PreviewFrame = { url: string; ready: boolean };
type CollegeLogo = { bytes: Uint8Array; preview: string };

export function CertificateEditor() {
  const [template, setTemplate] = useState<CertificateTemplate>("old");
  const [values, setValues] = useState<CertificateValues>(emptyCertificate);
  const [logo, setLogo] = useState<CollegeLogo | null>(null);
  const [frames, setFrames] = useState<PreviewFrame[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [preparingLogo, setPreparingLogo] = useState(false);
  const [error, setError] = useState("");
  const urlsRef = useRef<string[]>([]);
  const logoRef = useRef<CollegeLogo | null>(null);
  const complete = isCertificateComplete(values, template);

  function release(url: string) {
    URL.revokeObjectURL(url);
    urlsRef.current = urlsRef.current.filter((item) => item !== url);
  }

  function update(name: keyof CertificateValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function replaceLogo(next: CollegeLogo | null) {
    setLogo((current) => {
      if (current && current.preview !== next?.preview) URL.revokeObjectURL(current.preview);
      return next;
    });
    logoRef.current = next;
  }

  function clearLogo() {
    replaceLogo(null);
    setError("");
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setPreparingLogo(true);
    setError("");
    try {
      const bytes = await removeLogoBackground(file);
      const preview = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: "image/png" }));
      replaceLogo({ bytes, preview });
    } catch {
      setError("The logo could not be prepared. Use a PNG or JPG.");
    } finally {
      setPreparingLogo(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { buildCertificatePdf } = await import("@/lib/certificate-pdf");
          const bytes = await buildCertificatePdf(values, template, logo?.bytes);
          if (cancelled) return;
          const url = URL.createObjectURL(
            new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
          );
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          urlsRef.current.push(url);
          setFrames((current) => {
            const visible = current.filter((frame) => frame.ready).slice(-1);
            const dropped = current
              .filter((frame) => !visible.includes(frame))
              .map((frame) => frame.url);
            if (dropped.length > 0) {
              queueMicrotask(() => {
                for (const droppedUrl of dropped) release(droppedUrl);
              });
            }
            return [...visible, { url, ready: false }];
          });
          setError("");
        } catch (caught) {
          if (!cancelled) {
            setError(
              caught instanceof Error && caught.message.startsWith("The certificate")
                ? caught.message
                : "The preview could not be created. Try again.",
            );
          }
        }
      })();
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [values, logo, template]);

  function selectTemplate(next: CertificateTemplate) {
    if (next === template) return;
    setTemplate(next);
    setFrames((current) => {
      if (current.length === 0) return current;
      const dropped = current.map((frame) => frame.url);
      queueMicrotask(() => {
        for (const url of dropped) release(url);
      });
      return [];
    });
  }

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (logoRef.current) URL.revokeObjectURL(logoRef.current.preview);
    };
  }, []);

  function showFrame(url: string) {
    window.setTimeout(() => {
      setFrames((current) => {
        if (!current.some((frame) => frame.url === url && !frame.ready)) return current;
        const next = current.map((frame) =>
          frame.url === url ? { ...frame, ready: true } : frame,
        );
        const pending = next.filter((frame) => !frame.ready);
        const visible = next.filter((frame) => frame.ready).slice(-1);
        const keep = new Set([...visible, ...pending].map((frame) => frame.url));
        const dropped = next.filter((frame) => !keep.has(frame.url)).map((frame) => frame.url);
        if (dropped.length > 0) {
          queueMicrotask(() => {
            for (const droppedUrl of dropped) release(droppedUrl);
          });
        }
        return [...visible, ...pending];
      });
    }, 140);
  }

  async function onDownload() {
    if (!complete || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const { downloadCertificatePdf } = await import("@/lib/certificate-pdf");
      await downloadCertificatePdf(values, template, logo?.bytes);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.startsWith("The certificate")
          ? caught.message
          : "The PDF could not be created. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-6xl flex-1 items-start gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 md:px-8 lg:grid-cols-[minmax(18rem,32rem)_minmax(0,1fr)] lg:items-start lg:py-10">
      <form
        className="@container min-w-0 rounded-2xl border border-line bg-card p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onDownload();
        }}
      >
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1" role="group" aria-label="Template">
          {certificateTemplates.map((item) => {
            const selected = template === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectTemplate(item.id)}
                className={`h-10 rounded-lg text-sm transition-colors ${
                  selected ? "bg-ink text-white" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <h1 className="mt-4 text-lg font-medium tracking-tight">Certificate</h1>
        <p className="mt-1 text-sm text-muted">Pick a template. These fields stay if you switch.</p>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <label className="block min-w-0">
            <span className="text-xs text-muted">Candidate</span>
            <input
              name="candidateName"
              type="text"
              value={values.candidateName}
              placeholder="Varun Kant"
              maxLength={60}
              autoComplete="off"
              onChange={(event) => update("candidateName", event.target.value)}
              className="mt-1 h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink sm:h-10 sm:text-sm"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs text-muted">Training</span>
            <input
              name="trainingName"
              type="text"
              value={values.trainingName}
              placeholder="AI Tools and Prompt Engineering Workshop"
              maxLength={120}
              autoComplete="off"
              onChange={(event) => update("trainingName", event.target.value)}
              className="mt-1 h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink sm:h-10 sm:text-sm"
            />
          </label>
          {template === "new" ? (
            <label className="block min-w-0">
              <span className="text-xs text-muted">Certificate link</span>
              <input
                name="certificateUrl"
                type="url"
                inputMode="url"
                value={values.certificateUrl}
                placeholder="https://www.techcityskills.com/certificate/varun-kant"
                maxLength={120}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => update("certificateUrl", event.target.value)}
                className="mt-1 h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink sm:h-10 sm:text-sm"
              />
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                Optional. A link adds a QR code that opens that page.
              </span>
            </label>
          ) : null}
          <label className="block min-w-0">
            <span className="text-xs text-muted">College logo</span>
            <input
              name="collegeLogo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onLogo(file);
              }}
              className="mt-1 block w-full text-sm text-muted file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:text-sm file:text-white"
            />
          </label>
        </div>

        <div className="mt-3 flex min-h-14 items-center gap-3">
          {logo ? (
            <img
              src={logo.preview}
              alt="College logo with the background removed"
              className="size-14 rounded-lg border border-line bg-white object-contain p-1"
            />
          ) : (
            <span className="grid size-14 place-items-center rounded-lg border border-dashed border-line text-[10px] tracking-wide text-muted uppercase">
              None
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm leading-snug text-muted">
              {preparingLogo
                ? "Removing the background…"
                : "Optional. Leave this empty and the header stays plain."}
            </p>
            {logo ? (
              <button type="button" onClick={clearLogo} className="mt-1 text-sm text-ink">
                Remove logo
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={!complete || downloading || preparingLogo}
          className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-ink text-sm text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted" aria-live="polite">
          {error ||
            (complete
              ? `Downloads as ${certificateFileName(values.candidateName)}.`
              : template === "new" &&
                  values.candidateName.trim() &&
                  certificateTraining(values.trainingName) &&
                  values.certificateUrl.trim() &&
                  !isHttpUrl(values.certificateUrl)
                ? "Use a full link, starting with https://."
                : "Add the candidate and the training to download the certificate.")}
        </p>
      </form>

      <section className="min-w-0 lg:sticky lg:top-20" aria-label="Certificate preview">
        <div className="relative h-[min(72dvh,820px)] min-h-80 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 sm:min-h-96 md:h-[min(78dvh,820px)] lg:h-[calc(100dvh-6.5rem)] lg:max-h-[860px] lg:min-h-[32rem]">
          {frames.some((frame) => frame.ready) ? null : (
            <div className="absolute inset-0 z-20 grid place-items-center bg-white text-sm text-muted">
              Preparing the certificate…
            </div>
          )}
          {frames.map((frame) => (
            <iframe
              key={frame.url}
              title="Certificate preview"
              src={`${frame.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              onLoad={() => showFrame(frame.url)}
              aria-hidden={!frame.ready}
              className={`absolute inset-0 h-full w-full bg-white ${
                frame.ready ? "z-10" : "pointer-events-none z-0"
              }`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
