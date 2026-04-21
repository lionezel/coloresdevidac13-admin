import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Collapse,
  Chip,
  Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Product } from "../interfaces/product";
import { OrderProduct } from "../interfaces/Order";

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
  categories: { id: string; name: string }[];
  onAdd: (items: OrderProduct[]) => Promise<void>;
}

export default function AddProductsToOrderDialog({
  open,
  onClose,
  products,
  categories,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCategories, setShowCategories] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({}); // variantKey → qty
  const [saving, setSaving] = useState(false);

  // variantKey = `${productId}::${variantId}`
  const increment = (productId: string, variantId: string) => {
    const key = `${productId}::${variantId}`;
    setCart((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  };

  const decrement = (productId: string, variantId: string) => {
    const key = `${productId}::${variantId}`;
    setCart((prev) => {
      const next = { ...prev };
      if ((next[key] ?? 0) <= 1) delete next[key];
      else next[key] = next[key] - 1;
      return next;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchName && matchCat && p.active;
    });
  }, [products, search, selectedCategory]);

  const handleConfirm = async () => {
    const items: OrderProduct[] = [];

    for (const [key, qty] of Object.entries(cart)) {
      const [productId, variantId] = key.split("::");
      const product = products.find((p) => p.id === productId);
      if (!product) continue;
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) continue;

      items.push({
        productId,
        productName: product.name,
        variantId,
        variantLabel: variant.label,
        price: variant.price,
        quantity: qty,
        image: variant.image ?? "",
        total: variant.price * qty,
        completed: false,
        category: product.category,
      });
    }

    if (items.length === 0) return;

    setSaving(true);
    await onAdd(items);
    setSaving(false);
    setCart({});
    setSearch("");
    setSelectedCategory("all");
    onClose();
  };

  const handleClose = () => {
    setCart({});
    setSearch("");
    setSelectedCategory("all");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 4, overflow: "hidden", maxHeight: "90vh" },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: "1.15rem",
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Badge badgeContent={totalItems} color="primary" max={99}>
          <ShoppingCartIcon color="action" />
        </Badge>
        Agregar productos a la orden
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* ---- FILTROS ---- */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: "1px solid #f1f5f9" }}>
          {/* Search */}
          <Box
            component="input"
            placeholder="🔍  Buscar producto..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            sx={{
              width: "100%",
              mb: 1.5,
              p: "9px 13px",
              fontSize: "0.9rem",
              borderRadius: "10px",
              border: "1.5px solid",
              borderColor: "divider",
              outline: "none",
              bgcolor: "background.paper",
              color: "text.primary",
              "&:focus": {
                borderColor: "primary.main",
                boxShadow: "0 0 0 3px rgba(99,102,241,0.1)",
              },
            }}
          />

          {/* Category toggle */}
          <Stack direction="row" alignItems="center" spacing={1} mb={showCategories ? 1 : 0}>
            <Box
              component="button"
              onClick={() => setShowCategories((v) => !v)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                px: 2,
                py: 0.6,
                borderRadius: "20px",
                border: "1.5px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: "text.secondary",
                transition: "all 0.18s ease",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              🏷️ Categorías
              {selectedCategory !== "all" && (
                <Chip
                  label={selectedCategory}
                  size="small"
                  color="primary"
                  sx={{ height: 17, fontSize: "0.68rem", fontWeight: 700, ml: 0.5 }}
                />
              )}
              <ExpandMoreIcon
                sx={{
                  fontSize: 17,
                  ml: 0.25,
                  transition: "transform 0.25s ease",
                  transform: showCategories ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Box>

            {selectedCategory !== "all" && (
              <Box
                component="button"
                onClick={() => setSelectedCategory("all")}
                sx={{
                  px: 1.2,
                  py: 0.4,
                  borderRadius: "20px",
                  border: "1.5px solid",
                  borderColor: "error.light",
                  bgcolor: "transparent",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.76rem",
                  color: "error.main",
                  "&:hover": { bgcolor: "error.main", color: "#fff" },
                }}
              >
                ✕ Limpiar
              </Box>
            )}
          </Stack>

          <Collapse in={showCategories} timeout={230}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap pb={0.5}>
              {[{ id: "all", name: "Todas" }, ...categories].map((cat) => {
                const filterValue = cat.id === "all" ? "all" : cat.name;
                const active = selectedCategory === filterValue;
                return (
                  <Box
                    key={cat.id}
                    component="button"
                    onClick={() =>
                      setSelectedCategory(cat.id === "all" ? "all" : cat.name)
                    }
                    sx={{
                      px: 1.8,
                      py: 0.6,
                      borderRadius: "20px",
                      border: "1.5px solid",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      transition: "all 0.18s ease",
                      borderColor: active ? "primary.main" : "divider",
                      bgcolor: active ? "primary.main" : "background.paper",
                      color: active ? "#fff" : "text.secondary",
                      "&:hover": {
                        borderColor: "primary.main",
                        color: active ? "#fff" : "primary.main",
                      },
                    }}
                  >
                    {cat.name}
                  </Box>
                );
              })}
            </Stack>
          </Collapse>
        </Box>

        {/* ---- PRODUCT LIST ---- */}
        <Stack
          spacing={0}
          divider={<Divider />}
          sx={{ overflowY: "auto", maxHeight: 380 }}
        >
          {filtered.length === 0 && (
            <Box sx={{ textAlign: "center", py: 6, color: "text.secondary", fontStyle: "italic" }}>
              No se encontraron productos.
            </Box>
          )}

          {filtered.map((product) =>
            product.variants.map((variant) => {
              const key = `${product.id}::${variant.id}`;
              const qty = cart[key] ?? 0;

              return (
                <Stack
                  key={key}
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{
                    px: 3,
                    py: 1.8,
                    transition: "background 0.15s",
                    bgcolor: qty > 0 ? "primary.50" : "transparent",
                    "&:hover": { bgcolor: qty > 0 ? "primary.50" : "#f8fafc" },
                  }}
                >
                  <Avatar
                    src={variant.image}
                    variant="rounded"
                    sx={{ width: 46, height: 46, flexShrink: 0 }}
                  />
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={700} fontSize="0.9rem" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {variant.label} · ${variant.price.toLocaleString()}
                    </Typography>
                  </Box>

                  {qty === 0 ? (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => increment(product.id!, variant.id)}
                      sx={{
                        border: "1.5px solid",
                        borderColor: "primary.main",
                        borderRadius: 2,
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => decrement(product.id!, variant.id)}
                        sx={{ border: "1.5px solid", borderColor: "divider", borderRadius: 2 }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Box
                        sx={{
                          minWidth: 28,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          color: "primary.main",
                        }}
                      >
                        {qty}
                      </Box>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => increment(product.id!, variant.id)}
                        sx={{ border: "1.5px solid", borderColor: "primary.main", borderRadius: 2 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              );
            })
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          bgcolor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          gap: 1.5,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{ color: "text.secondary", fontWeight: 700 }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={totalItems === 0 || saving}
          onClick={handleConfirm}
          startIcon={<ShoppingCartIcon />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 800 }}
        >
          {saving ? "Agregando..." : `Agregar ${totalItems > 0 ? `(${totalItems})` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
