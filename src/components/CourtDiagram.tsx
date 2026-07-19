type CourtDiagramProps = {
  className?: string;
};

export function CourtDiagram({ className = "" }: CourtDiagramProps) {
  return (
    <svg className={className} viewBox="0 0 100 200" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="196" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="83" width="96" height="17" fill="currentColor" fillOpacity="0.16" />
      <rect x="2" y="100" width="96" height="17" fill="currentColor" fillOpacity="0.16" />
      <line x1="2" y1="100" x2="98" y2="100" stroke="currentColor" strokeWidth="2.4" />
      <line x1="50" y1="2" x2="50" y2="83" stroke="currentColor" strokeWidth="1.2" />
      <line x1="50" y1="117" x2="50" y2="198" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
