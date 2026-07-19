type TrendSvgProps = {
  points: number[];
  emptyLabel?: string;
};

export function TrendSvg({ points, emptyLabel = "Trend starts after two rated matches." }: TrendSvgProps) {
  if (points.length < 2) {
    return (
      <div className="grid h-28 place-items-center rounded-lg border-2 border-dashed border-net-line bg-warm-white text-center font-bold text-ink">
        {emptyLabel}
      </div>
    );
  }

  const width = 320;
  const height = 112;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = Math.max(1, max - min);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((point - min) / spread) * (height - 18) - 9;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="h-28 w-full rounded-lg border-2 border-net-line bg-warm-white" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rating trend">
      <path d="M0 84 H320 M0 56 H320 M0 28 H320" stroke="#D9D2C2" strokeWidth="2" />
      <path d={path} fill="none" stroke="#A84A30" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      {points.map((point, index) => {
        const x = (index / Math.max(1, points.length - 1)) * width;
        const y = height - ((point - min) / spread) * (height - 18) - 9;
        return <circle key={`${point}-${index}`} cx={x} cy={y} r="4" fill="#E7B15A" stroke="#26332D" strokeWidth="2" />;
      })}
    </svg>
  );
}
