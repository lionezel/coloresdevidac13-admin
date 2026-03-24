import React from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';
import { Order } from '../interfaces/Order';

interface InvoiceReceiptProps {
    order: Order;
}

export const InvoiceReceipt = React.forwardRef<HTMLDivElement, InvoiceReceiptProps>(({ order }, ref) => {
    const formatCOP = (num: number) => `$${(num || 0).toLocaleString('es-CO')}`;

    // Helper to format date
    const formatDate = (dateValue: any) => {
        if (!dateValue) return new Date().toLocaleString();
        if (dateValue.toDate) return dateValue.toDate().toLocaleString();
        if (dateValue instanceof Date) return dateValue.toLocaleString();
        return new Date(dateValue).toLocaleString();
    };

    return (
        <Box 
            ref={ref} 
            sx={{ 
                width: '80mm', 
                p: 2, 
                bgcolor: 'white', 
                color: 'black', 
                fontFamily: "'Courier New', Courier, monospace",
                "@media print": {
                    width: "80mm",
                    padding: "5mm",
                    margin: 0,
                }
            }}
        >
            {/* Header */}
            <Stack spacing={0.5} alignItems="center" textAlign="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={900} sx={{ fontSize: '1.2rem', lineHeight: 1.1 }}>
                    COLORES DE VIDA C13
                </Typography>
                <Typography sx={{ fontSize: '0.7rem' }}>NIT: 900.500.XXX-X</Typography>
                <Typography sx={{ fontSize: '0.7rem' }}>Carrera 13 # XX - XX</Typography>
                <Typography sx={{ fontSize: '0.7rem' }}>Tel: +57 300 000 0000</Typography>
                <Typography sx={{ fontSize: '0.7rem' }}>Medellín - Antioquia</Typography>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: 'black' }} />

            {/* Order Info */}
            <Box mb={1} sx={{ fontSize: '0.75rem' }}>
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="inherit">No. Orden:</Typography>
                    <Typography variant="inherit" fontWeight={700}>#{order.id?.slice(-6).toUpperCase() || 'N/A'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="inherit">Mesa/Pedido:</Typography>
                    <Typography variant="inherit" fontWeight={700}>{order.name}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="inherit">Fecha:</Typography>
                    <Typography variant="inherit">{formatDate(order.dateSuccess || order.date)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="inherit">Atendido por:</Typography>
                    <Typography variant="inherit">Administración</Typography>
                </Stack>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: 'black' }} />

            {/* Items Table */}
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', marginBottom: '8px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px dashed black' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0', width: '30px' }}>Cant</th>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>Descripción</th>
                        <th style={{ textAlign: 'right', padding: '4px 0' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.products.map((p, idx) => (
                        <tr key={idx}>
                            <td style={{ verticalAlign: 'top', padding: '4px 0' }}>{p.quantity}</td>
                            <td style={{ verticalAlign: 'top', padding: '4px 0' }}>
                                <Typography variant="inherit" sx={{ display: 'block' }}>{p.productName}</Typography>
                                {p.variantLabel && (
                                    <Typography variant="inherit" sx={{ fontSize: '0.65rem', color: 'gray', display: 'block' }}>
                                        - {p.variantLabel}
                                    </Typography>
                                )}
                                {p.additions && p.additions.length > 0 && p.additions.map((add, addIdx) => (
                                    <Typography key={addIdx} variant="inherit" sx={{ fontSize: '0.65rem', color: 'gray', display: 'block' }}>
                                        + {add.name} ({formatCOP(add.price)})
                                    </Typography>
                                ))}
                            </td>
                            <td style={{ verticalAlign: 'top', textAlign: 'right', padding: '4px 0' }}>
                                {formatCOP(p.total ?? (p.price * p.quantity))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: 'black' }} />

            {/* Totals */}
            <Stack spacing={0.5} sx={{ fontSize: '0.8rem' }}>
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="inherit">Subtotal:</Typography>
                    <Typography variant="inherit">{formatCOP(order.subTotal || (order.total + (order.discountAmount || 0) - (order.tipAmount || 0)))}</Typography>
                </Stack>
                
                {order.discountAmount && order.discountAmount > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="inherit">Descuentos:</Typography>
                        <Typography variant="inherit">-{formatCOP(order.discountAmount)}</Typography>
                    </Stack>
                )}

                {order.tipAmount && order.tipAmount > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="inherit">Propina Voluntaria:</Typography>
                        <Typography variant="inherit">+{formatCOP(order.tipAmount)}</Typography>
                    </Stack>
                )}

                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 900 }}>TOTAL:</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 900 }}>{formatCOP(order.total)}</Typography>
                </Stack>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: 'black' }} />

            {/* Payment Method */}
            <Box mb={2} textAlign="center">
                <Typography sx={{ fontSize: '0.7rem' }}>Forma de Pago: {order.paymentMethod?.toUpperCase() || 'N/A'}</Typography>
            </Box>

            {/* Footer */}
            <Box textAlign="center" sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>¡GRACIAS POR SU COMPRA!</Typography>
                <Typography sx={{ fontSize: '0.65rem', mt: 1 }}>
                    Original - Comprobante de Pago
                </Typography>
                <Typography sx={{ fontSize: '0.55rem', mt: 1, color: '#333' }}>
                    Desarrollado por Colores de Vida C13 Admin
                </Typography>
            </Box>
        </Box>
    );
});

InvoiceReceipt.displayName = 'InvoiceReceipt';
