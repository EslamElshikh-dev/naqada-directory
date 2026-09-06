export type MemberFrameCode = 'gray' | 'bronze' | 'silver' | 'gold' | 'diamond';

export type MemberRoleOverride = {
  roleCode: string;
  roleLabel: string;
  frameCode: MemberFrameCode;
} | null;

export type MemberReputation = {
  frameCode: MemberFrameCode;
  tierLabel: string;
  roleCode: string | null;
  contributionCount: number;
  acceptedCount: number;
  pendingCount: number;
  memberDays: number;
  nextTierAt: number | null;
  nextTierLabel: string | null;
  progressPercent: number;
  isRoleOverride: boolean;
};

const rankLabels: Record<MemberFrameCode, string> = {
  gray: 'عضو جديد',
  bronze: 'مساهم برونزي',
  silver: 'مساهم فضي',
  gold: 'مساهم ذهبي',
  diamond: 'مالك ومطور الدليل',
};

function daysSince(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function progressBetween(value: number, start: number, end: number) {
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, Math.round(((value - start) / (end - start)) * 100)));
}

export function resolveMemberReputation(input: {
  createdAt: string;
  statuses?: string[];
  role?: MemberRoleOverride;
}): MemberReputation {
  const statuses = input.statuses || [];
  const contributionCount = statuses.filter((status) => status !== 'rejected').length;
  const acceptedCount = statuses.filter((status) => status === 'approved' || status === 'published').length;
  const pendingCount = statuses.filter((status) => status === 'pending' || status === 'reviewing').length;
  const memberDays = daysSince(input.createdAt);

  if (input.role) {
    return {
      frameCode: input.role.frameCode,
      tierLabel: input.role.roleLabel,
      roleCode: input.role.roleCode,
      contributionCount,
      acceptedCount,
      pendingCount,
      memberDays,
      nextTierAt: null,
      nextTierLabel: null,
      progressPercent: 100,
      isRoleOverride: true,
    };
  }

  let frameCode: MemberFrameCode = 'gray';
  if (contributionCount > 100 || memberDays >= 365) frameCode = 'gold';
  else if (contributionCount > 50) frameCode = 'silver';
  else if (contributionCount > 10) frameCode = 'bronze';

  let nextTierAt: number | null = 11;
  let nextTierLabel: string | null = rankLabels.bronze;
  let progressPercent = progressBetween(contributionCount, 0, 11);

  if (frameCode === 'bronze') {
    nextTierAt = 51;
    nextTierLabel = rankLabels.silver;
    progressPercent = progressBetween(contributionCount, 11, 51);
  } else if (frameCode === 'silver') {
    nextTierAt = 101;
    nextTierLabel = rankLabels.gold;
    progressPercent = progressBetween(contributionCount, 51, 101);
  } else if (frameCode === 'gold') {
    nextTierAt = null;
    nextTierLabel = null;
    progressPercent = 100;
  }

  return {
    frameCode,
    tierLabel: rankLabels[frameCode],
    roleCode: null,
    contributionCount,
    acceptedCount,
    pendingCount,
    memberDays,
    nextTierAt,
    nextTierLabel,
    progressPercent,
    isRoleOverride: false,
  };
}
