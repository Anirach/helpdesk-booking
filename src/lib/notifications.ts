/**
 * Server-Sent Events (SSE) notification manager
 * Manages real-time connections for appointment updates
 */

type EventCallback = (data: any) => void;

interface Connection {
  userId: string;
  role: string;
  controller: ReadableStreamDefaultController;
  lastHeartbeat: number;
}

class NotificationManager {
  private connections: Map<string, Connection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat every 30 seconds
    this.startHeartbeat();
  }

  /**
   * Register a new SSE connection
   */
  addConnection(connectionId: string, userId: string, role: string, controller: ReadableStreamDefaultController) {
    this.connections.set(connectionId, {
      userId,
      role,
      controller,
      lastHeartbeat: Date.now(),
    });
    console.log(`[SSE] Connection added: ${connectionId} (${role})`);
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string) {
    if (this.connections.has(connectionId)) {
      this.connections.delete(connectionId);
      console.log(`[SSE] Connection removed: ${connectionId}`);
    }
  }

  /**
   * Broadcast event to specific users or roles
   */
  broadcast(event: {
    type: string;
    data: any;
    targetUserId?: string;
    targetRole?: string;
  }) {
    const message = `data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    let sentCount = 0;

    this.connections.forEach((connection, connectionId) => {
      // Filter by target criteria
      if (event.targetUserId && connection.userId !== event.targetUserId) {
        return;
      }
      if (event.targetRole && connection.role !== event.targetRole) {
        return;
      }

      try {
        connection.controller.enqueue(encoded);
        sentCount++;
      } catch (error) {
        console.error(`[SSE] Failed to send to ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    });

    console.log(`[SSE] Broadcast ${event.type}: sent to ${sentCount} connections`);
  }

  /**
   * Send heartbeat to all connections
   */
  private sendHeartbeat() {
    const message = `: heartbeat\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const now = Date.now();
    const staleConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      try {
        connection.controller.enqueue(encoded);
        connection.lastHeartbeat = now;
      } catch (error) {
        console.error(`[SSE] Heartbeat failed for ${connectionId}:`, error);
        staleConnections.push(connectionId);
      }
    });

    // Clean up stale connections
    staleConnections.forEach((id) => this.removeConnection(id));

    if (this.connections.size > 0) {
      console.log(`[SSE] Heartbeat sent to ${this.connections.size} connections`);
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Every 30 seconds
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections by role
   */
  getConnectionsByRole(role: string): number {
    return Array.from(this.connections.values()).filter((c) => c.role === role).length;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

/**
 * Helper to create SSE stream
 */
export function createSSEStream(userId: string, role: string) {
  const connectionId = `${userId}-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      // Register connection
      notificationManager.addConnection(connectionId, userId, role, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      const welcome = encoder.encode(`data: ${JSON.stringify({ type: "connected", connectionId })}\n\n`);
      controller.enqueue(welcome);
    },
    cancel() {
      // Clean up on disconnect
      notificationManager.removeConnection(connectionId);
    },
  });

  return { stream, connectionId };
}
