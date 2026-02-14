'use client';

interface Props {
  onClick: () => void;
}

export function Fab({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{ bottom: `calc(5rem + max(env(safe-area-inset-bottom), 0px))` }}
      className="fixed right-5 z-50 w-12 h-12 rounded-full bg-accent text-white shadow-lg shadow-accent/25 flex items-center justify-center hover:brightness-110 active:scale-95 transition-all duration-150 tap-highlight"
      aria-label="Adicionar tarefa"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
