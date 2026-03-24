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
} from "@mui/material";
import {
    AccessTime,
    DeliveryDining,
    ShoppingBag,
    DeleteOutline,
    PointOfSale,
    InfoOutlined,
} from "@mui/icons-material";
import { useCollection } from "../hooks/useCollection";
import { differenceInMinutes } from "date-fns";
import { useParams } from "react-router-dom";
import { Order } from "../interfaces/Order";
import CheckoutDialog from "../components/CheckoutDialog";

export default function BillingPage() {
    const { restaurantId } = useParams<{ restaurantId: string }>();

    // Solo traemos órdenes para la caja (orders) y luego guardaremos en success
    const {
        data: allOrders = [],
        deleteItem,
    } = useCollection<Order>(restaurantId!, "orders");

    const { createItem: createSuccess } = useCollection<Order>(
        restaurantId!,
        "orderssuccess"
    );

    const [orderToCheckout, setOrderToCheckout] = useState<Order | null>(null);

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
        await createSuccess({
            ...orderToComplete,
            paymentMethod: finalPaymentMethod,
            state: "completada",
        });
        if (orderToComplete.id) {
            await deleteItem(orderToComplete.id);
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
        </Box>
    );
}

function BillingCard({
    order,
    onCheckout,
    onDelete,
}: {
    order: Order;
    onCheckout: (o: Order) => void;
    onDelete: (id: string) => void;
}) {
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
            </Card>
        </Fade>
    );
}