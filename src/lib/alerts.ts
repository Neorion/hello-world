import { prisma } from "./prisma";
import type { AlertRuleType, WellStatus } from "@/generated/prisma/client";

export interface AlertCheckResult {
  created: number;
  skipped: number;
}

/**
 * Core alert evaluation logic.
 * Called by the cron endpoint or the send-alerts script.
 */
export async function evaluateAlerts(): Promise<AlertCheckResult> {
  let created = 0;
  let skipped = 0;

  const watchlists = await prisma.watchlist.findMany({
    include: {
      alertRules: { where: { isActive: true } },
      wells: {
        include: {
          well: {
            include: {
              permits: { orderBy: { createdAt: "desc" }, take: 5 },
              production: { orderBy: { reportMonth: "desc" }, take: 2 },
            },
          },
        },
      },
    },
  });

  for (const watchlist of watchlists) {
    for (const rule of watchlist.alertRules) {
      for (const ww of watchlist.wells) {
        const well = ww.well;

        switch (rule.ruleType as AlertRuleType) {
          case "NEW_PERMIT": {
            // Fire if a permit was issued in the last 48 hours
            const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
            const newPermit = well.permits.find(
              (p) => p.issuedDate && p.issuedDate > cutoff
            );
            if (newPermit) {
              const exists = await prisma.alert.findFirst({
                where: {
                  watchlistId: watchlist.id,
                  wellId: well.id,
                  ruleType: "NEW_PERMIT",
                  triggeredAt: { gte: cutoff },
                },
              });
              if (!exists) {
                await prisma.alert.create({
                  data: {
                    watchlistId: watchlist.id,
                    wellId: well.id,
                    ruleType: "NEW_PERMIT",
                    message: `New permit issued for ${well.wellName} (${well.apiNumber})`,
                    details: {
                      permitId: newPermit.id,
                      permitType: newPermit.permitType,
                      issuedDate: newPermit.issuedDate?.toISOString(),
                    },
                  },
                });
                created++;
              } else {
                skipped++;
              }
            }
            break;
          }

          case "STATUS_CHANGE": {
            // Fire if well status matches targetStatus and no recent alert exists
            const targetStatuses = (rule.targetStatus ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (targetStatuses.includes(well.status as string)) {
              const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
              const exists = await prisma.alert.findFirst({
                where: {
                  watchlistId: watchlist.id,
                  wellId: well.id,
                  ruleType: "STATUS_CHANGE",
                  triggeredAt: { gte: cutoff },
                },
              });
              if (!exists) {
                await prisma.alert.create({
                  data: {
                    watchlistId: watchlist.id,
                    wellId: well.id,
                    ruleType: "STATUS_CHANGE",
                    message: `${well.wellName} status changed to ${well.status}`,
                    details: { status: well.status },
                  },
                });
                created++;
              } else {
                skipped++;
              }
            }
            break;
          }

          case "FIRST_PRODUCTION": {
            if (well.production.length > 0) {
              const exists = await prisma.alert.findFirst({
                where: {
                  watchlistId: watchlist.id,
                  wellId: well.id,
                  ruleType: "FIRST_PRODUCTION",
                },
              });
              if (!exists) {
                const firstProd = well.production[0];
                await prisma.alert.create({
                  data: {
                    watchlistId: watchlist.id,
                    wellId: well.id,
                    ruleType: "FIRST_PRODUCTION",
                    message: `${well.wellName} reported first production`,
                    details: {
                      reportMonth: firstProd.reportMonth.toISOString(),
                      oilBbl: firstProd.oilBbl.toString(),
                      gasMcf: firstProd.gasMcf.toString(),
                    },
                  },
                });
                created++;
              } else {
                skipped++;
              }
            }
            break;
          }

          case "PRODUCTION_THRESHOLD": {
            if (rule.threshold && well.production.length > 0) {
              const latest = well.production[0];
              const oilTotal = Number(latest.oilBbl) + Number(latest.gasMcf) / 6; // BOE
              if (oilTotal >= Number(rule.threshold)) {
                const startOfMonth = new Date(latest.reportMonth);
                const exists = await prisma.alert.findFirst({
                  where: {
                    watchlistId: watchlist.id,
                    wellId: well.id,
                    ruleType: "PRODUCTION_THRESHOLD",
                    triggeredAt: { gte: startOfMonth },
                  },
                });
                if (!exists) {
                  await prisma.alert.create({
                    data: {
                      watchlistId: watchlist.id,
                      wellId: well.id,
                      ruleType: "PRODUCTION_THRESHOLD",
                      message: `${well.wellName} production exceeded threshold (${oilTotal.toFixed(0)} BOE)`,
                      details: {
                        reportMonth: latest.reportMonth.toISOString(),
                        oilBbl: latest.oilBbl.toString(),
                        gasMcf: latest.gasMcf.toString(),
                        threshold: rule.threshold.toString(),
                      },
                    },
                  });
                  created++;
                } else {
                  skipped++;
                }
              }
            }
            break;
          }
        }
      }
    }
  }

  return { created, skipped };
}

/**
 * Mark alerts as email-sent (called after mailer runs).
 */
export async function markAlertsEmailSent(alertIds: number[]): Promise<void> {
  if (alertIds.length === 0) return;
  await prisma.alert.updateMany({
    where: { id: { in: alertIds } },
    data: { emailSent: true },
  });
}

/**
 * Get unread alert count for a watchlist.
 */
export async function getUnreadAlertCount(watchlistId: number): Promise<number> {
  return prisma.alert.count({
    where: { watchlistId, isRead: false },
  });
}
