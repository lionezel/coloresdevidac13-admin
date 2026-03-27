import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Stack,
    Typography,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Divider,
    FormGroup,
    Grid,
    Box,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Users, UserPermissions } from "../interfaces/Users";

interface Props {
    open: boolean;
    onClose: () => void;
    initial: Partial<Users> | null;
    onSubmit: (values: Partial<Users>) => Promise<void>;
}

const AVAILABLE_PAGES = [
    { id: "dashboard", label: "Dashboard" },
    { id: "products", label: "Productos" },
    { id: "categories", label: "Categorías" },
    { id: "orders", label: "Pedidos" },
    { id: "billing", label: "Caja / Facturación" },
    { id: "additions", label: "Adiciones" },
    { id: "discounts", label: "Descuentos" },
    { id: "carousel", label: "Carousel" },
    { id: "delivery", label: "Domicilios" },
    { id: "settings", label: "Configuración" },
];

const DEFAULT_PERMISSIONS: UserPermissions = {
    allowedPages: [],
    canCreate: true,
    canEdit: true,
    canDelete: false,
};

export default function UserDialog({ open, onClose, initial, onSubmit }: Props) {
    const [values, setValues] = useState<Partial<Users>>({});

    useEffect(() => {
        if (open) {
            if (initial) {
                setValues({
                    ...initial,
                    permissions: initial.permissions || { ...DEFAULT_PERMISSIONS },
                });
            } else {
                setValues({
                    role: "cajero",
                    permissions: { ...DEFAULT_PERMISSIONS },
                });
            }
        }
    }, [initial, open]);

    const handleChange = (key: keyof Users, value: any) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handlePermissionChange = (key: keyof UserPermissions, value: any) => {
        setValues((prev) => ({
            ...prev,
            permissions: {
                ...(prev.permissions || DEFAULT_PERMISSIONS),
                [key]: value,
            },
        }));
    };

    const handlePageToggle = (pageId: string) => {
        const currentPages = values.permissions?.allowedPages || [];
        const newPages = currentPages.includes(pageId)
            ? currentPages.filter((p) => p !== pageId)
            : [...currentPages, pageId];
        handlePermissionChange("allowedPages", newPages);
    };

    const handleSave = () => {
        onSubmit(values);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                {initial?.uid ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>

            <DialogContent>
                <Stack spacing={3} mt={1}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Nombre"
                                value={values.name || ""}
                                onChange={(e) => handleChange("name", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Email"
                                value={values.email || ""}
                                onChange={(e) => handleChange("email", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        
                        {!initial?.uid && (
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Contraseña"
                                    type="password"
                                    value={(values as any).password || ""}
                                    onChange={(e) => handleChange("password" as any, e.target.value)}
                                    fullWidth
                                    helperText="Mínimo 6 caracteres"
                                />
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                label="Rol"
                                value={values.role || "cajero"}
                                onChange={(e) => handleChange("role", e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="admin">Administrador</MenuItem>
                                <MenuItem value="cajero">Cajero</MenuItem>
                                <MenuItem value="mesero">Mesero</MenuItem>
                                <MenuItem value="cocinero">Cocinero</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Divider />

                    <Typography variant="h6">Permisos de Acceso</Typography>
                    
                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            Páginas Visibles
                        </Typography>
                        <Grid container spacing={1}>
                            {AVAILABLE_PAGES.map((page) => (
                                <Grid size={{ xs: 6, sm: 4 }} key={page.id}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={(values.permissions?.allowedPages || []).includes(page.id)}
                                                onChange={() => handlePageToggle(page.id)}
                                            />
                                        }
                                        label={page.label}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            Acciones Permitidas
                        </Typography>
                        <FormGroup row>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={values.permissions?.canCreate ?? true}
                                        onChange={(e) => handlePermissionChange("canCreate", e.target.checked)}
                                    />
                                }
                                label="Crear"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={values.permissions?.canEdit ?? true}
                                        onChange={(e) => handlePermissionChange("canEdit", e.target.checked)}
                                    />
                                }
                                label="Editar"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={values.permissions?.canDelete ?? false}
                                        onChange={(e) => handlePermissionChange("canDelete", e.target.checked)}
                                    />
                                }
                                label="Eliminar"
                            />
                        </FormGroup>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!values.email}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
