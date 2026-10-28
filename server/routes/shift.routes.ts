import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  authenticateToken,
  enforceTenantBoundary,
} from "../middlewares/auth.ts";
import { AttendanceService } from "../services/shift.service.ts";
import { LedgerError } from "../utils/errorCodes.ts";

const attendanceService = new AttendanceService();

export const shiftRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", enforceTenantBoundary);

  // POST /api/shift/open
  fastify.post("/open", async (request, reply) => {
    try {
      const { outletId } = request.body as { outletId: string };
      const cashierId = request.user!.userId;

      const result = await attendanceService.openShift(cashierId, outletId);

      return reply.code(201).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // POST /api/shift/close
  fastify.post("/close", async (request, reply) => {
    try {
      const { shiftId, actualCash } = request.body as {
        shiftId: string;
        actualCash: number;
      };

      const result = await attendanceService.closeShift(shiftId, actualCash);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // GET /api/shift/current
  fastify.get("/current", async (request, reply) => {
    try {
      const cashierId = request.user!.userId;
      const shift = await attendanceService.getCurrentShift(cashierId);

      return reply.code(200).send({
        success: true,
        data: shift,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });

  // POST /api/shift/attendance
  fastify.post("/attendance", async (request, reply) => {
    try {
      const { outletId } = request.body as { outletId: string };
      const userId = request.user!.userId;

      const result = await attendanceService.recordAttendance(userId, outletId);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof LedgerError) {
        return reply.code(error.status || 400).send({
          success: false,
          error: error.code,
          message: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: "SYS_001",
        message: error.message,
      });
    }
  });
};
