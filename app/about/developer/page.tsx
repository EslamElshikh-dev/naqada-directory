import '@/app/route-styles/about-developer.css';
import { permanentRedirect } from 'next/navigation';

export default function FormerDeveloperPage() {
  permanentRedirect('/developer');
}
