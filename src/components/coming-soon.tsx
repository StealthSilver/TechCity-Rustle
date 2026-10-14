export function ComingSoon({ label }: { label: string }) {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-full text-center">
        <p className="text-sm text-muted">{label}</p>
        <h1 className="mt-3 bg-[linear-gradient(100deg,#8a8a86_0%,#8a8a86_42%,#ffffff_50%,#8a8a86_58%,#8a8a86_100%)] bg-[length:220%_100%] text-4xl font-medium tracking-tight text-muted motion-safe:animate-shimmer motion-safe:bg-clip-text motion-safe:text-transparent sm:text-6xl lg:text-7xl">
          Coming soon
        </h1>
      </div>
    </main>
  );
}
