import { useState, useMemo } from "react";
import {
    Typography,
    Button,
    Stack,
    Box,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Avatar,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    List,
    ListItem,
    ListItemText,
    Chip,
} from "@mui/material";
import { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { PremiumDataGrid } from "../components/PremiumDataGrid";
import { useCollection } from "../hooks/useCollection";
import ItemDialog from "../components/ItemDialog";
import { useParams } from "react-router-dom";
import { CreditCustomer } from "../interfaces/CreditCustomer";
import { Order } from "../interfaces/Order";
import { Person, Phone, Email, LocationOn, Delete, Edit, History, ReceiptLong, CheckCircle } from "@mui/icons-material";
import { Timestamp } from "firebase/firestore";

export default function CreditCustomersPage() {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Clientes
    const { data: customers, createItem, updateItem, deleteItem } =
        useCollection<CreditCustomer>(restaurantId!, "credit_customers");

    // Órdenes finalizadas para calcular deuda y ver historial
    const { data: allSuccessOrders = [], deleteItem: deleteOrder } = useCollection<Order>(
        restaurantId!,
        "orderssuccess"
    );

    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<CreditCustomer | null>(null);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CreditCustomer | null>(null);

    const formatDate = (date?: any) => {
        if (!date) return "-";
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Filtrar órdenes por cliente para el historial
    const customerOrders = useMemo(() => {
        if (!selectedCustomerForHistory) return [];
        return allSuccessOrders
            .filter(o => o.customerId === selectedCustomerForHistory.id)
            .sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime();
            });
    }, [allSuccessOrders, selectedCustomerForHistory]);

    // Calcular deuda de un cliente sumando sus órdenes "fiadas"
    const calculateDebt = (customerId: string) => {
        return allSuccessOrders
            .filter(o => o.customerId === customerId && o.paymentMethod === "fiado")
            .reduce((acc, o) => acc + (o.total || 0), 0);
    };

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Nombre",
            flex: 1.5,
            renderCell: (params) => (
                <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                        <Person fontSize="small" />
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>
                        {params.value}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: "debt",
            headerName: "Deuda Total",
            width: 150,
            renderCell: (params) => (
                <Typography fontWeight={900} color="error.main">
                    ${calculateDebt(params.row.id).toLocaleString()}
                </Typography>
            ),
        },
        { field: "phone", headerName: "Teléfono", flex: 1 },
        {
            field: "actions",
            headerName: "Acciones",
            width: 200,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={() => setSelectedCustomerForHistory(params.row)}
                    >
                        <History fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                            setCurrent(params.row);
                            setOpen(true);
                        }}
                    >
                        <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteItem(params.row.id)}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Stack
                direction={isMobile ? "column" : "row"}
                justifyContent="space-between"
                alignItems={isMobile ? "stretch" : "center"}
                spacing={2}
                mb={4}
            >
                <Box>
                    <Typography variant="h4" fontWeight={900}>
                        💳 Clientes de Crédito
                    </Typography>
                    <Typography color="text.secondary">
                        Gestiona los clientes que pagan a fin de mes y revisa lo que acumulan.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Person />}
                    onClick={() => {
                        setCurrent(null);
                        setOpen(true);
                    }}
                    sx={{ borderRadius: 2, px: 3, py: 1 }}
                >
                    Nuevo Cliente
                </Button>
            </Stack>

            {!isMobile ? (
                <Box sx={{ height: 600, width: "100%", bgcolor: "background.paper", borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <PremiumDataGrid
                        rows={customers}
                        columns={columns}
                        onRowDoubleClick={(p: GridRowParams) => {
                            setSelectedCustomerForHistory(p.row as CreditCustomer);
                        }}
                    />
                </Box>
            ) : (
                <Stack spacing={2}>
                    {customers.map((customer) => (
                        <Card key={customer.id} sx={{ borderRadius: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                        <Person />
                                    </Avatar>
                                    <Box flex={1}>
                                        <Typography variant="h6" fontWeight={700}>{customer.name}</Typography>
                                        <Typography variant="h5" color="error.main" fontWeight={900}>
                                            ${calculateDebt(customer.id!).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <IconButton onClick={() => setSelectedCustomerForHistory(customer)}>
                                        <History />
                                    </IconButton>
                                </Stack>

                                <Stack direction="row" spacing={1} mt={3}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<Edit />}
                                        onClick={() => {
                                            setCurrent(customer);
                                            setOpen(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Delete />}
                                        onClick={() => customer.id && deleteItem(customer.id)}
                                    >
                                        Eliminar
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            {/* MODAL DE EDICIÓN */}
            <ItemDialog<CreditCustomer>
                open={open}
                onClose={() => setOpen(false)}
                initial={
                    current || {
                        name: "",
                        phone: "",
                        email: "",
                        address: "",
                    }
                }
                fields={[
                    { key: "name", label: "Nombre Completo" },
                    { key: "phone", label: "Teléfono / WhatsApp" },
                    { key: "email", label: "Correo Electrónico" },
                    { key: "address", label: "Dirección de Residencia" },
                ]}
                onSubmit={async (values) => {
                    if (current?.id) {
                        await updateItem(current.id, values);
                    } else {
                        await createItem({
                            ...values,
                            createdAt: Timestamp.now(),
                        });
                    }
                    setOpen(false);
                }}
            />

            {/* MODAL DE HISTORIAL / LO QUE ACUMULA */}
            <Dialog
                open={Boolean(selectedCustomerForHistory)}
                onClose={() => setSelectedCustomerForHistory(null)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h5" fontWeight={800}>Historial de Consumo</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedCustomerForHistory?.name}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" fontWeight={700} color="error.main">DEUDA TOTAL</Typography>
                        <Typography variant="h4" fontWeight={900} color="error.main">
                            ${calculateDebt(selectedCustomerForHistory?.id || "").toLocaleString()}
                        </Typography>
                    </Box>
                </DialogTitle>
                <Divider />
                <DialogContent>
                    {customerOrders.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <ReceiptLong sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">No hay órdenes registradas para este cliente.</Typography>
                        </Box>
                    ) : (
                        <List>
                            {customerOrders.map((order) => (
                                <Card key={order.id} variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800}>{formatDate(order.date)}</Typography>
                                                <Typography variant="body2" color="text.secondary">{order.products.length} productos</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="h6" fontWeight={900}>${order.total?.toLocaleString()}</Typography>
                                                <Chip
                                                    label={order.paymentMethod === 'fiado' ? 'PENDIENTE' : 'PAGADO'}
                                                    size="small"
                                                    color={order.paymentMethod === 'fiado' ? 'error' : 'success'}
                                                    sx={{ fontWeight: 800 }}
                                                />
                                            </Box>
                                        </Stack>
                                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                                        <Stack spacing={0.5}>
                                            {order.products.map((p, idx) => (
                                                <Typography key={idx} variant="caption" display="block">
                                                    • {p.quantity}x {p.productName} (${Number(p.total || p.price * p.quantity).toLocaleString()})
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setSelectedCustomerForHistory(null)} sx={{ fontWeight: 700 }}>Cerrar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        sx={{ fontWeight: 800, borderRadius: 4 }}
                        disabled={calculateDebt(selectedCustomerForHistory?.id || "") === 0}
                        onClick={() => {
                            // Logic to clear debt could go here (e.g., updating paymentMethod of orders or deleting them)
                            // For now, let's keep it simple as requested: "ver lo que acumula"
                            alert("Funcionalidad para liquidar deuda: Puedes marcar las órdenes como pagadas en la base de datos.");
                        }}
                    >
                        Liquidar Deuda
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
