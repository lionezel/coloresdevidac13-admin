import { useState, useMemo } from "react";
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
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

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
            
            totals.totalSales += total;
            totals.totalGross += (total + guiaAmount);
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
        <Box p={{ xs: 2, md: 4 }} bgcolor="#f8fafc" minHeight="100vh">
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.02em" }}>
                        Cierre de Caja
                    </Typography>
                    <Typography color="text.secondary">
                        Resumen diario de ventas y conciliación de efectivo.
                    </Typography>
                </Box>
                <Chip 
                    label={new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    icon={<CalendarMonth />}
                    sx={{ fontWeight: 700, px: 1, height: 40, borderRadius: 2, bgcolor: "#fff", border: "1px solid #e2e8f0" }}
                />
            </Stack>

            {successMsg && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>
                    {successMsg}
                </Alert>
            )}

            <Grid container spacing={3}>
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
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ReceiptLong color="primary" /> Órdenes de Hoy ({todayOrders.length})
                            </Typography>
                            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800 }}>Orden</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Hora</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Método</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {todayOrders.map((order) => (
                                            <TableRow key={order.id} hover>
                                                <TableCell sx={{ fontWeight: 600 }}>{order.name}</TableCell>
                                                <TableCell color="text.secondary">
                                                    {toDate(order).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={order.paymentMethod} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: "0.65rem" }} />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {formatCOP(order.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {todayOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.disabled" }}>
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
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalAtm color="error" /> Pagos y Salidas (Egresos)
                            </Typography>
                            
                            <Stack spacing={2} mb={3}>
                                <Stack direction="row" spacing={2}>
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
                                        sx={{ width: 150 }}
                                        value={newExpense.amount === 0 ? "" : newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                    />
                                    <Button 
                                        variant="contained" 
                                        color="error"
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
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <History color="primary" /> Desglose de Efectivo
                            </Typography>
                            
                            <Grid container spacing={2}>
                                {/* BILLETES */}
                                <Grid size={{ xs: 12 }}><Typography variant="caption" fontWeight={900} color="text.secondary">BILLETES</Typography></Grid>
                                {[100000, 50000, 20000, 10000, 5000, 2000].map(val => (
                                    <Grid size={{ xs: 6 }} key={val}>
                                        <DenominationInput 
                                            label={`$${val / 1000}k`} 
                                            value={denominations[`bills${val}` as keyof typeof denominations]} 
                                            onChange={(n) => setDenominations({...denominations, [`bills${val}`]: n})} 
                                        />
                                    </Grid>
                                ))}
                                
                                {/* MONEDAS */}
                                <Grid size={{ xs: 12 }} sx={{ mt: 1 }}><Typography variant="caption" fontWeight={900} color="text.secondary">MONEDAS</Typography></Grid>
                                {[1000, 500, 200, 100].map(val => (
                                    <Grid size={{ xs: 6 }} key={val}>
                                        <DenominationInput 
                                            label={`$${val}`} 
                                            value={denominations[`coins${val}` as keyof typeof denominations]} 
                                            onChange={(n) => setDenominations({...denominations, [`coins${val}`]: n})} 
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: "#f0fdf4", borderRadius: 3, textAlign: 'center' }}>
                                <Typography variant="caption" fontWeight={700} color="success.main" display="block">TOTAL EFECTIVO CONTADO</Typography>
                                <Typography variant="h5" fontWeight={900} color="success.dark">{formatCOP(totalFromBreakdown)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: 4, border: "1px solid #e2e8f0", position: 'sticky', top: 20 }}>
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

                                <Box sx={{ p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" fontWeight={700} color="text.secondary">Efectivo Real (Desglose):</Typography>
                                    <Typography variant="h6" fontWeight={900} color="primary.main">{formatCOP(actualCash)}</Typography>
                                </Box>

                                <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 3 }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Ventas Brutas:</Typography>
                                            <Typography variant="caption" fontWeight={700}>{formatCOP(summary.totalGross)}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="error.main" fontWeight={600}>(-) Descuento Guías:</Typography>
                                            <Typography variant="caption" fontWeight={700} color="error.main">{formatCOP(summary.totalGuiaDiscount)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="error.main" fontWeight={600}>(-) Egresos / Pagos:</Typography>
                                            <Typography variant="caption" fontWeight={700} color="error.main">{formatCOP(totalExpenses)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" color="text.primary" fontWeight={800}>(=) Venta Total Neta:</Typography>
                                            <Typography variant="body2" fontWeight={900}>{formatCOP(summary.totalSales)}</Typography>
                                        </Stack>
                                        <Divider sx={{ my: 1 }} />
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>Efectivo Sistema (Teórico):</Typography>
                                            <Typography variant="body2" fontWeight={800}>{formatCOP(expectedCash)}</Typography>
                                        </Stack>
                                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                            * Teórico = Base + Ventas Efectivo - Egresos
                                        </Typography>
                                    </Stack>
                                    
                                    <Divider sx={{ my: 1.5 }} />
                                    
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1" fontWeight={800}>Diferencia:</Typography>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="subtitle1" fontWeight={1000} color={difference === 0 ? "text.primary" : difference > 0 ? "success.main" : "error.main"}>
                                                {formatCOP(difference)}
                                            </Typography>
                                            {difference !== 0 && (
                                                <Typography variant="caption" fontWeight={900} color={difference > 0 ? "success.main" : "error.main"} sx={{ display: 'block' }}>
                                                    {difference > 0 ? "SOBRANTE" : "FALTANTE"}
                                                </Typography>
                                            )}
                                        </Box>
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
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <History color="action" /> Historial de Cierres
                            </Typography>
                            <TableContainer>
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
                                            <TableRow key={c.id} hover>
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
                                                        {formatCOP(c.difference || 0)}
                                                    </Typography>
                                                    {c.difference !== 0 && (
                                                        <Typography variant="caption" fontWeight={900} color={(c.difference || 0) > 0 ? "success.main" : "error.main"} sx={{ fontSize: '0.6rem' }}>
                                                            {(c.difference || 0) > 0 ? "SOBRANTE" : "FALTANTE"}
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
                            
                            <Grid container spacing={3}>
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
            <CardContent sx={{ p: 2 }}>
                <Stack spacing={1}>
                    <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 32, height: 32 }}>
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="h6" fontWeight={900} color={isTotal ? color : "text.primary"}>
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
