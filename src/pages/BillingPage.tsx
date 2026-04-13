import { useState, useMemo } from "react";
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
    Fade,
    IconButton,
    Tooltip as MuiTooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";
import {
    AccessTime,
    DeliveryDining,
    ShoppingBag,
    DeleteOutline,
    PointOfSale,
    InfoOutlined,
    Print as PrintIcon,
    Edit,
    History,
    Replay,
} from "@mui/icons-material";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceReceipt } from "../components/InvoiceReceipt";
import { useCollection } from "../hooks/useCollection";
import { doc, getDoc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Product } from "../interfaces/product";
import { differenceInMinutes } from "date-fns";
import { useParams, useNavigate } from "react-router-dom";
import { Order } from "../interfaces/Order";
import CheckoutDialog from "../components/CheckoutDialog";
import EditBilledOrderDialog from "../components/EditBilledOrderDialog";
import { useAuth } from "../hooks/useAuth";
import { removeUndefined } from "../global/utils";

export default function BillingPage() {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const navigate = useNavigate();
    const { userDoc } = useAuth();
    const isAdmin = userDoc?.isAdmin === true || userDoc?.role === "admin";

    // Solo traemos órdenes para la caja (orders) y luego guardaremos en success
    const {
        data: allOrders = [],
        deleteItem,
    } = useCollection<Order>(restaurantId!, "orders");

    const { createItem: createSuccess, data: successOrders = [] } = useCollection<Order>(
        restaurantId!,
        "orderssuccess"
    );

    const [orderToCheckout, setOrderToCheckout] = useState<Order | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    const toggleExpand = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };

    // Órdenes facturadas del día actual
    const todayBilled = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        return successOrders
            .filter((o) => {
                const raw = (o as any).dateSuccess || (o as any).date;
                if (!raw) return false;
                let d: Date;
                if (typeof raw.toDate === "function") d = raw.toDate();
                else if (raw instanceof Date) d = raw;
                else d = new Date(raw);
                return d >= now && d < tomorrow;
            })
            .sort((a, b) => {
                const toD = (o: any) => {
                    const raw = o.dateSuccess || o.date;
                    if (!raw) return new Date();
                    if (typeof raw.toDate === "function") return raw.toDate();
                    return new Date(raw);
                };
                return toD(b).getTime() - toD(a).getTime();
            });
    }, [successOrders, refreshKey]);

    // Filtrar SOLAMENTE las que están "porCobrar" o "listo / caja"
    const ordersToBill = useMemo(() => {
        return allOrders
            .filter((o) => o.state === "porCobrar" || o.state === "listo / caja")
            .sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return dateA.getTime() - dateB.getTime();
            });
    }, [allOrders]);

    const handleOpenCheckout = (order: Order) => {
        setOrderToCheckout(order);
    };

    const confirmCheckout = async (orderToComplete: Order, finalPaymentMethod: string) => {
        try {
            // -- DESCUENTO DE STOCK --
            const todayStr = new Date().toLocaleDateString();
            for (const p of orderToComplete.products) {
                if (!p.productId || !p.variantId || p.productId === "__standalone__") continue;
                const docRef = doc(db, "restaurants", restaurantId!, "products", p.productId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const pData = snap.data() as Product;
                    const vIndex = pData.variants?.findIndex(v => v.id === p.variantId);
                    if (vIndex !== undefined && vIndex > -1) {
                        let variant = pData.variants[vIndex];
                        // Reset diario
                        if (variant.lastStockResetDate !== todayStr) {
                            variant.initialDailyStock = variant.stock;
                            variant.lastStockResetDate = todayStr;
                        }
                        // Descontar
                        const qty = Number(p.quantity || 1);
                        variant.stock = Math.max(0, (variant.stock || 0) - qty);

                        pData.variants[vIndex] = variant;
                        await updateDoc(docRef, { variants: pData.variants });
                    }
                }
            }

            // -- GUARDAR ORDEN --
            const rawOrder = {
                ...orderToComplete,
                paymentMethod: finalPaymentMethod,
                state: "completada",
                dateSuccess: new Date(),
            };
            
            // Limpiamos recursivamente el objeto para que Firestore no rechace valores `undefined`
            const cleanOrder = removeUndefined(rawOrder) as Order;
            
            await createSuccess(cleanOrder);
            if (orderToComplete.id) {
                await deleteItem(orderToComplete.id);
            }
        } catch (error) {
            console.error("Error al procesar inventario o caja:", error);
            alert("Error al procesar la orden o el inventario. Revisa la consola.");
        }
    };

    const handleReopenOrder = async (order: Order) => {
        if (!restaurantId || !order.id) return;
        if (!window.confirm(`¿Deseas reabrir la orden "${order.name}" para re-facturarla?`)) return;
        try {
            // Mover a orders con estado porCobrar
            const { id, ...orderData } = order;
            await addDoc(collection(db, "restaurants", restaurantId, "orders"), {
                ...orderData,
                state: "porCobrar",
            });
            // Eliminar de orderssuccess
            await deleteDoc(doc(db, "restaurants", restaurantId, "orderssuccess", order.id));
        } catch (err) {
            console.error("Error reabriendo la orden:", err);
            alert("Error al reabrir la orden.");
        }
    };

    const handleDeleteBilled = async (order: Order) => {
        if (!restaurantId || !order.id) return;
        if (!window.confirm(`¿Eliminar definitivamente la orden "${order.name}"? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId, "orderssuccess", order.id));
        } catch (err) {
            console.error("Error eliminando la orden facturada:", err);
            alert("Error al eliminar la orden.");
        }
    };

    return (
        <Box sx={{ maxWidth: 1500, mx: "auto", pb: 6, px: { xs: 2, md: 4 } }}>
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
                        💰 Caja y Facturación
                    </Typography>
                    <Typography color="text.secondary" variant="body1">
                        Órdenes listas para ser cobradas y cerradas.
                    </Typography>
                </Box>
            </Stack>

            <Grid container spacing={3}>
                {ordersToBill.length === 0 ? (
                    <Grid size={12}>
                        <Fade in timeout={800}>
                            <Box
                                sx={{
                                    textAlign: "center",
                                    py: 12,
                                    bgcolor: "#fff",
                                    borderRadius: 5,
                                    border: "2px dashed #e2e8f0",
                                }}
                            >
                                <PointOfSale sx={{ fontSize: 70, color: "#cbd5e1", mb: 3 }} />
                                <Typography variant="h5" color="text.secondary" fontWeight={800} mb={1}>
                                    No hay órdenes para cobrar
                                </Typography>
                                <Typography variant="body1" color="text.disabled">
                                    Cuando la cocina marque una orden como lista, aparecerá aquí.
                                </Typography>
                            </Box>
                        </Fade>
                    </Grid>
                ) : (
                    ordersToBill.map((order) => (
                        <Grid key={order.id} size={{ xs: 12, md: 6, lg: 4 }}>
                            <BillingCard
                                order={order}
                                onCheckout={handleOpenCheckout}
                                onDelete={deleteItem}
                                onEdit={(id) => navigate(`/${restaurantId}/edit-order/${id}`)}
                            />
                        </Grid>
                    ))
                )}
            </Grid>

            <CheckoutDialog
                open={Boolean(orderToCheckout)}
                order={orderToCheckout}
                onClose={() => setOrderToCheckout(null)}
                onComplete={confirmCheckout}
            />

            {/* ─────────────────────────────── HISTORIAL DEL DÍA ─────────────────────────────── */}
            <Box mt={6}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                    <History sx={{ color: "text.secondary" }} />
                    <Box>
                        <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.02em" }}>
                            📋 Historial del Día
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Órdenes ya facturadas hoy.
                            {isAdmin && " Como admin puedes editarlas, reabrirlas o eliminarlas."}
                        </Typography>
                    </Box>
                    <Chip
                        label={`${todayBilled.length} orden${todayBilled.length !== 1 ? "es" : ""}`}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800, ml: "auto !important" }}
                    />
                </Stack>

                {todayBilled.length === 0 ? (
                    <Box
                        sx={{
                            textAlign: "center",
                            py: 8,
                            bgcolor: "#fff",
                            borderRadius: 4,
                            border: "2px dashed #e2e8f0",
                        }}
                    >
                        <History sx={{ fontSize: 56, color: "#cbd5e1", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" fontWeight={700}>
                            Sin órdenes facturadas todavía
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                            Las órdenes cobradas hoy aparecerán aquí.
                        </Typography>
                    </Box>
                ) : (
                    <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>ORDEN</TableCell>
                                        <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>HORA</TableCell>
                                        <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>PRODUCTOS</TableCell>
                                        <TableCell sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>MÉTODO</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>TOTAL</TableCell>
                                        {isAdmin && <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", letterSpacing: 0.5 }}>ACCIONES</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {todayBilled.map((order) => {
                                        const rawDate = (order as any).dateSuccess || (order as any).date;
                                        let dateObj: Date;
                                        if (rawDate?.toDate) dateObj = rawDate.toDate();
                                        else if (rawDate instanceof Date) dateObj = rawDate;
                                        else dateObj = new Date(rawDate);

                                        return (
                                            <TableRow
                                                key={order.id}
                                                sx={{
                                                    "&:hover": { bgcolor: "#f8fafc" },
                                                    transition: "background 0.15s",
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={800}>
                                                        {order.name}
                                                    </Typography>
                                                    {order.notes && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                            {order.notes}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                        {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                    </Typography>
                                                </TableCell>
                                                 <TableCell>
                                                    <Stack spacing={0.2}>
                                                        {(expandedOrders.has(order.id!) ? order.products : order.products.slice(0, 3)).map((p, i) => (
                                                            <Typography key={i} variant="caption" color="text.secondary">
                                                                {p.quantity}× {p.productName}
                                                            </Typography>
                                                        ))}
                                                        {order.products.length > 3 && (
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                onClick={() => toggleExpand(order.id!)}
                                                                sx={{
                                                                    p: 0,
                                                                    minWidth: 0,
                                                                    fontSize: "0.65rem",
                                                                    fontWeight: 800,
                                                                    color: expandedOrders.has(order.id!) ? "error.main" : "primary.main",
                                                                    textTransform: "none",
                                                                    justifyContent: "flex-start",
                                                                    "&:hover": { bgcolor: "transparent", opacity: 0.8 }
                                                                }}
                                                            >
                                                                {expandedOrders.has(order.id!) ? "Ver menos" : `+${order.products.length - 3} más`}
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={order.paymentMethod?.toUpperCase()}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body1" fontWeight={900} color="success.main">
                                                        ${Number(order.total || 0).toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell align="center">
                                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                                            <MuiTooltip title="Editar" arrow>
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => { setOrderToEdit(order); setEditOpen(true); }}
                                                                    sx={{ border: "1px solid", borderColor: "primary.light", borderRadius: 1.5 }}
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </MuiTooltip>
                                                            <MuiTooltip title="Reabrir para re-facturar" arrow>
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    onClick={() => handleReopenOrder(order)}
                                                                    sx={{ border: "1px solid", borderColor: "warning.light", borderRadius: 1.5 }}
                                                                >
                                                                    <Replay fontSize="small" />
                                                                </IconButton>
                                                            </MuiTooltip>
                                                            <MuiTooltip title="Eliminar definitivamente" arrow>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleDeleteBilled(order)}
                                                                    sx={{ border: "1px solid", borderColor: "error.light", borderRadius: 1.5 }}
                                                                >
                                                                    <DeleteOutline fontSize="small" />
                                                                </IconButton>
                                                            </MuiTooltip>
                                                        </Stack>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Totales del día */}
                        <Box sx={{ p: 2.5, bgcolor: "#f0fdf4", borderTop: "1px solid #d1fae5" }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={3}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Órdenes:</Typography>
                                    <Typography variant="body2" fontWeight={800}>{todayBilled.length}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Total del día:</Typography>
                                    <Typography variant="h6" fontWeight={900} color="success.dark">
                                        ${todayBilled.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Paper>
                )}
            </Box>

            {/* Diálogo de edición (solo admin) */}
            <EditBilledOrderDialog
                open={editOpen}
                order={orderToEdit}
                onClose={() => { setEditOpen(false); setOrderToEdit(null); }}
                onSaved={() => setRefreshKey(k => k + 1)}
            />
        </Box>
    );
}

function BillingCard({
    order,
    onCheckout,
    onDelete,
    onEdit,
}: {
    order: Order;
    onCheckout: (o: Order) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
}) {
    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `PreFactura_${order.id || 'order'}`,
    });

    const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
    const minutes = differenceInMinutes(new Date(), date);

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
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s ease",
                    "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 15px 30px -10px rgba(0,0,0,0.12)",
                        borderColor: "secondary.light",
                    },
                }}
            >
                <CardContent sx={{ p: 4, flexGrow: 1 }}>
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
                                <Typography variant="body2" color={"secondary.main"} fontWeight={800}>
                                    hace {minutes} min
                                </Typography>
                            </Stack>
                        </Box>

                        <Chip
                            icon={<ShoppingBag fontSize="small" />}
                            label="Por Cobrar"
                            color="secondary"
                            size="small"
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                        />
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

                    {/* PRODUCTOS RÁPIDOS */}
                    <Typography variant="caption" color="text.disabled" fontWeight={900} sx={{ mb: 2, display: "block", letterSpacing: 1 }}>
                        PRODUCTOS ({order.products.length})
                    </Typography>

                    <Stack spacing={2.5} mb={4}>
                        {order.products.map((p, idx) => (
                            <Box key={`${p.productId}-${idx}`}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ position: "relative" }}>
                                        <Avatar src={p.image} variant="rounded" sx={{ width: 40, height: 40, border: "1px solid #f1f5f9" }} />
                                        <Box sx={{ position: "absolute", top: -5, left: -5, bgcolor: "primary.main", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 1000, border: '2px solid #fff' }}>
                                            {p.quantity}
                                        </Box>
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={800}>{p.productName}</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={900}>
                                        ${Number(p.total ?? Number(p.price) * p.quantity).toLocaleString()}
                                    </Typography>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>

                    <Box sx={{ mt: "auto", pt: 2.5, borderTop: "2px solid #f1f5f9" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Chip label={order.paymentMethod.toUpperCase()} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: "0.7rem" }} />
                            <Box sx={{ textAlign: "right" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>Total a Cobrar</Typography>
                                <Typography variant="h5" fontWeight={900} color="secondary.main">
                                    ${totalGeneral.toLocaleString()}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0, flexDirection: "column", gap: 2 }}>
                    <Stack direction="row" spacing={1.5} width="100%">
                        <Button
                            fullWidth
                            variant="contained"
                            color="secondary"
                            onClick={() => onCheckout(order)}
                            startIcon={<PointOfSale />}
                            sx={{
                                borderRadius: 2.5,
                                py: 1.5,
                                fontSize: "1rem",
                                fontWeight: 800,
                                boxShadow: "0 4px 12px rgba(156, 39, 176, 0.2)",
                            }}
                        >
                            Cobrar
                        </Button>
                        
                        <MuiTooltip title="Agregar Productos / Editar" arrow>
                            <IconButton
                                color="primary"
                                onClick={() => onEdit(order.id!)}
                                sx={{ borderRadius: 2.5, p: 1.5, border: "1.5px solid", borderColor: "primary.light" }}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                        </MuiTooltip>

                        <MuiTooltip title="Eliminar" arrow>
                            <IconButton
                                color="error"
                                size="small"
                                onClick={() => onDelete(order.id!)}
                                sx={{ borderRadius: 2.5, p: 1.5, border: "1.5px solid", borderColor: "error.light" }}
                            >
                                <DeleteOutline fontSize="small" />
                            </IconButton>
                        </MuiTooltip>
                    </Stack>
                </CardActions>

                {/* Hidden Receipt for Printing (avoid display: none for some print libs) */}
                <Box sx={{ position: "absolute", top: -9999, left: -9999, opacity: 0, pointerEvents: "none" }}>
                    <InvoiceReceipt ref={componentRef} order={order} />
                </Box>
            </Card>
        </Fade>
    );
}