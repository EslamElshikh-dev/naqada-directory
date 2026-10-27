import '@/app/content-styles.css';
import { permanentRedirect } from 'next/navigation';

export default function LegacyDeveloperPage() {
  permanentRedirect('/developer');
}
