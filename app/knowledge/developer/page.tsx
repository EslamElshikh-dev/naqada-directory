import '@/app/route-styles/knowledge-developer.css';
import { permanentRedirect } from 'next/navigation';

export default function LegacyDeveloperPage() {
  permanentRedirect('/developer');
}
