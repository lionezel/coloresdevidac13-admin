import { useState, useMemo } from "react";
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { Add, Remove, DeleteOutline, AddShoppingCart, Close } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useCollection } from "../hooks/useCollection";
import { Product, Variant } from "../interfaces/product";
import { Addition } from "../interfaces/Addition";
import { OrderProduct, Order, OrderStatus } from "../interfaces/Order";

export default function CreateOrderPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: allProducts = [] } = useCollection<Product>(restaurantId!, "products");
  const { data: categories = [] } = useCollection<{ id: string; name: string }>(restaurantId!, "category");
  const { data: allAdditions = [] } = useCollection<Addition>(restaurantId!, "additions");

  const { createItem: createOrder } = useCollection<Order>(restaurantId!, "orders");

  // Filter out inactive products
  const products = allProducts.filter(p => p.active);

  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [cart, setCart] = useState<OrderProduct[]>([]);
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAdditions, setSelectedAdditions] = useState<Addition[]>([]);

  // Order Details state
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Tabs logic
  const handleTabChange = (_: any, newValue: string) => {
    setActiveCategory(newValue);
  };

  const filteredProducts = useMemo(() => {
    if (activeCategory === "Todas") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants[0] || null);
    setQuantity(1);
    setSelectedAdditions([]);
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant) return;

    const additionsTotal = selectedAdditions.reduce((acc, add) => acc + add.price, 0);
    const unitPrice = selectedVariant.price + additionsTotal;

    const newCartItem: OrderProduct = {
      productId: selectedProduct.id!,
      productName: selectedProduct.name,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      price: unitPrice,
      quantity: quantity,
      image: selectedVariant.image || "",
      total: unitPrice * quantity,
      additions: selectedAdditions.map(a => ({ id: a.id!, name: a.name, price: a.price })),
      completed: false
    };

    setCart([...cart, newCartItem]);
    setSelectedProduct(null);
    setSelectedAdditions([]);
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.total || 0), 0);
  }, [cart]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    const newOrder: Order = {
      name: customerName || `Orden-${Math.floor(Math.random() * 1000)}`,
      paymentMethod: "efectivo",
      orderType: "comerAca",
      notes,
      state: "pendiente" as OrderStatus,
      date: new Date(),
      products: cart,
      total: cartTotal,
      subTotal: cartTotal,
      customerName
    };

    await createOrder(newOrder);
    setSuccessMsg(true);
    setCart([]);
    setCustomerName("");
    setNotes("");
    if (isMobile) setIsDrawerOpen(false);
  };


  // Cart Component
  const CartSidebar = (
    <Box sx={{ 
      width: isMobile ? "90vw" : 400, 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      bgcolor: "rgba(255, 255, 255, 0.9)", 
      backdropFilter: "blur(12px)",
      borderLeft: isMobile ? "none" : "1px solid rgba(226, 232, 240, 0.8)",
      boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.05)"
    }}>
      <Box sx={{ p: 2.5, borderBottom: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}>Mi Orden</Typography>
        {isMobile && (
          <IconButton onClick={() => setIsDrawerOpen(false)} size="small" sx={{ bgcolor: "#f1f5f9" }}>
            <Close />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
        {cart.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 10, opacity: 0.6 }}>
            <AddShoppingCart sx={{ fontSize: 60, color: "#94a3b8", mb: 2 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">El carrito está vacío</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {cart.map((item, idx) => (
              <Box key={idx} sx={{ 
                p: 2, 
                borderRadius: 3,
                bgcolor: "#fff",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "0.2s",
                "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e293b" }}>
                      {item.quantity}x {item.productName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      {item.variantLabel !== "Única" && item.variantLabel}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(idx)} sx={{ bgcolor: "#fff1f2", "&:hover": { bgcolor: "#ffe4e6" } }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Box>
                {item.additions && item.additions.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    {item.additions.map((a, addIdx) => (
                      <Typography key={addIdx} variant="caption" sx={{ display: "block", color: "#64748b", bgcolor: "#f8fafc", px: 1, py: 0.2, borderRadius: 1, mb: 0.5, width: "fit-content" }}>
                        + {a.name} (${a.price})
                      </Typography>
                    ))}
                  </Box>
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main", textAlign: "right" }}>
                  ${item.total}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {/* Order Info Form */}
        <Box mt={4} sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 4, border: "1px solid #f1f5f9" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Información Adicional</Typography>
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

      <Box sx={{ p: 3, borderTop: "1px solid rgba(226, 232, 240, 0.8)", bgcolor: "rgba(248, 250, 252, 0.8)", backdropFilter: "blur(10px)" }}>
        <Box display="flex" justifyContent="space-between" mb={2.5} alignItems="flex-end">
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#64748b" }}>Monto Total</Typography>
          <Typography variant="h4" sx={{ fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>${cartTotal}</Typography>
        </Box>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          disabled={cart.length === 0} 
          onClick={handleSubmitOrder}
          sx={{ 
            py: 1.8, 
            borderRadius: 3.5, 
            fontSize: "1.1rem", 
            fontWeight: 900,
            textTransform: "none",
            boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
            "&.Mui-disabled": { bgcolor: "#cbd5e1" }
          }}
        >
          Confirmar Orden
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 80px)", margin: "-24px" }}>
      {/* LEFT SIDE: Products */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#f8fafc" }}>
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fff", borderBottom: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant={isMobile ? "h6" : "h4"} sx={{ fontWeight: 950, color: "#0f172a", letterSpacing: "-0.04em" }}>Nueva Orden</Typography>
            {!isMobile && <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>Gestiona pedidos rápidamente con un sistema premium</Typography>}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            {!isMobile && <Button variant="outlined" size="medium" onClick={() => navigate(`/${restaurantId}/orders`)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Volver</Button>}
            {isMobile && (
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => setIsDrawerOpen(true)} 
                sx={{ 
                  borderRadius: 3, 
                  fontWeight: 900, 
                  px: 3,
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.25)"
                }}
              >
                Carrito ({cart.length})
              </Button>
            )}
          </Box>
        </Box>

        {/* Categories Tabs */}
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 1, bgcolor: "#fff", borderBottom: "1px solid rgba(226, 232, 240, 0.8)" }}>
          <Tabs 
            value={activeCategory} 
            onChange={handleTabChange} 
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
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
                },
                "&:hover:not(.Mui-selected)": {
                  bgcolor: "#f1f5f9"
                }
              } 
            }}
          >
            <Tab label="Todas" value="Todas" />
            {categories.map((cat) => (
              <Tab key={cat.id} label={cat.name} value={cat.name} />
            ))}
          </Tabs>
        </Box>

        {/* Product Grid */}
        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 4 } }}>
          <Grid container spacing={3}>
            {filteredProducts.map(product => {
              const mainVariant = product.variants[0];
              if (!mainVariant) return null;
              
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={product.id}>
                  <Card 
                    sx={{ 
                      cursor: "pointer", 
                      borderRadius: 5, 
                      overflow: "hidden",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
                      "&:hover": { 
                        transform: "translateY(-8px)", 
                        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                        borderColor: "primary.light"
                      } 
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Box sx={{ position: "relative", paddingTop: "85%", bgcolor: "#e2e8f0" }}>
                      <CardMedia
                        component="img"
                        image={mainVariant.image || "https://placehold.co/400?text=No+Image"}
                        alt={product.name}
                        sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <Box sx={{ 
                        position: "absolute", 
                        top: 12, 
                        right: 12, 
                        bgcolor: "rgba(255, 255, 255, 0.9)", 
                        backdropFilter: "blur(4px)",
                        px: 1.5, 
                        py: 0.5, 
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: "primary.main" }}>
                          ${Math.min(...product.variants.map((v) => v.price))}
                        </Typography>
                      </Box>
                    </Box>
                    <CardContent sx={{ p: 2, bgcolor: "#fff" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5, lineHeight: 1.2, height: "2.4em", overflow: "hidden" }}>{product.name}</Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>{product.category}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      {/* RIGHT SIDE: Cart Sidebar */}
      {!isMobile ? (
        CartSidebar
      ) : (
        <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
          {CartSidebar}
        </Drawer>
      )}

      {/* MODAL: Add To Cart */}
      {selectedProduct && (
        <Dialog 
          open={!!selectedProduct} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ 
            p: 3, 
            fontWeight: 900, 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            bgcolor: "#fff",
            color: "#0f172a",
            letterSpacing: "-0.02em"
          }}>
            {selectedProduct.name}
            <IconButton onClick={handleCloseDialog} size="small" sx={{ bgcolor: "#f1f5f9" }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 4, bgcolor: "#fcfdff" }}>
            {/* Quantity */}
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.1em" }}>Seleccionar Cantidad</Typography>
            <Stack direction="row" alignItems="center" spacing={3} mb={5} justifyContent="center">
              <IconButton 
                onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: "#fff", 
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  border: "1px solid #f1f5f9",
                  "&:hover": { bgcolor: "#f8fafc" }
                }}
              >
                <Remove />
              </IconButton>
              <Typography variant="h3" sx={{ fontWeight: 950, minWidth: 60, textAlign: "center", color: "#0f172a" }}>{quantity}</Typography>
              <IconButton 
                onClick={() => setQuantity(quantity + 1)} 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: "primary.main", 
                  color: "#fff",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                  "&:hover": { bgcolor: "primary.dark" }
                }}
              >
                <Add />
              </IconButton>
            </Stack>

            {/* Additions */}
            {allAdditions.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.1em" }}>Complementos (Adiciones)</Typography>
                <Grid container spacing={1.5}>
                  {(() => {
                    const filtered = allAdditions.filter(a => 
                      !a.category || 
                      a.category.toLowerCase() === selectedProduct.category.toLowerCase() ||
                      a.category === "General"
                    );
                    const showAll = filtered.length === 0;
                    const toShow = showAll ? allAdditions : filtered;
                    
                    return (
                      <>
                        {showAll && (
                          <Grid size={12}>
                            <Box sx={{ bgcolor: "#fff7ed", p: 1.5, borderRadius: 2, border: "1px solid #ffedd5", mb: 2 }}>
                              <Typography variant="caption" sx={{ color: "#9a3412", fontWeight: 700, display: "block" }}>
                                ℹ️ Mostrando todas las adiciones (sin coincidencia de categoría).
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {toShow.map((addition) => {
                          const isSelected = selectedAdditions.some(a => a.id === addition.id);
                          return (
                            <Grid size={{ xs: 12, sm: 6 }} key={addition.id}>
                              <Box 
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAdditions(selectedAdditions.filter(a => a.id !== addition.id));
                                  } else {
                                    setSelectedAdditions([...selectedAdditions, addition]);
                                  }
                                }}
                                sx={{ 
                                  cursor: "pointer",
                                  border: "2px solid", 
                                  borderColor: isSelected ? "primary.main" : "#f1f5f9", 
                                  borderRadius: 4, 
                                  p: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  bgcolor: isSelected ? "rgba(59, 130, 246, 0.04)" : "#fff",
                                  transition: "0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                  "&:hover": { borderColor: isSelected ? "primary.main" : "#e2e8f0", transform: "scale(1.02)" }
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: isSelected ? "primary.main" : "#1e293b" }}>
                                    {addition.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                                    +${addition.price}
                                  </Typography>
                                </Box>
                                <Checkbox 
                                  checked={isSelected}
                                  sx={{ p: 0.5, color: "#e2e8f0" }}
                                />
                              </Box>
                            </Grid>
                          );
                        })}
                      </>
                    );
                  })()}
                </Grid>
              </>
            )}

          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: "#fff", display: "flex", gap: 2 }}>
            <Button onClick={handleCloseDialog} sx={{ px: 3, fontWeight: 700, borderRadius: 3, color: "#64748b", textTransform: "none" }}>Descartar</Button>
            <Button 
              variant="contained" 
              onClick={handleAddToCart} 
              sx={{ 
                borderRadius: 4, 
                fontWeight: 900, 
                flex: 1, 
                py: 1.5,
                fontSize: "1rem",
                textTransform: "none",
                boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)"
              }}
            >
              Agregar a la Orden (${((selectedVariant?.price || 0) + selectedAdditions.reduce((acc, a) => acc + a.price, 0)) * quantity})
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Success Snackbar */}
      <Snackbar open={successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          ¡Orden creada con éxito!
        </Alert>
      </Snackbar>
    </Box>
  );
}
