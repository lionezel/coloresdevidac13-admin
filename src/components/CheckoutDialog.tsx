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
import { Product } from "../interfaces/product";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { Order } from "../interfaces/Order";
import { useCollection } from "../hooks/useCollection";
import { CreditCustomer } from "../interfaces/CreditCustomer";
import { useParams } from "react-router-dom";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceReceipt } from "./InvoiceReceipt";
import PrintIcon from "@mui/icons-material/Print";

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
    const [cashCurrency, setCashCurrency] = useState<"COP" | "USD">("COP");
    const [usdExchangeRate, setUsdExchangeRate] = useState<number | "">(4200);
    const [usdReceived, setUsdReceived] = useState<number | "">("");

    // Plan Guía
    const [isGuiaPlan, setIsGuiaPlan] = useState<boolean>(false);

    // Tip & Discount States
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [tipMode, setTipMode] = useState<"percentage" | "fixed">("percentage");
    const [tipPercentage, setTipPercentage] = useState<number>(0);
    const [tipFixedAmount, setTipFixedAmount] = useState<number | "">("");

    const [discountType, setDiscountType] = useState<"none" | "total" | "producto">("none");
    const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">("percentage");
    const [discountValue, setDiscountValue] = useState<number | "">("");
    const [discountProductIdx, setDiscountProductIdx] = useState<number | "">("");

    const { data: allProducts = [] } = useCollection<Product>(restaurantId!, "products");
    const { data: creditCustomers = [] } = useCollection<CreditCustomer>(
        restaurantId!,
        "credit_customers"
    );

    const [localProducts, setLocalProducts] = useState<any[]>([]);

    const selectedCustomer = useMemo(() =>
        creditCustomers.find(c => c.id === selectedCustomerId),
        [creditCustomers, selectedCustomerId]);

    // Calculate total whenever an order is active
    const subTotal = useMemo(() => {
        return localProducts.reduce(
            (acc, p) => acc + Number(p.total ?? Number(p.price) * Number(p.quantity)),
            0
        );
    }, [localProducts]);

    const guiaDiscount = useMemo(() => {
        if (!isGuiaPlan || !localProducts.length) return 0;
        let foodCount = 0;
        localProducts.forEach(p => {
            const productDef = allProducts.find(prod => prod.id === p.productId);
            const cat = productDef?.category?.toLowerCase() || "";
            const name = p.productName.toLowerCase();

            const isDrink = cat.includes("bebida") || cat.includes("jugo") || cat.includes("gaseosa") ||
                cat.includes("cerveza") || cat.includes("licor") || cat.includes("trago") ||
                name.includes("bebida") || name.includes("jugo") || name.includes("gaseosa") ||
                name.includes("cerveza") || name.includes("limonada") || name.includes("agua");

            if (!isDrink) {
                foodCount += Number(p.quantity || 1);
            }
        });
        return foodCount * 5000;
    }, [isGuiaPlan, localProducts, allProducts]);

    const discountAmount = useMemo(() => {
        let baseDiscount = 0;
        if (discountType !== "none" && discountValue) {
            let targetAmount = subTotal;
            if (discountType === "producto") {
                if (discountProductIdx !== "") {
                    const p = localProducts[Number(discountProductIdx)];
                    if (p) targetAmount = Number(p.total ?? (p.price * p.quantity));
                }
            }
            if (discountMode === "percentage") {
                baseDiscount = Math.round(targetAmount * (Number(discountValue) / 100));
            } else {
                baseDiscount = Number(discountValue);
            }
            baseDiscount = Math.min(baseDiscount, targetAmount);
        }

        return baseDiscount + guiaDiscount;
    }, [discountType, discountMode, discountValue, discountProductIdx, subTotal, localProducts, guiaDiscount]);

    const tipAmount = useMemo(() => {
        const baseForTip = subTotal - discountAmount;
        if (tipMode === "percentage") return Math.round(baseForTip * (tipPercentage / 100));
        return Number(tipFixedAmount) || 0;
    }, [subTotal, discountAmount, tipPercentage, tipFixedAmount, tipMode]);

    const totalGeneral = subTotal - discountAmount + tipAmount;

    React.useEffect(() => {
        if (order) {
            setPaymentMethod(order.paymentMethod.toLowerCase());
            // Deep copy objects to avoid mutation
            setLocalProducts(order.products.map(p => ({ ...p })));
        } else {
            setLocalProducts([]);
        }
        setTipMode("percentage");
        setTipPercentage(0);
        setTipFixedAmount("");
        setCashReceived("");
        setCashCurrency("COP");
        setUsdExchangeRate(4200);
        setUsdReceived("");
        setDiscountType("none");
        setDiscountMode("percentage");
        setDiscountValue("");
        setDiscountProductIdx("");
        setIsGuiaPlan(false);
        setSelectedCustomerId("");
    }, [order]);

    const handlePriceChange = (idx: number, newPrice: number) => {
        setLocalProducts(prev => {
            const next = [...prev];
            const item = { ...next[idx] };
            item.price = newPrice;
            item.total = newPrice * item.quantity;
            next[idx] = item;
            return next;
        });
    };

    // Calculate change
    const changeToGive = useMemo(() => {
        if (paymentMethod !== "efectivo" || cashReceived === "") return 0;
        const amount = Number(cashReceived);
        return amount > totalGeneral ? amount - totalGeneral : 0;
    }, [cashReceived, totalGeneral, paymentMethod]);

    const isShortOnCash =
        paymentMethod === "efectivo" &&
        cashCurrency === "COP" &&
        cashReceived !== "" &&
        Number(cashReceived) < totalGeneral;

    // USD calculations
    const totalInUSD = useMemo(() => {
        if (cashCurrency !== "USD" || !usdExchangeRate) return 0;
        return totalGeneral / Number(usdExchangeRate);
    }, [cashCurrency, usdExchangeRate, totalGeneral]);

    const copChangeFromUSD = useMemo(() => {
        if (cashCurrency !== "USD" || usdReceived === "" || !usdExchangeRate) return 0;
        const paid = Number(usdReceived) * Number(usdExchangeRate);
        return paid > totalGeneral ? paid - totalGeneral : 0;
    }, [cashCurrency, usdReceived, usdExchangeRate, totalGeneral]);

    const isShortOnUSD =
        paymentMethod === "efectivo" &&
        cashCurrency === "USD" &&
        usdReceived !== "" &&
        usdExchangeRate !== "" &&
        Number(usdReceived) * Number(usdExchangeRate) < totalGeneral;

    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Factura_${order?.id || 'new'}`,
    });

    const handleFinish = async () => {
        if (isShortOnCash || isShortOnUSD) return;
        if (paymentMethod === "fiado" && !selectedCustomerId) return;

        if (order) {
            const customerData = selectedCustomer ? {
                id: selectedCustomer.id!,
                name: selectedCustomer.name
            } : undefined;

            const payload: any = {
                ...order,
                products: localProducts,
                subTotal,
                discountAmount: discountAmount > 0 ? discountAmount : null,
                discountType: discountAmount > 0 ? (discountType as "total" | "producto") : null,
                discountMode: discountAmount > 0 ? discountMode : null,
                discountValue: discountAmount > 0 ? Number(discountValue) : null,
                discountProductId: discountAmount > 0 && discountType === "producto" && discountProductIdx !== ""
                    ? localProducts[Number(discountProductIdx)].productId
                    : null,
                isGuiaPlan,
                guiaDiscount: guiaDiscount > 0 ? guiaDiscount : null,
                tipPercentage,
                tipAmount,
                total: totalGeneral,
                customer: customerData,
                // Multi-currency cash
                cashCurrency: paymentMethod === "efectivo" ? cashCurrency : null,
                usdReceived: paymentMethod === "efectivo" && cashCurrency === "USD" ? Number(usdReceived) : null,
                usdExchangeRate: paymentMethod === "efectivo" && cashCurrency === "USD" ? Number(usdExchangeRate) : null,
                changeInCOP: paymentMethod === "efectivo" && cashCurrency === "USD" ? copChangeFromUSD : null,
            };

            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined || payload[key] === null) {
                    delete payload[key];
                }
            });

            await onComplete(payload as Order, paymentMethod, customerData);
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
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            variant="outlined"
                            size="small"
                            color="info"
                            startIcon={<PrintIcon />}
                            onClick={() => handlePrint()}
                            sx={{ borderRadius: 2, fontWeight: 900, px: 2 }}
                        >
                            Imprimir Factura
                        </Button>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
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

                {/* Plan Guía Toggle */}
                <Box mb={3} p={2} sx={{ bgcolor: isGuiaPlan ? "success.50" : "#f8fafc", borderRadius: 3, border: "2px solid", borderColor: isGuiaPlan ? "success.main" : "#e2e8f0" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} color={isGuiaPlan ? "success.main" : "text.primary"}>
                                🗺️ Plan Guía
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Aplica -$5.000 por cada plato (excluye bebidas).
                            </Typography>
                        </Box>
                        <Button
                            variant={isGuiaPlan ? "contained" : "outlined"}
                            color="success"
                            onClick={() => setIsGuiaPlan(!isGuiaPlan)}
                            sx={{ borderRadius: 2, fontWeight: 900 }}
                        >
                            {isGuiaPlan ? "ACTIVADO" : "ACTIVAR"}
                        </Button>
                    </Stack>
                    {isGuiaPlan && guiaDiscount > 0 && (
                        <Typography variant="body2" color="success.main" fontWeight={800} mt={1} textAlign="right">
                            Descuento Guía: -${guiaDiscount.toLocaleString()}
                        </Typography>
                    )}
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

                {/* Selector de Promociones y Descuentos */}
                <Box mb={3}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight={600}>
                        Promociones y Descuentos:
                    </Typography>

                    <TextField
                        select
                        size="small"
                        value={discountType}
                        onChange={(e) => {
                            setDiscountType(e.target.value as any);
                            setDiscountValue("");
                            setDiscountProductIdx("");
                        }}
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="none">Sin descuento</MenuItem>
                        <MenuItem value="total">Descuento al Total de la Orden</MenuItem>
                        <MenuItem value="producto">Descuento a un Producto Específico</MenuItem>
                    </TextField>

                    {discountType !== "none" && (
                        <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 2 }}>
                            {discountType === "producto" && (
                                <TextField
                                    select
                                    label="Seleccionar Producto"
                                    size="small"
                                    value={discountProductIdx}
                                    onChange={(e) => setDiscountProductIdx(e.target.value as any)}
                                    fullWidth
                                    sx={{ mb: 2, bgcolor: "#fff" }}
                                >
                                    {localProducts.map((p, idx) => (
                                        <MenuItem key={idx} value={idx}>
                                            {p.quantity}x {p.productName} (${Number(p.total ?? (p.price * p.quantity)).toLocaleString()})
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}

                            <Stack direction="row" spacing={1} mb={2}>
                                <Button
                                    variant={discountMode === "percentage" ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => setDiscountMode("percentage")}
                                    sx={{ borderRadius: 2 }}
                                    color="secondary"
                                >
                                    Porcentaje (%)
                                </Button>
                                <Button
                                    variant={discountMode === "fixed" ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => setDiscountMode("fixed")}
                                    sx={{ borderRadius: 2 }}
                                    color="secondary"
                                >
                                    Monto Fijo ($)
                                </Button>
                            </Stack>

                            <TextField
                                size="small"
                                type="number"
                                placeholder={discountMode === "percentage" ? "Ej. 10" : "Ej. 5000"}
                                value={discountValue}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDiscountValue(val >= 0 ? val : "");
                                }}
                                fullWidth
                                sx={{ bgcolor: "#fff" }}
                                InputProps={{
                                    endAdornment: discountMode === "percentage" ? <Typography variant="caption" sx={{ ml: 0.5 }}>%</Typography> : null,
                                    startAdornment: discountMode === "fixed" ? <Typography variant="caption" sx={{ mr: 1, fontWeight: 800 }}>$</Typography> : null,
                                    sx: { borderRadius: 2 }
                                }}
                            />
                        </Box>
                    )}
                </Box>

                {/* Ajuste de Precios */}
                <Box mb={3}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight={600}>
                        Ajuste de Precios de Productos:
                    </Typography>
                    <Stack spacing={1.5}>
                        {localProducts.map((p, idx) => (
                            <Box key={idx} sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={800}>
                                            {p.quantity}x {p.productName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {p.variantLabel && p.variantLabel !== "Única" ? p.variantLabel : ""}
                                        </Typography>
                                    </Box>
                                    <TextField
                                        label="Precio Unit."
                                        size="small"
                                        type="number"
                                        value={p.price}
                                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                                        sx={{ width: 130, bgcolor: "#fff" }}
                                        InputProps={{
                                            startAdornment: <Typography variant="caption" sx={{ mr: 0.5, fontWeight: 700 }}>$</Typography>,
                                            sx: { borderRadius: 1.5, fontWeight: 800 }
                                        }}
                                    />
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
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
                            <Typography color="text.secondary" variant="body2" fontWeight={600}>Subtotal ({localProducts.length} productos)</Typography>
                            <Typography fontWeight={700} variant="body2">${subTotal.toLocaleString()}</Typography>
                        </Stack>

                        {discountAmount > 0 && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography color="text.secondary" variant="body2" fontWeight={600}>
                                    Descuento {discountMode === "percentage" && `(${discountValue}%)`} {discountType === "producto" && `- Prod`}
                                </Typography>
                                <Typography fontWeight={800} variant="body2" color="error.main">- ${discountAmount.toLocaleString()}</Typography>
                            </Stack>
                        )}

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

                            {/* Currency toggle */}
                            <Stack direction="row" spacing={1} mb={2}>
                                <Button
                                    size="small"
                                    variant={cashCurrency === "COP" ? "contained" : "outlined"}
                                    onClick={() => { setCashCurrency("COP"); setCashReceived(""); setUsdReceived(""); }}
                                    sx={{ borderRadius: 2, fontWeight: 800 }}
                                    color="warning"
                                >
                                    🇨🇴 Pesos (COP)
                                </Button>
                                <Button
                                    size="small"
                                    variant={cashCurrency === "USD" ? "contained" : "outlined"}
                                    onClick={() => { setCashCurrency("USD"); setCashReceived(""); setUsdReceived(""); }}
                                    sx={{ borderRadius: 2, fontWeight: 800 }}
                                    color="warning"
                                >
                                    🇺🇸 Dólares (USD)
                                </Button>
                            </Stack>

                            {/* COP mode */}
                            {cashCurrency === "COP" && (
                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <TextField
                                        label="Efectivo Recibido ($)"
                                        type="number"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value ? Number(e.target.value) : "")}
                                        error={isShortOnCash}
                                        helperText={isShortOnCash ? "Monto insuficiente" : ""}
                                        fullWidth
                                        InputProps={{ sx: { bgcolor: "#fff", fontWeight: 700 } }}
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
                                        <Typography variant="h6" fontWeight={900} color={isShortOnCash ? "error.main" : "success.main"}>
                                            ${isShortOnCash
                                                ? (totalGeneral - Number(cashReceived)).toLocaleString()
                                                : changeToGive.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Stack>
                            )}

                            {/* USD mode */}
                            {cashCurrency === "USD" && (
                                <Stack spacing={2}>
                                    {/* Exchange rate */}
                                    <TextField
                                        label="Tasa de cambio (COP por 1 USD)"
                                        type="number"
                                        value={usdExchangeRate}
                                        onChange={(e) => setUsdExchangeRate(e.target.value ? Number(e.target.value) : "")}
                                        fullWidth
                                        InputProps={{ sx: { bgcolor: "#fff", fontWeight: 700 } }}
                                        helperText={`Total a pagar: $${totalGeneral.toLocaleString()} COP ≈ $${totalInUSD.toFixed(2)} USD`}
                                    />

                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <TextField
                                            label="USD Recibidos"
                                            type="number"
                                            value={usdReceived}
                                            onChange={(e) => setUsdReceived(e.target.value ? Number(e.target.value) : "")}
                                            error={isShortOnUSD}
                                            helperText={isShortOnUSD ? "Monto insuficiente" : ""}
                                            fullWidth
                                            InputProps={{ sx: { bgcolor: "#fff", fontWeight: 700 }, startAdornment: <Typography variant="caption" sx={{ mr: 1, fontWeight: 800 }}>$</Typography> }}
                                        />

                                        <Box
                                            sx={{
                                                minWidth: '140px',
                                                p: 1.5,
                                                bgcolor: usdReceived !== "" ? (isShortOnUSD ? '#fee2e2' : '#dcfce7') : '#f1f5f9',
                                                borderRadius: 2,
                                                textAlign: 'center',
                                                border: '1px solid',
                                                borderColor: usdReceived !== "" ? (isShortOnUSD ? '#ef4444' : '#22c55e') : '#cbd5e1',
                                            }}
                                        >
                                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                                                {isShortOnUSD ? "DEBE (COP)" : "CAMBIO EN COP"}
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} color={isShortOnUSD ? "error.main" : "success.main"}>
                                                ${isShortOnUSD
                                                    ? (totalGeneral - Number(usdReceived) * Number(usdExchangeRate)).toLocaleString()
                                                    : copChangeFromUSD.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Stack>
                            )}
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
                <Stack direction="row" spacing={1}>
                    <Button onClick={onClose} size="large" sx={{ fontWeight: 600 }}>
                        Cancelar
                    </Button>
                </Stack>
                <Button
                    variant="contained"
                    size="large"
                    color="success"
                    disabled={isShortOnCash || isShortOnUSD}
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

            {/* Hidden Receipt for Printing */}
            <Box sx={{ display: 'none' }}>
                <InvoiceReceipt
                    ref={componentRef}
                    order={{
                        ...order,
                        products: localProducts,
                        subTotal,
                        discountAmount,
                        tipAmount,
                        total: totalGeneral,
                        isGuiaPlan,
                        guiaDiscount,
                        paymentMethod
                    }}
                />
            </Box>
        </Dialog>
    );
}
