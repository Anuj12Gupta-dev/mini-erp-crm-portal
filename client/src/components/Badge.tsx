type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'badge',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  info: 'badge badge-info',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: string }) {
  return <span className={TONE_CLASS[tone]}>{children}</span>;
}
