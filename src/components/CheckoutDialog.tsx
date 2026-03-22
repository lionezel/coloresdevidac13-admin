import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Stack,
    Box,
    Divider,
    TextField,
    MenuItem,
    IconButton,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { Order } from "../interfaces/Order";
import { useCollection } from "../hooks/useCollection";
import { CreditCustomer } from "../interfaces/CreditCustomer";
import { useParams } from "react-router-dom";

interface CheckoutDialogProps {
    open: boolean;
    order: Order | null;
    onClose: () => void;
    onComplete: (order: Order, finalPaymentMethod: string, customer?: { id: string, name: string }) => Promise<void>;
}

export default function CheckoutDialog({
    open,
    order,
    onClose,
    onComplete,
}: CheckoutDialogProps) {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");
    const [cashReceived, setCashReceived] = useState<number | "">("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [tipMode, setTipMode] = useState<"percentage" | "fixed">("percentage");
    const [tipPercentage, setTipPercentage] = useState<number>(0);
    const [tipFixedAmount, setTipFixedAmount] = useState<number | "">("");

    const { data: creditCustomers = [] } = useCollection<CreditCustomer>(
        restaurantId!,
        "credit_customers"
    );

    const selectedCustomer = useMemo(() =>
        creditCustomers.find(c => c.id === selectedCustomerId),
        [creditCustomers, selectedCustomerId]);

    // Calculate total whenever an order is active
    const subTotal = useMemo(() => {
        if (!order) return 0;
        return order.products.reduce(
            (acc, p) => acc + Number(p.total ?? Number(p.price) * Number(p.quantity)),
            0
        );
    }, [order]);

    const tipAmount = useMemo(() => {
        if (tipMode === "percentage") return Math.round(subTotal * (tipPercentage / 100));
        return Number(tipFixedAmount) || 0;
    }, [subTotal, tipPercentage, tipFixedAmount, tipMode]);

    const totalGeneral = subTotal + tipAmount;

    // Sync default payment method when order changes
    React.useEffect(() => {
        if (order && order.paymentMethod) {
            setPaymentMethod(order.paymentMethod.toLowerCase());
        }
        setTipMode("percentage");
        setTipPercentage(0);
        setTipFixedAmount("");
        setCashReceived("");
    }, [order]);

    // Calculate change
    const changeToGive = useMemo(() => {
        if (paymentMethod !== "efectivo" || cashReceived === "") return 0;
        const amount = Number(cashReceived);
        return amount > totalGeneral ? amount - totalGeneral : 0;
    }, [cashReceived, totalGeneral, paymentMethod]);

    const isShortOnCash =
        paymentMethod === "efectivo" &&
        cashReceived !== "" &&
        Number(cashReceived) < totalGeneral;

    const handleFinish = async () => {
        if (isShortOnCash) return;
        if (paymentMethod === "fiado" && !selectedCustomerId) return;

        if (order) {
            const customerData = selectedCustomer ? {
                id: selectedCustomer.id!,
                name: selectedCustomer.name
            } : undefined;

            await onComplete({
                ...order,
                subTotal,
                tipPercentage,
                tipAmount,
                total: totalGeneral
            }, paymentMethod, customerData);
            onClose();
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
                        <PointOfSaleIcon color="primary" fontSize="large" />
                        Checkout & Facturación
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ pb: 3 }}>
                <Box mb={2} mt={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Orden a cobrar:
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                        {order.name}
                    </Typography>
                </Box>

                {/* Selector de Propina */}
                <Box mb={3}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight={600}>
                        Agregar Propina:
                    </Typography>

                    <Stack direction="row" spacing={1} mb={1.5}>
                        <Button 
                            variant={tipMode === "percentage" ? "contained" : "outlined"} 
                            size="small" 
                            onClick={() => setTipMode("percentage")}
                            sx={{ borderRadius: 2 }}
                        >
                            Porcentaje (%)
                        </Button>
                        <Button 
                            variant={tipMode === "fixed" ? "contained" : "outlined"} 
                            size="small" 
                            onClick={() => setTipMode("fixed")}
                            sx={{ borderRadius: 2 }}
                        >
                            Monto Fijo ($)
                        </Button>
                    </Stack>

                    {tipMode === "percentage" ? (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                            {[0, 5, 10, 15].map((pct) => (
                                <Button
                                    key={pct}
                                    variant={tipPercentage === pct ? "contained" : "outlined"}
                                    onClick={() => setTipPercentage(pct)}
                                    size="small"
                                    sx={{ borderRadius: 2, minWidth: '60px' }}
                                >
                                    {pct}%
                                </Button>
                            ))}
                            <TextField
                                size="small"
                                type="number"
                                placeholder="Otro"
                                value={![0, 5, 10, 15].includes(tipPercentage) ? tipPercentage || '' : ""}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val >= 0) setTipPercentage(val);
                                }}
                                InputProps={{
                                    endAdornment: <Typography variant="caption" sx={{ ml: 0.5 }}>%</Typography>,
                                    sx: { width: 90, borderRadius: 2, height: 32, fontSize: '0.875rem' }
                                }}
                            />
                        </Stack>
                    ) : (
                        <TextField
                            size="small"
                            type="number"
                            placeholder="Escribe el monto..."
                            value={tipFixedAmount}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setTipFixedAmount(val >= 0 ? val : "");
                            }}
                            fullWidth
                            InputProps={{
                                startAdornment: <Typography variant="caption" sx={{ mr: 1, fontWeight: 800 }}>$</Typography>,
                                sx: { borderRadius: 2 }
                            }}
                        />
                    )}
                </Box>

                {/* Resumen de Total */}
                <Box
                    sx={{
                        bgcolor: "#f8fafc",
                        p: 3,
                        borderRadius: 3,
                        border: "2px solid #e2e8f0",
                        mb: 3,
                    }}
                >
                    <Stack spacing={1} mb={2}>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography color="text.secondary" variant="body2" fontWeight={600}>Subtotal ({order.products.length} productos)</Typography>
                            <Typography fontWeight={700} variant="body2">${subTotal.toLocaleString()}</Typography>
                        </Stack>
                        {tipAmount > 0 && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                                    Propina {tipMode === "percentage" && `(${tipPercentage}%)`}
                                </Typography>
                                <Typography fontWeight={700} variant="body2" color="success.main">+ ${tipAmount.toLocaleString()}</Typography>
                            </Stack>
                        )}
                    </Stack>
                    <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
                    <Box sx={{ textAlign: "center" }}>
                        <Typography variant="overline" color="text.secondary" fontWeight={800}>
                            TOTAL A PAGAR
                        </Typography>
                        <Typography variant="h3" fontWeight={900} color="primary.main">
                            ${totalGeneral.toLocaleString()}
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                    {/* Selector de Método de Pago */}
                    <TextField
                        select
                        label="Método de Pago Final"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        fullWidth
                        variant="outlined"
                    >
                        <MenuItem value="efectivo">💵 Efectivo</MenuItem>
                        <MenuItem value="tarjeta">💳 Tarjeta de Crédito/Débito</MenuItem>
                        <MenuItem value="transferencia">🏦 Transferencia / Nequi</MenuItem>
                        <MenuItem value="fiado">📝 Fiado (Pendiente Cobro)</MenuItem>
                        <MenuItem value="otro">🏷️ Otro</MenuItem>
                    </TextField>

                    {/* Selector de Cliente para Fiado */}
                    {paymentMethod === "fiado" && (
                        <TextField
                            select
                            label="Seleccionar Cliente de Crédito"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            fullWidth
                            variant="outlined"
                            required
                            helperText={!selectedCustomerId ? "Debes seleccionar un cliente para fiar" : ""}
                            error={!selectedCustomerId}
                        >
                            {creditCustomers.map((customer) => (
                                <MenuItem key={customer.id} value={customer.id}>
                                    {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    {/* Calculadora de Efectivo */}
                    {paymentMethod === "efectivo" && (
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: "#fffbeb",
                                borderRadius: 3,
                                border: "1px dashed #f59e0b",
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#b45309" mb={2}>
                                Calculadora de Cambio
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <TextField
                                    label="Efectivo Recibido ($)"
                                    type="number"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value ? Number(e.target.value) : "")}
                                    error={isShortOnCash}
                                    helperText={
                                        isShortOnCash ? "Monto insuficiente" : ""
                                    }
                                    fullWidth
                                    InputProps={{
                                        sx: { bgcolor: "#fff", fontWeight: 700 },
                                    }}
                                />

                                <Box
                                    sx={{
                                        minWidth: '120px',
                                        p: 1.5,
                                        bgcolor: cashReceived ? (isShortOnCash ? '#fee2e2' : '#dcfce7') : '#f1f5f9',
                                        borderRadius: 2,
                                        textAlign: 'center',
                                        border: '1px solid',
                                        borderColor: cashReceived ? (isShortOnCash ? '#ef4444' : '#22c55e') : '#cbd5e1',
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                                        {isShortOnCash ? "DEBE" : "CAMBIO"}
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        fontWeight={900}
                                        color={isShortOnCash ? "error.main" : "success.main"}
                                    >
                                        ${isShortOnCash
                                            ? (totalGeneral - Number(cashReceived)).toLocaleString()
                                            : changeToGive.toLocaleString()
                                        }
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {paymentMethod !== "efectivo" && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Verifica el comprobante bancario antes de finalizar la orden.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0, justifyContent: "space-between" }}>
                <Button onClick={onClose} size="large" sx={{ fontWeight: 600 }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    size="large"
                    color="success"
                    disabled={isShortOnCash}
                    onClick={handleFinish}
                    startIcon={<ReceiptLongIcon />}
                    sx={{
                        fontWeight: 800,
                        py: 1.5,
                        px: 4,
                        borderRadius: 8,
                        boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
                    }}
                >
                    COBRAR Y FACTURAR
                </Button>
            </DialogActions>
        </Dialog>
    );
}
