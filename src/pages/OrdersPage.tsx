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
  Edit,
} from "@mui/icons-material";
import { useCollection } from "../hooks/useCollection";
import { useAuth } from "../hooks/useAuth";
import { differenceInMinutes } from "date-fns";
import { useParams, useNavigate } from "react-router-dom";
import { Order, OrderStatus } from "../interfaces/Order";
import { Product } from "../interfaces/product";


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
  "listo / caja": { label: "Listo / Caja", color: "secondary", icon: <ShoppingBag fontSize="small" /> },
  completada: { label: "Completada", color: "success", icon: <CheckCircle fontSize="small" /> },
  cancelada: { label: "Cancelada", color: "error", icon: <DeleteOutline fontSize="small" /> },
};

/* =======================
   🎵 Alertas Sonoras
 ======================= */
const playNotificationSound = () => {
  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  audio.play().catch(() => { });
};

// Sonido de alerta para demoras (más cálido)
const delayAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3");
delayAudio.loop = true;

const playDelaySound = () => {
  if (delayAudio.paused) {
    delayAudio.play().catch(() => { });
  }
};

const stopDelaySound = () => {
  if (!delayAudio.paused) {
    delayAudio.pause();
    delayAudio.currentTime = 0;
  }
};

/* =======================
   🥤 Helpers de Filtrado
 ======================= */
const isDrinkCategory = (category?: string) => {
  if (!category) return false;
  const name = category.toLowerCase();
  return (
    name.includes("bebida") ||
    name.includes("jugo") ||
    name.includes("gaseosa") ||
    name.includes("cerveza") ||
    name.includes("licor") ||
    name.includes("trago") ||
    name.includes("coctel") ||
    name.includes("cóctel") ||
    name.includes("limonada") ||
    name.includes("agua") ||
    name.includes("café") ||
    name.includes("te") ||
    name.includes("té") ||
    name.includes("bar") ||
    name.includes("soda")
  );
};

const isDrinkOrder = (order: Order) => {
  if (!order.products || order.products.length === 0) return false;
  return order.products.every(p => isDrinkCategory(p.category));
};

/* =======================
   🚀 Componente Principal
 ======================= */

export default function OrdersPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { userDoc, canCreate, canDelete } = useAuth();
  const userRole = userDoc?.role;
  const [tabValue, setTabValue] = useState(0);
  const previousOrdersCount = useRef(0);

  const {
    data: orders = [],
    deleteItem,
    updateItem,
  } = useCollection<Order>(restaurantId!, "orders");

  const { data: allProducts = [] } = useCollection<Product>(restaurantId!, "products");

  const handleSendToCashier = async (order: Order) => {
    // La cocina marca el pedido como listo para cobrar y facturar.
    if (order.id) {
      const completedProducts = order.products.map(p => ({ ...p, completed: true }));
      await updateItem(order.id, { state: "listo / caja", products: completedProducts });
    }
  };

  const handleChangeStatus = async (orderId: string, state: OrderStatus) => {
    await updateItem(orderId, { state });
  };

  const handleTabChange = (_: any, newValue: number) => {
    setTabValue(newValue);
  };

  /* 🔄 Actualizar tiempos cada 30s */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const lastDelaySoundPlayedRef = useRef(0);
  const isFirstRender = useRef(true);

  /* 🔔 Alerta de Nueva Orden */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousOrdersCount.current = orders.length;
      return;
    }

    if (orders.length > previousOrdersCount.current) {
      // Para evitar que suene cuando Firebase carga el arreglo por primera vez
      // Validamos si la orden más reciente fue creada hace menos de 2 minutos
      const newestOrder = [...orders].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // Descendente (más nuevos primero)
      })[0];

      if (newestOrder) {
        const date = newestOrder.date?.toDate ? newestOrder.date.toDate() : new Date(newestOrder.date);
        const minutes = differenceInMinutes(new Date(), date);
        if (minutes < 2) {
          playNotificationSound();
        }
      }
    }
    previousOrdersCount.current = orders.length;
  }, [orders]);

  /* 🔔 Activar alerta sonora de demora automáticamente */
  useEffect(() => {
    const hasDelayedOrders = orders.some((order) => {
      // Ignoramos ordenes finalizadas o en caja
      if (["completada", "cancelada", "porCobrar", "listo / caja"].includes(order.state)) return false;

      const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
      const minutes = differenceInMinutes(new Date(), date);
      return minutes >= 10;
    });

    // Empieza a sonar si hay ordenes con demora y estamos viendo "Activas"
    if (hasDelayedOrders && tabValue === 0) {
      const now = Date.now();
      // Si nunca sonó o pasaron 5 minutos (300000ms) desde la última vez
      if (now - lastDelaySoundPlayedRef.current >= 300000) {
        lastDelaySoundPlayedRef.current = now;
        playDelaySound();

        // Detener después de 5 segundos
        setTimeout(() => {
          stopDelaySound();
        }, 5000);
      }
    } else {
      stopDelaySound();
      if (!hasDelayedOrders) {
        lastDelaySoundPlayedRef.current = 0; // Resetear para que avise de inmediato cuando haya otra
      }
    }

    return () => stopDelaySound();
  }, [orders, tabValue, tick]);


  /* 📂 Filtrado y Ordenamiento */
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => {
      const isBasicActive = !["completada", "cancelada"].includes(o.state) &&
        (!["porCobrar", "listo / caja"].includes(o.state) || o.products.some(p => !p.completed));
      if (!isBasicActive) return false;
      // Solo el cocinero no puede ver órdenes que son solo bebidas
      if (userRole === "cocinero") return !isDrinkOrder(o);
      return true;
    }).length;
  }, [orders, userRole]);

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    if (tabValue === 0) {
      // Activas: solo el cocinero no ve órdenes de solo bebidas.
      // Cajero, mesero y admin ven todo.
      return sorted.filter(o => {
        const isBasicActive = !["completada", "cancelada"].includes(o.state) &&
          (!["porCobrar", "listo / caja"].includes(o.state) || o.products.some(p => !p.completed));

        if (!isBasicActive) return false;

        // Solo el cocinero no ve órdenes de solo bebidas
        if (userRole === "cocinero") return !isDrinkOrder(o);
        return true;
      });
    } else {
      return sorted.filter(o => ["completada", "cancelada", "porCobrar", "listo / caja"].includes(o.state));
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

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {canCreate && (
            <Button
              variant="contained"
              onClick={() => navigate(`/${restaurantId}/create-order`)}
              sx={{ fontWeight: 800, borderRadius: 2, py: 1 }}
            >
              + Nueva Orden
            </Button>
          )}
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
              <Tab label={`Activas (${activeOrdersCount})`} />
              <Tab label="Caja e Historial" />
            </Tabs>
          </Paper>
        </Box>
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
                allProducts={allProducts}
                userRole={userRole}
                canDelete={canDelete}
                onUpdateStatus={handleChangeStatus}
                onUpdateOrder={updateItem}
                onComplete={handleSendToCashier}
                onDelete={deleteItem}
                onEdit={(id) => navigate(`/${restaurantId}/edit-order/${id}`)}
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

function OrderCard({ order, allProducts, userRole, canDelete, onUpdateStatus, onComplete, onDelete, onEdit, onUpdateOrder }: {
  order: Order;
  allProducts: Product[];
  userRole?: string;
  canDelete?: boolean;
  onUpdateStatus: (id: string, s: OrderStatus) => void;
  onComplete: (o: Order) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void> | void;
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

  const { foodItems, drinkItems } = useMemo(() => {
    const food: typeof order.products = [];
    const drinks: typeof order.products = [];

    // Si la orden está en un estado activo, solo mostramos los productos pendientes (no completados)
    // Esto cumple el requisito: "que solo se vea el producto que agregaron"
    const isActive = !["completada", "cancelada"].includes(order.state) &&
      (!["porCobrar", "listo / caja"].includes(order.state) || order.products.some(p => !p.completed));
    const visibleProducts = isActive ? order.products.filter(p => !p.completed) : order.products;

    visibleProducts.forEach(p => {
      const productDef = allProducts.find(prod => prod.id === p.productId);
      const cat = productDef?.category?.toLowerCase() || "";
      const name = p.productName.toLowerCase();

      const isDrink = cat.includes("bebida") || cat.includes("jugo") || cat.includes("gaseosa") ||
        cat.includes("cerveza") || cat.includes("licor") || cat.includes("trago") ||
        name.includes("bebida") || name.includes("jugo") || name.includes("gaseosa") ||
        name.includes("cerveza") || name.includes("limonada") || name.includes("agua");

      if (isDrink) {
        drinks.push(p);
      } else {
        food.push(p);
      }
    });

    return { foodItems: food, drinkItems: drinks };
  }, [order.products, allProducts, order.state]);

  const renderProduct = (p: typeof order.products[0], idx: number) => (
    <Box key={`${p.productId}-${idx}`}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "#fff",
            minWidth: 22,
            height: 22,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 900,
          }}
        >
          {p.quantity}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" fontWeight={800} sx={{ lineHeight: 1.1, fontSize: "0.8rem", display: 'block' }}>
            {p.productName}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.65rem", display: 'block' }}>
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
                    height: 16,
                    fontSize: "0.6rem",
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

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            const newProducts = [...order.products];
            newProducts[idx] = { ...newProducts[idx], completed: !newProducts[idx].completed };
            onUpdateOrder(order.id!, { products: newProducts });
          }}
          sx={{
            p: 0.5,
            border: "2px solid",
            borderColor: p.completed ? "success.main" : "#e2e8f0",
            bgcolor: p.completed ? "success.50" : "transparent"
          }}
        >
          <CheckCircle sx={{ color: p.completed ? "success.main" : "#cbd5e1", fontSize: 22 }} />
        </IconButton>
      </Stack>
    </Box>
  );

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

        <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
          {/* CABECERA */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight={850} color="text.primary" sx={{ lineHeight: 1.1, mb: 0.3 }}>
                {order.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime sx={{ fontSize: 16, color: "text.disabled" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />
                <Typography variant="caption" color={isDelayed ? "error.main" : "text.secondary"} fontWeight={800}>
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



          {/* DIRECCIÓN */}
          {order.address && (
            <Stack direction="row" spacing={1} alignItems="center" mb={3} sx={{ bgcolor: "#f8fafc", p: 1.5, borderRadius: 2 }}>
              <DeliveryDining color="action" sx={{ fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
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
              <Typography variant="caption" color="#92400e" fontWeight={1000} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.2, fontSize: "0.65rem" }}>
                <InfoOutlined sx={{ fontSize: 14 }} /> NOTA CLIENTE
              </Typography>
              <Typography variant="caption" color="#b45309" fontWeight={500} sx={{ fontStyle: 'italic', display: 'block' }}>
                "{order.notes}"
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 3, borderStyle: "dashed" }} />

          {/* PRODUCTOS SEPARADOS */}
          {foodItems.length > 0 && (
            <>
              <Typography variant="caption" color="text.disabled" fontWeight={900} sx={{ mb: 1.5, display: "block", letterSpacing: 1, fontSize: "0.65rem" }}>
                COMIDA ({foodItems.length})
              </Typography>
              <Stack spacing={2.5} mb={foodItems.length > 0 && drinkItems.length > 0 ? 4 : 2}>
                {foodItems.map((p) => {
                  const idx = order.products.indexOf(p);
                  return renderProduct(p, idx);
                })}
              </Stack>
            </>
          )}

          {drinkItems.length > 0 && userRole !== "cocinero" && (
            <>
              <Typography variant="caption" color="text.disabled" fontWeight={900} sx={{ mb: 1.5, display: "block", letterSpacing: 1, fontSize: "0.65rem" }}>
                BEBIDAS ({drinkItems.length})
              </Typography>
              <Stack spacing={2.5} mb={2}>
                {drinkItems.map((p) => {
                  const idx = order.products.indexOf(p);
                  return renderProduct(p, idx);
                })}
              </Stack>
            </>
          )}
        </CardContent>

        {/* ACCIONES */}
        <CardActions sx={{ p: 2.5, pt: 0, flexDirection: "column", gap: 1.5 }}>


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

            <MuiTooltip title="Agregar Productos / Editar" arrow>
              <IconButton
                color="primary"
                onClick={() => onEdit(order.id!)}
                sx={{
                  borderRadius: 2.5,
                  p: 1.5,
                  border: "1.5px solid",
                  borderColor: "primary.light"
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </MuiTooltip>

            {canDelete && (
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
            )}
          </Stack>
        </CardActions>
      </Card>
    </Fade>
  );
}
