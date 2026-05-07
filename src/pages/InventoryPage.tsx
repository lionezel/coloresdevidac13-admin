import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
  Tooltip,
} from "@mui/material";
import { Add, Edit, History, Delete, DeleteSweep, ClearAll } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useCollection } from "../hooks/useCollection";
import { InventoryItem, StockMovement } from "../interfaces/Inventory";

import { useContext } from "react";
import { Timestamp } from "firebase/firestore";
import { AuthContext } from "../auth/AuthContext";

export default function InventoryPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { data: inventory = [], createItem, updateItem, deleteItem } = useCollection<InventoryItem>(
    restaurantId!,
    "inventory"
  );
  const { user } = useContext(AuthContext);

  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [openCountDialog, setOpenCountDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("Unidades");
  const [countQuantity, setCountQuantity] = useState<number | "">("");
  const [countType, setCountType] = useState<"count" | "in" | "out">("count");
  const [countNote, setCountNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenItem = (item?: InventoryItem) => {
    if (item) {
      setSelectedItem(item);
      setItemName(item.name);
      setItemUnit(item.unit);
    } else {
      setSelectedItem(null);
      setItemName("");
      setItemUnit("Unidades");
    }
    setOpenItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemName || isSaving) return;
    setIsSaving(true);
    try {
    if (selectedItem?.id) {
      await updateItem(selectedItem.id, { name: itemName, unit: itemUnit });
    } else {
      await createItem({
        name: itemName,
        unit: itemUnit,
        currentStock: 0,
        movements: [],
      });
    }
    } finally {
        setIsSaving(false);
    }
    setOpenItemDialog(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (isSaving) return;
    if (window.confirm("¿Estás seguro de que deseas eliminar este insumo de inventario?")) {
      setIsSaving(true);
      try {
        await deleteItem(id);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleOpenCount = (item: InventoryItem) => {
    setSelectedItem(item);
    setCountQuantity("");
    setCountType("count");
    setCountNote("");
    setOpenCountDialog(true);
  };

  const handleSaveCount = async () => {
    if (!selectedItem?.id || countQuantity === "" || isSaving) return;
    setIsSaving(true);
    try {
    const qty = Number(countQuantity);

    let newStock = selectedItem.currentStock || 0;
    let actualDiff = 0;

    if (countType === "count") {
      actualDiff = qty - newStock;
      newStock = qty;
    } else if (countType === "in") {
      actualDiff = Math.abs(qty);
      newStock += actualDiff;
    } else if (countType === "out") {
      actualDiff = -Math.abs(qty);
      newStock += actualDiff;
    }

    const movement: StockMovement = {
      type: countType,
      quantity: actualDiff,
      date: Timestamp.now() as any,
      user: user?.email || "Admin",
      description: countNote || (countType === "count" ? "Conteo manual" : countType === "in" ? "Ingreso manual" : "Salida manual"),
    };

    const updatedMovements = [...(selectedItem.movements || []), movement];
    await updateItem(selectedItem.id, {
      currentStock: newStock,
      movements: updatedMovements,
    });
    } finally {
        setIsSaving(false);
    }
    setOpenCountDialog(false);
  };

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={900}>
            Inventario & Insumos
          </Typography>
          <Typography color="text.secondary">Administra el stock interno de productos e insumos.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteSweep />} 
            onClick={async () => {
              if (window.confirm("¿Estás seguro de que deseas limpiar el stock de TODOS los INSUMOS? Esto pondrá el stock en 0.")) {
                for (const item of inventory) {
                  await updateItem(item.id!, { currentStock: 0, movements: [...(item.movements || []), {
                    type: "count",
                    quantity: -(item.currentStock || 0),
                    date: new Date(),
                    user: user?.email || "Admin",
                    description: "Reinicio masivo de stock"
                  }] });
                }
              }
            }}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Limpiar Insumos
          </Button>
          <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleOpenItem()} sx={{ borderRadius: 2, fontWeight: 800 }}>
            Nuevo Insumo
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f1f5f9" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Insumo</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Stock Actual</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography fontWeight={700}>{item.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    fontWeight={800}
                    color={item.currentStock <= 0 ? "error.main" : "success.main"}
                    sx={{
                      bgcolor: item.currentStock <= 0 ? "error.50" : "success.50",
                      px: 2,
                      py: 0.5,
                      borderRadius: 4,
                      display: "inline-block",
                    }}
                  >
                    {item.currentStock} {item.unit}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Ajustar Stock (Conteo)">
                      <Button size="small" variant="outlined" color="primary" onClick={() => handleOpenCount(item)}>
                        Stock
                      </Button>
                    </Tooltip>
                    <Tooltip title="Historial">
                      <IconButton color="info" onClick={() => { setSelectedItem(item); setOpenHistoryDialog(true); }}>
                        <History />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Nombre">
                      <IconButton color="secondary" onClick={() => handleOpenItem(item)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar Insumo">
                      <IconButton color="error" disabled={isSaving} onClick={() => item.id && handleDeleteItem(item.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Limpiar Stock (Poner en 0)">
                      <IconButton 
                        color="warning" 
                        disabled={isSaving} 
                        onClick={async () => {
                          if (item.id && window.confirm(`¿Limpiar stock de ${item.name}?`)) {
                            await updateItem(item.id, {
                              currentStock: 0,
                              movements: [...(item.movements || []), {
                                type: "count",
                                quantity: -(item.currentStock || 0),
                                date: new Date(),
                                user: user?.email || "Admin",
                                description: "Limpieza manual de stock"
                              }]
                            });
                          }
                        }}
                      >
                        <ClearAll />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {inventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">No hay insumos registrados.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para Crear/Editar Insumo */}
      <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>{selectedItem ? "Editar Insumo" : "Nuevo Insumo"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre del Insumo (Ej: Carne, Pan)"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <TextField
              label="Unidad de Medida (Ej: Unidades, Gramos)"
              fullWidth
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenItemDialog(false)} disabled={isSaving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveItem} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar"}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ajuste de Stock */}
      <Dialog open={openCountDialog} onClose={() => setOpenCountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>Ajuste de Stock: {selectedItem?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Stock Actual:</Typography>
              <Typography variant="h5" fontWeight={900}>{selectedItem?.currentStock} {selectedItem?.unit}</Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button variant={countType === "count" ? "contained" : "outlined"} onClick={() => setCountType("count")} sx={{ flex: 1 }}>
                Conteo Total
              </Button>
              <Button variant={countType === "in" ? "contained" : "outlined"} color="success" onClick={() => setCountType("in")} sx={{ flex: 1 }}>
                Entrada (+)
              </Button>
              <Button variant={countType === "out" ? "contained" : "outlined"} color="error" onClick={() => setCountType("out")} sx={{ flex: 1 }}>
                Salida (-)
              </Button>
            </Stack>

            <TextField
              label={countType === "count" ? "Cantidad Contada (Ajuste Final)" : "Cantidad a Registrar"}
              type="number"
              fullWidth
              value={countQuantity}
              onChange={(e) => setCountQuantity(e.target.value ? Number(e.target.value) : "")}
            />
            <TextField
              label="Nota u Observación (Opcional)"
              fullWidth
              value={countNote}
              onChange={(e) => setCountNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCountDialog(false)} disabled={isSaving}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveCount} disabled={isSaving}>{isSaving ? "Procesando..." : "Aplicar Ajuste"}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Historial */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={800}>Historial de: {selectedItem?.name}</DialogTitle>
        <DialogContent>
          {selectedItem?.movements && selectedItem.movements.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Nota</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...selectedItem.movements].reverse().map((mov, idx) => {
                    const date = mov.date?.seconds ? new Date(mov.date.seconds * 1000) : new Date();
                    return (
                      <TableRow key={idx}>
                        <TableCell>{date.toLocaleString()}</TableCell>
                        <TableCell>{mov.user}</TableCell>
                        <TableCell>
                          {mov.type === "sale" ? "Venta" : mov.type === "count" ? "Conteo" : mov.type === "in" ? "Entrada" : "Salida"}
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={800} color={mov.quantity > 0 ? "success.main" : mov.quantity < 0 ? "error.main" : "text.secondary"}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell>{mov.description}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No hay historial de movimientos.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
