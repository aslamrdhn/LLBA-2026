import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { generateToken } from "../utils/jwt.ts";
import { getFirebaseAdmin } from "../lib/firebase-admin.ts";
import { getAuth } from "firebase-admin/auth";

export class AuthService {
  /**
   * Cashier / Kitchen PIN Login
   */
  static async loginWithPin(userId: string, pin: string, deviceId?: string) {
    const user = await prisma.userProfile.findFirst({
      where: {
        OR: [{ userId }, { id: userId }, { phone: userId }],
      },
      include: {
        userOutlets: {
          include: { outlet: true },
        },
        tenant: {
          include: { outlets: true },
        },
      },
    });

    if (!user) {
      throw new Error("Pengguna tidak ditemukan");
    }

    if (user.status !== "active") {
      throw new Error("Akun pengguna tidak aktif. Hubungi pemilik atau pengelola.");
    }

    // §2.4 rule 8: PIN Manager tidak bisa login sesi penuh; /api/auth/pin-login menolak role MANAGER/OWNER
    if (user.role === "MANAGER" || user.role === "OWNER") {
      throw new Error("PIN tidak diizinkan untuk login sesi penuh Manager atau Owner. Silakan gunakan Google Login.");
    }

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      throw new Error(
        "Akun terkunci karena salah PIN berulang kali. Silakan tunggu atau hubungi manajer.",
      );
    }

    if (!user.pinHash) {
      throw new Error("PIN belum diatur untuk akun ini.");
    }

    const isValid = await bcrypt.compare(pin, user.pinHash);

    if (!isValid) {
      const attempts = user.pinAttempts + 1;
      let lockedUntil = null;

      if (attempts >= 3) {
        // Lock for 15 minutes
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          pinAttempts: attempts,
          pinLockedUntil: lockedUntil,
        },
      });

      if (lockedUntil) {
        throw new Error(
          "PIN salah 3 kali berturut-turut. Akun dikunci sementara selama 15 menit demi keamanan.",
        );
      }
      throw new Error("PIN yang Anda masukkan salah.");
    }

    // Success login: reset attempts and stamp last login
    const updatedUser = await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        pinAttempts: 0,
        pinLockedUntil: null,
        lastLoginAt: new Date(),
        deviceId: deviceId || user.deviceId,
      },
      include: {
        userOutlets: {
          include: { outlet: true },
        },
        tenant: {
          include: { outlets: true },
        },
      },
    });

    const token = generateToken({
      userId: updatedUser.userId,
      tenantId: updatedUser.tenantId || undefined,
    });

    return { token, role: updatedUser.role, user: updatedUser };
  }

  /**
   * Google Authentication Logic (Login/Register)
   */
  static async googleAuth(payload: any) {
    const {
      idToken,
      action,
      storeName,
      storePhone,
      storeAddress,
    } = payload;

    let uid: string;
    let email: string;
    let name: string;

    // Fast-path test/mock tokens (strictly forbidden in production)
    const isMockAllowed = process.env.NODE_ENV !== "production";
    if (
      isMockAllowed &&
      (process.env.NODE_ENV === "test" ||
        idToken.startsWith("mock_") ||
        idToken.startsWith("test_"))
    ) {
      uid = idToken.replace(/^(mock_|test_)/, "usr_");
      email = `${uid}@ledgerline.test`;
      name = `Pengguna Test (${uid})`;
    } else {
      // Live Firebase Admin verification
      const adminApp = getFirebaseAdmin();
      const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || `${uid}@firebase.user`;
      name = decodedToken.name || email;
    }

    if (action === "register") {
      const existingUser = await prisma.userProfile.findFirst({
        where: {
          OR: [{ userId: uid }, { email }],
        },
      });
      if (existingUser) {
        throw new Error("Akun Google ini sudah terdaftar. Silakan pilih opsi Masuk.");
      }

      const storeSlug =
        (storeName || "kedai-kopi").toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Math.floor(Math.random() * 10000);

      // Ensure Growth plan exists
      let growthPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: "growth" },
      });
      if (!growthPlan) {
        growthPlan = await prisma.subscriptionPlan.create({
          data: {
            code: "growth",
            name: "Growth Tier",
            priceMonthly: 249000,
            priceYearly: 2490000,
          },
        });
      }

      const tenant = await prisma.tenant.create({
        data: {
          name: storeName || "Kedai Kopi Utama",
          slug: storeSlug,
          status: "active",
          lifecycleStatus: "TRIAL",
          onboardingStep: 1,
          onboardingCompleted: false,
          outlets: {
            create: {
              name: "Outlet Utama",
              address: storeAddress || "Jl. Kopi No. 1",
              phone: storePhone || "",
            },
          },
        },
      });

      const primaryOutlet = await prisma.outlet.findFirst({
        where: { tenantId: tenant.id },
      });

      // Default main warehouse
      await prisma.warehouse.create({
        data: {
          tenantId: tenant.id,
          name: "Gudang Utama",
          location: "Pusat",
        },
      });

      // 14-day Growth trial subscription
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: growthPlan.id,
          status: "TRIAL",
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          eventType: "TRIAL_STARTED",
          toStatus: "TRIAL",
          metadata: JSON.stringify({ source: "google-auth", plan: "GROWTH", trialDays: 14 }),
        },
      });

      const user = await prisma.userProfile.create({
        data: {
          userId: uid,
          email,
          tenantId: tenant.id,
          role: "OWNER",
          fullName: name,
          userOutlets: {
            create: {
              outletId: primaryOutlet!.id,
              tenantId: tenant.id,
              role: "OWNER",
              isDefault: true,
            },
          },
        },
        include: {
          userOutlets: { include: { outlet: true } },
          tenant: { include: { outlets: true } },
        },
      });

      const token = generateToken({
        userId: user.userId,
        tenantId: user.tenantId || undefined,
      });

      return { token, tenant, user, subscription };
    } else {
      // Login
      const user = await prisma.userProfile.findFirst({
        where: {
          OR: [{ userId: uid }, { email }],
        },
        include: {
          tenant: { include: { outlets: true } },
          userOutlets: { include: { outlet: true } },
        },
      });

      if (!user) {
        // Auto-create trial account for frictionless onboarding
        const storeSlug =
          "kedai-" + Math.random().toString(36).substring(2, 8);

        const tenant = await prisma.tenant.create({
          data: {
            name: `${name}'s Coffee`,
            slug: storeSlug,
            status: "active",
            outlets: {
              create: {
                name: "Outlet Utama",
              },
            },
          },
          include: { outlets: true },
        });

        const createdUser = await prisma.userProfile.create({
          data: {
            userId: uid,
            email,
            tenantId: tenant.id,
            role: "OWNER",
            fullName: name,
            userOutlets: {
              create: {
                outletId: tenant.outlets[0].id,
                tenantId: tenant.id,
                role: "OWNER",
                isDefault: true,
              },
            },
          },
          include: {
            tenant: { include: { outlets: true } },
            userOutlets: { include: { outlet: true } },
          },
        });

        const token = generateToken({
          userId: createdUser.userId,
          tenantId: createdUser.tenantId || undefined,
        });

        return { token, tenant, user: createdUser };
      }

      if (user.status !== "active") {
        throw new Error("Akun Anda telah dinonaktifkan. Hubungi administrator.");
      }

      const token = generateToken({
        userId: user.userId,
        tenantId: user.tenantId || undefined,
      });

      return { token, tenant: user.tenant, user };
    }
  }

  /**
   * Owner Self-Service Onboarding Flow
   * Complete business initialization with 14-day Growth trial
   */
  static async selfServiceOnboard(payload: {
    ownerName: string;
    email: string;
    phone: string;
    businessName: string;
    businessType?: string;
    firstOutletName?: string;
    city?: string;
    idToken?: string;
    pin?: string;
  }) {
    const {
      ownerName,
      email,
      phone,
      businessName,
      businessType = "COFFEE_SHOP",
      firstOutletName = "Outlet Utama",
      city = "Jakarta",
      idToken,
      pin,
    } = payload;

    let uid: string;
    const isMockAllowed = process.env.NODE_ENV !== "production";
    if (
      isMockAllowed &&
      idToken &&
      (idToken.startsWith("mock_") ||
        idToken.startsWith("test_") ||
        process.env.NODE_ENV === "test")
    ) {
      uid = idToken.replace(/^(mock_|test_)/, "usr_");
    } else if (idToken) {
      try {
        const adminApp = getFirebaseAdmin();
        const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch {
        uid = `usr_${crypto.randomBytes(6).toString("hex")}`;
      }
    } else {
      uid = `usr_${crypto.randomBytes(6).toString("hex")}`;
    }

    const existingUser = await prisma.userProfile.findFirst({
      where: {
        OR: [{ userId: uid }, { email }],
      },
    });

    if (existingUser) {
      throw new Error("Email atau akun ini sudah terdaftar. Silakan pilih opsi Masuk.");
    }

    const storeSlug =
      (businessName || "kedai-kopi").toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.floor(Math.random() * 10000);

    let growthPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: "growth" },
    });
    if (!growthPlan) {
      growthPlan = await prisma.subscriptionPlan.create({
        data: {
          code: "growth",
          name: "Growth Tier",
          priceMonthly: 249000,
          priceYearly: 2490000,
        },
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: businessName,
        slug: storeSlug,
        status: "active",
        lifecycleStatus: "TRIAL",
        onboardingStep: 1,
        onboardingCompleted: false,
        config: JSON.stringify({ businessType, city }),
        outlets: {
          create: {
            name: firstOutletName,
            address: city,
            phone,
          },
        },
      },
    });

    const primaryOutlet = await prisma.outlet.findFirst({
      where: { tenantId: tenant.id },
    });

    await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        name: "Gudang Utama",
        location: "Pusat",
      },
    });

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const subscription = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: growthPlan.id,
        status: "TRIAL",
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        eventType: "TRIAL_STARTED",
        toStatus: "TRIAL",
        metadata: JSON.stringify({ source: "self-service", plan: "GROWTH", trialDays: 14 }),
      },
    });

    let pinHash = null;
    if (pin && pin.length >= 4) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    const user = await prisma.userProfile.create({
      data: {
        userId: uid,
        email,
        fullName: ownerName,
        phone,
        tenantId: tenant.id,
        role: "OWNER",
        status: "active",
        pinHash,
        userOutlets: {
          create: {
            outletId: primaryOutlet!.id,
            tenantId: tenant.id,
            role: "OWNER",
            isDefault: true,
          },
        },
      },
      include: {
        userOutlets: { include: { outlet: true } },
        tenant: { include: { outlets: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        actorRole: "OWNER",
        action: "SELF_SERVICE_REGISTRATION",
        resourceType: "TENANT",
        resourceId: tenant.id,
        severity: "info",
        metadata: JSON.stringify({ businessName, plan: "GROWTH", trialDays: 14 }),
      },
    });

    const token = generateToken({
      userId: user.userId,
      tenantId: user.tenantId || undefined,
    });

    return { token, tenant, user, subscription };
  }
}
