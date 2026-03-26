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

  const { createItem: createOrder } = useCollection<Order>(restaurantId!, "orders");

  // Filter out inactive products
  const products = allProducts.filter(p => p.active);

  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [cart, setCart] = useState<OrderProduct[]>([]);
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

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
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant) return;

    const newCartItem: OrderProduct = {
      productId: selectedProduct.id!,
      productName: selectedProduct.name,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      price: selectedVariant.price,
      quantity: quantity,
      image: selectedVariant.image || "",
      total: selectedVariant.price * quantity,
      completed: false
    };

    setCart([...cart, newCartItem]);
    setSelectedProduct(null);
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
    <Box sx={{ width: isMobile ? "auto" : 380, height: "100%", display: "flex", flexDirection: "column", bgcolor: "#fff", borderLeft: "1px solid #e2e8f0" }}>
      <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" fontWeight={800}>Resumen de Orden</Typography>
        {isMobile && (
          <IconButton onClick={() => setIsDrawerOpen(false)}>
            <Close />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        {cart.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 10 }}>
            <AddShoppingCart sx={{ fontSize: 60, color: "#cbd5e1" }} />
            <Typography variant="body1" color="text.secondary" mt={2}>El carrito está vacío</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {cart.map((item, idx) => (
              <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pb: 2, borderBottom: "1px dashed #e2e8f0" }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {item.quantity}x {item.productName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.variantLabel !== "Única" && item.variantLabel}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="primary" display="block" mt={0.5}>
                    ${item.total}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(idx)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        {/* Order Info Form */}
        <Box mt={4}>
          <Typography variant="subtitle2" fontWeight={800} mb={2}>Detalles del Cliente / Pedido</Typography>
          <Stack spacing={2}>
            <TextField 
              label="Nombre del Cliente o Mesa" 
              size="small" 
              fullWidth 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
            />
            <TextField 
              label="Nota para cocina" 
              size="small" 
              fullWidth 
              multiline 
              rows={2} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </Stack>
        </Box>
      </Box>

      <Box sx={{ p: 3, borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={800} color="text.secondary">Total</Typography>
          <Typography variant="h5" fontWeight={900} color="primary.main">${cartTotal}</Typography>
        </Box>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          disabled={cart.length === 0} 
          onClick={handleSubmitOrder}
          sx={{ py: 1.5, borderRadius: 2, fontSize: "1.1rem", fontWeight: 800 }}
        >
          Crear Orden
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 80px)", margin: "-24px" }}>
      {/* LEFT SIDE: Products */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#f1f5f9" }}>
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Nueva Orden (POS)</Typography>
            <Typography variant="body2" color="text.secondary">Selecciona los productos y crea un pedido rápidamente</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(`/${restaurantId}/orders`)}>Volver a Órdenes</Button>
            {isMobile && (
              <Button variant="contained" onClick={() => setIsDrawerOpen(true)}>
                Ver Carrito ({cart.length})
              </Button>
            )}
          </Box>
        </Box>

        {/* Categories Tabs */}
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, bgcolor: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          <Tabs 
            value={activeCategory} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.95rem" } }}
          >
            <Tab label="Todas" value="Todas" />
            {categories.map((cat) => (
              <Tab key={cat.id} label={cat.name} value={cat.name} />
            ))}
          </Tabs>
        </Box>

        {/* Product Grid */}
        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2}>
            {filteredProducts.map(product => {
              const mainVariant = product.variants[0];
              if (!mainVariant) return null;
              
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={product.id}>
                  <Card 
                    sx={{ 
                      cursor: "pointer", 
                      borderRadius: 3, 
                      transition: "0.2s", 
                      "&:hover": { transform: "translateY(-4px)", boxShadow: 3 } 
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Box sx={{ position: "relative", paddingTop: "75%", bgcolor: "#e2e8f0" }}>
                      <CardMedia
                        component="img"
                        image={mainVariant.image || "https://placehold.co/400?text=No+Image"}
                        alt={product.name}
                        sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Box>
                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{product.name}</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight={800}>
                        ${Math.min(...product.variants.map((v) => v.price))}
                      </Typography>
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
        <Dialog open={!!selectedProduct} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>{selectedProduct.name}</DialogTitle>
          <DialogContent dividers>
            {/* Quantity */}
            <Typography variant="subtitle2" fontWeight={800} mb={1}>Cantidad:</Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))} sx={{ bgcolor: "grey.100" }}><Remove /></IconButton>
              <Typography variant="h6" fontWeight={800}>{quantity}</Typography>
              <IconButton onClick={() => setQuantity(quantity + 1)} sx={{ bgcolor: "grey.100" }}><Add /></IconButton>
            </Stack>

          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={handleAddToCart} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Agregar a la Orden (${(selectedVariant?.price || 0) * quantity})
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
