import React, { useState, useMemo, Fragment } from "react";
import { useParams } from "react-router-dom";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Stack,
    TextField,
    Button,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Avatar,
    IconButton,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Collapse,
} from "@mui/material";
import {
    AttachMoney,
    LocalAtm,
    CreditCard,
    AccountBalance,
    Save,
    History,
    ReceiptLong,
    CalendarMonth,
    Close as CloseIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { useCollection } from "../hooks/useCollection";
import { useAuth } from "../hooks/useAuth";
import { formatCOP } from "../components/format";
import { Order } from "../interfaces/Order";
import { CashClosing } from "../interfaces/CashClosing";
import { Timestamp } from "firebase/firestore";

/* =========================
   HELPERS
========================= */
const toDate = (order: any): Date => {
    if (!order) return new Date();
    const dateValue = order.dateSuccess || order.date || order.createdAt || order.timestamp;
    if (!dateValue) return new Date();

    let dateObj: Date;
    if (typeof dateValue.toDate === "function") {
        dateObj = dateValue.toDate();
    } else if (dateValue instanceof Date) {
        dateObj = dateValue;
    } else if (typeof dateValue === "number") {
        dateObj = new Date(dateValue);
    } else if (dateValue && typeof dateValue === "object" && (dateValue.seconds !== undefined || dateValue._seconds !== undefined)) {
        const s = dateValue.seconds !== undefined ? dateValue.seconds : dateValue._seconds;
        dateObj = new Date(s * 1000);
    } else {
        dateObj = new Date(dateValue);
    }
    return isNaN(dateObj.getTime()) ? new Date() : dateObj;
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */
export default function CashClosingPage() {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const { userDoc } = useAuth();

    // Colecciones
    const { data: orders = [] } = useCollection<Order>(restaurantId!, "orderssuccess");
    const { data: closings = [], createItem: saveClosing } = useCollection<CashClosing>(restaurantId!, "cashclosings");

    // Estados locales
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [actualTransfer, setActualTransfer] = useState<number>(0);
    const [actualCard, setActualCard] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
    const [dialogTab, setDialogTab] = useState(0);

    // --- NUEVOS ESTADOS PARA DESGLOSE ---
    const [denominations, setDenominations] = useState({
        coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
        bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
    });
    const [expenses, setExpenses] = useState<{ description: string; amount: number }[]>([]);
    const [newExpense, setNewExpense] = useState({ description: "", amount: 0 });

    const totalFromBreakdown = useMemo(() => {
        return (denominations.coins100 * 100) + (denominations.coins200 * 200) + (denominations.coins500 * 500) + (denominations.coins1000 * 1000) +
            (denominations.bills2000 * 2000) + (denominations.bills5000 * 5000) + (denominations.bills10000 * 10000) +
            (denominations.bills20000 * 20000) + (denominations.bills50000 * 50000) + (denominations.bills100000 * 100000);
    }, [denominations]);

    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

    // Filtrar órdenes de HOY
    const todayOrders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return orders.filter(order => {
            const d = toDate(order);
            return d >= today && d < tomorrow && order.state === "completada";
        });
    }, [orders]);

    const selectedClosingOrders = useMemo(() => {
        if (!selectedClosing) return [];
        const targetParts = selectedClosing.date.split('-');
        if (targetParts.length === 3) {
            const startOfDay = new Date(Number(targetParts[0]), Number(targetParts[1]) - 1, Number(targetParts[2]));
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(startOfDay.getDate() + 1);

            return orders.filter(order => {
                const d = toDate(order);
                return d >= startOfDay && d < endOfDay && order.state === "completada";
            }).sort((a, b) => toDate(b).getTime() - toDate(a).getTime());
        }
        return [];
    }, [orders, selectedClosing]);

    // Resumen de ventas por método de pago
    const summary = useMemo(() => {
        const totals = {
            efectivo: 0,
            tarjeta: 0,
            transferencia: 0,
            otros: 0,
            totalSales: 0, // This is NET sales (with discount subtracted)
            totalGross: 0, // This is GROSS sales (before discount)
            totalGuiaDiscount: 0
        };

        todayOrders.forEach(order => {
            const pm = order.paymentMethod?.toLowerCase() || "";
            const total = Number(order.total || 0);
            const guiaAmount = Number(order.guiaDiscount || 0);

            totals.totalGross += total;
            totals.totalGuiaDiscount += guiaAmount;

            if (pm.includes("efectivo") || pm === "cash") {
                totals.efectivo += total;
            } else if (pm.includes("tarjeta") || pm.includes("card") || pm.includes("débito") || pm.includes("credito")) {
                totals.tarjeta += total;
            } else if (pm.includes("transferencia") || pm.includes("nequi") || pm.includes("bancolombia") || pm.includes("daviplata")) {
                totals.transferencia += total;
            } else {
                totals.otros += total;
            }
        });

        // Venta Neta = (Efectivo + Tarjeta + Transferencia) - Descuento Guía
        totals.totalSales = (totals.efectivo + totals.tarjeta + totals.transferencia) - totals.totalGuiaDiscount;

        return totals;
    }, [todayOrders]);

    const expectedCash = useMemo(() =>
        summary.efectivo + Number(openingBalance) - totalExpenses,
        [summary.efectivo, openingBalance, totalExpenses]);

    // --- MÉTRICAS DE NEGOCIO (Últimos 30 días) ---
    const businessMetrics = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentClosings = closings.filter(c => {
            const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.date || "");
            return d >= thirtyDaysAgo;
        });

        return recentClosings.reduce((acc, c) => {
            acc.totalNetSales += (c.totalSales || 0);
            acc.totalGuiaDiscount += (c.totalGuiaDiscount || 0);
            acc.totalExpenses += (c.totalExpenses || 0);
            acc.totalDifference += (c.difference || 0);
            acc.count++;
            return acc;
        }, { totalNetSales: 0, totalGuiaDiscount: 0, totalExpenses: 0, totalDifference: 0, count: 0 });
    }, [closings]);

    const actualCash = totalFromBreakdown;
    const difference = useMemo(() => actualCash - expectedCash, [actualCash, expectedCash]);

    const transferDifference = useMemo(() => actualTransfer - summary.transferencia, [actualTransfer, summary.transferencia]);
    const cardDifference = useMemo(() => actualCard - summary.tarjeta, [actualCard, summary.tarjeta]);

    const handleSaveClosing = async () => {
        if (!restaurantId || !userDoc) return;

        setLoading(true);
        try {
            const closingData: Omit<CashClosing, "id"> = {
                restaurantId,
                date: new Date().toISOString().split('T')[0],
                closedBy: {
                    uid: userDoc.uid || userDoc.id,
                    name: userDoc.name || "Usuario",
                },
                openingBalance: Number(openingBalance),
                actualCash: Number(actualCash),
                difference: difference,
                actualTransfer: Number(actualTransfer),
                transferDifference: transferDifference,
                actualCard: Number(actualCard),
                cardDifference: cardDifference,
                totals: {
                    efectivo: summary.efectivo,
                    tarjeta: summary.tarjeta,
                    transferencia: summary.transferencia,
                    otros: summary.otros,
                },
                totalSales: summary.totalSales,
                totalGuiaDiscount: summary.totalGuiaDiscount,
                denominations,
                expenses,
                totalExpenses,
                notes,
                createdAt: Timestamp.now() as any,
            };

            await saveClosing(closingData);
            setSuccessMsg("Cierre de caja guardado exitosamente.");
            setOpeningBalance(0);
            setActualTransfer(0);
            setActualCard(0);
            setDenominations({
                coins100: 0, coins200: 0, coins500: 0, coins1000: 0,
                bills2000: 0, bills5000: 0, bills10000: 0, bills20000: 0, bills50000: 0, bills100000: 0
            });
            setExpenses([]);
            setNotes("");
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (error) {
            console.error("Error saving cash closing:", error);
            alert("Error al guardar el cierre de caja.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={{ xs: 1, md: 4 }} bgcolor="#f8fafc" minHeight="100vh">
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.02em", fontSize: { xs: "1.3rem", md: "2.125rem" } }}>
                        Cierre de Caja
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
                        Resumen diario de ventas y conciliación.
                    </Typography>
                </Box>
                <Chip
                    label={new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    icon={<CalendarMonth />}
                    sx={{ fontWeight: 700, px: 1, height: 32, borderRadius: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}
                />
            </Stack>

            {successMsg && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>
                    {successMsg}
                </Alert>
            )}

            <Grid container spacing={{ xs: 1.5, md: 3 }}>
                {/* 💳 RESUMEN DE VENTAS */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Efectivo" value={summary.efectivo} icon={<LocalAtm />} color="#10b981" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Tarjeta" value={summary.tarjeta} icon={<CreditCard />} color="#3b82f6" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Transferencia" value={summary.transferencia} icon={<AccountBalance />} color="#f59e0b" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Venta Bruta" value={summary.totalGross} icon={<AttachMoney />} color="#94a3b8" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Descuento Guías" value={summary.totalGuiaDiscount} icon={<LocalAtm />} color="#ed6c02" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <SummaryCard title="Venta Neta (En Caja)" value={summary.totalSales} icon={<AttachMoney />} color="#000" isTotal />
                        </Grid>
                    </Grid>

                    <Card sx={{ mt: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                                <ReceiptLong color="primary" /> Órdenes ({todayOrders.length})
                            </Typography>
                            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400, mx: { xs: -1, md: 0 }, width: { xs: 'calc(100% + 16px)', md: '100%' } }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox" />
                                            <TableCell sx={{ fontWeight: 800 }}>Orden</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Hora</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Método</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {todayOrders.map((order) => (
                                            <DialogOrderRow key={order.id} order={order} toDate={toDate} />
                                        ))}
                                        {todayOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.disabled" }}>
                                                    No hay ventas registradas hoy todavía.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>

                    {/* 💸 EGRESOS / PAGOS */}
                    <Card sx={{ mt: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                                <LocalAtm color="error" /> Egresos
                            </Typography>

                            <Stack spacing={2} mb={3}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                        label="Descripción"
                                        size="small"
                                        fullWidth
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                        placeholder="Ej: Pago proveedor, Taxi, etc."
                                    />
                                    <TextField
                                        label="Monto"
                                        type="number"
                                        size="small"
                                        sx={{ width: { xs: "100%", sm: 150 } }}
                                        value={newExpense.amount === 0 ? "" : newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                    />
                                    <Button
                                        variant="contained"
                                        color="error"
                                        sx={{ width: { xs: "100%", sm: "auto" } }}
                                        onClick={() => {
                                            if (newExpense.description && newExpense.amount > 0) {
                                                setExpenses([...expenses, newExpense]);
                                                setNewExpense({ description: "", amount: 0 });
                                            }
                                        }}
                                    >
                                        Agregar
                                    </Button>
                                </Stack>
                            </Stack>

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Monto</TableCell>
                                            <TableCell align="right"></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {expenses.map((exp, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{exp.description}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCOP(exp.amount)}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="error" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}>
                                                        <Box sx={{ fontSize: '1rem', fontWeight: 900 }}>×</Box>
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {expenses.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ color: "text.disabled", py: 2 }}>No hay egresos registrados.</TableCell>
                                            </TableRow>
                                        )}
                                        {expenses.length > 0 && (
                                            <TableRow sx={{ bgcolor: "#fef2f2" }}>
                                                <TableCell sx={{ fontWeight: 800 }}>TOTAL EGRESOS</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 900, color: "error.main" }}>{formatCOP(totalExpenses)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 📝 FORMULARIO DE CIERRE */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0", mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                                <History color="primary" /> Desglose Efectivo
                            </Typography>

                            <Grid container spacing={1.5}>
                                {/* BILLETES */}
                                <Grid size={{ xs: 12 }}><Typography variant="caption" fontWeight={900} color="text.secondary">BILLETES</Typography></Grid>
                                {[100000, 50000, 20000, 10000, 5000, 2000].map(val => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={val}>
                                        <DenominationInput
                                            label={`$${val / 1000}k`}
                                            value={denominations[`bills${val}` as keyof typeof denominations]}
                                            onChange={(n) => setDenominations({ ...denominations, [`bills${val}`]: n })}
                                        />
                                    </Grid>
                                ))}

                                {/* MONEDAS */}
                                <Grid size={{ xs: 12 }} sx={{ mt: 1 }}><Typography variant="caption" fontWeight={900} color="text.secondary">MONEDAS</Typography></Grid>
                                {[1000, 500, 200, 100].map(val => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={val}>
                                        <DenominationInput
                                            label={`$${val}`}
                                            value={denominations[`coins${val}` as keyof typeof denominations]}
                                            onChange={(n) => setDenominations({ ...denominations, [`coins${val}`]: n })}
                                        />
                                    </Grid>
                                ))}
                            </Grid>

                            <Box sx={{ mt: 3, p: 2, bgcolor: "#f0fdf4", borderRadius: 3, textAlign: 'center' }}>
                                <Typography variant="caption" fontWeight={700} color="success.main" display="block">TOTAL CONTADO</Typography>
                                <Typography variant="h5" fontWeight={900} color="success.dark" sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}>{formatCOP(totalFromBreakdown)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0", position: { xs: 'relative', md: 'sticky' }, top: 20 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={800} mb={3}>
                                Realizar Cierre
                            </Typography>

                            <Stack spacing={3}>
                                <TextField
                                    label="Base de Efectivo (Apertura)"
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    value={openingBalance || ""}
                                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                                    InputProps={{
                                        startAdornment: <AttachMoney sx={{ color: "text.disabled", mr: 1 }} />,
                                    }}
                                    helperText="Dinero con el que inició el turno."
                                />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Sistema (Teórico):</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(expectedCash)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Efectivo Real (Desglose):</Typography>
                                        <Typography variant="body1" fontWeight={900} color="primary.main">{formatCOP(actualCash)}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Tarjeta Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.tarjeta)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Tarjeta Real"
                                            type="number"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualCard || ""}
                                            onChange={(e) => setActualCard(Number(e.target.value))}
                                            InputProps={{
                                                startAdornment: <CreditCard sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Transferencia Sistema:</Typography>
                                        <Typography variant="body1" fontWeight={800}>{formatCOP(summary.transferencia)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Transferencia Real"
                                            type="number"
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            value={actualTransfer || ""}
                                            onChange={(e) => setActualTransfer(Number(e.target.value))}
                                            InputProps={{
                                                startAdornment: <AccountBalance sx={{ fontSize: 18, color: "text.disabled", mr: 1 }} />,
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 3, mt: 3 }}>
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={800} color="primary.dark">RESUMEN DE VENTAS</Typography>
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Ventas Brutas:</Typography>
                                            <Typography variant="caption" fontWeight={700}>{formatCOP(summary.totalGross)}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="caption" color="error.main" fontWeight={600}>(-) Desc. Guías:</Typography>
                                            <Typography variant="caption" fontWeight={700} color="error.main">{formatCOP(summary.totalGuiaDiscount)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="caption" color="error.main" fontWeight={600}>(-) Egresos:</Typography>
                                            <Typography variant="caption" fontWeight={700} color="error.main">{formatCOP(totalExpenses)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="body2" color="text.primary" fontWeight={800}>Venta Neta:</Typography>
                                            <Typography variant="body2" fontWeight={900}>{formatCOP(summary.totalSales)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 1 }} />
                                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>Teórico en Caja:</Typography>
                                            <Typography variant="body2" fontWeight={800}>{formatCOP(expectedCash)}</Typography>
                                        </Stack>

                                        <Divider sx={{ my: 1.5 }} />

                                        <Typography variant="subtitle2" fontWeight={800} color="primary.dark">RESUMEN DE DIFERENCIAS</Typography>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Diferencia Efectivo:</Typography>
                                            <Typography variant="caption" fontWeight={900} color={difference === 0 ? "text.secondary" : difference > 0 ? "success.main" : "error.main"}>
                                                {formatCOP(difference)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Diferencia Tarjeta:</Typography>
                                            <Typography variant="caption" fontWeight={900} color={cardDifference === 0 ? "text.secondary" : cardDifference > 0 ? "success.main" : "error.main"}>
                                                {formatCOP(cardDifference)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Diferencia Transf.:</Typography>
                                            <Typography variant="caption" fontWeight={900} color={transferDifference === 0 ? "text.secondary" : transferDifference > 0 ? "success.main" : "error.main"}>
                                                {formatCOP(transferDifference)}
                                            </Typography>
                                        </Stack>

                                        <Divider sx={{ my: 0.5 }} />

                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight={800}>Gran Total Dif.:</Typography>
                                            <Box sx={{ textAlign: "right" }}>
                                                <Typography variant="subtitle1" fontWeight={1000} color={(difference + cardDifference + transferDifference) === 0 ? "text.primary" : (difference + cardDifference + transferDifference) > 0 ? "success.main" : "error.main"}>
                                                    {formatCOP(difference + cardDifference + transferDifference)}
                                                </Typography>
                                                {(difference + cardDifference + transferDifference) !== 0 && (
                                                    <Typography variant="caption" fontWeight={900} color={(difference + cardDifference + transferDifference) > 0 ? "success.main" : "error.main"} sx={{ display: 'block', fontSize: '0.65rem' }}>
                                                        {(difference + cardDifference + transferDifference) > 0 ? "SOBRANTE TOTAL" : "FALTANTE TOTAL"}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Box>

                                <TextField
                                    label="Notas / Observaciones"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ej: descuadre de caja, gastos menores, etc."
                                />

                                <Button
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    onClick={handleSaveClosing}
                                    disabled={loading || todayOrders.length === 0}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                    sx={{
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 900,
                                        fontSize: "1rem",
                                        textTransform: "none",
                                        boxShadow: 4
                                    }}
                                >
                                    {loading ? "Guardando..." : "Cerrar Caja Hoy"}
                                </Button>
                                {todayOrders.length === 0 && (
                                    <Typography variant="caption" color="error" textAlign="center" fontWeight={600}>
                                        No se puede cerrar sin ventas registradas.
                                    </Typography>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 📜 HISTORIAL DE CIERRES */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ mt: 2, borderRadius: 4, border: "1px solid #e2e8f0" }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                                <History color="action" /> Historial
                            </Typography>
                            <TableContainer sx={{ mx: { xs: -1, md: 0 }, width: { xs: 'calc(100% + 16px)', md: '100%' }, overflowX: "auto" }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800 }}>Fecha Cierre</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Realizado por</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Base</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Ventas Totales</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Efectivo Final</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Diferencia</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Notas</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {closings
                                            .sort((a, b) => {
                                                const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
                                                const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
                                                return dB.getTime() - dA.getTime();
                                            })
                                            .map((c) => (
                                                <TableRow key={c.id} hover onClick={() => setSelectedClosing(c)} sx={{ cursor: 'pointer' }}>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>
                                                            {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : c.date}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "secondary.main" }}>
                                                                {c.closedBy?.name?.charAt(0)}
                                                            </Avatar>
                                                            <Typography variant="body2" fontWeight={600}>{c.closedBy?.name}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right">{formatCOP(c.openingBalance)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCOP(c.totalSales)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 1000, color: "primary.main" }}>
                                                        {formatCOP(c.actualCash || (c.totals?.efectivo || 0) + (c.openingBalance || 0))}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={800} color={(c.difference || 0) === 0 ? "text.secondary" : (c.difference || 0) > 0 ? "success.main" : "error.main"}>
                                                            Efe: {formatCOP(c.difference || 0)}
                                                        </Typography>
                                                        {c.cardDifference !== undefined && (
                                                            <Typography variant="body2" fontWeight={800} color={c.cardDifference === 0 ? "text.secondary" : c.cardDifference > 0 ? "success.main" : "error.main"}>
                                                                Tar: {formatCOP(c.cardDifference)}
                                                            </Typography>
                                                        )}
                                                        {c.transferDifference !== undefined && (
                                                            <Typography variant="body2" fontWeight={800} color={c.transferDifference === 0 ? "text.secondary" : c.transferDifference > 0 ? "success.main" : "error.main"}>
                                                                Tra: {formatCOP(c.transferDifference)}
                                                            </Typography>
                                                        )}
                                                        {((c.difference || 0) !== 0 || (c.cardDifference || 0) !== 0 || (c.transferDifference || 0) !== 0) && (
                                                            <Typography variant="caption" fontWeight={900} color={((c.difference || 0) + (c.cardDifference || 0) + (c.transferDifference || 0)) > 0 ? "success.main" : "error.main"} sx={{ fontSize: '0.6rem' }}>
                                                                {((c.difference || 0) + (c.cardDifference || 0) + (c.transferDifference || 0)) > 0 ? "SOBRANTE" : "FALTANTE"}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                            {c.notes || "—"}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        {closings.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.disabled" }}>
                                                    No hay historial de cierres.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 📊 MÉTRICAS DE NEGOCIO */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ mt: 3, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <History color="primary" /> Rendimiento del Negocio (Últimos 30 días)
                            </Typography>

                            <Grid container spacing={{ xs: 1.5, md: 3 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <SummaryCard
                                        title="Ventas Totales (Netas)"
                                        value={businessMetrics.totalNetSales}
                                        icon={<AttachMoney />}
                                        color="#10b981"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <SummaryCard
                                        title="Total Descuentos Guía"
                                        value={businessMetrics.totalGuiaDiscount}
                                        icon={<LocalAtm />}
                                        color="#ed6c02"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <SummaryCard
                                        title="Total Egresos"
                                        value={businessMetrics.totalExpenses}
                                        icon={<LocalAtm />}
                                        color="#ef4444"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <SummaryCard
                                        title="Diferencia Acumulada"
                                        value={businessMetrics.totalDifference}
                                        icon={<History />}
                                        color={businessMetrics.totalDifference >= 0 ? "#10b981" : "#ef4444"}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* DIÁLOGO DETALLES DE CIERRE */}
            <Dialog
                open={!!selectedClosing}
                onClose={() => { setSelectedClosing(null); setDialogTab(0); }}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
            >
                <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h5" fontWeight={900} color="primary.main">
                            Detalle de Cierre
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            {selectedClosing?.date} • Cajero: {selectedClosing?.closedBy?.name}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => { setSelectedClosing(null); setDialogTab(0); }} sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f1f5f9' } }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <Tabs
                    value={dialogTab}
                    onChange={(e, v) => setDialogTab(v)}
                    variant="fullWidth"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: '#f8fafc',
                        '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', fontSize: '0.95rem' }
                    }}
                >
                    <Tab label="Resumen General" />
                    <Tab label={`Órdenes (${selectedClosingOrders.length})`} />
                    <Tab label="Desglose Efectivo" />
                </Tabs>

                <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: '#ffffff' }}>
                    {selectedClosing && dialogTab === 0 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderColor: '#e2e8f0' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={900} color="primary.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ReceiptLong fontSize="small" /> Resumen de Ventas
                                        </Typography>
                                        <Stack spacing={1.5} mt={2}>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" color="text.secondary" fontWeight={700}>Base de Apertura</Typography>
                                                <Typography variant="body2" fontWeight={800}>{formatCOP(selectedClosing.openingBalance)}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                z                         <Typography variant="body2" color="text.secondary" fontWeight={700}>Ventas Totales Netas</Typography>
                                                <Typography variant="body2" fontWeight={800}>{formatCOP(selectedClosing.totalSales)}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" color="text.secondary" fontWeight={700}>Descuentos Guías</Typography>
                                                <Typography variant="body2" fontWeight={800} color="error.main">{formatCOP(selectedClosing.totalGuiaDiscount || 0)}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" color="text.secondary" fontWeight={700}>Egresos Registrados</Typography>
                                                <Typography variant="body2" fontWeight={800} color="error.main">{formatCOP(selectedClosing.totalExpenses || 0)}</Typography>
                                            </Stack>
                                            <Divider sx={{ my: 0.5 }} />
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body1" color="primary.main" fontWeight={900}>Efectivo Teórico</Typography>
                                                <Typography variant="body1" fontWeight={900}>
                                                    {formatCOP((selectedClosing.totals?.efectivo || 0) + (selectedClosing.openingBalance || 0) - (selectedClosing.totalExpenses || 0))}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderColor: '#e2e8f0' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={900} color="primary.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AccountBalance fontSize="small" /> Diferencias Totales
                                        </Typography>
                                        <Stack spacing={2} mt={2}>
                                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (selectedClosing.difference || 0) < 0 ? '#fef2f2' : (selectedClosing.difference || 0) > 0 ? '#f0fdf4' : '#f8fafc' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" fontWeight={700} color="text.secondary">Diferencia Efectivo</Typography>
                                                    <Typography variant="subtitle2" fontWeight={900} color={(selectedClosing.difference || 0) < 0 ? 'error.main' : (selectedClosing.difference || 0) > 0 ? 'success.main' : 'text.primary'}>
                                                        {formatCOP(selectedClosing.difference || 0)}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (selectedClosing.cardDifference || 0) < 0 ? '#fef2f2' : (selectedClosing.cardDifference || 0) > 0 ? '#f0fdf4' : '#f8fafc' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">Tarjeta Sistema</Typography>
                                                        <Typography variant="body2" fontWeight={800}>{formatCOP(selectedClosing.totals?.tarjeta || 0)}</Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">Diferencia Tarjeta</Typography>
                                                        <Typography variant="subtitle2" fontWeight={900} color={(selectedClosing.cardDifference || 0) < 0 ? 'error.main' : (selectedClosing.cardDifference || 0) > 0 ? 'success.main' : 'text.primary'}>
                                                            {formatCOP(selectedClosing.cardDifference || 0)}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Box>

                                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (selectedClosing.transferDifference || 0) < 0 ? '#fef2f2' : (selectedClosing.transferDifference || 0) > 0 ? '#f0fdf4' : '#f8fafc' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">Transf. Sistema</Typography>
                                                        <Typography variant="body2" fontWeight={800}>{formatCOP(selectedClosing.totals?.transferencia || 0)}</Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">Diferencia Transf.</Typography>
                                                        <Typography variant="subtitle2" fontWeight={900} color={(selectedClosing.transferDifference || 0) < 0 ? 'error.main' : (selectedClosing.transferDifference || 0) > 0 ? 'success.main' : 'text.primary'}>
                                                            {formatCOP(selectedClosing.transferDifference || 0)}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {selectedClosing.notes && (
                                <Grid size={{ xs: 12 }}>
                                    <Alert severity="info" variant="outlined" sx={{ borderRadius: 3, border: '1px solid #bae6fd', bgcolor: '#f0f9ff' }}>
                                        <Typography variant="caption" fontWeight={800} color="info.dark" display="block">Notas / Observaciones:</Typography>
                                        <Typography variant="body2" color="text.primary">{selectedClosing.notes}</Typography>
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    )}

                    {selectedClosing && dialogTab === 1 && (
                        <Box>
                            {selectedClosingOrders.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <Typography variant="body1" color="text.secondary" fontWeight={600}>No se encontraron órdenes para este día.</Typography>
                                </Box>
                            ) : (
                                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, maxHeight: 450 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }} />
                                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>Orden</TableCell>
                                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>Hora</TableCell>
                                                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>Método</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>Total</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedClosingOrders.map((order) => (
                                                <DialogOrderRow key={order.id} order={order} toDate={toDate} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {selectedClosing && dialogTab === 2 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#e2e8f0', height: '100%' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={800} color="primary" gutterBottom>
                                            Desglose de Efectivo Físico
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Denominación</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 700, color: "text.secondary" }}>Cnt</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>Total</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {[
                                                    { label: "$100.000", key: "bills100000", val: 100000 },
                                                    { label: "$50.000", key: "bills50000", val: 50000 },
                                                    { label: "$20.000", key: "bills20000", val: 20000 },
                                                    { label: "$10.000", key: "bills10000", val: 10000 },
                                                    { label: "$5.000", key: "bills5000", val: 5000 },
                                                    { label: "$2.000", key: "bills2000", val: 2000 },
                                                    { label: "$1.000", key: "coins1000", val: 1000 },
                                                    { label: "$500", key: "coins500", val: 500 },
                                                    { label: "$200", key: "coins200", val: 200 },
                                                    { label: "$100", key: "coins100", val: 100 },
                                                ].map(d => {
                                                    const qty = (selectedClosing.denominations as any)?.[d.key] || 0;
                                                    if (qty === 0) return null;
                                                    return (
                                                        <TableRow key={d.key}>
                                                            <TableCell sx={{ fontWeight: 600 }}>{d.label}</TableCell>
                                                            <TableCell align="center">{qty}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCOP(qty * d.val)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow sx={{ bgcolor: "#f0fdf4" }}>
                                                    <TableCell colSpan={2} sx={{ fontWeight: 800 }}>TOTAL RECOLECTADO</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 900, color: "success.dark" }}>
                                                        {formatCOP(selectedClosing.actualCash)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#e2e8f0', height: '100%' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={800} color="error.main" gutterBottom>
                                            Detalle de Egresos
                                        </Typography>
                                        {(!selectedClosing.expenses || selectedClosing.expenses.length === 0) ? (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
                                                No se registraron egresos en este cierre.
                                            </Typography>
                                        ) : (
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Descripción</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>Monto</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {selectedClosing.expenses.map((exp, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell sx={{ fontWeight: 600 }}>{exp.description}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCOP(exp.amount)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ bgcolor: "#fef2f2" }}>
                                                        <TableCell sx={{ fontWeight: 800 }}>TOTAL EGRESOS</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 900, color: "error.main" }}>{formatCOP(selectedClosing.totalExpenses || 0)}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}


/* =========================
   SUB-COMPONENTES
========================= */
function SummaryCard({ title, value, icon, color, isTotal }: { title: string; value: number; icon: any; color: string; isTotal?: boolean }) {
    return (
        <Card sx={{
            borderRadius: 4,
            height: "100%",
            border: isTotal ? `2px solid ${color}` : "1px solid #e2e8f0",
            bgcolor: isTotal ? `${color}05` : "#fff",
            transition: "0.2s",
            "&:hover": { transform: "translateY(-2px)", boxShadow: 3 }
        }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Stack spacing={1}>
                    <Avatar sx={{ bgcolor: `${color}15`, color: color, width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}>
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", fontSize: { xs: "0.55rem", md: "0.65rem" }, letterSpacing: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="h6" fontWeight={900} color={isTotal ? color : "text.primary"} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
                            {formatCOP(value)}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function DenominationInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: "#f1f5f9", p: 1, borderRadius: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 40, fontWeight: 700, color: "#64748b" }}>{label}</Typography>
            <TextField
                type="number"
                size="small"
                variant="standard"
                value={value === 0 ? "" : value}
                onChange={(e) => onChange(Number(e.target.value))}
                inputProps={{ style: { textAlign: 'right', fontWeight: 800, fontSize: '0.9rem' } }}
                InputProps={{ disableUnderline: true }}
                sx={{ bgcolor: "#fff", px: 1, borderRadius: 1 }}
            />
        </Stack>
    );
}

function DialogOrderRow({ order, toDate }: { order: Order; toDate: (order: any) => Date }) {
    const [open, setOpen] = useState(false);

    return (
        <Fragment>
            <TableRow hover onClick={() => setOpen(!open)} sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}>
                <TableCell padding="checkbox">
                    <IconButton size="small">
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{order.name}</TableCell>
                <TableCell color="text.secondary">
                    {toDate(order).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                    <Chip label={order.paymentMethod} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: "0.65rem", textTransform: "capitalize" }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {formatCOP(order.total)}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1.5, p: 2, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                            <Typography variant="subtitle2" gutterBottom component="div" fontWeight={800} color="primary.dark">
                                Productos Incluidos
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Cant.</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Producto</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Precio</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Subtotal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(order.products || []).map((product, idx) => (
                                        <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell sx={{ fontWeight: 800 }}>{product.quantity}x</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={800} color="text.primary">{product.productName}</Typography>
                                                {product.variantLabel && (
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>Variante: {product.variantLabel}</Typography>
                                                )}
                                                {product.additions && product.additions.length > 0 && (
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                                                        Adiciones: {product.additions.map((a: any) => a.name).join(', ')}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCOP(product.price)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>{formatCOP(product.total || (product.price * product.quantity))}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!order.products || order.products.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 2 }}>
                                                No hay productos registrados en esta orden.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </Fragment>
    );
}
