"use client";

import { useEffect, useRef, useState } from "react";
import {
  appreciationLetterFileName,
  composedSubject,
  emptyAppreciationLetter,
  isAppreciationLetterComplete,
  type AppreciationLetterValues,
} from "@/lib/appreciation-letter";

const fields: Array<{
  name: keyof AppreciationLetterValues;
  label: string;
  type: "text" | "date";
  placeholder?: string;
  maxLength?: number;
  wide?: boolean;
}> = [
  { name: "letterDate", label: "Date", type: "date" },
  {
    name: "trainerName",
    label: "Trainer name",
    type: "text",
    placeholder: "Sameer",
    maxLength: 80,
  },
  {
    name: "role",
    label: "Role",
    type: "text",
    placeholder: "Technical Trainer",
    maxLength: 60,
  },
  {
    name: "institution",
    label: "Institution",
    type: "text",
    placeholder: "MMU Chandigarh",
    maxLength: 80,
  },
  {
    name: "subject",
    label: "Subject",
    type: "text",
    placeholder: "Appreciation for Your Services as Technical Trainer – MMU Chandigarh",
    maxLength: 160,
    wide: true,
  },
  { name: "startDate", label: "Training start", type: "date" },
  { name: "endDate", label: "Training end", type: "date" },
];

type PreviewFrame = { url: string; ready: boolean };

export function AppreciationLetterEditor() {
  const [values, setValues] = useState<AppreciationLetterValues>(emptyAppreciationLetter);
  const [frames, setFrames] = useState<PreviewFrame[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const urlsRef = useRef<string[]>([]);
  const complete = isAppreciationLetterComplete(values);

  function release(url: string) {
    URL.revokeObjectURL(url);
    urlsRef.current = urlsRef.current.filter((item) => item !== url);
  }

  function update(name: keyof AppreciationLetterValues, value: string) {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === "role" || name === "institution") {
        const previous = composedSubject(current.role, current.institution);
        if (!current.subject.trim() || current.subject === previous) {
          next.subject = composedSubject(next.role, next.institution);
        }
      }
      return next;
    });
    setError("");
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { buildAppreciationLetterPdf } = await import("@/lib/appreciation-letter-pdf");
          const bytes = await buildAppreciationLetterPdf(values);
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
        } catch {
          if (!cancelled) setError("The preview could not be created. Try again.");
        }
      })();
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [values]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
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
      const { downloadAppreciationLetterPdf } = await import("@/lib/appreciation-letter-pdf");
      await downloadAppreciationLetterPdf(values);
    } catch {
      setError("The PDF could not be created. Try again.");
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
        <h1 className="text-lg font-medium tracking-tight">Appreciation letter</h1>
        <p className="mt-1 text-sm text-muted">The letter stays fixed. These fields change.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 @min-[24rem]:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className={`block min-w-0 ${field.wide ? "@min-[24rem]:col-span-2" : ""}`}
            >
              <span className="text-xs text-muted">{field.label}</span>
              <input
                name={field.name}
                type={field.type}
                value={values[field.name]}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                autoComplete="off"
                onChange={(event) => update(field.name, event.target.value)}
                className="mt-1 h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink sm:h-10 sm:text-sm"
              />
            </label>
          ))}
        </div>

        <p className="mt-3 text-sm leading-snug text-muted">
          The subject line follows the role and institution until you edit it.
        </p>

        <button
          type="submit"
          disabled={!complete || downloading}
          className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-ink text-sm text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted" aria-live="polite">
          {error ||
            (complete
              ? `Downloads as ${appreciationLetterFileName(values.trainerName)}.`
              : "Fill every field to download the appreciation letter.")}
        </p>
      </form>

      <section className="min-w-0 lg:sticky lg:top-20" aria-label="Appreciation letter preview">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm text-muted">Preview</h2>
          <button
            type="button"
            onClick={() => void onDownload()}
            disabled={!complete || downloading}
            className="hidden h-10 items-center rounded-lg bg-ink px-4 text-sm text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 lg:inline-flex"
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
        <div className="relative h-[min(72dvh,820px)] min-h-80 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 sm:min-h-96 md:h-[min(78dvh,820px)] lg:h-[calc(100dvh-7.5rem)] lg:max-h-[860px] lg:min-h-[32rem]">
          {frames.some((frame) => frame.ready) ? null : (
            <div className="absolute inset-0 z-20 grid place-items-center bg-white text-sm text-muted">
              Preparing the letter…
            </div>
          )}
          {frames.map((frame) => (
            <iframe
              key={frame.url}
              title="Appreciation letter preview"
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
