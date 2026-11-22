export default function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-14 md:py-20">
      <div className="mb-10 max-w-2xl">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}
