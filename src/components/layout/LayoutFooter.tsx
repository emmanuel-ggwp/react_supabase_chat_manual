export function LayoutFooter() {
  return (
    <footer className="border-t border-chat-surface/60 bg-chat-surface/80 px-4 py-4 text-xs text-chat-muted backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Construido con <span className="font-semibold text-chat-primary">Supabase</span> y{' '}
          <span className="font-semibold text-chat-secondary">React</span>.
        </p>
        <p>© {new Date().getFullYear()} Supabase Chat. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
