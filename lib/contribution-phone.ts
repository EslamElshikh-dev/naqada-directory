// Only treat a phone-only public correction as a proposed phone. Private contact
// details and numbers embedded in prose are never copied into the public record.
export function proposedContributionPhone(requestType: string, details: string | null) {
  if (requestType !== 'correction' || !details) return null;
  const raw = details.trim().replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  if (!/^\+?[\d ()-]+$/.test(raw)) return null;
  const phone = raw.replace(/[ ()-]/g, '');
  return /^\+?\d{10,15}$/.test(phone) ? phone : null;
}
