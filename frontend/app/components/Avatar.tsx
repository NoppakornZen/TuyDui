type AvatarProps = {
  label: string;
  url?: string | null;
  className?: string;
};

export function avatarInitial(label: string) {
  const first = Array.from(label.trim())[0];
  return first ? first.toLocaleUpperCase('th-TH') : '?';
}

export default function Avatar({ label, url, className }: AvatarProps) {
  if (url) {
    return <img className={className} src={url} alt="" />;
  }
  return <span className={className}>{avatarInitial(label)}</span>;
}
