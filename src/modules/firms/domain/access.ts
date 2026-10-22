export type MemberRole = "admin" | "manager" | "staff";
export type Actor = Readonly<{
  userId: string;
  firmId: string;
  role: MemberRole;
}>;

export function canManageCompanies(role: MemberRole) {
  return role === "admin" || role === "manager";
}
