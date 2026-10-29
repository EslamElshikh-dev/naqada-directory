import review from '@/data/owner-copy-review.json';
export function publicOwnerCopy<T extends { id:string;name:string;description:string;hours:string }>(row:T): T & {copy_reviewed_at?:string} {
  const item = review.items.find(item => item.id === row.id);
  if (!item || item.before.name !== row.name || item.before.description !== row.description || item.before.hours !== row.hours) return row;
  return { ...row, ...item.after, copy_reviewed_at: item.reviewedAt };
}
