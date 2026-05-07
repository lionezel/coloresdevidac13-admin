import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Stack,
  Tabs,
  Tab,
  Drawer,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Badge,
} from "@mui/material";
import {
  Add,
  Remove,
  DeleteOutline,
  AddShoppingCart,
  Close,
  Search,
  ExpandMore,
  ShoppingBag,
  PlaylistAdd,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useCollection } from "../hooks/useCollection";
import { Product, Variant } from "../interfaces/product";
import { Addition } from "../interfaces/Addition";
import { OrderProduct, Order, OrderStatus } from "../interfaces/Order";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StandaloneAddition {
  id: string;          // synthetic id "sa-<addition.id>-<ts>"
  additionId: string;
  name: string;
  price: number;
  quantity: number;
  completed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STANDALONE_CATEGORY = "__standalone__";

// ─── Sub-component: Additions picker with per-category search ────────────────
function AdditionsPicker({
  additions,
  selectedIds,
  onToggle,
  title = "Adiciones",
}: {
  additions: Addition[];
  selectedIds: Set<string>;
  onToggle: (addition: Addition) => void;
  title?: string;
}) {
  const [categorySearches, setCategorySearches] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const cats = Array.from(new Set(additions.map((a) => a.category || "General")));
    return cats.sort();
  }, [additions]);

  const setSearch = (cat: string, val: string) =>
    setCategorySearches((prev) => ({ ...prev, [cat]: val }));

  if (additions.length === 0) return null;

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 900,
          mb: 2,
          color: "#64748b",
          textTransform: "uppercase",
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </Typography>

      <Stack spacing={1.5}>
        {categories.map((cat) => {
          const q = (categorySearches[cat] || "").toLowerCase();
          const items = additions.filter(
            (a) => (a.category || "General") === cat && a.name.toLowerCase().includes(q)
          );
          const selectedCount = items.filter((a) => selectedIds.has(a.id!)).length;

          return (
            <Accordion
              key={cat}
              defaultExpanded={categories.length === 1}
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid #e2e8f0",
                borderRadius: "12px !important",
                "&:before": { display: "none" },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: "#64748b" }} />}
                sx={{
                  bgcolor: "#f8fafc",
                  minHeight: 48,
                  "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 },
                }}
              >
                <Typography sx={{ fontWeight: 800, color: "#334155", fontSize: "0.9rem" }}>
                  {cat}
                </Typography>
                {selectedCount > 0 && (
                  <Chip
                    label={selectedCount}
                    size="small"
                    color="primary"
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 900 }}
                  />
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, pt: 1.5 }}>
                {/* Per-category search */}
                <TextField
                  size="small"
                  placeholder={`Buscar en ${cat}…`}
                  value={categorySearches[cat] || ""}
                  onChange={(e) => setSearch(cat, e.target.value)}
                  fullWidth
                  sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: "#94a3b8" }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Grid container spacing={1}>
                  {items.map((addition) => {
                    const isSelected = selectedIds.has(addition.id!);
                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={addition.id}>
                        <Box
                          onClick={() => onToggle(addition)}
                          sx={{
                            cursor: "pointer",
                            border: "2px solid",
                            borderColor: isSelected ? "primary.main" : "#f1f5f9",
                            borderRadius: 3,
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            bgcolor: isSelected ? "rgba(59,130,246,0.05)" : "#fff",
                            transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                            "&:hover": {
                              borderColor: isSelected ? "primary.main" : "#c7d2fe",
                              transform: "scale(1.02)",
                            },
                          }}
                        >
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800, color: isSelected ? "primary.main" : "#1e293b", lineHeight: 1.2 }}
                            >
                              {addition.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                              +${addition.price}
                            </Typography>
                          </Box>
                          <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ p: 0.5, color: "#e2e8f0" }}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                  {items.length === 0 && (
                    <Grid size={12}>
                      <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Sin resultados
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateOrderPage() {
  const { restaurantId, orderId } = useParams<{ restaurantId: string; orderId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: allProducts = [] } = useCollection<Product>(restaurantId!, "products");
  const { data: categories = [] } = useCollection<{ id: string; name: string }>(restaurantId!, "category");
  const { data: allAdditions = [] } = useCollection<Addition>(restaurantId!, "additions");
  const { data: allOrders, createItem: createOrder, updateItem } = useCollection<Order>(restaurantId!, "orders");

  const products = allProducts.filter((p) => p.active);

  // ── Category tab + product search ──
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [productSearch, setProductSearch] = useState("");

  // ── Cart (regular items) ──
  const [cart, setCart] = useState<OrderProduct[]>([]);

  // ── Standalone additions ──
  const [standaloneAdditions, setStandaloneAdditions] = useState<StandaloneAddition[]>([]);
  const [standaloneDialogOpen, setStandaloneDialogOpen] = useState(false);
  const [standaloneSelected, setStandaloneSelected] = useState<Set<string>>(new Set());

  // ── Product detail modal ──
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(new Set());

  // ── Order form ──
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [loadedOrder, setLoadedOrder] = useState(false);

  // ─── Load existing order ──────────────────────────────────────────────────
  useEffect(() => {
    if (orderId && allOrders.length > 0 && !loadedOrder) {
      const order = allOrders.find((o) => o.id === orderId);
      if (order) {
        const regularProducts = order.products.filter((p) => p.productId !== STANDALONE_CATEGORY);
        const saProducts = order.products.filter((p) => p.productId === STANDALONE_CATEGORY);

        setCart(regularProducts);
        setStandaloneAdditions(
          saProducts.map((p) => ({
            id: `sa-${p.variantId}-${Date.now()}`,
            additionId: p.variantId,
            name: p.productName,
            price: p.price,
            quantity: p.quantity,
            completed: p.completed ?? false,
          }))
        );
        setCustomerName(order.customerName || order.name || "");
        setNotes(order.notes || "");
        setLoadedOrder(true);
      }
    }
  }, [orderId, allOrders, loadedOrder]);

  // ─── Filtered products ────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Todas") list = list.filter((p) => p.category === activeCategory);
    const q = productSearch.toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [products, activeCategory, productSearch]);

  // ─── Product modal handlers ───────────────────────────────────────────────
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants[0] || null);
    setQuantity(1);
    setSelectedAdditions(new Set());
  };

  const handleToggleAddition = (addition: Addition) => {
    setSelectedAdditions((prev) => {
      const next = new Set(prev);
      if (next.has(addition.id!)) next.delete(addition.id!);
      else next.add(addition.id!);
      return next;
    });
  };

  const handleCloseDialog = () => setSelectedProduct(null);

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant) return;

    const chosenAdditions = allAdditions.filter((a) => selectedAdditions.has(a.id!));
    const additionsTotal = chosenAdditions.reduce((acc, a) => acc + a.price, 0);
    const unitPrice = selectedVariant.price + additionsTotal;

    const existingIndex = cart.findIndex((item) => {
      if (item.productId !== selectedProduct.id || item.variantId !== selectedVariant.id) return false;
      if (item.completed) return false; // Keep separate for kitchen if already delivered
      const existingIds = (item.additions || []).map((a) => a.id).sort();
      const newIds = Array.from(selectedAdditions).sort();
      return JSON.stringify(existingIds) === JSON.stringify(newIds);
    });

    if (existingIndex !== -1) {
      const newCart = [...cart];
      const existingItem = newCart[existingIndex];
      
      existingItem.quantity += quantity;
      existingItem.total = unitPrice * existingItem.quantity;
      setCart(newCart);
    } else {
      const newItem: OrderProduct = {
        productId: selectedProduct.id!,
        productName: selectedProduct.name,
        variantId: selectedVariant.id,
        variantLabel: selectedVariant.label,
        price: unitPrice,
        quantity,
        image: selectedVariant.image || "",
        total: unitPrice * quantity,
        additions: chosenAdditions.map((a) => ({ id: a.id!, name: a.name, price: a.price })),
        completed: false,
        category: selectedProduct.category,
      };
      setCart([...cart, newItem]);
    }

    setSelectedProduct(null);
    setSelectedAdditions(new Set());
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQty = newCart[index].quantity + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
      setCart(newCart);
    } else {
      newCart[index].quantity = newQty;
      // unitPrice is embedded in item.price for cart products
      newCart[index].total = newCart[index].price * newQty;
      setCart(newCart);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // ─── Standalone additions handlers ───────────────────────────────────────
  const handleToggleStandaloneAddition = (addition: Addition) => {
    setStandaloneSelected((prev) => {
      const next = new Set(prev);
      if (next.has(addition.id!)) next.delete(addition.id!);
      else next.add(addition.id!);
      return next;
    });
  };

  const handleConfirmStandaloneAdditions = () => {
    const chosen = allAdditions.filter((a) => standaloneSelected.has(a.id!));
    const newItems: StandaloneAddition[] = chosen.map((a) => ({
      id: `sa-${a.id}-${Date.now()}`,
      additionId: a.id!,
      name: a.name,
      price: a.price,
      quantity: 1,
      completed: false,
    }));

    setStandaloneAdditions((prev) => {
      const merged = [...prev];
      newItems.forEach((ni) => {
        const idx = merged.findIndex((m) => m.additionId === ni.additionId && !m.completed);
        if (idx !== -1) {
          merged[idx].quantity += 1;
        }
        else merged.push(ni);
      });
      return merged;
    });

    setStandaloneSelected(new Set());
    setStandaloneDialogOpen(false);
  };

  const handleRemoveStandalone = (id: string) =>
    setStandaloneAdditions((prev) => prev.filter((sa) => sa.id !== id));

  const handleUpdateStandaloneQuantity = (id: string, delta: number) => {
    setStandaloneAdditions((prev) =>
      prev.map((sa) => {
        if (sa.id === id) {
          return { ...sa, quantity: sa.quantity + delta };
        }
        return sa;
      }).filter((sa) => sa.quantity > 0)
    );
  };

  // ─── Totals ───────────────────────────────────────────────────────────────
  const cartTotal = useMemo(() => {
    const productTotal = cart.reduce(
      (acc, item) => {
        const base = Number(item.total ?? Number(item.price) * Number(item.quantity));
        let itemDiscount = 0;
        if (item.discount && item.discount > 0) {
          if (item.discountMode === "fixed") {
            itemDiscount = item.discount;
          } else {
            itemDiscount = Math.round(base * (item.discount / 100));
          }
        }
        return acc + base - itemDiscount;
      },
      0
    );
    const saTotal = standaloneAdditions.reduce((acc, sa) => acc + sa.price * sa.quantity, 0);
    return productTotal + saTotal;
  }, [cart, standaloneAdditions]);

  // ─── Submit order ─────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cart.length === 0 && standaloneAdditions.length === 0) return;

    // Convert standalone additions → OrderProduct entries with special productId
    const saAsProducts: OrderProduct[] = standaloneAdditions.map((sa) => ({
      productId: STANDALONE_CATEGORY,
      productName: sa.name,
      variantId: sa.additionId,
      variantLabel: "Adición",
      price: sa.price,
      quantity: sa.quantity,
      image: "",
      total: sa.price * sa.quantity,
      additions: [], // Asegurar que sea un arreglo vacío y no undefined
      completed: sa.completed ?? false,
      category: "ADICIÓN",
    }));

    const allProducts2 = [...cart, ...saAsProducts];

    if (orderId) {
      // Keep billing state even if products were added (kitchen will see p.completed === false)
      const originalOrder = allOrders.find(o => o.id === orderId);
      let newState = originalOrder?.state;
      
      if (originalOrder && (originalOrder.state === "listo / caja" || originalOrder.state === "porCobrar")) {
        // We no longer revert to "pendiente". 
        // The kitchen view is now configured to show these states if there are incomplete products.
        newState = originalOrder.state;
      }

      await updateItem(orderId, {
        products: allProducts2,
        total: cartTotal,
        subTotal: cartTotal,
        customerName,
        notes,
        state: newState,
        name: customerName || `Orden-${orderId.substring(0, 4)}`,
      });
      setSuccessMsg(true);
      if (isMobile) setIsDrawerOpen(false);
      setTimeout(() => navigate(`/${restaurantId}/orders`), 1000);
      return;
    }

    const newOrder: Order = {
      name: customerName || `Orden-${Math.floor(Math.random() * 1000)}`,
      paymentMethod: "efectivo",
      orderType: "comerAca",
      notes,
      state: "pendiente" as OrderStatus,
      date: new Date(),
      products: allProducts2,
      total: cartTotal,
      subTotal: cartTotal,
      customerName,
    };

    await createOrder(newOrder);
    setSuccessMsg(true);
    setCart([]);
    setStandaloneAdditions([]);
    setCustomerName("");
    setNotes("");
    if (isMobile) setIsDrawerOpen(false);
  };

  // ─── Additions for current product modal (filtered and all) ──────────────
  const productModalAdditions = useMemo(() => {
    if (!selectedProduct) return allAdditions;
    const filtered = allAdditions.filter(
      (a) =>
        !a.category ||
        a.category.toLowerCase() === selectedProduct.category.toLowerCase() ||
        a.category === "General"
    );
    return filtered.length > 0 ? filtered : allAdditions;
  }, [allAdditions, selectedProduct]);

  // ─── Cart Sidebar ─────────────────────────────────────────────────────────
  const totalItemCount = cart.length + standaloneAdditions.length;

  const CartSidebar = (
    <Box
      sx={{
        width: isMobile ? "92vw" : 400,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderLeft: isMobile ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}>
            Mi Orden
          </Typography>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            {totalItemCount} {totalItemCount === 1 ? "ítem" : "ítems"}
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setIsDrawerOpen(false)} size="small" sx={{ bgcolor: "#f1f5f9" }}>
            <Close />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
        {totalItemCount === 0 ? (
          <Box sx={{ textAlign: "center", mt: 10, opacity: 0.6 }}>
            <AddShoppingCart sx={{ fontSize: 60, color: "#94a3b8", mb: 2 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">
              El carrito está vacío
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Agrega productos o adiciones para comenzar
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Regular products */}
            {cart.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "#fff",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "0.2s",
                  "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                  <Box flex={1} pr={1}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e293b" }}>
                      {item.productName}
                    </Typography>
                    {item.completed && (
                      <Chip 
                        label="Entregado" 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, mt: 0.5 }} 
                      />
                    )}
                    {item.variantLabel && item.variantLabel !== "Única" && (
                      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                        {item.variantLabel}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFromCart(idx)}
                    sx={{ p: 0.5, bgcolor: "#fff1f2", "&:hover": { bgcolor: "#ffe4e6" } }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Box>
                {item.additions && item.additions.length > 0 && (
                  <Box sx={{ mb: 1.5, pl: 1, borderLeft: "2px solid #e0e7ff" }}>
                    {item.additions.map((a, addIdx) => (
                      <Typography
                        key={addIdx}
                        variant="caption"
                        sx={{ display: "block", color: "#6366f1", fontWeight: 700, mb: 0.3 }}
                      >
                        + {a.name} (${a.price})
                      </Typography>
                    ))}
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton size="small" onClick={() => handleUpdateCartQuantity(idx, -1)} sx={{ bgcolor: "#f1f5f9", p: 0.5 }}>
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 20, textAlign: "center" }}>
                      {item.quantity}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleUpdateCartQuantity(idx, 1)} 
                      sx={{ bgcolor: "#f1f5f9", p: 0.5 }}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main", textAlign: "right" }}>
                    ${Number(item.total ?? Number(item.price) * Number(item.quantity))}
                  </Typography>
                </Box>
              </Box>
            ))}

            {/* Standalone additions */}
            {standaloneAdditions.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 900,
                    color: "#9333ea",
                    textTransform: "uppercase",
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    display: "block",
                    mb: 1,
                  }}
                >
                  Adiciones adicionales
                </Typography>
                <Stack spacing={1}>
                  {standaloneAdditions.map((sa) => (
                    <Box
                      key={sa.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: "#faf5ff",
                        border: "1px solid #e9d5ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box flex={1}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "#7c3aed" }}>
                          {sa.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9333ea", fontWeight: 700, display: "block" }}>
                          ${sa.price} c/u
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                          <IconButton size="small" onClick={() => handleUpdateStandaloneQuantity(sa.id, -1)} sx={{ bgcolor: "#f1f5f9", p: 0.5, color: "#7c3aed" }}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 20, textAlign: "center", color: "#7c3aed" }}>
                            {sa.quantity}
                          </Typography>
                          <IconButton size="small" onClick={() => handleUpdateStandaloneQuantity(sa.id, 1)} sx={{ bgcolor: "#f1f5f9", p: 0.5, color: "#7c3aed" }}>
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveStandalone(sa.id)}
                          sx={{ bgcolor: "#fff1f2", "&:hover": { bgcolor: "#ffe4e6" }, p: 0.5 }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: "#7c3aed" }}>
                          ${sa.price * sa.quantity}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {/* Standalone additions button */}
        <Box mt={3}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<PlaylistAdd />}
            onClick={() => {
              setStandaloneSelected(new Set());
              setStandaloneDialogOpen(true);
            }}
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              textTransform: "none",
              borderColor: "#9333ea",
              color: "#9333ea",
              "&:hover": { bgcolor: "#faf5ff", borderColor: "#7c3aed" },
            }}
          >
            Agregar adición suelta
          </Button>
        </Box>

        {/* Order Info Form */}
        <Box mt={3} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 4, border: "1px solid #f1f5f9" }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 900,
              mb: 2,
              color: "#475569",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Información Adicional
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Cliente / Mesa"
              variant="outlined"
              size="small"
              fullWidth
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              sx={{ bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <TextField
              label="Notas de Cocina"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Stack>
        </Box>
      </Box>

      {/* Footer / Total */}
      <Box
        sx={{
          p: 3,
          borderTop: "1px solid rgba(226,232,240,0.8)",
          bgcolor: "rgba(248,250,252,0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box display="flex" justifyContent="space-between" mb={2.5} alignItems="flex-end">
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#64748b" }}>
            Monto Total
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>
            ${cartTotal}
          </Typography>
        </Box>
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={totalItemCount === 0}
          onClick={handleSubmitOrder}
          sx={{
            py: 1.8,
            borderRadius: 3.5,
            fontSize: "1.1rem",
            fontWeight: 900,
            textTransform: "none",
            boxShadow: "0 10px 25px -5px rgba(59,130,246,0.4)",
            "&.Mui-disabled": { bgcolor: "#cbd5e1" },
          }}
        >
          {orderId ? "Guardar Cambios" : "Confirmar Orden"}
        </Button>
      </Box>
    </Box>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 80px)", margin: "-24px" }}>
      {/* LEFT: Products */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#f8fafc" }}>
        {/* Top bar */}
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            bgcolor: "#fff",
            borderBottom: "1px solid rgba(226,232,240,0.8)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              variant={isMobile ? "h6" : "h4"}
              sx={{ fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}
            >
              {orderId ? "Editar Orden" : "Nueva Orden"}
            </Typography>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
                Gestiona pedidos rápidamente con un sistema premium
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            {!isMobile && (
              <Button
                variant="outlined"
                size="medium"
                onClick={() => navigate(`/${restaurantId}/orders`)}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Volver
              </Button>
            )}
            {isMobile && (
              <Badge badgeContent={totalItemCount} color="primary" max={99}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingBag />}
                  onClick={() => setIsDrawerOpen(true)}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 900,
                    px: 2.5,
                    boxShadow: "0 8px 16px rgba(59,130,246,0.25)",
                  }}
                >
                  Carrito
                </Button>
              </Badge>
            )}
          </Box>
        </Box>

        {/* Category tabs */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            pt: 2,
            pb: 1,
            bgcolor: "#fff",
            borderBottom: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <Tabs
            value={activeCategory}
            onChange={(_, v) => setActiveCategory(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.9rem",
                minHeight: 40,
                px: 2.5,
                mr: 1,
                borderRadius: 2.5,
                color: "#64748b",
                transition: "0.2s",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                },
                "&:hover:not(.Mui-selected)": { bgcolor: "#f1f5f9" },
              },
            }}
          >
            <Tab label="Todas" value="Todas" />
            {categories.map((cat) => (
              <Tab key={cat.id} label={cat.name} value={cat.name} />
            ))}
          </Tabs>
        </Box>

        {/* Product search */}
        <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, bgcolor: "#fff", borderBottom: "1px solid #f1f5f9" }}>
          <TextField
            size="small"
            placeholder="Buscar producto…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#f8fafc" } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 20, color: "#94a3b8" }} />
                </InputAdornment>
              ),
              endAdornment: productSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setProductSearch("")}>
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        {/* Product Grid */}
        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
          {filteredProducts.length === 0 ? (
            <Box sx={{ textAlign: "center", mt: 8, opacity: 0.6 }}>
              <Search sx={{ fontSize: 56, color: "#94a3b8", mb: 2 }} />
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                Sin resultados
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {filteredProducts.map((product) => {
                const mainVariant = product.variants[0];
                if (!mainVariant) return null;
                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={product.id}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        borderRadius: 5,
                        overflow: "hidden",
                        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                        border: "1px solid #f1f5f9",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                          borderColor: "primary.light",
                        },
                      }}
                      onClick={() => handleProductClick(product)}
                    >
                      <Box sx={{ position: "relative", paddingTop: "85%", bgcolor: "#e2e8f0" }}>
                        <CardMedia
                          component="img"
                          image={mainVariant.image || "https://placehold.co/400?text=No+Image"}
                          alt={product.name}
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            bgcolor: "rgba(255,255,255,0.92)",
                            backdropFilter: "blur(4px)",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 900, color: "primary.main" }}>
                            ${Math.min(...product.variants.map((v) => v.price))}
                          </Typography>
                        </Box>
                      </Box>
                      <CardContent sx={{ p: 2, bgcolor: "#fff" }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 800,
                            color: "#1e293b",
                            mb: 0.5,
                            lineHeight: 1.2,
                            height: "2.4em",
                            overflow: "hidden",
                          }}
                        >
                          {product.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                          {product.category}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Box>

      {/* RIGHT: Cart */}
      {!isMobile ? (
        CartSidebar
      ) : (
        <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
          {CartSidebar}
        </Drawer>
      )}

      {/* MODAL: Product detail + variant + additions */}
      {selectedProduct && (
        <Dialog
          open={!!selectedProduct}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, overflow: "hidden" } }}
        >
          <DialogTitle
            sx={{
              p: 3,
              fontWeight: 900,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#fff",
              color: "#0f172a",
              letterSpacing: "-0.02em",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a" }}>
                {selectedProduct.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                {selectedProduct.category}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} size="small" sx={{ bgcolor: "#f1f5f9" }}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 3, bgcolor: "#fcfdff" }}>
            {/* Variant selector */}
            {selectedProduct.variants.length > 1 && (
              <Box mb={3}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 900,
                    mb: 1.5,
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                  }}
                >
                  Variante
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {selectedProduct.variants.map((v) => {
                    const isActive = selectedVariant?.id === v.id;
                    return (
                      <Box
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        sx={{
                          cursor: "pointer",
                          border: "2px solid",
                          borderColor: isActive ? "primary.main" : "#e2e8f0",
                          borderRadius: 2.5,
                          px: 2,
                          py: 1,
                          bgcolor: isActive ? "rgba(59,130,246,0.06)" : "#fff",
                          transition: "0.2s",
                          "&:hover": { borderColor: "primary.light" },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800, color: isActive ? "primary.main" : "#334155" }}
                        >
                          {v.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>
                          ${v.price}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Quantity */}
            <Box mb={3}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  mb: 1.5,
                  color: "#64748b",
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                }}
              >
                Cantidad
              </Typography>
              <Stack direction="row" alignItems="center" spacing={3} justifyContent="center">
                <IconButton
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    border: "1px solid #f1f5f9",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  <Remove />
                </IconButton>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 950, minWidth: 56, textAlign: "center", color: "#0f172a" }}
                >
                  {quantity}
                </Typography>
                <IconButton
                  onClick={() => setQuantity(quantity + 1)}
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: "primary.main",
                    color: "#fff",
                    boxShadow: "0 8px 16px rgba(59,130,246,0.3)",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  <Add />
                </IconButton>
              </Stack>
            </Box>

            {/* Additions picker with per-category search */}
            {productModalAdditions.length > 0 && (
              <AdditionsPicker
                additions={productModalAdditions}
                selectedIds={selectedAdditions}
                onToggle={handleToggleAddition}
                title="Adiciones del producto"
              />
            )}
          </DialogContent>

          <DialogActions
            sx={{
              p: 3,
              bgcolor: "#fff",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              gap: 1.5,
            }}
          >
            <Button
              onClick={handleCloseDialog}
              sx={{
                px: 3,
                fontWeight: 700,
                borderRadius: 3,
                color: "#64748b",
                textTransform: "none",
              }}
            >
              Descartar
            </Button>
            <Button
              variant="contained"
              onClick={handleAddToCart}
              sx={{
                borderRadius: 3.5,
                fontWeight: 900,
                flex: 1,
                py: 1.5,
                fontSize: "1rem",
                textTransform: "none",
                boxShadow: "0 10px 20px -5px rgba(59,130,246,0.3)",
              }}
            >
              Agregar — $
              {(
                (selectedVariant?.price || 0) +
                allAdditions
                  .filter((a) => selectedAdditions.has(a.id!))
                  .reduce((acc, a) => acc + a.price, 0)
              ) * quantity}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* MODAL: Standalone additions */}
      <Dialog
        open={standaloneDialogOpen}
        onClose={() => setStandaloneDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            p: 3,
            fontWeight: 900,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#fff",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a" }}>
              Adiciones adicionales
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              Selecciona las que quieres agregar a la orden
            </Typography>
          </Box>
          <IconButton
            onClick={() => setStandaloneDialogOpen(false)}
            size="small"
            sx={{ bgcolor: "#f1f5f9" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: "#fcfdff" }}>
          <AdditionsPicker
            additions={allAdditions}
            selectedIds={standaloneSelected}
            onToggle={handleToggleStandaloneAddition}
            title="Todas las adiciones"
          />
          {allAdditions.length === 0 && (
            <Box sx={{ textAlign: "center", py: 6, opacity: 0.6 }}>
              <PlaylistAdd sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No hay adiciones configuradas
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            bgcolor: "#fff",
            borderTop: "1px solid #f1f5f9",
            gap: 1.5,
          }}
        >
          <Button
            onClick={() => setStandaloneDialogOpen(false)}
            sx={{ px: 3, fontWeight: 700, borderRadius: 3, color: "#64748b", textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={standaloneSelected.size === 0}
            onClick={handleConfirmStandaloneAdditions}
            sx={{
              flex: 1,
              borderRadius: 3.5,
              fontWeight: 900,
              py: 1.5,
              textTransform: "none",
              bgcolor: "#9333ea",
              "&:hover": { bgcolor: "#7c3aed" },
              boxShadow: "0 10px 20px -5px rgba(147,51,234,0.3)",
              "&.Mui-disabled": { bgcolor: "#e9d5ff" },
            }}
          >
            Agregar {standaloneSelected.size > 0 ? `(${standaloneSelected.size})` : ""}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {orderId ? "¡Orden actualizada con éxito!" : "¡Orden creada con éxito!"}
        </Alert>
      </Snackbar>
    </Box>
  );
}
