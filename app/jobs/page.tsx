import Document from './public-document';
export { metadata } from './public-document';
export const revalidate = 3600;
export default function Page() { return <Document searchParams={Promise.resolve({})} />; }
