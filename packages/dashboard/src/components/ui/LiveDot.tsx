interface Props {
  active?: boolean;
}

export function LiveDot({ active = true }: Props) {
  return (
    <span className={`live-dot ${active ? 'live-dot--active' : 'live-dot--idle'}`} aria-hidden />
  );
}
