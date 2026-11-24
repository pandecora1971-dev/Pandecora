import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt, hashForLookup } from "@/lib/encryption";
import { hashPassword } from "@/lib/auth";
import { isAdmin, canManageAdmins } from "@/lib/roles";
import { createStaffAccountSchema } from "@/lib/validators";

export type CreateStaffResult =
  | { success: true; role: "MODERATOR" | "ADMIN" }
  | { success: false; error: string };

/**
 * Creates a brand-new, already-verified staff account. Public sign-up is off,
 * so this is the in-panel counterpart of scripts/provision-accounts.ts.
 * Admins may create moderators; only the super admin may create admins.
 */
export async function createStaffAccountAs(
  actor: { id: string; name: string; role: Role },
  input: { name: unknown; email: unknown; password: unknown; role: unknown },
): Promise<CreateStaffResult> {
  if (!isAdmin(actor.role)) return { success: false, error: "Unauthorized." };

  const parsed = createStaffAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password, role } = parsed.data;

  if (role === "ADMIN" && !canManageAdmins(actor.role)) {
    return { success: false, error: "Only the super admin can create admin accounts." };
  }

  try {
    const emailHash = hashForLookup(email);
    const existing = await db.user.findUnique({ where: { emailHash }, select: { id: true } });
    if (existing) {
      return { success: false, error: "An account with that email already exists — use Promote instead." };
    }

    const encEmail = encrypt(email);
    const encPhone = encrypt("+00000000000"); // staff accounts have no personal phone
    const now = new Date();

    const user = await db.user.create({
      select: { id: true },
      data: {
        name,
        encryptedEmail: encEmail.ciphertext,
        emailIV:        encEmail.iv,
        emailTag:       encEmail.tag,
        emailHash,
        encryptedPhone: encPhone.ciphertext,
        phoneIV:        encPhone.iv,
        phoneTag:       encPhone.tag,
        hashedPassword: await hashPassword(password),
        role,
        teacherOrStudent: "TEACHER",
        division: "N/A",
        district: "N/A",
        upazila:  "N/A",
        institutionType: "UNIVERSITY",
        universityType:  "PUBLIC",
        institutionName: "Platform Administration",
        department:      "Administration",
        emailVerified:   true,
        emailVerifiedAt: now,
      },
    });

    await db.auditLog
      .create({
        data: {
          adminId:    actor.id,
          adminName:  actor.name,
          action:     "SIGNUP",
          targetId:   user.id,
          targetType: "USER",
          details:    `Created ${role} account for ${name}`,
        },
      })
      .catch(() => undefined);

    return { success: true, role };
  } catch {
    // Two admins creating the same email at once: the unique emailHash wins.
    return { success: false, error: "Failed to create account." };
  }
}
