import rateLimit from "express-rate-limit";

// Standard rate limiter: Maksimal 100 request per 15 menit dari IP yang sama
export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message:
      "Terlalu banyak request dari IP ini, silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter untuk endpoint sensitif seperti login: Maksimal 5 percobaan per 15 menit
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
