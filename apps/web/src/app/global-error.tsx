'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <button onClick={reset}>Tentar novamente</button>
        </div>
      </body>
    </html>
  );
}
