import { categories, localities } from '@/lib/data';

function field(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export function validateOwnerListing(input: unknown) {
  if (!input || typeof input !== 'object') return { error: 'أكمل بيانات النشاط أولًا.' } as const;
  const body = input as Record<string, unknown>;
  const data = {
    name: field(body.name, 160),
    phone: field(body.phone, 20).replace(/[\s()-]/g, ''),
    hours: field(body.hours, 180),
    address: field(body.address, 240),
    description: field(body.description, 2000),
    category: field(body.category, 120),
    locality: field(body.locality, 160),
  };
  if (data.name.length < 2) return { error: 'اكتب اسم النشاط بوضوح.' } as const;
  if (!/^\+?[0-9]{10,15}$/.test(data.phone)) return { error: 'اكتب رقم جوال صحيحًا مثل 01012345678.' } as const;
  if (data.hours.length < 3) return { error: 'اكتب مواعيد العمل؛ ولو بتتغير، اذكر إن التواصل مسبقًا مطلوب.' } as const;
  if (data.address.length < 5) return { error: 'اكتب عنوانًا يساعد الناس توصل للنشاط.' } as const;
  if (data.description.length < 20) return { error: 'صف نشاطك وخدماتك في ٢٠ حرفًا على الأقل.' } as const;
  if (!categories.some((item) => item.name === data.category)) return { error: 'اختر تصنيف النشاط من القائمة.' } as const;
  if (!localities.some((item) => item.name === data.locality)) return { error: 'اختر القرية أو الموضع من القائمة.' } as const;
  return { data } as const;
}
