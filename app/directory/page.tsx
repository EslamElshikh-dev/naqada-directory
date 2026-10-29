import Document, { generateMetadata as metadataForDirectory } from './public-document';
export const revalidate = 3600;
export function generateMetadata() { return metadataForDirectory({ searchParams: Promise.resolve({}) }); }
export default function Page() { return <Document searchParams={Promise.resolve({})} />; }
