import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
  Divider,
  TextField,
} from "@mui/material";
import {
  AttachMoney,
  ShoppingBag,
  People,
  Receipt,
  CreditCard,
  AccountBalance,
  LocalAtm,
  Savings,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useCollection } from "../hooks/useCollection";
import { Product } from "../interfaces/product";
import { useAnalytics, Period } from "../hooks/useAnalytics";
import { formatCOP } from "../components/format";

/* =========================
   KPI CARD
========================= */
const Metric = ({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) => (
  <Card
    sx={{
      borderRadius: 4,
      height: "100%",
      transition: "0.3s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 6,
      },
    }}
  >
    <CardContent>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>

          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>

          {subtitle && (
            <Chip
              size="small"
              label={subtitle}
              color="success"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

/* =========================
   DATE HELPERS
========================= */
const getWeekString = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getDateOfISOWeek = (w: number, y: number) => {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

/* =========================
   DASHBOARD
========================= */
export default function Dashboard() {
  const { restaurantId } = useParams();

  const { data: orders = [] } = useCollection<any>(
    restaurantId ?? "",
    "orderssuccess"
  );

  const { data: products = [] } = useCollection<Product>(
    restaurantId ?? "",
    "products"
  );

  const [period, setPeriod] = useState<Period>("month");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [stockSearch, setStockSearch] = useState("");
  const analytics = useAnalytics(orders, period, customDate);

  if (!restaurantId) {
    return (
      <Box p={3}>
        <Typography color="error">
          No se encontró el restaurante
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 4 }} bgcolor="#f4f6fb" minHeight="100vh">
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Analytics
          </Typography>
          <Typography color="text.secondary">
            Resumen de rendimiento del restaurante
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          {/* Specific Pickers */}
          {period === "day" && (
            <TextField
              type="date"
              size="small"
              value={customDate ? `${customDate.getFullYear()}-${String(customDate.getMonth() + 1).padStart(2, "0")}-${String(customDate.getDate()).padStart(2, "0")}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const [y, m, d] = val.split('-');
                  setCustomDate(new Date(Number(y), Number(m) - 1, Number(d)));
                } else setCustomDate(new Date());
              }}
              sx={{ bgcolor: "#fff", borderRadius: 2, flexGrow: { xs: 1, sm: 0 }, minWidth: 160 }}
            />
          )}

          {period === "week" && (
            <TextField
              type="week"
              size="small"
              value={customDate ? getWeekString(customDate) : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const [y, w] = val.split('-W');
                  setCustomDate(getDateOfISOWeek(Number(w), Number(y)));
                } else setCustomDate(new Date());
              }}
              sx={{ bgcolor: "#fff", borderRadius: 2, flexGrow: { xs: 1, sm: 0 }, minWidth: 160 }}
            />
          )}

          {period === "month" && (
            <TextField
              type="month"
              size="small"
              value={customDate ? `${customDate.getFullYear()}-${String(customDate.getMonth() + 1).padStart(2, "0")}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const [y, m] = val.split('-');
                  setCustomDate(new Date(Number(y), Number(m) - 1, 1));
                } else setCustomDate(new Date());
              }}
              sx={{ bgcolor: "#fff", borderRadius: 2, flexGrow: { xs: 1, sm: 0 }, minWidth: 160 }}
            />
          )}

          {period === "year" && (
            <TextField
              type="number"
              size="small"
              placeholder="YYYY"
              value={customDate ? customDate.getFullYear() : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val.length === 4) {
                  setCustomDate(new Date(Number(val), 0, 1));
                }
              }}
              sx={{ bgcolor: "#fff", borderRadius: 2, width: 100, flexGrow: { xs: 1, sm: 0 }, minWidth: 120 }}
            />
          )}

          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setPeriod(value);
              }
            }}
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
              display: "flex",
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                flex: "1 1 auto",
                minWidth: "80px",
              },
            }}
          >
            <ToggleButton value="day">Día</ToggleButton>
            <ToggleButton value="week">Semana</ToggleButton>
            <ToggleButton value="month">Mes</ToggleButton>
            <ToggleButton value="year">Año</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Ingresos"
            value={formatCOP(analytics.revenue)}
            subtitle={`+${analytics.growth.toFixed(1)}%`}
            icon={<AttachMoney />}
            color="#2e7d32"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Órdenes"
            value={analytics.orders}
            icon={<ShoppingBag />}
            color="#1565c0"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Usuarios"
            value={analytics.users}
            icon={<People />}
            color="#6a1b9a"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Ticket promedio"
            value={formatCOP(analytics.ticketAvg)}
            icon={<Receipt />}
            color="#ef6c00"
          />
        </Grid>

        {/* Payment Methods Breakdown */}
        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Ingresos Efectivo"
            value={formatCOP(analytics.paymentRevenue.efectivo)}
            icon={<LocalAtm />}
            color="#388e3c"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Ingresos Tarjeta"
            value={formatCOP(analytics.paymentRevenue.tarjeta)}
            icon={<CreditCard />}
            color="#1976d2"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Ingresos Transferencia"
            value={formatCOP(analytics.paymentRevenue.transferencia)}
            icon={<AccountBalance />}
            color="#fbc02d"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Total Propinas"
            value={formatCOP(analytics.totalTips)}
            icon={<Savings />}
            color="#e91e63"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
          <Metric
            title="Total Descuento Guías"
            value={formatCOP(analytics.totalGuiaDiscount)}
            icon={<LocalAtm />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* CHARTS */}
      <Grid container spacing={3}>
        {/* REVENUE CHART */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Evolución de Ingresos
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenueChart}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(val) => `$${(val / 1000)}k`} tick={{ fontSize: 12 }} width={60} />
                  <Tooltip formatter={(value: number) => formatCOP(value)} />
                  <Line dataKey="total" stroke="#2e7d32" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ORDER STATUS */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Estado de Órdenes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Entregadas", value: analytics.delivered },
                      { name: "Canceladas", value: analytics.cancelled },
                    ]}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    <Cell fill="#2e7d32" />
                    <Cell fill="#e53935" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* PAYMENT METHODS & ORDER TYPES */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Métodos de Pago
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.paymentMethods}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    fill="#1565c0"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#1565c0', '#42a5f5', '#90caf9', '#0d47a1'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Tipos de Orden
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.orderTypes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    fill="#ef6c00"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.orderTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef6c00', '#ffb74d', '#ffe0b2', '#e65100'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* PEAK HOURS */}
        <Grid size={{ xs: 12, md: 12, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Horas Pico (Pedidos)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.peakHours}>
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="orders" fill="#6a1b9a" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* TOP PRODUCTS: QTY vs REVENUE */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Top 5 Productos (Por Cantidad)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="qty" fill="#1565c0" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={800} mb={2}>
                Top 5 Productos (Por Ganancia)
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.topProductsByRevenue} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => formatCOP(value)} />
                  <Bar dataKey="revenue" fill="#2e7d32" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* INVENTARIO / STOCK DIARIO */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 4, height: '100%', mt: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} mb={2}>
                <Typography fontWeight={800}>
                  Control de Inventario Diario
                </Typography>
                <TextField
                  size="small"
                  placeholder="Buscar producto…"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  sx={{ bgcolor: "#fff", borderRadius: 2, minWidth: 220 }}
                />
              </Stack>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px", color: "#64748b" }}>Producto</th>
                      <th style={{ padding: "12px 16px", color: "#64748b" }}>Categoría</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b" }}>Stock Inicial</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b" }}>Ventas</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b" }}>Stock Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.flatMap(p =>
                      p.variants?.map(v => {
                        const isToday = v.lastStockResetDate === new Date().toLocaleDateString();
                        const initial = isToday && v.initialDailyStock !== undefined ? v.initialDailyStock : v.stock;
                        const current = v.stock;
                        const sold = initial - current;

                        return {
                          name: `${p.name}`,
                          category: p.category,
                          initial,
                          current,
                          sold
                        };
                      }) || []
                    )
                      .filter(item =>
                        item.name.toLowerCase().includes(stockSearch.toLowerCase())
                      )
                      .sort((a, b) => b.sold - a.sold)
                      .map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#334155" }}>{item.name}</td>
                          <td style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 500 }}>{item.category}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#64748b" }}>{item.initial}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: item.sold > 0 ? "#f59e0b" : "#cbd5e1", fontWeight: 800 }}>{item.sold}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: item.current <= 5 ? "#ef4444" : "#10b981", fontWeight: 900 }}>{item.current}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
