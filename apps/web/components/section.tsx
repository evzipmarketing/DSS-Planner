export function Section({
  index,
  title,
  children,
  hideHeading = false,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  hideHeading?: boolean;
}) {
  return (
    <section className="block" data-panel={`${index} ${title}`} aria-label={hideHeading ? title : undefined}>
      {hideHeading ? null : (
        <header className="block-head">
          <span>{index}</span>
          <h2>{title}</h2>
        </header>
      )}
      {children}
    </section>
  );
}
