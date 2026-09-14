import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-state">
      <h1>Pantalla no encontrada</h1>
      <Link className="button button--primary" href="/">
        Volver a HOY
      </Link>
    </section>
  );
}
