import { useState, useEffect, useMemo, useRef } from "react";
import {
  Typography,
  Button,
  Stack,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  Box,
  Tabs,
  Tab,
  Fade,
  Paper,
  IconButton,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  AccessTime,
  NotificationsActive,
  CheckCircle,
  DeliveryDining,
  ShoppingBag,
  Restaurant,
  DeleteOutline,
  KeyboardArrowRight,
  InfoOutlined,
  Person,
} from "@mui/icons-material";
import { useCollection } from "../hooks/useCollection";
import { differenceInMinutes } from "date-fns";
import { useParams } from "react-router-dom";
import { Order, OrderStatus } from "../interfaces/Order";

/* =======================
   🎨 Configuración de Estados
 ======================= */

const statusConfig: Record<
  OrderStatus,
  { label: string; color: "warning" | "primary" | "info" | "success" | "error" | "secondary"; icon: any }
> = {
  pendiente: { label: "Pendiente", color: "warning", icon: <AccessTime fontSize="small" /> },
  enProceso: { label: "En Cocina", color: "primary", icon: <Restaurant fontSize="small" /> },
  enCamino: { label: "En Camino", color: "info", icon: <DeliveryDining fontSize="small" /> },
  porCobrar: { label: "Por Cobrar", color: "secondary", icon: <ShoppingBag fontSize="small" /> },
  completada: { label: "Completada", color: "success", icon: <CheckCircle fontSize="small" /> },
  cancelada: { label: "Cancelada", color: "error", icon: <DeleteOutline fontSize="small" /> },
};

/* =======================
   🎵 Alerta Sonora
 ======================= */
const playNotificationSound = () => {
  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  audio.play().catch(() => { });
};

/* =======================
   🚀 Componente Principal
 ======================= */

export default function OrdersPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const previousOrdersCount = useRef(0);

  const {
    data: orders = [],
    deleteItem,
    updateItem,
  } = useCollection<Order>(restaurantId!, "orders");

  const handleSendToCashier = async (order: Order) => {
    // La cocina marca el pedido como listo para cobrar y facturar.
    if (order.id) {
      await updateItem(order.id, { state: "porCobrar" });
    }
  };

  const handleChangeStatus = async (orderId: string, state: OrderStatus) => {
    await updateItem(orderId, { state });
  };

  const handleTabChange = (_: any, newValue: number) => {
    setTabValue(newValue);
  };

  /* 🔄 Actualizar tiempos cada 30s */
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  /* 📂 Filtrado y Ordenamiento */
  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    if (tabValue === 0) {
      // Activas NO muestra completadas, canceladas ni "porCobrar" (A menos que queramos verlas en cocina, usualmente cocina no las ve si ya están en caja)
      return sorted.filter(o => !["completada", "cancelada", "porCobrar"].includes(o.state));
    } else {
      return sorted.filter(o => ["completada", "cancelada", "porCobrar"].includes(o.state));
    }
  }, [orders, tabValue]);

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto", pb: 6, px: { xs: 2, md: 4 } }}>
      {/* HEADER BALANCEADO */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={5}
        mt={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.03em" }}>
            Gestión de Órdenes
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Control en tiempo real de tu cocina y repartos
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 0.5,
            borderRadius: 3,
            bgcolor: "#f1f5f9",
            border: "1px solid #e2e8f0"
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              minHeight: 44,
              "& .MuiTabs-indicator": { height: "100%", borderRadius: 2, zIndex: 0, bgcolor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
              "& .MuiTab-root": { minHeight: 44, zIndex: 1, textTransform: "none", fontWeight: 700, px: 3, fontSize: "0.95rem", borderRadius: 2 }
            }}
          >
            <Tab label={`Activas (${orders.filter(o => !["completada", "cancelada", "porCobrar"].includes(o.state)).length})`} />
            <Tab label="Caja e Historial" />
          </Tabs>
        </Paper>
      </Stack>

      {/* GRILLA DE ÓRDENES */}
      <Grid container spacing={3}>
        {filteredOrders.length === 0 ? (
          <Grid size={12}>
            <Fade in timeout={800}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 12,
                  bgcolor: "#fff",
                  borderRadius: 5,
                  border: "2px dashed #e2e8f0"
                }}
              >
                <ShoppingBag sx={{ fontSize: 70, color: "#cbd5e1", mb: 3 }} />
                <Typography variant="h5" color="text.secondary" fontWeight={800} mb={1}>
                  No hay órdenes actuales
                </Typography>
                <Typography variant="body1" color="text.disabled">
                  Las nuevas órdenes aparecerán aquí automáticamente
                </Typography>
              </Box>
            </Fade>
          </Grid>
        ) : (
          filteredOrders.map((order) => (
            <Grid key={order.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <OrderCard
                order={order}
                onUpdateStatus={handleChangeStatus}
                onComplete={handleSendToCashier}
                onDelete={deleteItem}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

/* =======================
   📦 Tarjeta de Orden (Refinada)
 ======================= */

function OrderCard({ order, onUpdateStatus, onComplete, onDelete }: {
  order: Order;
  onUpdateStatus: (id: string, s: OrderStatus) => void;
  onComplete: (o: Order) => void;
  onDelete: (id: string) => void;
}) {
  const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
  const minutes = differenceInMinutes(new Date(), date);
  const isDelayed = minutes >= 10 && !["completada", "cancelada"].includes(order.state);

  const totalGeneral = useMemo(() => {
    return order.products.reduce(
      (acc, p) => acc + Number(p.total ?? Number(p.price) * Number(p.quantity)),
      0
    );
  }, [order.products]);

  return (
    <Fade in timeout={500}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 5,
          border: "1px solid",
          borderColor: isDelayed ? "error.main" : "#e2e8f0",
          bgcolor: isDelayed ? "rgba(254, 242, 242, 0.4)" : "#fff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "visible",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 15px 30px -10px rgba(0,0,0,0.12)",
            borderColor: "primary.light"
          },
          ...(isDelayed && {
            animation: "pulse_normal 2s infinite ease-in-out",
            "@keyframes pulse_normal": {
              "0%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
              "70%": { boxShadow: "0 0 0 12px rgba(239, 68, 68, 0)" },
              "100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" }
            }
          })
        }}
      >
        {/* INDICADOR DE DEMORA */}
        {isDelayed && (
          <Box
            sx={{
              position: "absolute",
              top: -12,
              right: 24,
              bgcolor: "error.main",
              color: "#fff",
              borderRadius: "20px",
              px: 2,
              py: 0.5,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              boxShadow: 3
            }}
          >
            <NotificationsActive sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={900}>DEMORADA: {minutes} MIN</Typography>
          </Box>
        )}

        <CardContent sx={{ p: 4, flexGrow: 1 }}>
          {/* CABECERA */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                {order.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime sx={{ fontSize: 16, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />
                <Typography variant="body2" color={isDelayed ? "error.main" : "text.secondary"} fontWeight={800}>
                  hace {minutes} min
                </Typography>
              </Stack>
            </Box>

            <Chip
              icon={statusConfig[order.state]?.icon}
              label={statusConfig[order.state]?.label ?? "Estado"}
              color={statusConfig[order.state]?.color}
              size="small"
              sx={{
                fontWeight: 800,
                borderRadius: 2,
                px: 0.5,
                "& .MuiChip-label": { fontSize: "0.75rem" }
              }}
            />
          </Stack>

          {/* TIPO DE ORDEN O CLIENTE */}
          <Stack direction="row" spacing={1} mb={2}>
            {order.name.toLowerCase().trim().startsWith("mesa") ? (
              <Chip
                icon={<Restaurant fontSize="small" />}
                label="Mesa"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            ) : (
              <Chip
                icon={<Person fontSize="small" />}
                label={order.customerName ? `Fiado: ${order.customerName}` : "Fiador / Otro"}
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            )}
          </Stack>

          {/* DIRECCIÓN */}
          {order.address && (
            <Stack direction="row" spacing={1} alignItems="center" mb={3} sx={{ bgcolor: "#f8fafc", p: 1.5, borderRadius: 2 }}>
              <DeliveryDining color="action" sx={{ fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                {order.address}
              </Typography>
            </Stack>
          )}

          {/* NOTA */}
          {order.notes && (
            <Box
              mb={3}
              p={2}
              sx={{
                bgcolor: "#fffbeb",
                borderRadius: 2,
                borderLeft: "5px solid #f59e0b"
              }}
            >
              <Typography variant="caption" color="#92400e" fontWeight={1000} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <InfoOutlined sx={{ fontSize: 16 }} /> NOTA CLIENTE
              </Typography>
              <Typography variant="body2" color="#b45309" fontWeight={500} sx={{ fontStyle: 'italic' }}>
                "{order.notes}"
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 3, borderStyle: "dashed" }} />

          {/* PRODUCTOS */}
          <Typography variant="caption" color="text.disabled" fontWeight={900} sx={{ mb: 2, display: "block", letterSpacing: 1 }}>
            PRODUCTOS ({order.products.length})
          </Typography>

          <Stack spacing={2.5} mb={4}>
            {order.products.map((p, idx) => (
              <Box key={`${p.productId}-${idx}`}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ position: "relative" }}>
                    <Avatar
                      src={p.image}
                      variant="rounded"
                      sx={{ width: 50, height: 50, border: "1px solid #f1f5f9" }}
                    />
                    <Box
                      sx={{
                        position: "absolute", top: -6, left: -6,
                        bgcolor: "primary.main", color: "#fff",
                        width: 20, height: 20, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", fontWeight: 1000, border: '2px solid #fff',
                        boxShadow: 2
                      }}
                    >
                      {p.quantity}
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {p.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {p.variantLabel}
                    </Typography>

                    {p.additions && p.additions.length > 0 && (
                      <Stack direction="row" spacing={0.5} mt={0.8} flexWrap="wrap">
                        {p.additions.map((add) => (
                          <Chip
                            key={add.id}
                            label={`+ ${add.name}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              borderColor: "success.light",
                              color: "success.dark"
                            }}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Typography variant="body2" fontWeight={900} color="text.primary">
                    ${Number(p.total ?? Number(p.price) * p.quantity).toLocaleString()}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* TOTAL */}
          <Box sx={{ mt: "auto", pt: 2.5, borderTop: "2px solid #f1f5f9" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1}>
                <Chip
                  label={order.paymentMethod.toUpperCase()}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 800, fontSize: "0.7rem" }}
                  color={order.paymentMethod === "efectivo" ? "default" : "primary"}
                />
              </Stack>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Total Orden</Typography>
                <Typography variant="h5" fontWeight={900} color="primary.main">
                  ${totalGeneral.toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>

        {/* ACCIONES */}
        <CardActions sx={{ p: 3, pt: 0, flexDirection: "column", gap: 2 }}>
          {!["completada", "cancelada"].includes(order.state) && (
            <Box
              sx={{
                display: "flex",
                width: "100%",
                bgcolor: "#f8fafc",
                p: 0.5,
                borderRadius: 2.5,
                border: "1px solid #f1f5f9"
              }}
            >
              {[
                { s: "pendiente", label: "P" },
                { s: "enProceso", label: "COCINA" },
                { s: "enCamino", label: "RUTA" }
              ].map((item) => (
                <Button
                  key={item.s}
                  fullWidth
                  size="small"
                  onClick={() => onUpdateStatus(order.id!, item.s as OrderStatus)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    ...(order.state === item.s ? {
                      bgcolor: "primary.main",
                      color: "#fff",
                      "&:hover": { bgcolor: "primary.dark" }
                    } : {
                      color: "text.secondary",
                      "&:hover": { bgcolor: "#fff", color: "primary.main" }
                    })
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Stack direction="row" spacing={1.5} width="100%">
            <Button
              fullWidth
              variant="contained"
              color="success"
              onClick={() => onComplete(order)}
              endIcon={<KeyboardArrowRight />}
              sx={{
                borderRadius: 2.5,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 800,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
              }}
            >
              Listo / A Caja
            </Button>

            <MuiTooltip title="Eliminar" arrow>
              <IconButton
                color="error"
                size="small"
                onClick={() => onDelete(order.id!)}
                sx={{
                  borderRadius: 2.5,
                  p: 1.5,
                  border: "1.5px solid",
                  borderColor: "error.light"
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Stack>
        </CardActions>
      </Card>
    </Fade>
  );
}
