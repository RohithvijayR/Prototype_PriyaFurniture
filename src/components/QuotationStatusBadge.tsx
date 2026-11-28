import { getQuotationStatusMeta, type QuotationStatusDisplayMeta } from '../types/firestore';

interface QuotationStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const TONE_STYLES: Record<
  QuotationStatusDisplayMeta['tone'],
  { container: string; dot: string }
> = {
  neutral: {
    container: 'bg-[#F5F0E8] text-[#202735] border-[#D9CBB8]',
    dot: 'bg-[#586070]',
  },
  slate: {
    container: 'bg-[#EEF1F5] text-[#202735] border-[#CBD3DF]',
    dot: 'bg-[#202735]',
  },
  amber: {
    container: 'bg-[#FDF4EC] text-[#7E3D10] border-[#E4C2A6]',
    dot: 'bg-[#9B4D17]',
  },
  positive: {
    container: 'bg-[#EDF5EF] text-[#1E4D2B] border-[#BDD7C3]',
    dot: 'bg-[#2C6E3F]',
  },
  muted: {
    container: 'bg-[#F4F3F1] text-[#586070] border-[#DCD8D0]',
    dot: 'bg-[#8A8F99]',
  },
};

export function QuotationStatusBadge({ status, size = 'sm' }: QuotationStatusBadgeProps) {
  const meta = getQuotationStatusMeta(status);
  const styles = TONE_STYLES[meta.tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-medium whitespace-nowrap ${
        styles.container
      } ${size === 'md' ? 'px-3 py-1 text-xs rounded-lg' : 'px-2.5 py-0.5 text-xs rounded-md'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
