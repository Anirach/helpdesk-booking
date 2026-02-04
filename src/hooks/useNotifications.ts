import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface NotificationEvent {
  type: string;
  [key: string]: any;
}

interface UseNotificationsOptions {
  userId: string;
  role: string;
  onAppointmentAssigned?: (data: any) => void;
  onAppointmentStatusChanged?: (data: any) => void;
  enabled?: boolean;
}

export function useNotifications({
  userId,
  role,
  onAppointmentAssigned,
  onAppointmentStatusChanged,
  enabled = true,
}: UseNotificationsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !userId || !role) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const url = `/api/notifications/subscribe?userId=${userId}&role=${role}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("[SSE] Connected");
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationEvent = JSON.parse(event.data);

          console.log("[SSE] Received:", data.type, data);

          // Handle different event types
          switch (data.type) {
            case "connected":
              console.log("[SSE] Connection established:", data.connectionId);
              break;

            case "appointment:assigned":
              if (onAppointmentAssigned) {
                onAppointmentAssigned(data);
              }

              // Show toast notification
              if (data.action === "ASSIGNED") {
                toast.success(
                  `มอบหมายงานใหม่: ${data.serviceName} - ${data.customerName} (${data.appointmentTime})`
                );
              } else if (data.action === "REASSIGNED") {
                toast.info(
                  `เปลี่ยนการมอบหมาย: ${data.serviceName} - จาก ${data.oldStaffName} → ${data.staffName}`
                );
              }
              break;

            case "appointment:status_changed":
              if (onAppointmentStatusChanged) {
                onAppointmentStatusChanged(data);
              }

              toast.info(
                `เปลี่ยนสถานะนัดหมาย: ${data.customerName} - ${data.newStatus}`
              );
              break;

            default:
              console.log("[SSE] Unknown event type:", data.type);
          }
        } catch (error) {
          console.error("[SSE] Failed to parse message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("[SSE] Error:", error);
        eventSource.close();

        // Attempt to reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error("[SSE] Failed to connect:", error);
    }
  }, [userId, role, enabled, onAppointmentAssigned, onAppointmentStatusChanged]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log("[SSE] Disconnected");
    }
  }, []);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    disconnect,
    reconnect: connect,
  };
}
