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
    <section className="block">
      <header className="block-head">
        <span>{index}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
