import Document, { generateMetadata as metadataForPage } from './public-document';
export { generateStaticParams } from './public-document';
export const revalidate = 3600;
type Props = { params: Promise<{ slug: string; category: string }> };
export function generateMetadata({ params }: Props) { return metadataForPage({ params, searchParams: Promise.resolve({}) }); }
export default function Page({ params }: Props) { return <Document params={params} searchParams={Promise.resolve({})} />; }
