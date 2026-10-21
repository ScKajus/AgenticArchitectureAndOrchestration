import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { REFUND_LIMIT, REFUND_WINDOW_DAYS, daysAgo, orders, refunds, verifiedCustomerIds } from "../data.ts";
import { fail, ok } from "../result.ts";

const REFUNDABLE_STATUSES = ["delivered", "returned"];

export function registerProcessRefund(server: McpServer) {
    server.registerTool(
        "process_refund",
        {
            title: "Process refund",
            description:
                "Refunds the given amount on one order to the original payment method. The customer_id must have been " +
                `verified with get_customer and must own the order. Refunds over $${REFUND_LIMIT}, outside the ` +
                `${REFUND_WINDOW_DAYS}-day window, on non-delivered orders, or on already-refunded orders are rejected ` +
                "with a rejection_reason.",
            inputSchema: {
                customer_id: z.string().describe("Verified customer ID from get_customer"),
                order_id: z.string().describe("Order to refund"),
                amount: z.number().describe("Amount to refund, greater than 0 and no more than total - refunded_amount"),
                reason: z.string().describe("Short reason, e.g. 'damaged item'"),
            },
            annotations: { destructiveHint: true, idempotentHint: false },
        },
        async ({ customer_id, order_id, amount, reason }) => {
            if (!verifiedCustomerIds.has(customer_id)) {
                return fail("permission_denied", `Customer ${customer_id} has not been verified. Call get_customer first.`);
            }
            if (!(amount > 0)) {
                return fail("invalid_input", "amount must be greater than 0.");
            }
            if (!reason.trim()) {
                return fail("invalid_input", "reason must not be empty.");
            }

            const order = orders.find(o => o.order_id.toLowerCase() === order_id.trim().toLowerCase());
            if (!order) {
                return fail("not_found", `No order found with number ${order_id}.`);
            }
            if (order.customer_id !== customer_id) {
                return fail("permission_denied", `Order ${order.order_id} does not belong to customer ${customer_id}.`);
            }

            const reject = (rejection_reason: string) =>
                ok({ refund_id: null, order_id: order.order_id, amount, status: "rejected", rejection_reason });

            if (!REFUNDABLE_STATUSES.includes(order.status)) {
                return reject(`Order status is '${order.status}'. Only delivered or returned orders can be refunded.`);
            }
            if (order.refunded_amount > 0) {
                return reject(`Order already has a refund of $${order.refunded_amount.toFixed(2)}.`);
            }
            if (order.delivery_date && order.delivery_date < daysAgo(REFUND_WINDOW_DAYS)) {
                return reject(`Order was delivered on ${order.delivery_date}, outside the ${REFUND_WINDOW_DAYS}-day refund window.`);
            }
            const remaining = order.total - order.refunded_amount;
            if (amount > remaining) {
                return reject(`Amount $${amount.toFixed(2)} exceeds the refundable balance of $${remaining.toFixed(2)}.`);
            }
            if (amount > REFUND_LIMIT) {
                return reject(`Amount $${amount.toFixed(2)} exceeds the agent refund limit of $${REFUND_LIMIT}.`);
            }

            const refund = {
                refund_id: `R-${55120 + refunds.length}`,
                order_id: order.order_id,
                customer_id,
                amount,
                reason,
                created_at: new Date().toISOString(),
            };
            refunds.push(refund);
            order.refunded_amount += amount;

            return ok({ refund_id: refund.refund_id, order_id: order.order_id, amount, status: "processed" });
        },
    );
}
