import { permanentRedirect } from 'next/navigation';

export default function LegacyDeveloperPage() {
  permanentRedirect('/about/developer');
}
