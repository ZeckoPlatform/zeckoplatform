import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { orders, orderItems, orderHistory, orderCommunication, products } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

const router = Router();

// Create new order
router.post("/orders", authenticateToken, async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      specialInstructions,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Calculate total amount and group items by vendor
    const itemsByVendor = new Map<number, typeof items>();
    let totalAmount = 0;

    for (const item of items) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      const vendorItems = itemsByVendor.get(product.vendorId) || [];
      vendorItems.push({
        ...item,
        pricePerUnit: product.price,
        totalPrice: product.price * item.quantity,
      });
      itemsByVendor.set(product.vendorId, vendorItems);
      totalAmount += product.price * item.quantity;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "gbp",
      metadata: {
        orderId: "pending", // Will be updated after order creation
        buyerId: req.user.id.toString(),
      },
    });

    // Create orders for each vendor
    const createdOrders = [];
    for (const [vendorId, vendorItems] of itemsByVendor.entries()) {
      const vendorTotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const [order] = await db.insert(orders).values({
        buyerId: req.user.id,
        vendorId,
        status: "pending",
        totalAmount: vendorTotal,
        shippingAddress,
        billingAddress,
        specialInstructions,
        stripePaymentIntentId: paymentIntent.id,
      }).returning();

      // Create order items
      await db.insert(orderItems).values(
        vendorItems.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
        }))
      );

      // Create initial order history entry
      await db.insert(orderHistory).values({
        orderId: order.id,
        status: "pending",
        note: "Order created",
        createdBy: req.user.id,
      });

      createdOrders.push(order);
    }

    // Update payment intent with first order ID
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        orderId: createdOrders[0].id.toString(),
      },
    });

    res.json({
      orders: createdOrders,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Failed to create order",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get orders (with different views for buyers and vendors)
router.get("/orders", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { status } = req.query;
    const queryBuilder = db.query.orders.findMany({
      where: status
        ? and(
            req.user.userType === "vendor"
              ? eq(orders.vendorId, req.user.id)
              : eq(orders.buyerId, req.user.id),
            eq(orders.status, status as string)
          )
        : req.user.userType === "vendor"
        ? eq(orders.vendorId, req.user.id)
        : eq(orders.buyerId, req.user.id),
      with: {
        items: {
          with: {
            product: true,
          },
        },
        history: {
          orderBy: [desc(orderHistory.createdAt)],
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    const userOrders = await queryBuilder;
    res.json(userOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update order status (vendor only)
router.patch("/orders/:orderId/status", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderId } = req.params;
    const { status, note } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId)));

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.userType !== "vendor" || order.vendorId !== req.user.id) {
      return res.status(403).json({ message: "Only the vendor can update order status" });
    }

    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, parseInt(orderId)))
      .returning();

    // Add status update to history
    await db.insert(orderHistory).values({
      orderId: parseInt(orderId),
      status,
      note,
      createdBy: req.user.id,
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Add communication message
router.post("/orders/:orderId/messages", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderId } = req.params;
    const { message, receiverId } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId)));

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify user is either buyer or vendor of the order
    if (order.buyerId !== req.user.id && order.vendorId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to send messages for this order" });
    }

    // Create communication message
    const [communication] = await db.insert(orderCommunication).values({
      orderId: parseInt(orderId),
      senderId: req.user.id,
      receiverId,
      message,
    }).returning();

    res.json(communication);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      message: "Failed to send message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get order messages
router.get("/orders/:orderId/messages", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderId } = req.params;
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId)));

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify user is either buyer or vendor of the order
    if (order.buyerId !== req.user.id && order.vendorId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to view messages for this order" });
    }

    const messages = await db.query.orderCommunication.findMany({
      where: eq(orderCommunication.orderId, parseInt(orderId)),
      orderBy: [desc(orderCommunication.createdAt)],
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
