export function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="block" data-panel={`${index} ${title}`}>
      <header className="block-head">
        <span>{index}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
