import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Stack,
    Box,
    TextField,
    MenuItem,
    Divider,
    IconButton,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { Order } from "../interfaces/Order";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useParams } from "react-router-dom";

interface Props {
    open: boolean;
    order: Order | null;
    onClose: () => void;
    onSaved: () => void;
}

const PAYMENT_METHODS = [
    { value: "efectivo", label: "💵 Efectivo" },
    { value: "tarjeta", label: "💳 Tarjeta de Crédito/Débito" },
    { value: "transferencia", label: "🏦 Transferencia / Nequi" },
];

export default function EditBilledOrderDialog({ open, order, onClose, onSaved }: Props) {
    const { restaurantId } = useParams<{ restaurantId: string }>();

    const [paymentMethod, setPaymentMethod] = useState("");
    const [total, setTotal] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (order && open) {
            setPaymentMethod(order.paymentMethod?.toLowerCase() || "efectivo");
            setTotal(order.total ?? "");
            setNotes(order.notes || "");
        }
    }, [order, open]);

    const handleSave = async () => {
        if (!order?.id || !restaurantId) return;
        setLoading(true);
        try {
            const ref = doc(db, "restaurants", restaurantId, "orderssuccess", order.id);
            await updateDoc(ref, {
                paymentMethod,
                total: Number(total),
                notes,
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error("Error actualizando la orden facturada:", err);
            alert("Error al guardar los cambios.");
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    const originalTotal = order.products.reduce(
        (acc, p) => acc + Number(p.total ?? Number(p.price) * Number(p.quantity)),
        0
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1}>
                        <EditIcon color="primary" />
                        Editar Orden Facturada
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 3 }}>
                {/* Orden info */}
                <Box
                    sx={{
                        p: 2,
                        bgcolor: "#f8fafc",
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                        mb: 3,
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="subtitle1" fontWeight={900}>
                                {order.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {order.products.length} producto(s) · Subtotal original: $
                                {originalTotal.toLocaleString()}
                            </Typography>
                        </Box>
                        <Chip
                            label="Facturada"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 800 }}
                        />
                    </Stack>

                    {/* Products list (read-only) */}
                    <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />
                    <Stack spacing={0.5}>
                        {order.products.map((p, i) => (
                            <Stack key={i} direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">
                                    {p.quantity}x {p.productName}
                                </Typography>
                                <Typography variant="caption" fontWeight={700}>
                                    ${Number(p.total ?? Number(p.price) * Number(p.quantity)).toLocaleString()}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                <Stack spacing={3}>
                    {/* Método de pago */}
                    <TextField
                        select
                        label="Método de Pago"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        fullWidth
                        variant="outlined"
                    >
                        {PAYMENT_METHODS.map((m) => (
                            <MenuItem key={m.value} value={m.value}>
                                {m.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Total editable */}
                    <TextField
                        label="Total Final"
                        type="number"
                        value={total}
                        onChange={(e) => setTotal(e.target.value ? Number(e.target.value) : "")}
                        fullWidth
                        variant="outlined"
                        InputProps={{
                            startAdornment: (
                                <Typography variant="body2" sx={{ mr: 1, fontWeight: 800, color: "text.secondary" }}>
                                    $
                                </Typography>
                            ),
                        }}
                        helperText={
                            total !== "" && Number(total) !== originalTotal
                                ? `⚠️ El total original era $${originalTotal.toLocaleString()}`
                                : "Puedes ajustar el total si hubo corrección manual."
                        }
                    />

                    {/* Notas */}
                    <TextField
                        label="Notas / Observaciones"
                        multiline
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        fullWidth
                        variant="outlined"
                        placeholder="Ej: pago a cuenta, corrección de total, etc."
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} sx={{ fontWeight: 600 }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={loading || total === ""}
                    sx={{ fontWeight: 800, px: 4, borderRadius: 2 }}
                >
                    {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
