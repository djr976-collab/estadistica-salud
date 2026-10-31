import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="h1">Página no encontrada</h1>
      <p>La dirección no existe o el registro no está disponible para su usuario.</p>
      <Link href="/" className="btn-primary">Volver al inicio</Link>
    </div>
  );
}
